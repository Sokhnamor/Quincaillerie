<?php

namespace App\Services\Assistant;

use Anthropic\Client;
use Anthropic\Messages\ToolUseBlock;
use App\Models\Setting;
use Carbon\Carbon;

/**
 * Assistant backed by Claude (Anthropic API). Enabled with
 * ASSISTANT_DRIVER=claude and ANTHROPIC_API_KEY in .env.
 *
 * Claude never touches the database: it calls the read-only tools below,
 * which Laravel executes through AssistantTools (same role rules as the app).
 */
class ClaudeAssistant
{
    private const MAX_TOOL_ROUNDS = 6;

    public function __construct(private AssistantTools $tools)
    {
    }

    /**
     * @param array<int, array{role: string, content: string}> $history previous text turns
     */
    public function answer(string $message, array $history, array $suggestions): array
    {
        $client = new Client(apiKey: config('assistant.anthropic_key'), baseUrl: config('assistant.base_url'));
        $model = config('assistant.model');

        $messages = [];
        foreach (array_slice($history, -10) as $turn) {
            $messages[] = ['role' => $turn['role'], 'content' => $turn['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        // Takes the conversation as a parameter: an arrow function would capture a stale copy
        $request = fn (array $messages) => $client->messages->create(
            model: $model,
            maxTokens: 4000,
            system: [['type' => 'text', 'text' => $this->systemPrompt(), 'cacheControl' => ['type' => 'ephemeral']]],
            // A chat assistant: low effort keeps answers fast and cheap
            outputConfig: ['effort' => 'low'],
            tools: $this->toolDefinitions(),
            messages: $messages,
        );

        $response = $request($messages);
        for ($round = 0; $response->stopReason === 'tool_use' && $round < self::MAX_TOOL_ROUNDS; $round++) {
            $results = [];
            foreach ($response->content as $block) {
                if ($block instanceof ToolUseBlock) {
                    $results[] = [
                        'type' => 'tool_result',
                        'toolUseID' => $block->id,
                        'content' => json_encode($this->runTool($block->name, (array) $block->input), JSON_UNESCAPED_UNICODE),
                    ];
                }
            }
            $messages[] = ['role' => 'assistant', 'content' => $response->content];
            $messages[] = ['role' => 'user', 'content' => $results];
            $response = $request($messages);
        }

        if ($response->stopReason === 'refusal') {
            throw new \RuntimeException('Claude a refusé de répondre à cette demande.');
        }

        $text = '';
        foreach ($response->content as $block) {
            if ($block->type === 'text') {
                $text .= $block->text;
            }
        }

        return [
            'reply' => trim($text) !== '' ? trim($text) : "Je n'ai pas pu formuler de réponse. Reformulez votre question.",
            'cards' => [],
            'actions' => [],
            'suggestions' => array_slice($suggestions, 0, 3),
            'source' => 'claude',
        ];
    }

    private function systemPrompt(): string
    {
        $shop = Setting::get('company_name', 'la quincaillerie');
        $currency = Setting::get('currency', 'FCFA');
        $today = now()->locale('fr')->translatedFormat('l j F Y');
        $role = $this->tools->canManage()
            ? 'gestionnaire ou administrateur : il peut voir les prix d\'achat et les marges'
            : 'caissier : les prix d\'achat et les marges lui sont cachés (les outils renvoient null) ; dis-lui simplement que ces informations sont réservées aux gestionnaires';

        return <<<PROMPT
        Tu es l'assistant de gestion de « {$shop} », une quincaillerie au Sénégal. Nous sommes le {$today}. Les montants sont en {$currency}.
        L'utilisateur est {$role}.

        Tu aides à piloter le magasin : stock, réapprovisionnement, ventes, dettes des clients, caisse, et utilisation de l'application
        (point de vente, devis, retours, clôture de caisse, approvisionnements, rapports).

        Règles :
        - Pour tout chiffre (stock, ventes, dettes…), utilise les outils. N'invente jamais une donnée ; si un outil ne renvoie rien, dis-le.
        - Réponds en français, de façon courte et concrète, comme un collègue expérimenté au comptoir.
        - Mets en gras (**texte**) les chiffres importants. Pas de tableaux markdown : utilise des listes courtes avec « • ».
        - Les dates des outils sont au format AAAA-MM-JJ ; affiche-les au format JJ/MM/AAAA.
        - Tu ne peux rien modifier dans l'application : pour agir, indique dans quel menu aller.
        PROMPT;
    }

    private function toolDefinitions(): array
    {
        $period = [
            'start_date' => ['type' => 'string', 'description' => 'Début de période, AAAA-MM-JJ'],
            'end_date' => ['type' => 'string', 'description' => 'Fin de période incluse, AAAA-MM-JJ'],
        ];

        return [
            ['name' => 'restock_suggestions', 'description' => 'Produits sous leur seuil d\'alerte ou en rupture, avec les ventes des 30 derniers jours et une quantité à commander suggérée.', 'inputSchema' => ['type' => 'object']],
            ['name' => 'sales_summary', 'description' => 'Nombre de ventes, chiffre d\'affaires net TTC, encaissements, reste à encaisser et marge (gestionnaires) sur une période, avec l\'évolution par rapport à la période précédente de même durée.', 'inputSchema' => ['type' => 'object', 'properties' => $period, 'required' => ['start_date', 'end_date']]],
            ['name' => 'find_products', 'description' => 'Recherche des produits par nom ou référence : stock, seuil, prix de vente, prix de gros, prix d\'achat (gestionnaires).', 'inputSchema' => ['type' => 'object', 'properties' => ['query' => ['type' => 'string', 'description' => 'Mots du nom ou référence, ex. « ciment 50 »']], 'required' => ['query']]],
            ['name' => 'product_sales', 'description' => 'Quantité vendue et chiffre d\'affaires HT d\'un produit sur une période.', 'inputSchema' => ['type' => 'object', 'properties' => ['product_id' => ['type' => 'integer'], ...$period], 'required' => ['product_id', 'start_date', 'end_date']]],
            ['name' => 'top_products', 'description' => 'Produits les plus vendus (en quantité) sur une période.', 'inputSchema' => ['type' => 'object', 'properties' => [...$period, 'limit' => ['type' => 'integer', 'description' => '5 par défaut']], 'required' => ['start_date', 'end_date']]],
            ['name' => 'sleeping_products', 'description' => 'Produits en stock qui ne se sont pas vendus depuis N jours, avec la valeur immobilisée (gestionnaires).', 'inputSchema' => ['type' => 'object', 'properties' => ['days' => ['type' => 'integer', 'description' => '30 par défaut']]]],
            ['name' => 'debtors', 'description' => 'Clients qui doivent de l\'argent, du plus gros montant au plus petit, avec leur plafond de crédit.', 'inputSchema' => ['type' => 'object']],
            ['name' => 'find_client', 'description' => 'Fiche d\'un client par son nom : total acheté, dette actuelle, plafond de crédit, téléphone.', 'inputSchema' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string']], 'required' => ['name']]],
            ['name' => 'cash_today', 'description' => 'Encaissements du jour par moyen de paiement (espèces, Wave, Orange Money…).', 'inputSchema' => ['type' => 'object']],
        ];
    }

    private function runTool(string $name, array $input): mixed
    {
        $date = fn (string $key, string $default) => Carbon::parse($input[$key] ?? $default);
        $words = fn (string $key) => preg_split('/\s+/', trim((string) ($input[$key] ?? ''))) ?: [];

        try {
            return match ($name) {
                'restock_suggestions' => $this->tools->restockSuggestions(),
                'sales_summary' => $this->tools->salesSummary($date('start_date', 'first day of this month')->startOfDay(), $date('end_date', 'today')->endOfDay()),
                'find_products' => $this->tools->findProducts($words('query')),
                'product_sales' => $this->tools->productSales((int) ($input['product_id'] ?? 0), $date('start_date', 'first day of this month')->startOfDay(), $date('end_date', 'today')->endOfDay()),
                'top_products' => $this->tools->topProducts($date('start_date', 'first day of this month')->startOfDay(), $date('end_date', 'today')->endOfDay(), min(20, (int) ($input['limit'] ?? 5))),
                'sleeping_products' => $this->tools->sleepingProducts(max(1, (int) ($input['days'] ?? 30))),
                'debtors' => $this->tools->debtors(15),
                'find_client' => $this->tools->findClient($words('name')) ?? ['error' => 'Aucun client trouvé avec ce nom.'],
                'cash_today' => $this->tools->cashToday(),
                default => ['error' => "Outil inconnu : {$name}"],
            };
        } catch (\Throwable $e) {
            report($e);

            return ['error' => 'Impossible de récupérer ces données.'];
        }
    }
}
