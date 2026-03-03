<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function stats(): JsonResponse
    {
        $today = now()->startOfDay();
        $yesterday = now()->subDay()->startOfDay();
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();
        $startOfLastMonth = now()->subMonth()->startOfMonth();
        $endOfLastMonth = now()->subMonth()->endOfMonth();

        // Ventes du jour
        $todaySales = Sale::whereDate('created_at', $today)
            ->where('status', 'paid')
            ->sum('total');

        // Ventes d'hier
        $yesterdaySales = Sale::whereDate('created_at', $yesterday)
            ->where('status', 'paid')
            ->sum('total');

        // Croissance des ventes
        $salesGrowth = 0;
        if ($yesterdaySales > 0) {
            $salesGrowth = round((($todaySales - $yesterdaySales) / $yesterdaySales) * 100, 1);
        } elseif ($todaySales > 0) {
            $salesGrowth = 100;
        }

        // Achats du mois
        $monthPurchases = Purchase::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->where('status', 'completed')
            ->sum('total');

        // Achats du mois dernier
        $lastMonthPurchases = Purchase::whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
            ->where('status', 'completed')
            ->sum('total');

        // Croissance des achats
        $purchasesGrowth = 0;
        if ($lastMonthPurchases > 0) {
            $purchasesGrowth = round((($monthPurchases - $lastMonthPurchases) / $lastMonthPurchases) * 100, 1);
        } elseif ($monthPurchases > 0) {
            $purchasesGrowth = 100;
        }

        // Valeur du stock
        $stockValue = Product::selectRaw('SUM(stock * selling_price) as total')
            ->value('total') ?? 0;

        // Articles en stock faible
        $lowStockProducts = Product::whereColumn('stock', '<=', 'alert_threshold')
            ->where('stock', '>', 0)
            ->count();

        // Articles en rupture de stock
        $outOfStockProducts = Product::where('stock', '<=', 0)->count();

        return response()->json([
            'today_sales' => $todaySales,
            'month_purchases' => $monthPurchases,
            'stock_value' => $stockValue,
            'low_stock_count' => $lowStockProducts,
            'out_of_stock_count' => $outOfStockProducts,
            'sales_growth' => $salesGrowth,
            'purchases_growth' => $purchasesGrowth,
        ]);
    }

    /**
     * Get chart data
     */
    public function charts(): JsonResponse
    {
        // Ventes par catégorie (6 derniers mois)
        $salesByCategory = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', now()->subMonths(6))
            ->where('sales.status', 'paid')
            ->select(
                'categories.name as category',
                DB::raw('SUM(sale_items.subtotal) as total')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total')
            ->limit(6)
            ->get();

        // Ventes mensuelles (6 derniers mois)
        $monthlySales = Sale::where('created_at', '>=', now()->subMonths(6))
            ->where('status', 'paid')
            ->select(
                DB::raw('MONTH(created_at) as month'),
                DB::raw('YEAR(created_at) as year'),
                DB::raw('SUM(total) as total')
            )
            ->groupBy('month', 'year')
            ->orderBy('year')
            ->orderBy('month')
            ->get();

        // Top produits vendus
        $topProducts = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', now()->subDays(30))
            ->where('sales.status', 'paid')
            ->select(
                'products.name',
                'products.reference',
                DB::raw('SUM(sale_items.quantity) as quantity_sold'),
                DB::raw('SUM(sale_items.subtotal) as total_sales')
            )
            ->groupBy('products.id', 'products.name', 'products.reference')
            ->orderByDesc('quantity_sold')
            ->limit(5)
            ->get();

        return response()->json([
            'sales_by_category' => $salesByCategory,
            'monthly_sales' => $monthlySales,
            'top_products' => $topProducts,
        ]);
    }

    /**
     * Get recent sales
     */
    public function recentSales(): JsonResponse
    {
        $sales = Sale::with(['client', 'user'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'client_name' => $sale->client ? $sale->client->name : 'Client inconnu',
                    'total' => $sale->total,
                    'status' => $sale->status,
                    'created_at' => $sale->created_at,
                    'client' => $sale->client,
                ];
            });

        return response()->json([
            'sales' => $sales
        ]);
    }

    /**
     * Get recent purchases
     */
    public function recentPurchases(): JsonResponse
    {
        $purchases = Purchase::with(['supplier', 'user'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'purchases' => $purchases
        ]);
    }

    /**
     * Get stock alerts
     */
    public function alerts(): JsonResponse
    {
        // Stock faible
        $lowStock = Product::with('category')
            ->whereColumn('stock', '<=', 'alert_threshold')
            ->where('stock', '>', 0)
            ->orderBy('stock')
            ->limit(10)
            ->get();

        // Rupture de stock
        $outOfStock = Product::with('category')
            ->where('stock', '<=', 0)
            ->orderBy('name')
            ->limit(10)
            ->get();

        return response()->json([
            'low_stock' => $lowStock,
            'out_of_stock' => $outOfStock,
        ]);
    }

    /**
     * Get all dashboard data
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'stats' => $this->stats()->getData(),
            'charts' => $this->charts()->getData(),
            'recent_sales' => $this->recentSales()->getData()->sales,
            'recent_purchases' => $this->recentPurchases()->getData()->purchases,
            'alerts' => $this->alerts()->getData(),
        ]);
    }
}
