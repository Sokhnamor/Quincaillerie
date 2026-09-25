<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The old UI let users change a sale's status without entering an amount,
 * leaving "unpaid"/"partial" sales with paid_amount = total. Realign them.
 */
return new class extends Migration
{
    public function up(): void
    {
        $inconsistent = DB::table('sales')
            ->whereIn('status', ['unpaid', 'partial'])
            ->whereColumn('paid_amount', '>=', 'total')
            ->get();

        foreach ($inconsistent as $sale) {
            DB::table('sale_payments')->where('sale_id', $sale->id)->delete();

            if ($sale->status === 'unpaid') {
                DB::table('sales')->where('id', $sale->id)->update(['paid_amount' => 0]);
                continue;
            }

            // The real partial amount was never recorded: use half, flagged for review
            $paid = round($sale->total / 2, 2);
            DB::table('sales')->where('id', $sale->id)->update(['paid_amount' => $paid]);
            DB::table('sale_payments')->insert([
                'sale_id' => $sale->id,
                'user_id' => $sale->user_id,
                'amount' => $paid,
                'method' => 'cash',
                'note' => 'Montant estimé (reprise des anciennes données) — à vérifier',
                'created_at' => $sale->created_at,
                'updated_at' => $sale->created_at,
            ]);
        }
    }

    public function down(): void
    {
        // Data fix: not reversible
    }
};
