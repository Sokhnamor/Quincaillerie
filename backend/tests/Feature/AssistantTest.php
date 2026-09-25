<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssistantTest extends TestCase
{
    use RefreshDatabase;

    private Product $cement;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'gestionnaire', 'caissier'] as $name) {
            Role::create(['name' => $name, 'description' => $name]);
        }
        Setting::setMany(['tax_rate' => 0]);
        $category = Category::create(['name' => 'Matériaux']);

        $this->cement = Product::create([
            'name' => 'Sac de ciment 50kg', 'unit' => 'sac', 'category_id' => $category->id,
            'purchase_price' => 3000, 'selling_price' => 4000, 'stock' => 3, 'alert_threshold' => 10,
        ]);
        Product::create([
            'name' => 'Marteau 500g', 'unit' => 'pièce', 'category_id' => $category->id,
            'purchase_price' => 1000, 'selling_price' => 1500, 'stock' => 40, 'alert_threshold' => 5,
        ]);
    }

    private function actingAsRole(string $role): User
    {
        $user = User::factory()->create(['role_id' => Role::where('name', $role)->value('id')]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function ask(string $message): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/assistant', ['message' => $message])->assertOk()->assertJsonPath('source', 'rules');
    }

    public function test_it_requires_authentication(): void
    {
        $this->postJson('/api/assistant', ['message' => 'Bonjour'])->assertUnauthorized();
    }

    public function test_restock_question_lists_products_under_threshold(): void
    {
        $this->actingAsRole('gestionnaire');

        $response = $this->ask('Qu\'est-ce que je dois commander cette semaine ?');

        $response->assertJsonPath('cards.0.type', 'list');
        $response->assertJsonPath('cards.0.items.0.title', 'Sac de ciment 50kg');
        $response->assertJsonPath('cards.0.items.0.value', '+17 sac');
        $this->assertStringContainsString('1 produit(s) à réapprovisionner', $response->json('reply'));
        $response->assertJsonPath('actions.0.link', '/purchases');
    }

    public function test_product_stock_question_finds_the_product(): void
    {
        $this->actingAsRole('caissier');

        $reply = $this->ask('Il reste combien de ciment ?')->json('reply');

        $this->assertStringContainsString('Sac de ciment 50kg', $reply);
        $this->assertStringContainsString('3 sac', $reply);
        $this->assertStringNotContainsString('prix d\'achat', $reply, 'Cashiers must not see purchase prices');
    }

    public function test_sales_questions_understand_periods(): void
    {
        $this->actingAsRole('caissier');
        $this->postJson('/api/sales', ['items' => [['product_id' => $this->cement->id, 'quantity' => 2, 'unit_price' => 4000]]])->assertCreated();

        $today = $this->ask('Ventes du jour');
        $this->assertStringContainsStringIgnoringCase("aujourd'hui", $today->json('reply'));
        $this->assertStringContainsString('8 000', $today->json('reply'));

        $this->assertStringContainsString('Aucune vente', $this->ask('Ventes d\'hier')->json('reply'));

        $sold = $this->ask('Combien de ciment vendu ce mois ?')->json('reply');
        $this->assertStringContainsString('2 sac', $sold);
    }

    public function test_debts_and_reminder_with_whatsapp_link(): void
    {
        $this->actingAsRole('caissier');
        $client = Client::create(['name' => 'Amadou Diallo', 'phone' => '77 111 22 33']);
        $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1, 'unit_price' => 4000]],
            'paid_amount' => 1000,
        ])->assertCreated();

        $debts = $this->ask('Qui me doit de l\'argent ?');
        $debts->assertJsonPath('cards.0.items.0.title', 'Amadou Diallo');
        $this->assertStringContainsString('3 000', $debts->json('cards.0.items.0.value'));

        $reminder = $this->ask('Relance Amadou');
        $reminder->assertJsonPath('cards.0.type', 'quote');
        $this->assertStringStartsWith('https://wa.me/221771112233?text=', $reminder->json('actions.0.href'));
    }

    public function test_margin_is_reserved_to_managers(): void
    {
        $this->actingAsRole('caissier');
        $this->assertStringContainsString('réservés aux gestionnaires', $this->ask('Quelle est ma marge ce mois ?')->json('reply'));

        $this->actingAsRole('admin');
        $this->assertStringContainsString('Marge brute estimée', $this->ask('Quelle est ma marge ce mois ?')->json('reply'));
    }

    public function test_how_to_and_unknown_questions(): void
    {
        $this->actingAsRole('caissier');

        $this->assertStringContainsString('Faire un retour', $this->ask('Comment faire un retour ?')->json('reply'));

        $unknown = $this->ask('Quelle est la capitale du Japon ?');
        $this->assertStringContainsString("Je n'ai pas bien compris", $unknown->json('reply'));
        $this->assertNotEmpty($unknown->json('suggestions'));
    }

    public function test_welcome_returns_insights(): void
    {
        $this->actingAsRole('admin');

        $this->getJson('/api/assistant/welcome')
            ->assertOk()
            ->assertJsonPath('mode', 'rules')
            ->assertJsonFragment(['text' => "1 produit(s) sous le seuil d'alerte"]);
    }

    public function test_it_falls_back_to_rules_when_the_ai_is_unreachable(): void
    {
        $this->actingAsRole('admin');
        config([
            'assistant.driver' => 'claude',
            'assistant.anthropic_key' => 'sk-test',
            'assistant.base_url' => 'http://127.0.0.1:9', // nothing listens here
        ]);

        $this->postJson('/api/assistant', ['message' => 'Que dois-je commander ?'])
            ->assertOk()
            ->assertJsonPath('source', 'rules')
            ->assertJsonPath('notice', 'Assistant IA indisponible pour le moment : réponse du mode hors ligne.');
    }
}
