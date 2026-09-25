<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    private const SORTABLE = ['name', 'stock', 'selling_price', 'purchase_price', 'created_at', 'id'];

    public function __construct(private StockService $stock)
    {
    }

    /**
     * Display a paginated list of products
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category:id,name', 'supplier:id,name']);

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->supplier_id) {
            $query->where('supplier_id', $request->supplier_id);
        }

        match ($request->stock_status) {
            'in_stock' => $query->whereColumn('stock', '>', 'alert_threshold'),
            'low_stock' => $query->lowStock(),
            'out_of_stock' => $query->outOfStock(),
            'alert' => $query->whereColumn('stock', '<=', 'alert_threshold'),
            default => null,
        };

        $sort = in_array($request->sort, self::SORTABLE, true) ? $request->sort : 'id';
        $direction = $request->direction === 'asc' ? 'asc' : 'desc';

        $products = $query->orderBy($sort, $direction)->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($products);
    }

    /**
     * Store a newly created product
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules() + [
            'reference' => 'nullable|string|max:50|unique:products,reference',
            'stock' => 'nullable|integer|min:0',
        ]);

        $product = DB::transaction(function () use ($validated, $request) {
            $initialStock = (int) ($validated['stock'] ?? 0);

            $product = Product::create([
                ...$validated,
                'reference' => ($validated['reference'] ?? null) ?: $this->nextReference(),
                'stock' => 0,
            ]);

            if ($initialStock > 0) {
                $this->stock->move($product, $initialStock, 'initial', $request->user()->id, $product->reference, 'Stock initial');
            }

            return $product;
        });

        return response()->json([
            'product' => $product->fresh(['category', 'supplier']),
            'message' => 'Produit créé avec succès'
        ], 201);
    }

    /**
     * Display the specified product with its recent history
     */
    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'supplier']);

        $sales = DB::table('sale_items')
            ->where('product_id', $product->id)
            ->selectRaw('COALESCE(SUM(quantity),0) as quantity, COALESCE(SUM(subtotal),0) as revenue')
            ->first();

        return response()->json([
            'product' => $product,
            'stats' => [
                'quantity_sold' => (int) $sales->quantity,
                'revenue' => (float) $sales->revenue,
            ],
            'movements' => $product->stockMovements()->with('user:id,name')->latest()->limit(30)->get(),
        ]);
    }

    /**
     * Update the specified product. Stock is changed through adjustments only.
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate($this->rules(partial: true) + [
            'reference' => 'sometimes|string|max:50|unique:products,reference,' . $product->id,
        ]);

        $product->update($validated);

        return response()->json([
            'product' => $product->fresh(['category', 'supplier']),
            'message' => 'Produit mis à jour avec succès'
        ]);
    }

    /**
     * Manual stock correction (inventory count, breakage, loss…)
     */
    public function adjustStock(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'mode' => 'required|in:add,remove,set',
            'quantity' => 'required|integer|min:0',
            'note' => 'required|string|max:255',
        ], [
            'note.required' => 'Indiquez le motif de l\'ajustement.',
        ]);

        $delta = match ($validated['mode']) {
            'add' => $validated['quantity'],
            'remove' => -$validated['quantity'],
            'set' => $validated['quantity'] - $product->stock,
        };

        if ($delta === 0) {
            return response()->json(['message' => 'Aucun changement de stock.', 'product' => $product], 200);
        }

        DB::transaction(fn () => $this->stock->move(
            $product, $delta, 'adjustment', $request->user()->id, null, $validated['note']
        ));

        return response()->json([
            'product' => $product->fresh(['category', 'supplier']),
            'message' => 'Stock ajusté avec succès'
        ]);
    }

    /**
     * Remove the specified product
     */
    public function destroy(Product $product): JsonResponse
    {
        if ($product->saleItems()->exists() || $product->purchaseItems()->exists()) {
            return response()->json([
                'message' => 'Ce produit figure dans des ventes ou des achats : il ne peut pas être supprimé.'
            ], 422);
        }

        $product->delete();

        return response()->json([
            'message' => 'Produit supprimé avec succès'
        ]);
    }

    /**
     * Products for the point of sale (minimal data)
     */
    public function forSale(Request $request): JsonResponse
    {
        $query = Product::with('category:id,name')
            ->select(['id', 'name', 'reference', 'unit', 'selling_price', 'purchase_price', 'stock', 'alert_threshold', 'category_id']);

        if (!$request->boolean('include_out_of_stock')) {
            $query->where('stock', '>', 0);
        }

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->orderBy('name')->limit(min((int) ($request->limit ?? 60), 200))->get());
    }

    private function rules(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'name' => "$req|string|max:255",
            'unit' => 'nullable|string|max:20',
            'category_id' => "$req|exists:categories,id",
            'supplier_id' => 'nullable|exists:suppliers,id',
            'purchase_price' => "$req|numeric|min:0",
            'selling_price' => "$req|numeric|min:0",
            'alert_threshold' => "$req|integer|min:0",
            'description' => 'nullable|string|max:2000',
        ];
    }

    private function nextReference(): string
    {
        $next = (Product::max('id') ?? 0) + 1;

        do {
            $reference = 'PRD-' . str_pad((string) $next++, 5, '0', STR_PAD_LEFT);
        } while (Product::where('reference', $reference)->exists());

        return $reference;
    }
}
