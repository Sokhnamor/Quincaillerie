<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Display a paginated list of clients
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $clients = $query->orderBy('name')->paginate($request->per_page ?? 15);

        return response()->json($clients);
    }

    /**
     * Store a newly created client
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

        $client = Client::create($validated);

        return response()->json([
            'client' => $client,
            'message' => 'Client créé avec succès'
        ], 201);
    }

    /**
     * Display the specified client
     */
    public function show(Client $client): JsonResponse
    {
        return response()->json([
            'client' => $client->load(['sales'])
        ]);
    }

    /**
     * Update the specified client
     */
    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
        ]);

        $client->update($validated);

        return response()->json([
            'client' => $client,
            'message' => 'Client mis à jour avec succès'
        ]);
    }

    /**
     * Remove the specified client
     */
    public function destroy(Client $client): JsonResponse
    {
        if ($client->sales()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer ce client car il a des ventes associées'
            ], 422);
        }

        $client->delete();

        return response()->json([
            'message' => 'Client supprimé avec succès'
        ]);
    }

    /**
     * Get all clients for dropdowns
     */
    public function all(): JsonResponse
    {
        $clients = Client::orderBy('name')->get();

        return response()->json($clients);
    }
}
