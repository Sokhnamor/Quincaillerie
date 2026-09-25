<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    private const RULES = [
        'type' => 'nullable|in:particulier,professionnel',
        'credit_limit' => 'nullable|numeric|min:0',
        'phone' => 'nullable|string|max:30',
        'email' => 'nullable|email|max:255',
        'address' => 'nullable|string|max:500',
        'city' => 'nullable|string|max:100',
    ];

    /**
     * Display a paginated list of clients with their purchase totals and debt
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::withCount('sales')
            ->withSum('sales', 'total')
            ->withSum('sales', 'returned_amount')
            ->withSum('sales', 'paid_amount');

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('with_debt')) {
            $query->whereHas('sales', fn ($q) => $q->where('status', '!=', 'paid'));
        }

        $clients = $query->orderBy('name')->paginate(min((int) ($request->per_page ?? 15), 100));

        $clients->getCollection()->transform(function ($client) {
            $client->sales_sum_total = (float) $client->sales_sum_total - (float) $client->sales_sum_returned_amount;
            $client->balance_due = max(0, $client->sales_sum_total - (float) $client->sales_sum_paid_amount);
            return $client;
        });

        return response()->json($clients);
    }

    /**
     * Store a newly created client
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['name' => 'required|string|max:255'] + self::RULES);

        $client = Client::create($validated);

        return response()->json([
            'client' => $client,
            'message' => 'Client créé avec succès'
        ], 201);
    }

    /**
     * Display the specified client with purchase history
     */
    public function show(Client $client): JsonResponse
    {
        $sales = $client->sales()->latest()->limit(20)
            ->get(['id', 'invoice_number', 'total', 'returned_amount', 'paid_amount', 'status', 'created_at']);

        $totals = $client->sales()->selectRaw('COUNT(*) as count, COALESCE(SUM(total - returned_amount),0) as total, COALESCE(SUM(paid_amount),0) as paid')->first();

        return response()->json([
            'client' => $client,
            'sales' => $sales,
            'stats' => [
                'sales_count' => (int) $totals->count,
                'total_spent' => (float) $totals->total,
                'balance_due' => max(0, (float) $totals->total - (float) $totals->paid),
                'credit_limit' => $client->credit_limit !== null ? (float) $client->credit_limit : null,
            ],
        ]);
    }

    /**
     * Update the specified client
     */
    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate(['name' => 'sometimes|string|max:255'] + self::RULES);

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
        if ($client->sales()->exists()) {
            return response()->json([
                'message' => 'Ce client a des ventes associées : il ne peut pas être supprimé.'
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
        $clients = Client::orderBy('name')->get(['id', 'name', 'type', 'phone', 'city', 'credit_limit']);

        // Current debt, so the point of sale can warn before a credit sale
        $debts = \App\Models\Sale::where('status', '!=', 'paid')->whereNotNull('client_id')
            ->groupBy('client_id')
            ->selectRaw('client_id, SUM(total - returned_amount - paid_amount) as due')
            ->pluck('due', 'client_id');
        $clients->each(fn ($c) => $c->balance_due = (float) ($debts[$c->id] ?? 0));

        return response()->json($clients);
    }
}
