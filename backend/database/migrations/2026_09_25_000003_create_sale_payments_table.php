<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            // cash, wave, orange_money, card, transfer, cheque
            $table->string('method', 30)->default('cash');
            $table->string('note')->nullable();
            $table->timestamps();
        });

        // Backfill: one payment per existing sale that already had money paid
        $now = now();
        DB::table('sales')->where('paid_amount', '>', 0)->orderBy('id')->each(function ($sale) use ($now) {
            DB::table('sale_payments')->insert([
                'sale_id' => $sale->id,
                'user_id' => $sale->user_id,
                'amount' => $sale->paid_amount,
                'method' => 'cash',
                'note' => 'Paiement initial',
                'created_at' => $sale->created_at ?? $now,
                'updated_at' => $sale->created_at ?? $now,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_payments');
    }
};
