<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    /**
     * Display a paginated list of sales
     */
    public function index(Request $request): JsonResponse
    {
        $query = Sale::with(['client', 'user', 'items']);

        // Search by invoice number or client name
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($clientQuery) use ($search) {
                      $clientQuery->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by status - accept both filter name formats
        $status = $request->status ?? $request->filter;
        if ($status) {
            $query->where('status', $status);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $sales = $query->orderByDesc('created_at')->paginate($request->per_page ?? 15);

        return response()->json($sales);
    }

    /**
     * Store a newly created sale
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'paid_amount' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            // Generate invoice number
            $invoiceNumber = 'SAL-' . date('Ymd') . '-' . str_pad(Sale::count() + 1, 5, '0', STR_PAD_LEFT);

            // Calculate totals
            $subtotal = 0;
            $itemsData = [];

            foreach ($validated['items'] as $item) {
                $product = Product::find($item['product_id']);
                
                // Check stock
                if ($product->stock < $item['quantity']) {
                    return response()->json([
                        'message' => "Stock insuffisant pour le produit: {$product->name}"
                    ], 422);
                }

                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $subtotal += $itemSubtotal;

                $itemsData[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $itemSubtotal
                ];

                // Update stock
                $product->decrement('stock', $item['quantity']);
            }

            $taxAmount = $subtotal * 0.19; // TVA 19%
            $discount = $validated['discount'] ?? 0;
            $total = $subtotal + $taxAmount - $discount;
            $paidAmount = $validated['paid_amount'] ?? $total;

            // Determine status
            if ($paidAmount >= $total) {
                $status = 'paid';
            } elseif ($paidAmount > 0) {
                $status = 'partial';
            } else {
                $status = 'unpaid';
            }

            $sale = Sale::create([
                'invoice_number' => $invoiceNumber,
                'client_id' => $validated['client_id'] ?? null,
                'user_id' => $request->user()->id,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount' => $discount,
                'total' => $total,
                'status' => $status,
                'paid_amount' => $paidAmount,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Create sale items
            foreach ($itemsData as $itemData) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    ...$itemData
                ]);
            }

            DB::commit();

            return response()->json([
                'sale' => $sale->load(['client', 'user', 'items.product']),
                'message' => 'Vente créée avec succès'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erreur lors de la création de la vente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified sale
     */
    public function show(Sale $sale): JsonResponse
    {
        $sale = $sale->load(['client', 'user', 'items.product']);
        
        // Add product_name to each item for frontend compatibility
        $sale->items->each(function ($item) {
            $item->product_name = $item->product ? $item->product->name : 'Produit supprimé';
        });

        return response()->json([
            'sale' => $sale
        ]);
    }

    /**
     * Update the specified sale
     */
    public function update(Request $request, Sale $sale): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'status' => 'sometimes|in:paid,partial,unpaid',
            'paid_amount' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $sale->update($validated);

        // Update status based on paid amount if provided
        if (isset($validated['paid_amount'])) {
            if ($validated['paid_amount'] >= $sale->total) {
                $sale->update(['status' => 'paid']);
            } elseif ($validated['paid_amount'] > 0) {
                $sale->update(['status' => 'partial']);
            } else {
                $sale->update(['status' => 'unpaid']);
            }
        }

        return response()->json([
            'sale' => $sale->load(['client', 'user', 'items.product']),
            'message' => 'Vente mise à jour avec succès'
        ]);
    }

    /**
     * Remove the specified sale
     */
    public function destroy(Sale $sale): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Restore stock for each item
            foreach ($sale->items as $item) {
                $item->product->increment('stock', $item->quantity);
            }

            // Delete sale items first
            $sale->items()->delete();
            
            // Delete sale
            $sale->delete();

            DB::commit();

            return response()->json([
                'message' => 'Vente supprimée avec succès'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erreur lors de la suppression: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate PDF invoice for a sale
     */
    public function generatePdf(Sale $sale): \Illuminate\Http\Response
    {
        $sale = $sale->load(['client', 'user', 'items.product']);
        
        // Add product_name to each item
        $sale->items->each(function ($item) {
            $item->product_name = $item->product ? $item->product->name : 'Produit supprimé';
        });

        $companyName = config('app.name', 'Mon Entreprise');
        
        $pdf = Pdf::loadView('invoices.sale', [
            'sale' => $sale,
            'company' => [
                'name' => $companyName,
                'address' => 'Cotonou, Benin',
                'phone' => '+229 00 00 00 00',
                'email' => 'contact@entreprise.com',
                'tax_id' => 'N° Contribuable: 0000000000'
            ]
        ]);

        return $pdf->download('facture-' . $sale->invoice_number . '.pdf');
    }
}
