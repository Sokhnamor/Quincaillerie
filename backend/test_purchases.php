<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Purchase;

echo "=== Purchases Test ===\n";
echo "Total purchases: " . Purchase::count() . "\n\n";

$purchases = Purchase::all(['id', 'total', 'status', 'created_at']);
echo "All purchases:\n";
foreach ($purchases as $p) {
    echo "ID: {$p->id}, Total: {$p->total}, Status: {$p->status}, Date: {$p->created_at}\n";
}

echo "\n=== Month Test ===\n";
$startOfMonth = now()->startOfMonth();
$endOfMonth = now()->endOfMonth();
echo "Start of month: {$startOfMonth}\n";
echo "End of month: {$endOfMonth}\n";

$monthPurchases = Purchase::whereBetween('created_at', [$startOfMonth, $endOfMonth])->get();
echo "Purchases this month: " . $monthPurchases->count() . "\n";
echo "Sum this month: " . Purchase::whereBetween('created_at', [$startOfMonth, $endOfMonth])->sum('total') . "\n";

