<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Display a paginated list of products
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'supplier']);

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if ($request->has('category_id') && $request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by stock status
        if ($request->has('stock_status')) {
            $status = $request->stock_status;
            if ($status === 'in_stock') {
                $query->whereColumn('stock', '>', 'alert_threshold');
            } elseif ($status === 'low_stock') {
                $query->whereColumn('stock', '<=', 'alert_threshold')
                      ->where('stock', '>', 0);
            } elseif ($status === 'out_of_stock') {
                $query->where('stock', '<=', 0);
            }
        }

        $products = $query->orderByDesc('id')->paginate($request->per_page ?? 15);

        return response()->json($products);
    }

    /**
     * Store a newly created product
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'reference' => 'nullable|string|unique:products,reference',
            'category_id' => 'required|exists:categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'alert_threshold' => 'required|integer|min:0',
            'description' => 'nullable|string',
        ]);

        // Auto-generate reference if not provided
        if (empty($validated['reference'])) {
            $validated['reference'] = 'PROD-' . strtoupper(uniqid());
        }

        $product = Product::create($validated);

        return response()->json([
            'product' => $product->load(['category', 'supplier']),
            'message' => 'Produit créé avec succès'
        ], 201);
    }

    /**
     * Display the specified product
     */
    public function show(Product $product): JsonResponse
    {
        return response()->json([
            'product' => $product->load(['category', 'supplier', 'saleItems', 'purchaseItems'])
        ]);
    }

    /**
     * Update the specified product
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'reference' => 'sometimes|string|unique:products,reference,' . $product->id,
            'category_id' => 'sometimes|exists:categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'purchase_price' => 'sometimes|numeric|min:0',
            'selling_price' => 'sometimes|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'alert_threshold' => 'sometimes|integer|min:0',
            'description' => 'nullable|string',
        ]);

        $product->update($validated);

        return response()->json([
            'product' => $product->load(['category', 'supplier']),
            'message' => 'Produit mis à jour avec succès'
        ]);
    }

    /**
     * Remove the specified product
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'message' => 'Produit supprimé avec succès'
        ]);
    }

    /**
     * Get products for sale selection (minimal data)
     */
    public function forSale(Request $request): JsonResponse
    {
        $query = Product::select(['id', 'name', 'reference', 'selling_price', 'stock'])
            ->where('stock', '>', 0);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        $products = $query->limit(20)->get();

        return response()->json($products);
    }
}
