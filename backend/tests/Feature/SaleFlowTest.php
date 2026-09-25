<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SaleFlowTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'gestionnaire', 'caissier'] as $name) {
            Role::create(['name' => $name, 'description' => $name]);
        }
        $this->category = Category::create(['name' => 'Outillage']);
    }

    private function actingAsRole(string $role): User
    {
        $user = User::factory()->create(['role_id' => Role::where('name', $role)->value('id')]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function product(int $stock, float $price = 1000): Product
    {
        return Product::create([
            'name' => 'Produit ' . uniqid(),
            'category_id' => $this->category->id,
            'purchase_price' => $price * 0.7,
            'selling_price' => $price,
            'stock' => $stock,
            'alert_threshold' => 2,
        ]);
    }

    public function test_api_requires_authentication(): void
    {
        $this->getJson('/api/products')->assertUnauthorized();
        $this->postJson('/api/categories', ['name' => 'X'])->assertUnauthorized();
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }

    public function test_sale_decrements_stock_applies_tax_and_numbers_invoice(): void
    {
        $this->actingAsRole('caissier');
        $product = $this->product(10);

        $response = $this->postJson('/api/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 1000]],
            'payment_method' => 'wave',
        ])->assertCreated();

        $sale = Sale::first();
        $this->assertSame(7, $product->fresh()->stock);
        $this->assertEquals(3000, $sale->subtotal);
        $this->assertEquals(540, $sale->tax_amount); // 18%
        $this->assertEquals(3540, $sale->total);
        $this->assertSame('paid', $sale->status);
        $this->assertMatchesRegularExpression('/^FAC-\d{4}-\d{6}$/', $sale->invoice_number);
        $this->assertDatabaseHas('sale_payments', ['sale_id' => $sale->id, 'method' => 'wave', 'amount' => 3540]);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'type' => 'sale', 'quantity' => -3, 'stock_after' => 7]);
        $response->assertJsonPath('sale.invoice_number', $sale->invoice_number);
    }

    public function test_insufficient_stock_rolls_back_the_whole_sale(): void
    {
        $this->actingAsRole('caissier');
        $ok = $this->product(10);
        $short = $this->product(1);

        $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $ok->id, 'quantity' => 2, 'unit_price' => 1000],
                ['product_id' => $short->id, 'quantity' => 5, 'unit_price' => 1000],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors('stock');

        $this->assertSame(10, $ok->fresh()->stock, 'Stock of the first product must be restored');
        $this->assertSame(0, Sale::count());
    }

    public function test_invoice_numbers_stay_unique_after_a_cancellation(): void
    {
        $this->actingAsRole('admin');
        $product = $this->product(20);
        $payload = ['items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000]]];

        $first = $this->postJson('/api/sales', $payload)->json('sale');
        $this->postJson('/api/sales', $payload)->assertCreated();
        $this->deleteJson('/api/sales/' . $first['id'])->assertOk();
        $this->postJson('/api/sales', $payload)->assertCreated();

        $this->assertSame(2, Sale::count());
        $this->assertSame(18, $product->fresh()->stock);
    }

    public function test_partial_payment_then_installment_marks_sale_paid(): void
    {
        $this->actingAsRole('caissier');
        $product = $this->product(5);

        $client = Client::create(['name' => 'Moussa']);

        // A credit sale needs a client
        $this->postJson('/api/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 10000]],
            'paid_amount' => 5000,
        ])->assertStatus(422)->assertJsonValidationErrors('client_id');

        $sale = $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 10000]],
            'paid_amount' => 5000,
        ])->assertCreated()->json('sale');

        $this->assertSame('partial', $sale['status']);

        // Cannot pay more than what is left
        $this->postJson("/api/sales/{$sale['id']}/payments", ['amount' => 999999, 'method' => 'cash'])
            ->assertStatus(422);

        $this->postJson("/api/sales/{$sale['id']}/payments", ['amount' => 6800, 'method' => 'orange_money'])
            ->assertOk()
            ->assertJsonPath('sale.status', 'paid');
    }

    public function test_cashier_cannot_manage_catalogue_or_cancel_sales(): void
    {
        $this->actingAsRole('caissier');
        $product = $this->product(5);

        $this->postJson('/api/categories', ['name' => 'Peinture'])->assertForbidden();
        $this->deleteJson('/api/products/' . $product->id)->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/sales/export/excel')->assertForbidden();
    }

    public function test_purchase_restocks_and_cancellation_is_blocked_once_sold(): void
    {
        $this->actingAsRole('gestionnaire');
        $supplier = Supplier::create(['name' => 'Fournisseur SA']);
        $product = $this->product(0);

        $purchase = $this->postJson('/api/purchases', [
            'supplier_id' => $supplier->id,
            'items' => [['product_id' => $product->id, 'quantity' => 4, 'unit_price' => 650]],
        ])->assertCreated()->json('purchase');

        $this->assertSame(4, $product->fresh()->stock);
        $this->assertEquals(650, $product->fresh()->purchase_price);

        $this->postJson('/api/sales', ['items' => [['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 1000]]])
            ->assertCreated();

        // Only 1 left: removing the 4 received units must fail
        $this->deleteJson('/api/purchases/' . $purchase['id'])->assertStatus(422);
        $this->assertSame(1, $product->fresh()->stock);
    }

    public function test_stock_adjustment_is_journaled(): void
    {
        $this->actingAsRole('gestionnaire');
        $product = $this->product(10);

        $this->postJson("/api/products/{$product->id}/adjust-stock", ['mode' => 'set', 'quantity' => 6, 'note' => 'Inventaire'])
            ->assertOk();

        $this->assertSame(6, $product->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'type' => 'adjustment', 'quantity' => -4, 'note' => 'Inventaire']);
    }

    public function test_product_used_in_a_sale_cannot_be_deleted(): void
    {
        $this->actingAsRole('admin');
        $product = $this->product(5);
        $this->postJson('/api/sales', ['items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000]]]);

        $this->deleteJson('/api/products/' . $product->id)->assertStatus(422);
        $this->assertModelExists($product);
    }

    public function test_invoice_pdf_is_generated_in_every_format(): void
    {
        $this->actingAsRole('caissier');
        $product = $this->product(5);
        $sale = $this->postJson('/api/sales', ['items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 1500]]])->json('sale');

        foreach (['ticket', 'a5', 'a4'] as $format) {
            $response = $this->get("/api/sales/{$sale['id']}/pdf?format={$format}")->assertOk();
            $this->assertStringStartsWith('%PDF', $response->getContent(), "Format {$format}");
        }
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->create(['email' => 'off@test.sn', 'password' => 'password123', 'is_active' => false]);

        $this->postJson('/api/login', ['email' => 'off@test.sn', 'password' => 'password123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }
}
