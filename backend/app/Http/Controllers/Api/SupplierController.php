<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * Display a paginated list of suppliers
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->orderBy('name')->paginate($request->per_page ?? 15);

        return response()->json($suppliers);
    }

    /**
     * Store a newly created supplier
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
        ]);

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
            'supplier' => $supplier->load(['products', 'purchases'])
        ]);
    }

    /**
     * Update the specified supplier
     */
    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
        ]);

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
        if ($supplier->products()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer ce fournisseur car il a des produits associés'
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
        $suppliers = Supplier::orderBy('name')->get();

        return response()->json($suppliers);
    }
}
