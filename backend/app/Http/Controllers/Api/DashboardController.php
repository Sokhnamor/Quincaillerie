<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SalePayment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * All dashboard data in one call
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'stats' => $this->statsData(),
            'charts' => $this->chartsData(),
            'recent_sales' => $this->recentSalesData(),
            'alerts' => $this->alertsData(),
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json($this->statsData());
    }

    public function charts(): JsonResponse
    {
        return response()->json($this->chartsData());
    }

    public function recentSales(): JsonResponse
    {
        return response()->json(['sales' => $this->recentSalesData()]);
    }

    public function alerts(): JsonResponse
    {
        return response()->json($this->alertsData());
    }

    private function statsData(): array
    {
        $now = now();
        $today = $now->copy()->startOfDay();
        $yesterday = $today->copy()->subDay();
        $monthStart = $now->copy()->startOfMonth();
        $lastMonthStart = $monthStart->copy()->subMonth();
        // Same point in the previous month, for a fair month-to-date comparison
        $lastMonthSameDay = $lastMonthStart->copy()->addDays($now->day - 1)->setTimeFrom($now)->min($monthStart);

        $revenue = fn (Carbon $from, Carbon $to) => (float) Sale::whereBetween('created_at', [$from, $to])->sum('total');

        $todayRevenue = $revenue($today, $now);
        $yesterdayRevenue = $revenue($yesterday, $today->copy()->subSecond());
        $monthRevenue = $revenue($monthStart, $now);
        $lastMonthRevenue = $revenue($lastMonthStart, $lastMonthSameDay);

        $receivables = Sale::where('status', '!=', 'paid')
            ->selectRaw('COALESCE(SUM(total - paid_amount),0) as due, COUNT(*) as count')
            ->first();

        $monthMargin = (float) DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.created_at', '>=', $monthStart)
            ->selectRaw('COALESCE(SUM((sale_items.unit_price - products.purchase_price) * sale_items.quantity),0) as margin')
            ->value('margin');

        return [
            'today_sales' => $todayRevenue,
            'today_sales_count' => Sale::where('created_at', '>=', $today)->count(),
            'sales_growth' => $this->growth($todayRevenue, $yesterdayRevenue),
            'month_sales' => $monthRevenue,
            'month_sales_growth' => $this->growth($monthRevenue, $lastMonthRevenue),
            'month_collected' => (float) SalePayment::where('created_at', '>=', $monthStart)->sum('amount'),
            'month_purchases' => (float) Purchase::where('created_at', '>=', $monthStart)->sum('total'),
            'month_margin' => $monthMargin,
            'receivables' => (float) $receivables->due,
            'receivables_count' => (int) $receivables->count,
            'stock_value' => (float) (Product::where('stock', '>', 0)->selectRaw('SUM(stock * purchase_price) as v')->value('v') ?? 0),
            'stock_retail_value' => (float) (Product::where('stock', '>', 0)->selectRaw('SUM(stock * selling_price) as v')->value('v') ?? 0),
            'products_count' => Product::count(),
            'clients_count' => Client::count(),
            'low_stock_count' => Product::lowStock()->count(),
            'out_of_stock_count' => Product::outOfStock()->count(),
        ];
    }

    private function chartsData(): array
    {
        // Last 12 months (grouped in PHP to stay database-agnostic)
        $from = now()->startOfMonth()->subMonths(11);
        $sales = Sale::where('created_at', '>=', $from)->get(['total', 'created_at']);
        $payments = SalePayment::where('created_at', '>=', $from)->get(['amount', 'created_at']);

        $monthly = [];
        for ($m = $from->copy(); $m <= now(); $m->addMonth()) {
            $key = $m->format('Y-m');
            $monthly[$key] = [
                'month' => $key,
                'label' => ucfirst($m->locale('fr')->translatedFormat('M Y')),
                'total' => 0.0,
                'collected' => 0.0,
                'count' => 0,
            ];
        }
        foreach ($sales as $sale) {
            $key = $sale->created_at->format('Y-m');
            if (isset($monthly[$key])) {
                $monthly[$key]['total'] += (float) $sale->total;
                $monthly[$key]['count']++;
            }
        }
        foreach ($payments as $payment) {
            $key = $payment->created_at->format('Y-m');
            if (isset($monthly[$key])) {
                $monthly[$key]['collected'] += (float) $payment->amount;
            }
        }

        // Last 30 days
        $dayFrom = now()->startOfDay()->subDays(29);
        $daily = [];
        for ($d = $dayFrom->copy(); $d <= now(); $d->addDay()) {
            $daily[$d->format('Y-m-d')] = ['date' => $d->format('Y-m-d'), 'label' => $d->format('d/m'), 'total' => 0.0, 'count' => 0];
        }
        foreach ($sales->where('created_at', '>=', $dayFrom) as $sale) {
            $key = $sale->created_at->format('Y-m-d');
            if (isset($daily[$key])) {
                $daily[$key]['total'] += (float) $sale->total;
                $daily[$key]['count']++;
            }
        }

        $salesByCategory = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', now()->subMonths(6))
            ->select('categories.name as category', DB::raw('SUM(sale_items.subtotal) as total'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total')
            ->limit(6)
            ->get();

        $topProducts = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', now()->subDays(30))
            ->select(
                'products.id',
                'products.name',
                'products.reference',
                DB::raw('SUM(sale_items.quantity) as quantity_sold'),
                DB::raw('SUM(sale_items.subtotal) as total_sales')
            )
            ->groupBy('products.id', 'products.name', 'products.reference')
            ->orderByDesc('quantity_sold')
            ->limit(5)
            ->get();

        $paymentMethods = SalePayment::where('created_at', '>=', now()->startOfMonth())
            ->select('method', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('method')
            ->orderByDesc('total')
            ->get();

        return [
            'monthly_sales' => array_values($monthly),
            'daily_sales' => array_values($daily),
            'sales_by_category' => $salesByCategory,
            'top_products' => $topProducts,
            'payment_methods' => $paymentMethods,
        ];
    }

    private function recentSalesData(): array
    {
        return Sale::with('client:id,name')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn ($sale) => [
                'id' => $sale->id,
                'invoice_number' => $sale->invoice_number,
                'client_name' => $sale->client?->name ?? 'Client comptoir',
                'total' => (float) $sale->total,
                'remaining_amount' => $sale->remaining_amount,
                'status' => $sale->status,
                'created_at' => $sale->created_at,
            ])
            ->all();
    }

    private function alertsData(): array
    {
        $columns = ['id', 'name', 'reference', 'unit', 'stock', 'alert_threshold', 'category_id', 'supplier_id'];

        return [
            'low_stock' => Product::with('category:id,name')->lowStock()->orderBy('stock')->limit(10)->get($columns),
            'out_of_stock' => Product::with('category:id,name')->outOfStock()->orderBy('name')->limit(10)->get($columns),
        ];
    }

    private function growth(float $current, float $previous): float
    {
        if ($previous > 0) {
            return round(($current - $previous) / $previous * 100, 1);
        }

        return $current > 0 ? 100.0 : 0.0;
    }
}
