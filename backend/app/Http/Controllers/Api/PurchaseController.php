<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    /**
     * Display a paginated list of purchases
     */
    public function index(Request $request): JsonResponse
    {
        $query = Purchase::with(['supplier', 'user']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($supplierQuery) use ($search) {
                      $supplierQuery->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $purchases = $query->orderByDesc('created_at')->paginate($request->per_page ?? 15);

        return response()->json($purchases);
    }

    /**
     * Store a newly created purchase
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $invoiceNumber = 'ACH-' . date('Ymd') . '-' . str_pad(Purchase::count() + 1, 5, '0', STR_PAD_LEFT);

            $subtotal = 0;
            $itemsData = [];

            foreach ($validated['items'] as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $subtotal += $itemSubtotal;

                $itemsData[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $itemSubtotal
                ];

                // Update stock and purchase price
                $product = Product::find($item['product_id']);
                $product->increment('stock', $item['quantity']);
                $product->update(['purchase_price' => $item['unit_price']]);
            }

            $taxAmount = $subtotal * 0.19;
            $discount = $validated['discount'] ?? 0;
            $total = $subtotal + $taxAmount - $discount;

            $purchase = Purchase::create([
                'invoice_number' => $invoiceNumber,
                'supplier_id' => $validated['supplier_id'],
                'user_id' => $request->user()->id,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount' => $discount,
                'total' => $total,
                'status' => 'completed',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($itemsData as $itemData) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    ...$itemData
                ]);
            }

            DB::commit();

            return response()->json([
                'purchase' => $purchase->load(['supplier', 'user', 'items.product']),
                'message' => 'Achat créé avec succès'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erreur lors de la création: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified purchase
     */
    public function show(Purchase $purchase): JsonResponse
    {
        return response()->json([
            'purchase' => $purchase->load(['supplier', 'user', 'items.product'])
        ]);
    }

    /**
     * Update the specified purchase
     */
    public function update(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:pending,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        $purchase->update($validated);

        return response()->json([
            'purchase' => $purchase->load(['supplier', 'user', 'items.product']),
            'message' => 'Achat mis à jour avec succès'
        ]);
    }

    /**
     * Remove the specified purchase
     */
    public function destroy(Purchase $purchase): JsonResponse
    {
        try {
            DB::beginTransaction();

            foreach ($purchase->items as $item) {
                $item->product->decrement('stock', $item->quantity);
            }

            $purchase->items()->delete();
            $purchase->delete();

            DB::commit();

            return response()->json([
                'message' => 'Achat supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erreur lors de la suppression: ' . $e->getMessage()
            ], 500);
        }
    }
}
