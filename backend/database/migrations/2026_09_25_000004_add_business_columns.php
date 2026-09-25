<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('unit', 20)->default('pièce')->after('reference');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('role_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('tax_rate', 5, 2)->default(18)->after('subtotal');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->string('supplier_reference')->nullable()->after('invoice_number');
        });

        // Keep the historical rate on existing sales (they were computed at 19%)
        DB::table('sales')->where('subtotal', '>', 0)->update(['tax_rate' => 19]);
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('unit'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_active'));
        Schema::table('sales', fn (Blueprint $table) => $table->dropColumn('tax_rate'));
        Schema::table('purchases', fn (Blueprint $table) => $table->dropColumn('supplier_reference'));
    }
};
