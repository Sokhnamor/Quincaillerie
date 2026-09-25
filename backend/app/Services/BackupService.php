<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * SQL dump of the database written in PHP, so it works on WAMP/XAMPP
 * without depending on the mysqldump binary being in the PATH.
 * Restore by importing the .sql file in phpMyAdmin.
 */
class BackupService
{
    public const KEEP = 30;

    public function directory(): string
    {
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);

        return $dir;
    }

    public function create(): string
    {
        $connection = DB::connection();
        if ($connection->getDriverName() !== 'mysql' && $connection->getDriverName() !== 'mariadb') {
            throw new \RuntimeException('La sauvegarde intégrée ne prend en charge que MySQL / MariaDB.');
        }

        $pdo = $connection->getPdo();
        $filename = 'quincaillerie-' . now()->format('Y-m-d_His') . '.sql';
        $path = $this->directory() . DIRECTORY_SEPARATOR . $filename;
        $out = fopen($path, 'w');

        fwrite($out, "-- Sauvegarde Quincaillerie Pro\n-- Base : {$connection->getDatabaseName()}\n-- Date : " . now()->format('d/m/Y H:i:s') . "\n\n");
        fwrite($out, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n");

        $tables = array_map(fn ($row) => array_values((array) $row)[0], DB::select('SHOW TABLES'));

        foreach ($tables as $table) {
            $create = (array) DB::selectOne("SHOW CREATE TABLE `{$table}`");
            fwrite($out, "DROP TABLE IF EXISTS `{$table}`;\n" . array_values($create)[1] . ";\n\n");

            $rows = DB::table($table)->cursor();
            $batch = [];
            foreach ($rows as $row) {
                $values = array_map(fn ($v) => $v === null ? 'NULL' : $pdo->quote((string) $v), (array) $row);
                $batch[] = '(' . implode(',', $values) . ')';
                if (count($batch) === 200) {
                    fwrite($out, "INSERT INTO `{$table}` VALUES\n" . implode(",\n", $batch) . ";\n");
                    $batch = [];
                }
            }
            if ($batch) {
                fwrite($out, "INSERT INTO `{$table}` VALUES\n" . implode(",\n", $batch) . ";\n");
            }
            fwrite($out, "\n");
        }

        fwrite($out, "SET FOREIGN_KEY_CHECKS = 1;\n");
        fclose($out);

        $this->prune();

        return $filename;
    }

    /** @return array<int, array{name: string, size: int, created_at: string}> */
    public function list(): array
    {
        return collect(File::files($this->directory()))
            ->filter(fn ($f) => $f->getExtension() === 'sql')
            ->sortByDesc(fn ($f) => $f->getMTime())
            ->map(fn ($f) => [
                'name' => $f->getFilename(),
                'size' => $f->getSize(),
                'created_at' => date(DATE_ATOM, $f->getMTime()),
            ])
            ->values()
            ->all();
    }

    public function path(string $name): ?string
    {
        // Only plain file names from the backup folder
        if (!preg_match('/^quincaillerie-[\d_-]+\.sql$/', $name)) {
            return null;
        }
        $path = $this->directory() . DIRECTORY_SEPARATOR . $name;

        return is_file($path) ? $path : null;
    }

    private function prune(): void
    {
        foreach (array_slice($this->list(), self::KEEP) as $old) {
            @unlink($this->directory() . DIRECTORY_SEPARATOR . $old['name']);
        }
    }
}
