<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Business rules of a sale's life: creation, returns (credit notes) and cancellation.
 * Shared by the point of sale and the quote conversion.
 */
class SaleService
{
    public function __construct(private StockService $stock)
    {
    }

    /**
     * @param array{client_id?: int|null, items: array<int, array{product_id: int, quantity: int, unit_price: float}>,
     *              discount?: float|null, paid_amount?: float|null, payment_method?: string|null, notes?: string|null} $data
     */
    public function create(array $data, int $userId): Sale
    {
        return DB::transaction(function () use ($data, $userId) {
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }

            $taxRate = Setting::taxRate();
            $taxAmount = round($subtotal * $taxRate / 100, 2);
            $discount = (float) ($data['discount'] ?? 0);
            $total = round($subtotal + $taxAmount - $discount, 2);

            if ($total < 0) {
                throw ValidationException::withMessages(['discount' => ['La remise ne peut pas dépasser le montant de la vente.']]);
            }

            // Money received now; any excess is change given back, not credit
            $paidAmount = min((float) ($data['paid_amount'] ?? $total), $total);
            $this->assertCreditAllowed($data['client_id'] ?? null, $total - $paidAmount);

            $sale = Sale::create([
                // Temporary unique value, replaced once the id is known
                'invoice_number' => 'TMP-' . uniqid('', true),
                'client_id' => $data['client_id'] ?? null,
                'user_id' => $userId,
                'subtotal' => $subtotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'discount' => $discount,
                'total' => $total,
                'status' => Sale::statusFor($paidAmount, $total),
                'paid_amount' => $paidAmount,
                'notes' => $data['notes'] ?? null,
            ]);

            $sale->update(['invoice_number' => $this->number('FAC', $sale->id, $sale->created_at->format('Y'))]);

            foreach ($data['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Throws (and rolls back the whole sale) if stock is insufficient
                $this->stock->move($product, -$item['quantity'], 'sale', $userId, $sale->invoice_number);

                $sale->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['quantity'] * $item['unit_price'],
                ]);
            }

            if ($paidAmount > 0) {
                $sale->payments()->create([
                    'user_id' => $userId,
                    'amount' => $paidAmount,
                    'method' => $data['payment_method'] ?? 'cash',
                    'note' => 'Paiement à la vente',
                ]);
            }

            return $sale;
        });
    }

    /**
     * Return some items of a sale: restock them, issue a credit note and refund the client if he overpaid.
     *
     * @param array<int, array{sale_item_id: int, quantity: int}> $lines
     */
    public function createReturn(Sale $sale, array $lines, int $userId, ?string $reason, string $refundMethod = 'cash'): SaleReturn
    {
        return DB::transaction(function () use ($sale, $lines, $userId, $reason, $refundMethod) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            $items = $sale->items()->with('product')->get()->keyBy('id');

            $subtotal = 0;
            $prepared = [];
            foreach ($lines as $line) {
                /** @var SaleItem|null $item */
                $item = $items->get($line['sale_item_id']);
                if (!$item) {
                    throw ValidationException::withMessages(['items' => ['Un article ne fait pas partie de cette vente.']]);
                }
                $quantity = (int) $line['quantity'];
                if ($quantity < 1) {
                    continue;
                }
                if ($quantity > $item->returnableQuantity()) {
                    $name = $item->product?->name ?? 'ce produit';
                    throw ValidationException::withMessages([
                        'items' => ["Quantité retournée trop élevée pour « {$name} » (maximum {$item->returnableQuantity()})."],
                    ]);
                }
                $subtotal += $quantity * (float) $item->unit_price;
                $prepared[] = [$item, $quantity];
            }

            if (!$prepared) {
                throw ValidationException::withMessages(['items' => ['Indiquez au moins une quantité à retourner.']]);
            }

            // Credit = returned goods + their VAT − their share of the original discount
            $taxAmount = round($subtotal * (float) $sale->tax_rate / 100, 2);
            $discountShare = (float) $sale->subtotal > 0 ? round((float) $sale->discount * $subtotal / (float) $sale->subtotal, 2) : 0;
            $credit = round($subtotal + $taxAmount - $discountShare, 2);

            $saleReturn = SaleReturn::create([
                'number' => 'TMP-' . uniqid('', true),
                'sale_id' => $sale->id,
                'user_id' => $userId,
                'reason' => $reason,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_share' => $discountShare,
                'total' => $credit,
                'refund_amount' => 0,
            ]);
            $saleReturn->update(['number' => $this->number('AV', $saleReturn->id, $saleReturn->created_at->format('Y'))]);

            foreach ($prepared as [$item, $quantity]) {
                $saleReturn->items()->create([
                    'sale_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'quantity' => $quantity,
                    'unit_price' => $item->unit_price,
                    'subtotal' => $quantity * (float) $item->unit_price,
                ]);
                $item->increment('returned_quantity', $quantity);

                if ($item->product) {
                    $this->stock->move($item->product, $quantity, 'return', $userId, $saleReturn->number, $reason ?: 'Retour client');
                }
            }

            $sale->returned_amount = round((float) $sale->returned_amount + $credit, 2);
            $sale->save();

            // If the client has now paid more than the net amount, give the difference back
            $overpaid = round((float) $sale->paid_amount - $sale->net_total, 2);
            if ($overpaid > 0) {
                $sale->payments()->create([
                    'user_id' => $userId,
                    'amount' => -$overpaid,
                    'method' => $refundMethod,
                    'note' => 'Remboursement ' . $saleReturn->number,
                ]);
                $saleReturn->update(['refund_amount' => $overpaid, 'refund_method' => $refundMethod]);
            }

            $sale->refreshPaymentStatus();

            return $saleReturn;
        });
    }

    /**
     * Cancel a sale: put back what was not already returned, then delete it
     */
    public function cancel(Sale $sale, int $userId): void
    {
        DB::transaction(function () use ($sale, $userId) {
            foreach ($sale->items()->with('product')->get() as $item) {
                $quantity = $item->returnableQuantity();
                if ($item->product && $quantity > 0) {
                    $this->stock->move($item->product, $quantity, 'sale_cancel', $userId, $sale->invoice_number, 'Annulation de la vente');
                }
            }

            $sale->delete(); // items, payments and returns cascade
        });
    }

    /**
     * A sale on credit needs a known client whose credit limit is not exceeded
     */
    private function assertCreditAllowed(?int $clientId, float $newDebt): void
    {
        if ($newDebt <= 0) {
            return;
        }

        if (!$clientId) {
            throw ValidationException::withMessages([
                'client_id' => ['Une vente à crédit (paiement partiel) nécessite de choisir un client.'],
            ]);
        }

        $client = Client::findOrFail($clientId);
        if ($client->credit_limit === null) {
            return;
        }

        $current = $client->balanceDue();
        $limit = (float) $client->credit_limit;
        if ($current + $newDebt > $limit) {
            $fmt = fn ($v) => number_format($v, 0, ',', ' ');
            throw ValidationException::withMessages([
                'client_id' => ["Plafond de crédit dépassé pour {$client->name} : dette actuelle {$fmt($current)}, plafond {$fmt($limit)}, crédit demandé {$fmt($newDebt)}."],
            ]);
        }
    }

    private function number(string $prefix, int $id, string $year): string
    {
        return $prefix . '-' . $year . '-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }
}
