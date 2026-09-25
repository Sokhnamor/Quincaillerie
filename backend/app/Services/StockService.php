<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Validation\ValidationException;

/**
 * Single entry point for every stock change, so each change is journaled
 * in stock_movements. Callers are expected to run inside a DB transaction.
 */
class StockService
{
    /**
     * Apply a signed quantity change to a product's stock.
     *
     * @throws ValidationException when the change would make stock negative
     */
    public function move(
        Product $product,
        int $quantity,
        string $type,
        ?int $userId = null,
        ?string $reference = null,
        ?string $note = null,
    ): StockMovement {
        // Re-read with a row lock so concurrent sales cannot oversell
        $locked = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();

        $before = $locked->stock;
        $after = $before + $quantity;

        if ($after < 0) {
            throw ValidationException::withMessages([
                'stock' => ["Stock insuffisant pour « {$locked->name} » (disponible : {$before}, demandé : " . abs($quantity) . ').'],
            ]);
        }

        $locked->update(['stock' => $after]);
        $product->setAttribute('stock', $after);

        return StockMovement::create([
            'product_id' => $locked->id,
            'user_id' => $userId,
            'type' => $type,
            'quantity' => $quantity,
            'stock_before' => $before,
            'stock_after' => $after,
            'reference' => $reference,
            'note' => $note,
        ]);
    }
}
