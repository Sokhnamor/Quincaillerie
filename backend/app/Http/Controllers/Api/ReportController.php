<?php

namespace App\Http\Controllers\Api;

use App\Exports\ReportExport;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SalePayment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Business reports over a period
 */
class ReportController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        return response()->json($this->build($request));
    }

    public function export(Request $request)
    {
        $report = $this->build($request);

        return Excel::download(new ReportExport($report), "rapport-{$report['period']['start']}-au-{$report['period']['end']}.xlsx");
    }

    private function build(Request $request): array
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $start = Carbon::parse($request->input('start_date', now()->startOfMonth()->toDateString()))->startOfDay();
        $end = Carbon::parse($request->input('end_date', now()->toDateString()))->endOfDay();
        $range = [$start, $end];

        $sales = Sale::whereBetween('created_at', $range)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(returned_amount),0) as returned,
                         COALESCE(SUM(discount),0) as discount, COALESCE(SUM(tax_amount),0) as tax, COALESCE(SUM(paid_amount),0) as paid')
            ->first();
        $net = (float) $sales->total - (float) $sales->returned;

        // Net quantities (after returns) joined with current purchase prices
        $lines = fn () => DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereBetween('sales.created_at', $range);

        $qtyExpr = '(sale_items.quantity - sale_items.returned_quantity)';
        $margin = (float) $lines()->selectRaw("COALESCE(SUM((sale_items.unit_price - products.purchase_price) * {$qtyExpr}),0) as m")->value('m');

        $products = $lines()
            ->select('products.id', 'products.name', 'products.reference')
            ->selectRaw("SUM({$qtyExpr}) as quantity, SUM(sale_items.unit_price * {$qtyExpr}) as revenue,
                         SUM((sale_items.unit_price - products.purchase_price) * {$qtyExpr}) as margin")
            ->groupBy('products.id', 'products.name', 'products.reference')
            ->orderByDesc('revenue')
            ->get();

        $categories = $lines()
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.name as category')
            ->selectRaw("SUM({$qtyExpr}) as quantity, SUM(sale_items.unit_price * {$qtyExpr}) as revenue,
                         SUM((sale_items.unit_price - products.purchase_price) * {$qtyExpr}) as margin")
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        $sellers = Sale::whereBetween('sales.created_at', $range)
            ->join('users', 'sales.user_id', '=', 'users.id')
            ->select('users.name')
            ->selectRaw('COUNT(*) as count, SUM(sales.total - sales.returned_amount) as revenue')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('revenue')
            ->get();

        $methods = SalePayment::whereBetween('created_at', $range)
            ->select('method')
            ->selectRaw('SUM(amount) as total, COUNT(*) as count')
            ->groupBy('method')
            ->orderByDesc('total')
            ->get();

        // Day by day (grouped in PHP to stay database-agnostic)
        $daily = [];
        for ($d = $start->copy(); $d <= $end; $d->addDay()) {
            $daily[$d->toDateString()] = ['date' => $d->toDateString(), 'count' => 0, 'revenue' => 0.0];
        }
        foreach (Sale::whereBetween('created_at', $range)->get(['total', 'returned_amount', 'created_at']) as $sale) {
            $key = $sale->created_at->toDateString();
            if (isset($daily[$key])) {
                $daily[$key]['count']++;
                $daily[$key]['revenue'] += $sale->net_total;
            }
        }

        // Stock that did not move during the period
        $soldIds = $products->pluck('id');
        $sleeping = Product::where('stock', '>', 0)
            ->whereNotIn('id', $soldIds)
            ->orderByRaw('stock * purchase_price DESC')
            ->limit(15)
            ->get(['id', 'name', 'reference', 'unit', 'stock', 'purchase_price'])
            ->map(fn ($p) => [...$p->only(['id', 'name', 'reference', 'unit', 'stock']), 'value' => round($p->stock * (float) $p->purchase_price, 2)]);

        return [
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'totals' => [
                'sales_count' => (int) $sales->count,
                'gross_revenue' => (float) $sales->total,
                'returns' => (float) $sales->returned,
                'net_revenue' => $net,
                'discounts' => (float) $sales->discount,
                'tax' => (float) $sales->tax,
                'collected' => (float) $methods->sum('total'),
                'unpaid' => max(0, $net - (float) $sales->paid),
                'margin' => $margin,
                'margin_rate' => $net > 0 ? round($margin / max(1, $net - (float) $sales->tax) * 100, 1) : 0,
                'average_basket' => (int) $sales->count > 0 ? round($net / (int) $sales->count) : 0,
            ],
            'daily' => array_values($daily),
            'by_seller' => $sellers,
            'by_payment_method' => $methods,
            'by_category' => $categories,
            'top_products' => $products->take(10)->values(),
            'products' => $products,
            'sleeping_products' => $sleeping,
        ];
    }
}
