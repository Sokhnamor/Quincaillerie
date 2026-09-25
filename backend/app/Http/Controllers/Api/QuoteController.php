<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Quote;
use App\Models\SalePayment;
use App\Models\Setting;
use App\Services\SaleService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Quotes / pro forma invoices: no stock impact until converted into a sale
 */
class QuoteController extends Controller
{
    public function __construct(private SaleService $sales)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Quote::with(['client:id,name,phone', 'user:id,name'])->withCount('items');

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('number', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%")
                  ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->status === 'expired') {
            $query->whereNotIn('status', ['converted', 'rejected'])->whereDate('valid_until', '<', now()->toDateString());
        } elseif ($request->status) {
            $query->where('status', $request->status);
        }

        return response()->json(
            $query->orderByDesc('created_at')->orderByDesc('id')->paginate(min((int) ($request->per_page ?? 15), 100))
        );
    }

    public function show(Quote $quote): JsonResponse
    {
        return response()->json(['quote' => $this->loadDetails($quote)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateQuote($request);

        $quote = DB::transaction(function () use ($validated, $request) {
            $quote = Quote::create([
                ...$this->header($validated),
                'number' => 'TMP-' . uniqid('', true),
                'user_id' => $request->user()->id,
                'status' => $validated['status'] ?? 'draft',
            ]);
            $quote->update(['number' => 'DEV-' . $quote->created_at->format('Y') . '-' . str_pad((string) $quote->id, 6, '0', STR_PAD_LEFT)]);
            $this->syncItems($quote, $validated['items']);

            return $quote;
        });

        return response()->json(['quote' => $this->loadDetails($quote), 'message' => 'Devis ' . $quote->number . ' créé'], 201);
    }

    public function update(Request $request, Quote $quote): JsonResponse
    {
        $this->assertEditable($quote);

        // Status-only change (sent, accepted, rejected…)
        if ($request->keys() === ['status']) {
            $request->validate(['status' => ['required', Rule::in(['draft', 'sent', 'accepted', 'rejected'])]]);
            $quote->update(['status' => $request->status]);

            return response()->json(['quote' => $this->loadDetails($quote), 'message' => 'Statut du devis mis à jour']);
        }

        $validated = $this->validateQuote($request);

        DB::transaction(function () use ($quote, $validated) {
            $quote->update([...$this->header($validated), 'status' => $validated['status'] ?? $quote->status]);
            $this->syncItems($quote, $validated['items']);
        });

        return response()->json(['quote' => $this->loadDetails($quote), 'message' => 'Devis mis à jour']);
    }

    public function destroy(Quote $quote): JsonResponse
    {
        $this->assertEditable($quote);
        $quote->delete();

        return response()->json(['message' => 'Devis supprimé']);
    }

    /**
     * Turn an accepted quote into a real sale (stock is taken out at that moment)
     */
    public function convert(Request $request, Quote $quote): JsonResponse
    {
        $this->assertEditable($quote);

        $validated = $request->validate([
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_method' => ['nullable', Rule::in(SalePayment::METHODS)],
        ]);

        $quote->load('items');
        $lines = $quote->items->whereNotNull('product_id');
        if ($lines->count() !== $quote->items->count()) {
            throw ValidationException::withMessages([
                'items' => ['Certaines lignes du devis ne correspondent plus à un produit du catalogue. Modifiez le devis avant de le convertir.'],
            ]);
        }

        $sale = DB::transaction(function () use ($quote, $lines, $validated, $request) {
            $sale = $this->sales->create([
                'client_id' => $quote->client_id,
                'items' => $lines->map(fn ($i) => ['product_id' => $i->product_id, 'quantity' => $i->quantity, 'unit_price' => (float) $i->unit_price])->values()->all(),
                'discount' => (float) $quote->discount,
                'paid_amount' => $validated['paid_amount'] ?? null,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'notes' => trim('Issu du devis ' . $quote->number . '. ' . ($quote->notes ?? '')),
            ], $request->user()->id);

            $quote->update(['status' => 'converted', 'sale_id' => $sale->id]);

            return $sale;
        });

        return response()->json([
            'quote' => $this->loadDetails($quote),
            'sale' => $sale->only(['id', 'invoice_number', 'total', 'status']),
            'message' => 'Devis converti en vente ' . $sale->invoice_number,
        ]);
    }

    public function pdf(Request $request, Quote $quote)
    {
        $settings = Setting::allValues();
        // A quote is a document to hand over: never a till receipt
        $paper = in_array($request->input('format'), ['a4', 'a5'], true) ? $request->input('format') : ($settings['invoice_format'] === 'a4' ? 'a4' : 'a5');

        $pdf = Pdf::loadView('invoices.quote', [
            'quote' => $this->loadDetails($quote),
            'settings' => $settings,
            'paper' => $paper,
        ])->setPaper($paper);

        return $pdf->download(($quote->status === 'accepted' ? 'proforma-' : 'devis-') . $quote->number . '.pdf');
    }

    private function validateQuote(Request $request): array
    {
        return $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'nullable|string|max:255',
            'valid_until' => 'nullable|date',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'status' => ['nullable', Rule::in(['draft', 'sent', 'accepted', 'rejected'])],
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.designation' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ], [
            'items.required' => 'Ajoutez au moins une ligne au devis.',
        ]);
    }

    /** Totals are recomputed server-side with the current VAT rate */
    private function header(array $validated): array
    {
        $subtotal = collect($validated['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);
        $taxRate = Setting::taxRate();
        $taxAmount = round($subtotal * $taxRate / 100, 2);
        $discount = (float) ($validated['discount'] ?? 0);

        if ($discount > $subtotal + $taxAmount) {
            throw ValidationException::withMessages(['discount' => ['La remise ne peut pas dépasser le montant du devis.']]);
        }

        return [
            'client_id' => $validated['client_id'] ?? null,
            'client_name' => $validated['client_name'] ?? null,
            'valid_until' => $validated['valid_until'] ?? now()->addDays(15)->toDateString(),
            'notes' => $validated['notes'] ?? null,
            'subtotal' => $subtotal,
            'tax_rate' => $taxRate,
            'tax_amount' => $taxAmount,
            'discount' => $discount,
            'total' => round($subtotal + $taxAmount - $discount, 2),
        ];
    }

    private function syncItems(Quote $quote, array $items): void
    {
        $quote->items()->delete();
        $names = Product::whereIn('id', collect($items)->pluck('product_id')->filter())->pluck('name', 'id');

        foreach ($items as $item) {
            $designation = ($item['designation'] ?? null) ?: ($names[$item['product_id'] ?? 0] ?? null);
            if (!$designation) {
                throw ValidationException::withMessages(['items' => ['Chaque ligne doit avoir un produit ou une désignation.']]);
            }
            $quote->items()->create([
                'product_id' => $item['product_id'] ?? null,
                'designation' => $designation,
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'subtotal' => $item['quantity'] * $item['unit_price'],
            ]);
        }
    }

    private function assertEditable(Quote $quote): void
    {
        if ($quote->status === 'converted') {
            throw ValidationException::withMessages(['quote' => ['Ce devis a déjà été converti en vente : il ne peut plus être modifié.']]);
        }
    }

    private function loadDetails(Quote $quote): Quote
    {
        return $quote->load(['client', 'user:id,name', 'items.product:id,name,reference,unit,stock', 'sale:id,invoice_number']);
    }
}
