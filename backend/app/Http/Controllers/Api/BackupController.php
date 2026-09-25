<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;

/**
 * Database backups (admin only)
 */
class BackupController extends Controller
{
    public function __construct(private BackupService $backups)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->backups->list());
    }

    public function store(): JsonResponse
    {
        try {
            $name = $this->backups->create();
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'La sauvegarde a échoué : ' . $e->getMessage()], 500);
        }

        return response()->json(['name' => $name, 'message' => 'Sauvegarde créée'], 201);
    }

    public function download(string $name)
    {
        $path = $this->backups->path($name);
        abort_unless($path, 404);

        return response()->download($path, $name, ['Content-Type' => 'application/sql']);
    }
}
