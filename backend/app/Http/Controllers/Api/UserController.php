<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * User management (admin only)
 */
class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role')->withCount('sales');

        if ($search = $request->search) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function roles(): JsonResponse
    {
        return response()->json(Role::orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'role_id' => 'required|exists:roles,id',
            'phone' => 'nullable|string|max:30',
            'is_active' => 'boolean',
        ]);

        $user = User::create($validated);

        return response()->json([
            'user' => $user->load('role'),
            'message' => 'Utilisateur créé avec succès'
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'role_id' => 'sometimes|exists:roles,id',
            'phone' => 'nullable|string|max:30',
            'is_active' => 'sometimes|boolean',
        ]);

        $isSelf = $request->user()->id === $user->id;
        if ($isSelf && ((isset($validated['is_active']) && !$validated['is_active'])
            || (isset($validated['role_id']) && (int) $validated['role_id'] !== $user->role_id))) {
            return response()->json([
                'message' => 'Vous ne pouvez pas désactiver votre propre compte ni changer votre propre rôle.'
            ], 422);
        }

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        // A deactivated user is logged out everywhere
        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'user' => $user->load('role'),
            'message' => 'Utilisateur mis à jour'
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        if ($user->sales()->exists() || $user->purchases()->exists()) {
            return response()->json([
                'message' => 'Cet utilisateur a enregistré des ventes ou des achats. Désactivez-le plutôt que de le supprimer.'
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé']);
    }
}
