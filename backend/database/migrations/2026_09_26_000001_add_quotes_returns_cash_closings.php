<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Prix de gros
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('wholesale_price', 12, 2)->nullable()->after('selling_price');
            $table->unsignedInteger('wholesale_min_qty')->nullable()->after('wholesale_price');
        });

        // Type de client et plafond de crédit
        Schema::table('clients', function (Blueprint $table) {
            $table->string('type', 20)->default('particulier')->after('name');
            $table->decimal('credit_limit', 12, 2)->nullable()->after('city');
        });

        // Retours : montant crédité sur la vente et quantités retournées par ligne
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('returned_amount', 12, 2)->default(0)->after('total');
        });
        Schema::table('sale_items', function (Blueprint $table) {
            $table->unsignedInteger('returned_quantity')->default(0)->after('quantity');
        });

        // Devis / proforma
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('client_name')->nullable(); // prospect not registered as a client
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(18);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            // draft, sent, accepted, rejected, converted
            $table->string('status', 20)->default('draft');
            $table->date('valid_until')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('designation');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });

        // Retours / avoirs
        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('tax_amount', 12, 2);
            $table->decimal('discount_share', 12, 2)->default(0);
            $table->decimal('total', 12, 2);          // montant de l'avoir
            $table->decimal('refund_amount', 12, 2)->default(0); // argent rendu au client
            $table->string('refund_method', 30)->nullable();
            $table->timestamps();
        });

        Schema::create('sale_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });

        // Clôtures de caisse
        Schema::create('cash_closings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->date('business_date');
            $table->unsignedInteger('sales_count')->default(0);
            $table->decimal('sales_total', 12, 2)->default(0);
            $table->decimal('returns_total', 12, 2)->default(0);
            $table->json('collected_by_method');
            $table->decimal('expected_cash', 12, 2)->default(0);
            $table->decimal('counted_cash', 12, 2)->default(0);
            $table->decimal('difference', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('business_date');
        });

        // Historique : le stock existant devient un mouvement « stock initial »
        $now = now();
        $withHistory = DB::table('stock_movements')->distinct()->pluck('product_id')->all();
        DB::table('products')->whereNotIn('id', $withHistory)->where('stock', '>', 0)->orderBy('id')
            ->each(function ($product) use ($now) {
                DB::table('stock_movements')->insert([
                    'product_id' => $product->id,
                    'user_id' => null,
                    'type' => 'initial',
                    'quantity' => $product->stock,
                    'stock_before' => 0,
                    'stock_after' => $product->stock,
                    'reference' => $product->reference,
                    'note' => 'Reprise du stock existant',
                    // Dated today: it is the stock level at the moment tracking starts
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_closings');
        Schema::dropIfExists('sale_return_items');
        Schema::dropIfExists('sale_returns');
        Schema::dropIfExists('quote_items');
        Schema::dropIfExists('quotes');
        Schema::table('sale_items', fn (Blueprint $table) => $table->dropColumn('returned_quantity'));
        Schema::table('sales', fn (Blueprint $table) => $table->dropColumn('returned_amount'));
        Schema::table('clients', fn (Blueprint $table) => $table->dropColumn(['type', 'credit_limit']));
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn(['wholesale_price', 'wholesale_min_qty']));
    }
};
