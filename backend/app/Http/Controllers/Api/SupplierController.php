<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    private const RULES = [
        'phone' => 'nullable|string|max:30',
        'email' => 'nullable|email|max:255',
        'address' => 'nullable|string|max:500',
        'city' => 'nullable|string|max:100',
    ];

    /**
     * Display a paginated list of suppliers
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::withCount('products')->withSum('purchases', 'total');

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->orderBy('name')->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($suppliers);
    }

    /**
     * Store a newly created supplier
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['name' => 'required|string|max:255'] + self::RULES);

        $supplier = Supplier::create($validated);

        return response()->json([
            'supplier' => $supplier,
            'message' => 'Fournisseur créé avec succès'
        ], 201);
    }

    /**
     * Display the specified supplier
     */
    public function show(Supplier $supplier): JsonResponse
    {
        return response()->json([
            'supplier' => $supplier->loadCount('products')->loadSum('purchases', 'total'),
            'products' => $supplier->products()->select(['id', 'name', 'reference', 'stock', 'alert_threshold', 'purchase_price', 'supplier_id'])->orderBy('name')->get(),
            'purchases' => $supplier->purchases()->latest()->limit(10)->get(['id', 'invoice_number', 'total', 'status', 'created_at']),
        ]);
    }

    /**
     * Update the specified supplier
     */
    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate(['name' => 'sometimes|string|max:255'] + self::RULES);

        $supplier->update($validated);

        return response()->json([
            'supplier' => $supplier,
            'message' => 'Fournisseur mis à jour avec succès'
        ]);
    }

    /**
     * Remove the specified supplier
     */
    public function destroy(Supplier $supplier): JsonResponse
    {
        if ($supplier->products()->exists() || $supplier->purchases()->exists()) {
            return response()->json([
                'message' => 'Ce fournisseur a des produits ou des achats associés : il ne peut pas être supprimé.'
            ], 422);
        }

        $supplier->delete();

        return response()->json([
            'message' => 'Fournisseur supprimé avec succès'
        ]);
    }

    /**
     * Get all suppliers for dropdowns
     */
    public function all(): JsonResponse
    {
        return response()->json(Supplier::orderBy('name')->get(['id', 'name', 'phone', 'email', 'city']));
    }
}
