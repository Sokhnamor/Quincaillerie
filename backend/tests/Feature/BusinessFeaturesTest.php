<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Quote;
use App\Models\Role;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Credit limits, returns / credit notes, quotes, cash closing and reports
 */
class BusinessFeaturesTest extends TestCase
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
            'purchase_price' => $price * 0.6,
            'selling_price' => $price,
            'stock' => $stock,
            'alert_threshold' => 2,
        ]);
    }

    /** Sale without tax to keep the arithmetic readable */
    private function sell(array $payload): array
    {
        \App\Models\Setting::setMany(['tax_rate' => 0]);

        return $this->postJson('/api/sales', $payload)->assertCreated()->json('sale');
    }

    public function test_credit_limit_blocks_a_sale_that_would_exceed_it(): void
    {
        $this->actingAsRole('caissier');
        \App\Models\Setting::setMany(['tax_rate' => 0]);
        $product = $this->product(20);
        $client = Client::create(['name' => 'Chantier Ndiaye', 'type' => 'professionnel', 'credit_limit' => 15000]);

        // 10 000 owed: within the limit
        $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'items' => [['product_id' => $product->id, 'quantity' => 10, 'unit_price' => 1000]],
            'paid_amount' => 0,
        ])->assertCreated();

        // +8 000 would bring the debt to 18 000 > 15 000
        $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'items' => [['product_id' => $product->id, 'quantity' => 8, 'unit_price' => 1000]],
            'paid_amount' => 0,
        ])->assertStatus(422)->assertJsonValidationErrors('client_id');

        $this->assertSame(10, $product->fresh()->stock, 'The refused sale must not touch the stock');
    }

    public function test_partial_return_restocks_issues_credit_note_and_refunds_overpayment(): void
    {
        $this->actingAsRole('caissier');
        $product = $this->product(10);
        $sale = $this->sell(['items' => [['product_id' => $product->id, 'quantity' => 4, 'unit_price' => 2500]]]); // 10 000 paid
        $itemId = $sale['items'][0]['id'];

        $response = $this->postJson("/api/sales/{$sale['id']}/returns", [
            'items' => [['sale_item_id' => $itemId, 'quantity' => 1]],
            'reason' => 'Défectueux',
            'refund_method' => 'wave',
        ])->assertCreated();

        $this->assertMatchesRegularExpression('/^AV-\d{4}-\d{6}$/', $response->json('return.number'));
        $this->assertEquals(2500, $response->json('return.total'));
        $this->assertEquals(2500, $response->json('return.refund_amount'));
        $this->assertSame(7, $product->fresh()->stock);

        $fresh = Sale::find($sale['id']);
        $this->assertEquals(2500, $fresh->returned_amount);
        $this->assertEquals(7500, $fresh->paid_amount, 'A negative refund payment is recorded');
        $this->assertSame('paid', $fresh->status);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'type' => 'return', 'quantity' => 1]);

        // Cannot return more than what is left (3)
        $this->postJson("/api/sales/{$sale['id']}/returns", ['items' => [['sale_item_id' => $itemId, 'quantity' => 4]]])
            ->assertStatus(422);

        // Cancelling the sale only puts back the 3 not yet returned
        $this->actingAsRole('admin');
        $this->deleteJson("/api/sales/{$sale['id']}")->assertOk();
        $this->assertSame(10, $product->fresh()->stock);
    }

    public function test_return_on_unpaid_sale_reduces_the_debt_without_refund(): void
    {
        $this->actingAsRole('caissier');
        $product = $this->product(10);
        $client = Client::create(['name' => 'Awa']);
        $sale = $this->sell(['client_id' => $client->id, 'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 3000]], 'paid_amount' => 0]);

        $this->postJson("/api/sales/{$sale['id']}/returns", ['items' => [['sale_item_id' => $sale['items'][0]['id'], 'quantity' => 1]]])
            ->assertCreated()
            ->assertJsonPath('return.refund_amount', '0.00')
            ->assertJsonPath('sale.remaining_amount', 3000);
    }

    public function test_quote_has_no_stock_impact_until_converted(): void
    {
        $this->actingAsRole('caissier');
        \App\Models\Setting::setMany(['tax_rate' => 18]);
        $product = $this->product(10);

        $quote = $this->postJson('/api/quotes', [
            'client_name' => 'Entreprise BTP Sall',
            'items' => [['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 1000]],
        ])->assertCreated()->json('quote');

        $this->assertMatchesRegularExpression('/^DEV-\d{4}-\d{6}$/', $quote['number']);
        $this->assertEquals(3540, $quote['total']);
        $this->assertSame(10, $product->fresh()->stock);

        $this->get("/api/quotes/{$quote['id']}/pdf")->assertOk();

        $this->postJson("/api/quotes/{$quote['id']}/convert", ['payment_method' => 'orange_money'])
            ->assertOk()
            ->assertJsonPath('quote.status', 'converted');

        $this->assertSame(7, $product->fresh()->stock);
        $this->assertSame(1, Sale::count());
        $this->assertSame('converted', Quote::find($quote['id'])->status);

        // A converted quote is locked
        $this->postJson("/api/quotes/{$quote['id']}/convert")->assertStatus(422);
    }

    public function test_cash_closing_compares_counted_cash_with_expected(): void
    {
        $this->actingAsRole('caissier');
        $product = $this->product(10);
        $this->sell(['items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 5000]], 'payment_method' => 'cash']);
        $this->sell(['items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 4000]], 'payment_method' => 'wave']);

        $summary = $this->getJson('/api/cash-closings/summary')->assertOk();
        $this->assertEquals(10000, $summary->json('expected_cash'));
        $this->assertEquals(4000, $summary->json('by_method.wave.total'));

        $this->postJson('/api/cash-closings', ['counted_cash' => 9500])
            ->assertCreated()
            ->assertJsonPath('closing.difference', '-500.00');
    }

    public function test_report_returns_net_revenue_and_margin(): void
    {
        $this->actingAsRole('gestionnaire');
        $product = $this->product(10, 1000); // bought 600
        $this->sell(['items' => [['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 1000]]]);

        $this->getJson('/api/reports/summary')
            ->assertOk()
            ->assertJsonPath('totals.sales_count', 1)
            ->assertJsonPath('totals.net_revenue', 5000)
            ->assertJsonPath('totals.margin', 2000);

        $this->actingAsRole('caissier');
        $this->getJson('/api/reports/summary')->assertForbidden();
    }

    public function test_admin_can_remove_a_wrong_payment(): void
    {
        $this->actingAsRole('admin');
        $product = $this->product(5);
        $sale = $this->sell(['items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000]]]);
        $paymentId = Sale::find($sale['id'])->payments()->value('id');

        $this->deleteJson("/api/sales/{$sale['id']}/payments/{$paymentId}")
            ->assertOk()
            ->assertJsonPath('sale.status', 'unpaid');
    }
}
