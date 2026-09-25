<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Assistant\AssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssistantController extends Controller
{
    public function __construct(private AssistantService $assistant)
    {
    }

    /** Insights and suggestions shown when the panel opens */
    public function welcome(Request $request): JsonResponse
    {
        return response()->json($this->assistant->welcome($request->user()));
    }

    public function ask(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:500',
            'history' => 'nullable|array|max:20',
            'history.*.role' => 'required|in:user,assistant',
            'history.*.content' => 'required|string|max:4000',
        ]);

        return response()->json(
            $this->assistant->answer($request->user(), trim($validated['message']), $validated['history'] ?? [])
        );
    }
}
