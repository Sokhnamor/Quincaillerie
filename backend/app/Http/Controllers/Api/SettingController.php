<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Setting::allValues());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'company_address' => 'nullable|string|max:255',
            'company_phone' => 'nullable|string|max:50',
            'company_email' => 'nullable|email|max:255',
            'company_ninea' => 'nullable|string|max:50',
            'company_rccm' => 'nullable|string|max:50',
            'currency' => 'required|string|max:10',
            'tax_rate' => 'required|numeric|min:0|max:100',
            'invoice_format' => 'required|in:ticket,a5,a4',
            'invoice_footer' => 'nullable|string|max:500',
        ]);

        Setting::setMany($validated);

        return response()->json([
            'settings' => Setting::allValues(),
            'message' => 'Paramètres enregistrés'
        ]);
    }
}
