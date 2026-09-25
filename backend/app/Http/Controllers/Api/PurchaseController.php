<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseController extends Controller
{
    public function __construct(private StockService $stock)
    {
    }

    /**
     * Display a paginated list of purchases
     */
    public function index(Request $request): JsonResponse
    {
        $query = Purchase::with(['supplier:id,name', 'user:id,name'])->withCount('items');

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('supplier_reference', 'like', "%{$search}%")
                  ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->supplier_id) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $purchases = $query->orderByDesc('created_at')->orderByDesc('id')
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($purchases);
    }

    /**
     * Record a received purchase (restock): increases stock and updates purchase prices
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'supplier_reference' => 'nullable|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|distinct|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ], [
            'items.required' => 'Ajoutez au moins un produit.',
            'supplier_id.required' => 'Choisissez un fournisseur.',
        ]);

        $purchase = DB::transaction(function () use ($validated, $request) {
            $userId = $request->user()->id;

            $subtotal = collect($validated['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);
            $discount = (float) ($validated['discount'] ?? 0);
            $total = round($subtotal - $discount, 2);

            if ($total < 0) {
                throw ValidationException::withMessages(['discount' => ['La remise ne peut pas dépasser le montant de l\'achat.']]);
            }

            $purchase = Purchase::create([
                'invoice_number' => 'TMP-' . uniqid('', true),
                'supplier_reference' => $validated['supplier_reference'] ?? null,
                'supplier_id' => $validated['supplier_id'],
                'user_id' => $userId,
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount' => $discount,
                'total' => $total,
                'status' => 'received',
                'notes' => $validated['notes'] ?? null,
            ]);

            $purchase->update([
                'invoice_number' => 'ACH-' . $purchase->created_at->format('Y') . '-' . str_pad((string) $purchase->id, 6, '0', STR_PAD_LEFT),
            ]);

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                $purchase->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['quantity'] * $item['unit_price'],
                ]);

                $this->stock->move($product, $item['quantity'], 'purchase', $userId, $purchase->invoice_number);
                $product->update(['purchase_price' => $item['unit_price']]);
            }

            return $purchase;
        });

        return response()->json([
            'purchase' => $purchase->load(['supplier', 'user:id,name', 'items.product:id,name,reference,unit']),
            'message' => 'Approvisionnement enregistré, le stock a été mis à jour'
        ], 201);
    }

    /**
     * Display the specified purchase
     */
    public function show(Purchase $purchase): JsonResponse
    {
        return response()->json([
            'purchase' => $purchase->load(['supplier', 'user:id,name', 'items.product:id,name,reference,unit'])
        ]);
    }

    /**
     * Update notes / supplier reference
     */
    public function update(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'supplier_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $purchase->update($validated);

        return response()->json([
            'purchase' => $purchase->load(['supplier', 'user:id,name', 'items.product:id,name,reference,unit']),
            'message' => 'Achat mis à jour avec succès'
        ]);
    }

    /**
     * Cancel a purchase: remove the received quantities from stock
     */
    public function destroy(Request $request, Purchase $purchase): JsonResponse
    {
        DB::transaction(function () use ($purchase, $request) {
            foreach ($purchase->items()->with('product')->get() as $item) {
                if ($item->product) {
                    // Fails if the goods have already been sold
                    $this->stock->move(
                        $item->product,
                        -$item->quantity,
                        'purchase_cancel',
                        $request->user()->id,
                        $purchase->invoice_number,
                        'Annulation de l\'approvisionnement'
                    );
                }
            }

            $purchase->delete();
        });

        return response()->json([
            'message' => 'Approvisionnement annulé, le stock a été corrigé'
        ]);
    }
}
