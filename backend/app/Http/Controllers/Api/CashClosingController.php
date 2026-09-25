<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashClosing;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * End-of-day cash register closing: what the system expects vs what was counted
 */
class CashClosingController extends Controller
{
    /**
     * Figures of a business day (defaults to today)
     */
    public function summary(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $date = Carbon::parse($request->input('date', now()->toDateString()));

        return response()->json([
            ...$this->figures($date),
            'closings' => CashClosing::with('user:id,name')->whereDate('business_date', $date)->latest()->get(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = CashClosing::with('user:id,name');

        // A cashier only sees his own closings
        if ($request->user()->hasRole('caissier')) {
            $query->where('user_id', $request->user()->id);
        }

        return response()->json($query->orderByDesc('business_date')->orderByDesc('id')->paginate(min((int) $request->input('per_page', 15), 100)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date|before_or_equal:today',
            'counted_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ], [
            'counted_cash.required' => 'Saisissez le montant des espèces comptées dans la caisse.',
        ]);

        $date = Carbon::parse($validated['date'] ?? now()->toDateString());
        $figures = $this->figures($date);
        $counted = round((float) $validated['counted_cash'], 2);

        $closing = CashClosing::create([
            'user_id' => $request->user()->id,
            'business_date' => $date->toDateString(),
            'sales_count' => $figures['sales_count'],
            'sales_total' => $figures['sales_total'],
            'returns_total' => $figures['returns_total'],
            'collected_by_method' => $figures['by_method'],
            'expected_cash' => $figures['expected_cash'],
            'counted_cash' => $counted,
            'difference' => round($counted - $figures['expected_cash'], 2),
            'notes' => $validated['notes'] ?? null,
        ]);

        $diff = (float) $closing->difference;
        $message = $diff == 0.0
            ? 'Caisse clôturée : aucun écart.'
            : 'Caisse clôturée avec un écart de ' . ($diff > 0 ? '+' : '') . number_format($diff, 0, ',', ' ') . '.';

        return response()->json(['closing' => $closing->load('user:id,name'), 'message' => $message], 201);
    }

    private function figures(Carbon $date): array
    {
        $payments = SalePayment::whereDate('created_at', $date)
            ->selectRaw('method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('method')
            ->get();

        $byMethod = $payments->mapWithKeys(fn ($p) => [$p->method => ['total' => round((float) $p->total, 2), 'count' => (int) $p->count]])->all();

        $sales = Sale::whereDate('created_at', $date)->selectRaw('COUNT(*) as count, COALESCE(SUM(total),0) as total')->first();
        $returns = SaleReturn::whereDate('created_at', $date)->selectRaw('COALESCE(SUM(total),0) as total, COALESCE(SUM(refund_amount),0) as refunded')->first();

        return [
            'date' => $date->toDateString(),
            'sales_count' => (int) $sales->count,
            'sales_total' => (float) $sales->total,
            'returns_total' => (float) $returns->total,
            'refunded' => (float) $returns->refunded,
            'by_method' => $byMethod,
            'collected_total' => round($payments->sum(fn ($p) => (float) $p->total), 2),
            'expected_cash' => $byMethod['cash']['total'] ?? 0.0,
        ];
    }
}
