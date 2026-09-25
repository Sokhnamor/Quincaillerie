<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage in routes: ->middleware('role:admin,gestionnaire')
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !$user->hasRole(...$roles)) {
            return response()->json([
                'message' => "Vous n'avez pas les droits nécessaires pour cette action.",
            ], 403);
        }

        return $next($request);
    }
}
