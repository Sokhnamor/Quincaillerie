<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class BackupDatabase extends Command
{
    protected $signature = 'app:backup';

    protected $description = 'Sauvegarde la base de données dans storage/app/backups (30 dernières conservées)';

    public function handle(BackupService $backups): int
    {
        try {
            $file = $backups->create();
        } catch (\Throwable $e) {
            $this->error('Échec de la sauvegarde : ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->info("Sauvegarde créée : {$file}");

        return self::SUCCESS;
    }
}
