<?php

namespace App\Http\Controllers\Api;

use App\Exports\SalesExport;
use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use App\Models\Setting;
use App\Services\SaleService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;

class SaleController extends Controller
{
    private const INVOICE_FORMATS = ['ticket', 'a5', 'a4'];

    public function __construct(private SaleService $sales)
    {
    }

    /**
     * Display a paginated list of sales
     */
    public function index(Request $request): JsonResponse
    {
        $sales = $this->filteredQuery($request)
            ->with(['client:id,name,phone', 'user:id,name'])
            ->withCount('items')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($sales);
    }

    /**
     * Totals for the current filters (shown above the sales list)
     */
    public function summary(Request $request): JsonResponse
    {
        $row = $this->filteredQuery($request)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total - returned_amount),0) as total, COALESCE(SUM(paid_amount),0) as paid')
            ->first();

        return response()->json([
            'count' => (int) $row->count,
            'total' => (float) $row->total,
            'paid' => (float) $row->paid,
            'remaining' => max(0, (float) $row->total - (float) $row->paid),
        ]);
    }

    /**
     * Store a newly created sale
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|distinct|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_method' => ['nullable', Rule::in(SalePayment::METHODS)],
        ], [
            'items.required' => 'Ajoutez au moins un produit à la vente.',
            'items.*.product_id.distinct' => 'Un même produit ne peut apparaître qu\'une fois dans la vente.',
        ]);

        $sale = $this->sales->create($validated, $request->user()->id);

        return response()->json([
            'sale' => $this->loadDetails($sale),
            'message' => 'Vente enregistrée avec succès'
        ], 201);
    }

    /**
     * Display the specified sale
     */
    public function show(Sale $sale): JsonResponse
    {
        return response()->json([
            'sale' => $this->loadDetails($sale)
        ]);
    }

    /**
     * Update client / notes of a sale. Amounts are changed through payments only.
     */
    public function update(Request $request, Sale $sale): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        $sale->update($validated);

        return response()->json([
            'sale' => $this->loadDetails($sale),
            'message' => 'Vente mise à jour avec succès'
        ]);
    }

    /**
     * Record a new payment (installment) for a sale
     */
    public function addPayment(Request $request, Sale $sale): JsonResponse
    {
        $remaining = $sale->remaining_amount;

        if ($remaining <= 0) {
            throw ValidationException::withMessages(['amount' => ['Cette vente est déjà entièrement payée.']]);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:' . $remaining],
            'method' => ['required', Rule::in(SalePayment::METHODS)],
            'note' => 'nullable|string|max:255',
        ], [
            'amount.max' => 'Le montant ne peut pas dépasser le reste à payer (' . number_format($remaining, 0, ',', ' ') . ').',
        ]);

        DB::transaction(function () use ($sale, $validated, $request) {
            $sale->payments()->create([
                ...$validated,
                'user_id' => $request->user()->id,
            ]);
            $sale->refreshPaymentStatus();
        });

        return response()->json([
            'sale' => $this->loadDetails($sale),
            'message' => 'Paiement enregistré'
        ]);
    }

    /**
     * Remove a payment recorded by mistake (admin only)
     */
    public function deletePayment(Sale $sale, SalePayment $payment): JsonResponse
    {
        abort_unless($payment->sale_id === $sale->id, 404);

        DB::transaction(function () use ($sale, $payment) {
            $payment->delete();
            $sale->refreshPaymentStatus();
        });

        return response()->json([
            'sale' => $this->loadDetails($sale),
            'message' => 'Paiement supprimé, le reste à payer a été recalculé'
        ]);
    }

    /**
     * Partial return of a sale: restock, credit note and refund if needed
     */
    public function storeReturn(Request $request, Sale $sale): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.sale_item_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:0',
            'reason' => 'nullable|string|max:255',
            'refund_method' => ['nullable', Rule::in(SalePayment::METHODS)],
        ]);

        $saleReturn = $this->sales->createReturn(
            $sale,
            $validated['items'],
            $request->user()->id,
            $validated['reason'] ?? null,
            $validated['refund_method'] ?? 'cash',
        );

        $message = 'Avoir ' . $saleReturn->number . ' enregistré';
        if ((float) $saleReturn->refund_amount > 0) {
            $message .= ' : rendre ' . number_format((float) $saleReturn->refund_amount, 0, ',', ' ') . ' ' . Setting::get('currency') . ' au client';
        }

        return response()->json([
            'sale' => $this->loadDetails($sale->fresh()),
            'return' => $saleReturn->load('items.product:id,name,reference,unit'),
            'message' => $message,
        ], 201);
    }

    /**
     * Credit note PDF
     */
    public function returnPdf(Request $request, Sale $sale, SaleReturn $saleReturn)
    {
        abort_unless($saleReturn->sale_id === $sale->id, 404);

        $settings = Setting::allValues();
        $saleReturn->load(['items.product:id,name,reference,unit', 'user:id,name', 'sale.client']);
        $pdf = Pdf::loadView('invoices.credit-note', ['return' => $saleReturn, 'settings' => $settings]);

        if ($settings['invoice_format'] === 'ticket') {
            $height = 135 / 25.4 * 72 + $saleReturn->items->count() * 26;
            $pdf->setPaper([0, 0, 80 / 25.4 * 72, $height]);
        } else {
            $pdf->setPaper('a5');
        }

        return $pdf->download('avoir-' . $saleReturn->number . '.pdf');
    }

    /**
     * Cancel a sale: restore stock and delete it
     */
    public function destroy(Request $request, Sale $sale): JsonResponse
    {
        $this->sales->cancel($sale, $request->user()->id);

        return response()->json([
            'message' => 'Vente annulée, le stock a été restauré'
        ]);
    }

    /**
     * Generate the invoice PDF: 80 mm receipt ("ticket"), A5 or A4.
     * The format comes from ?format=… or the "invoice_format" setting.
     */
    public function generatePdf(Request $request, Sale $sale)
    {
        $settings = Setting::allValues();
        $format = in_array($request->input('format'), self::INVOICE_FORMATS, true) ? $request->input('format') : $settings['invoice_format'];
        $sale = $this->loadDetails($sale);

        if ($format === 'ticket') {
            // 80 mm wide roll; height grows with the content so the receipt is never cut
            $width = 80 / 25.4 * 72;
            $height = 165 / 25.4 * 72 + $sale->items->count() * 26 + $sale->payments->count() * 11
                + ($sale->notes ? 30 : 0) + ($sale->returns->isNotEmpty() ? 30 : 0);
            $pdf = Pdf::loadView('invoices.ticket', compact('sale', 'settings'))->setPaper([0, 0, $width, $height]);
        } else {
            $pdf = Pdf::loadView('invoices.sale', ['sale' => $sale, 'settings' => $settings, 'paper' => $format])->setPaper($format);
        }

        $filename = ($format === 'ticket' ? 'ticket-' : 'facture-') . $sale->invoice_number . '.pdf';

        return $request->boolean('inline') ? $pdf->stream($filename) : $pdf->download($filename);
    }

    /**
     * Export the filtered sales list to Excel
     */
    public function exportExcel(Request $request)
    {
        $sales = $this->filteredQuery($request)->with(['client', 'user'])->orderByDesc('created_at')->get();

        return Excel::download(new SalesExport($sales), 'ventes-' . now()->format('Y-m-d') . '.xlsx');
    }

    /**
     * Export the filtered sales list to PDF
     */
    public function exportPdf(Request $request)
    {
        $sales = $this->filteredQuery($request)->with(['client', 'user'])->orderByDesc('created_at')->get();

        $pdf = Pdf::loadView('reports.sales', [
            'sales' => $sales,
            'settings' => Setting::allValues(),
            'filters' => $request->only(['start_date', 'end_date', 'status']),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('ventes-' . now()->format('Y-m-d') . '.pdf');
    }

    private function filteredQuery(Request $request): Builder
    {
        $query = Sale::query();

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        $status = $request->status ?? $request->filter;
        if ($status === 'due') {
            $query->where('status', '!=', 'paid');
        } elseif ($status === 'returned') {
            $query->where('returned_amount', '>', 0);
        } elseif ($status) {
            $query->where('status', $status);
        }
        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        return $query;
    }

    private function loadDetails(Sale $sale): Sale
    {
        $sale->load([
            'client',
            'user:id,name',
            'items.product:id,name,reference,unit',
            'payments.user:id,name',
            'returns.user:id,name',
            'returns.items.product:id,name',
        ]);

        $sale->items->each(function ($item) {
            $item->product_name = $item->product?->name ?? 'Produit supprimé';
        });

        return $sale;
    }
}
