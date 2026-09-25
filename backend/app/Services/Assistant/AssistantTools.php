<?php

namespace App\Services\Assistant;

use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Read-only business data the assistant can use.
 * Shared by every assistant driver (rules today, an LLM tomorrow) so answers
 * always come from the same queries and the same role restrictions.
 */
class AssistantTools
{
    public function __construct(private User $user)
    {
    }

    public function canManage(): bool
    {
        return $this->user->hasRole('admin', 'gestionnaire');
    }

    /** Products at or under their alert threshold, with a suggested order quantity */
    public function restockSuggestions(int $limit = 15): array
    {
        $since = now()->subDays(30);
        $sold = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', $since)
            ->groupBy('sale_items.product_id')
            ->selectRaw('sale_items.product_id, SUM(sale_items.quantity - sale_items.returned_quantity) as qty')
            ->pluck('qty', 'product_id');

        return Product::with('supplier:id,name')
            ->whereColumn('stock', '<=', 'alert_threshold')
            ->orderBy('stock')
            ->limit($limit)
            ->get()
            ->map(function (Product $p) use ($sold) {
                $monthly = (int) ($sold[$p->id] ?? 0);
                // Enough for ~a month of sales, and at least twice the alert threshold
                $target = max($p->alert_threshold * 2, $monthly);
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'reference' => $p->reference,
                    'unit' => $p->unit,
                    'stock' => $p->stock,
                    'threshold' => $p->alert_threshold,
                    'sold_30_days' => $monthly,
                    'suggested_quantity' => max(1, $target - $p->stock),
                    'supplier' => $p->supplier?->name,
                    'estimated_cost' => $this->canManage() ? max(1, $target - $p->stock) * (float) $p->purchase_price : null,
                ];
            })
            ->all();
    }

    /** Sales totals over a period, compared with the previous period of the same length */
    public function salesSummary(Carbon $start, Carbon $end): array
    {
        $current = $this->totals($start, $end);
        $length = $start->diffInSeconds($end);
        $prevEnd = $start->copy()->subSecond();
        $previous = $this->totals($prevEnd->copy()->subSeconds($length), $prevEnd);

        $growth = $previous['net'] > 0 ? round(($current['net'] - $previous['net']) / $previous['net'] * 100, 1) : null;

        return [...$current, 'previous_net' => $previous['net'], 'growth' => $growth];
    }

    private function totals(Carbon $start, Carbon $end): array
    {
        $row = Sale::whereBetween('created_at', [$start, $end])
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total - returned_amount),0) as net, COALESCE(SUM(paid_amount),0) as paid')
            ->first();

        $margin = null;
        if ($this->canManage()) {
            $margin = (float) DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->whereBetween('sales.created_at', [$start, $end])
                ->selectRaw('COALESCE(SUM((sale_items.unit_price - products.purchase_price) * (sale_items.quantity - sale_items.returned_quantity)),0) as m')
                ->value('m');
        }

        return [
            'count' => (int) $row->count,
            'net' => (float) $row->net,
            'collected' => (float) SalePayment::whereBetween('created_at', [$start, $end])->sum('amount'),
            'unpaid' => max(0, (float) $row->net - (float) $row->paid),
            'margin' => $margin,
        ];
    }

    /** Products whose name or reference matches all the given words */
    public function findProducts(array $words, int $limit = 6): array
    {
        $words = array_values(array_filter($words, fn ($w) => mb_strlen($w) >= 3));
        if (!$words) {
            return [];
        }

        $query = Product::with('category:id,name');
        foreach ($words as $word) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$word}%")->orWhere('reference', 'like', "%{$word}%"));
        }
        $products = $query->limit($limit)->get();

        // Fall back to "any word" when requiring all words finds nothing
        if ($products->isEmpty() && count($words) > 1) {
            $query = Product::with('category:id,name');
            $query->where(function ($q) use ($words) {
                foreach ($words as $word) {
                    $q->orWhere('name', 'like', "%{$word}%");
                }
            });
            $products = $query->limit($limit)->get();
        }

        return $products->map(fn (Product $p) => [
            'id' => $p->id,
            'name' => $p->name,
            'reference' => $p->reference,
            'unit' => $p->unit,
            'category' => $p->category?->name,
            'stock' => $p->stock,
            'threshold' => $p->alert_threshold,
            'status' => $p->stock_status,
            'selling_price' => (float) $p->selling_price,
            'wholesale_price' => $p->wholesale_price !== null ? (float) $p->wholesale_price : null,
            'purchase_price' => $this->canManage() ? (float) $p->purchase_price : null,
        ])->all();
    }

    /** Quantity and revenue of one product over a period */
    public function productSales(int $productId, Carbon $start, Carbon $end): array
    {
        $row = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sale_items.product_id', $productId)
            ->whereBetween('sales.created_at', [$start, $end])
            ->selectRaw('COALESCE(SUM(sale_items.quantity - sale_items.returned_quantity),0) as qty,
                         COALESCE(SUM(sale_items.unit_price * (sale_items.quantity - sale_items.returned_quantity)),0) as revenue,
                         COUNT(DISTINCT sales.id) as sales')
            ->first();

        return ['quantity' => (int) $row->qty, 'revenue' => (float) $row->revenue, 'sales' => (int) $row->sales];
    }

    public function topProducts(Carbon $start, Carbon $end, int $limit = 5): array
    {
        return DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereBetween('sales.created_at', [$start, $end])
            ->groupBy('products.id', 'products.name', 'products.unit')
            ->select('products.id', 'products.name', 'products.unit')
            ->selectRaw('SUM(sale_items.quantity - sale_items.returned_quantity) as quantity,
                         SUM(sale_items.unit_price * (sale_items.quantity - sale_items.returned_quantity)) as revenue')
            ->orderByDesc('quantity')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'unit' => $r->unit, 'quantity' => (int) $r->quantity, 'revenue' => (float) $r->revenue])
            ->all();
    }

    /** In stock but not sold for $days days */
    public function sleepingProducts(int $days = 30, int $limit = 8): array
    {
        $sold = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.created_at', '>=', now()->subDays($days))
            ->distinct()
            ->pluck('sale_items.product_id');

        return Product::where('stock', '>', 0)
            ->whereNotIn('id', $sold)
            ->orderByRaw('stock * purchase_price DESC')
            ->limit($limit)
            ->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'unit' => $p->unit,
                'stock' => $p->stock,
                'tied_up' => $this->canManage() ? $p->stock * (float) $p->purchase_price : null,
            ])
            ->all();
    }

    /** Clients who owe money, biggest debt first */
    public function debtors(int $limit = 8): array
    {
        $debts = Sale::where('status', '!=', 'paid')->whereNotNull('client_id')
            ->groupBy('client_id')
            ->selectRaw('client_id, SUM(total - returned_amount - paid_amount) as due, COUNT(*) as sales, MIN(created_at) as oldest')
            ->having('due', '>', 0)
            ->orderByDesc('due')
            ->limit($limit)
            ->get();

        $clients = Client::whereIn('id', $debts->pluck('client_id'))->get()->keyBy('id');

        return $debts->map(function ($d) use ($clients) {
            $c = $clients[$d->client_id];
            $limit = $c->credit_limit !== null ? (float) $c->credit_limit : null;
            return [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'due' => (float) $d->due,
                'sales' => (int) $d->sales,
                'oldest' => Carbon::parse($d->oldest)->toDateString(),
                'credit_limit' => $limit,
                'over_limit' => $limit !== null && (float) $d->due > $limit,
            ];
        })->all();
    }

    public function findClient(array $words): ?array
    {
        $words = array_values(array_filter($words, fn ($w) => mb_strlen($w) >= 3));
        if (!$words) {
            return null;
        }
        $query = Client::query();
        foreach ($words as $word) {
            $query->where('name', 'like', "%{$word}%");
        }
        $client = $query->first() ?? Client::where(function ($q) use ($words) {
            foreach ($words as $word) {
                $q->orWhere('name', 'like', "%{$word}%");
            }
        })->first();

        if (!$client) {
            return null;
        }

        return [
            'id' => $client->id,
            'name' => $client->name,
            'phone' => $client->phone,
            'type' => $client->type,
            'due' => $client->balanceDue(),
            'credit_limit' => $client->credit_limit !== null ? (float) $client->credit_limit : null,
            'total_spent' => (float) $client->sales()->sum(DB::raw('total - returned_amount')),
            'sales_count' => $client->sales()->count(),
        ];
    }

    /** Money received today, by payment method */
    public function cashToday(): array
    {
        $rows = SalePayment::whereDate('created_at', today())
            ->groupBy('method')
            ->selectRaw('method, SUM(amount) as total, COUNT(*) as count')
            ->get();

        return [
            'by_method' => $rows->mapWithKeys(fn ($r) => [$r->method => (float) $r->total])->all(),
            'total' => (float) $rows->sum('total'),
            'sales_count' => Sale::whereDate('created_at', today())->count(),
        ];
    }

    /** Things worth telling the user as soon as the assistant opens */
    public function insights(): array
    {
        $insights = [];

        $out = Product::where('stock', '<=', 0)->count();
        $low = Product::whereColumn('stock', '<=', 'alert_threshold')->where('stock', '>', 0)->count();
        if ($out) {
            $insights[] = ['tone' => 'danger', 'icon' => 'fa-ban', 'text' => "{$out} produit(s) en rupture de stock", 'ask' => 'Que dois-je commander ?'];
        }
        if ($low) {
            $insights[] = ['tone' => 'warning', 'icon' => 'fa-triangle-exclamation', 'text' => "{$low} produit(s) sous le seuil d'alerte", 'ask' => 'Que dois-je commander ?'];
        }

        $overLimit = collect($this->debtors(50))->where('over_limit', true)->count();
        if ($overLimit) {
            $insights[] = ['tone' => 'danger', 'icon' => 'fa-hand-holding-dollar', 'text' => "{$overLimit} client(s) au-delà de leur plafond de crédit", 'ask' => 'Qui me doit de l\'argent ?'];
        }

        $expiring = DB::table('quotes')->whereIn('status', ['draft', 'sent', 'accepted'])
            ->whereBetween('valid_until', [today()->toDateString(), today()->addDays(3)->toDateString()])->count();
        if ($expiring) {
            $insights[] = ['tone' => 'info', 'icon' => 'fa-file-signature', 'text' => "{$expiring} devis expire(nt) dans les 3 jours", 'ask' => null, 'link' => '/quotes'];
        }

        $today = $this->totals(today()->startOfDay(), now());
        $insights[] = ['tone' => 'success', 'icon' => 'fa-sack-dollar', 'text' => "{$today['count']} vente(s) aujourd'hui", 'ask' => 'Ventes du jour'];

        return $insights;
    }
}
