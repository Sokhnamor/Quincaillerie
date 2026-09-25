<?php

namespace App\Services\Assistant;

use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * Offline assistant: understands common French questions with keyword rules
 * and answers from AssistantTools. No external service, no cost.
 */
class RulesAssistant
{
    private const MONTHS = [
        'janvier' => 1, 'fevrier' => 2, 'mars' => 3, 'avril' => 4, 'mai' => 5, 'juin' => 6,
        'juillet' => 7, 'aout' => 8, 'septembre' => 9, 'octobre' => 10, 'novembre' => 11, 'decembre' => 12,
    ];

    /** Words that never name a product or a client */
    private const STOPWORDS = [
        'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'au', 'aux', 'en', 'et', 'ou', 'a', 'ce', 'cet', 'cette', 'ces',
        'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
        'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'moi', 'te', 'se', 'y', 'qui', 'que', 'quoi', 'quel', 'quelle', 'quels', 'quelles',
        'est', 'sont', 'ai', 'as', 'avons', 'avez', 'ont', 'etait', 'sera', 'faut', 'peux', 'peut', 'puis', 'dois', 'doit', 'veux', 'voudrais',
        'combien', 'comment', 'pourquoi', 'quand', 'ou', 'reste', 'restant', 'restants', 'il', 'y', 'encore', 'bien', 'tres', 'plus', 'moins', 'pas', 'ne',
        'stock', 'stocks', 'quantite', 'prix', 'coute', 'coutent', 'vendu', 'vendus', 'vendue', 'vendues', 'vente', 'ventes', 'vend', 'avons', 'magasin',
        'dispo', 'disponible', 'disponibles', 'donne', 'donner', 'montre', 'affiche', 'voir', 'dis', 'savoir', 'svp', 'stp', 'merci', 'bonjour', 'salut',
        'aujourd', 'hui', 'hier', 'semaine', 'mois', 'annee', 'dernier', 'derniere', 'passe', 'passee', 'jour', 'jours', 'depuis', 'pour', 'sur', 'dans', 'par', 'avec',
        'client', 'clients', 'produit', 'produits', 'article', 'articles', 'sac', 'sacs', 'piece', 'pieces', 'relance', 'relancer', 'message', 'ecris', 'redige', 'rediger',
        'info', 'infos', 'information', 'informations', 'fiche', 'sur', 'tout', 'tous', 'toutes', 'cela', 'ca',
    ];

    private string $currency;

    public function __construct(private AssistantTools $tools)
    {
        $this->currency = Setting::get('currency', 'FCFA');
    }

    public function answer(string $message): array
    {
        $text = $this->normalize($message);
        $words = $this->words($text);

        return match (true) {
            $text === '' => $this->fallback(),
            $this->has($text, ['comment ', 'comment faire', 'aide moi a', 'ou trouver', 'ou est', 'expliquer', 'explique']) && ($help = $this->howTo($text)) !== null => $help,
            $this->has($text, ['relance', 'relancer', 'rappel de paiement', 'message pour']) => $this->reminder($words),
            $this->has($text, ['commander', 'reapprovision', 'rupture', 'manque', 'alerte', 'stock faible', 'acheter', 'racheter', 'recommander', 'bientot fini', 'epuise']) => $this->restock(),
            $this->has($text, ['doit', 'dette', 'credit', 'impaye', 'creance', 'pas paye', 'reste a payer', 'debiteur']) && !$this->mentionsProduct($words) => $this->debts($words),
            $this->has($text, ['dormant', 'ne se vend', 'invendu', 'se vendent pas', 'ne bouge', 'pas vendu', 'moins vendu']) => $this->sleeping(),
            $this->has($text, ['meilleur', 'plus vendu', 'top', 'populaire', 'marche le mieux', 'se vend le mieux', 'best']) => $this->top($text),
            $this->has($text, ['caisse', 'encaisse', 'espece', 'wave', 'orange money', 'tiroir']) => $this->cash(),
            $this->has($text, ['marge', 'benefice', 'gagne', 'rentab']) => $this->margin($text),
            $this->has($text, ['combien de', 'quantite de', 'nombre de']) && $this->has($text, ['vendu', 'vente']) && $this->mentionsProduct($words) => $this->productSold($text, $words),
            $this->has($text, ['vente', 'vendu', 'chiffre', ' ca ', 'recette', 'resultat', 'bilan', 'combien on a fait', 'performance']) => $this->sales($text),
            $this->has($text, ['bonjour', 'salut', 'bonsoir', 'hello', 'coucou']) && count($words) <= 3 => $this->greeting(),
            $this->has($text, ['aide', 'que peux', 'que sais', 'tu sais faire', 'tu peux faire', 'quoi faire', 'fonction']) => $this->capabilities(),
            ($product = $this->productAnswer($words)) !== null => $product,
            ($client = $this->clientAnswer($words)) !== null => $client,
            default => $this->fallback(),
        };
    }

    public function suggestions(): array
    {
        $base = ['Que dois-je commander ?', 'Ventes du jour', 'Ventes de ce mois', 'Qui me doit de l\'argent ?', 'Meilleures ventes du mois', 'Produits qui ne se vendent pas'];
        if ($this->tools->canManage()) {
            $base[] = 'Quelle est ma marge ce mois ?';
        }
        $base[] = 'Comment faire un retour ?';

        return $base;
    }

    // ---------------------------------------------------------------- intents

    private function greeting(): array
    {
        $hour = now()->hour;
        $hello = $hour < 18 ? 'Bonjour' : 'Bonsoir';

        return $this->reply(
            "{$hello} ! Je suis l'assistant de gestion de votre quincaillerie. Posez-moi une question sur le stock, les ventes, les clients ou l'utilisation de l'application.",
            [],
            [],
            array_slice($this->suggestions(), 0, 4)
        );
    }

    private function capabilities(): array
    {
        $lines = [
            '• **Stock** : « Que dois-je commander ? », « Stock du ciment »',
            '• **Ventes** : « Ventes d\'hier », « Chiffre d\'affaires d\'août », « Combien de ciment vendu ce mois ? »',
            '• **Clients** : « Qui me doit de l\'argent ? », « Relance Amadou »',
            '• **Analyse** : « Meilleures ventes », « Produits qui ne se vendent pas »' . ($this->tools->canManage() ? ', « Ma marge ce mois »' : ''),
            '• **Caisse** : « Combien en caisse aujourd\'hui ? »',
            '• **Aide** : « Comment faire un devis ? », « Comment clôturer la caisse ? »',
        ];

        return $this->reply("Voici ce que je sais faire :\n" . implode("\n", $lines), [], [], array_slice($this->suggestions(), 0, 4));
    }

    private function restock(): array
    {
        $items = $this->tools->restockSuggestions();
        if (!$items) {
            return $this->reply('Bonne nouvelle : **aucun produit n\'est sous son seuil d\'alerte**. Rien d\'urgent à commander.', [], [], ['Produits qui ne se vendent pas', 'Meilleures ventes du mois']);
        }

        $out = count(array_filter($items, fn ($i) => $i['stock'] <= 0));
        $text = count($items) . ' produit(s) à réapprovisionner' . ($out ? ", dont **{$out} en rupture**" : '') . '. Quantités suggérées pour couvrir environ un mois de ventes :';

        $cards = [$this->list('À commander', array_map(fn ($i) => [
            'title' => $i['name'],
            'subtitle' => 'Stock ' . $i['stock'] . ' ' . $i['unit'] . ' · vendus en 30 j : ' . $i['sold_30_days'] . ($i['supplier'] ? ' · ' . $i['supplier'] : ''),
            'value' => '+' . $i['suggested_quantity'] . ' ' . $i['unit'],
            'tone' => $i['stock'] <= 0 ? 'danger' : 'warning',
        ], $items))];

        $total = array_sum(array_map(fn ($i) => $i['estimated_cost'] ?? 0, $items));
        if ($this->tools->canManage() && $total > 0) {
            $text .= "\n\nCoût estimé de la commande : **" . $this->money($total) . '** (au dernier prix d\'achat).';
        }

        $actions = $this->tools->canManage()
            ? [['label' => 'Créer l\'approvisionnement', 'icon' => 'fa-truck-ramp-box', 'link' => '/purchases', 'query' => ['new' => 1]]]
            : [['label' => 'Voir les produits en alerte', 'icon' => 'fa-boxes-stacked', 'link' => '/products', 'query' => ['stock_status' => 'alert']]];

        return $this->reply($text, $cards, $actions, ['Produits qui ne se vendent pas', 'Meilleures ventes du mois']);
    }

    private function sales(string $text): array
    {
        [$start, $end, $label] = $this->period($text);
        $s = $this->tools->salesSummary($start, $end);

        if ($s['count'] === 0) {
            return $this->reply("Aucune vente enregistrée **{$label}**.", [], [], ['Ventes de ce mois', 'Ventes du mois dernier']);
        }

        $trend = $s['growth'] === null ? '' : ' (' . ($s['growth'] >= 0 ? '+' : '') . str_replace('.', ',', (string) $s['growth']) . ' % par rapport à la période précédente)';
        $reply = '**' . Str::ucfirst($label) . "** : {$s['count']} vente(s) pour **" . $this->money($s['net']) . "**{$trend}.";

        $stats = [
            ['label' => 'Chiffre d\'affaires', 'value' => $this->money($s['net'])],
            ['label' => 'Encaissé (y compris anciens crédits)', 'value' => $this->money($s['collected'])],
            ['label' => 'Reste à encaisser', 'value' => $this->money($s['unpaid'])],
        ];
        if ($s['margin'] !== null) {
            $stats[] = ['label' => 'Marge estimée', 'value' => $this->money($s['margin'])];
        }

        $top = $this->tools->topProducts($start, $end, 3);
        $cards = [['type' => 'stats', 'items' => $stats]];
        if ($top) {
            $cards[] = $this->list('Les plus vendus', array_map(fn ($p) => ['title' => $p['name'], 'value' => $p['quantity'] . ' ' . $p['unit']], $top));
        }

        $actions = [['label' => 'Voir les ventes', 'icon' => 'fa-receipt', 'link' => '/sales', 'query' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString()]]];
        if ($this->tools->canManage()) {
            $actions[] = ['label' => 'Rapport détaillé', 'icon' => 'fa-chart-pie', 'link' => '/reports'];
        }

        return $this->reply($reply, $cards, $actions, ['Meilleures ventes du mois', 'Qui me doit de l\'argent ?']);
    }

    private function margin(string $text): array
    {
        if (!$this->tools->canManage()) {
            return $this->reply('Les marges et les prix d\'achat sont réservés aux gestionnaires et administrateurs.', [], [], ['Ventes du jour', 'Que dois-je commander ?']);
        }

        [$start, $end, $label] = $this->period($text);
        $s = $this->tools->salesSummary($start, $end);
        $rate = $s['net'] > 0 ? round($s['margin'] / $s['net'] * 100, 1) : 0;

        return $this->reply(
            "Marge brute estimée **{$label}** : **" . $this->money($s['margin']) . '** sur ' . $this->money($s['net']) . " de ventes (environ {$rate} % du CA TTC).\n\nElle est calculée avec le prix d'achat actuel de chaque produit.",
            [],
            [['label' => 'Rapport détaillé', 'icon' => 'fa-chart-pie', 'link' => '/reports']],
            ['Meilleures ventes du mois', 'Produits qui ne se vendent pas']
        );
    }

    private function top(string $text): array
    {
        [$start, $end, $label] = $this->period($text);
        $top = $this->tools->topProducts($start, $end, 8);

        if (!$top) {
            return $this->reply("Aucune vente **{$label}**, je ne peux pas encore faire de classement.", [], [], ['Meilleures ventes du mois dernier']);
        }

        $rows = array_map(fn ($p, $i) => [($i + 1), $p['name'], $p['quantity'] . ' ' . $p['unit'], $this->money($p['revenue'])], $top, array_keys($top));

        return $this->reply(
            "Meilleures ventes **{$label}** : c'est **{$top[0]['name']}** qui arrive en tête.",
            [$this->table('Classement', ['#', 'Produit', 'Quantité', 'CA HT'], $rows)],
            [],
            ['Produits qui ne se vendent pas', 'Que dois-je commander ?']
        );
    }

    private function sleeping(): array
    {
        $items = $this->tools->sleepingProducts(30);
        if (!$items) {
            return $this->reply('Tous les produits en stock se sont vendus au moins une fois ces 30 derniers jours. 👍', [], [], ['Meilleures ventes du mois']);
        }

        $total = array_sum(array_map(fn ($i) => $i['tied_up'] ?? 0, $items));
        $text = count($items) . " produit(s) en stock **sans aucune vente depuis 30 jours**.";
        if ($total > 0) {
            $text .= ' Ils immobilisent environ **' . $this->money($total) . '** (valeur d\'achat).';
        }
        $text .= "\n\nIdées : les mettre en avant au comptoir, faire une promotion ou éviter de les recommander.";

        return $this->reply(
            $text,
            [$this->list('Stock dormant', array_map(fn ($i) => ['title' => $i['name'], 'subtitle' => $i['stock'] . ' ' . $i['unit'] . ' en stock', 'value' => $i['tied_up'] !== null ? $this->money($i['tied_up']) : null], $items))],
            [],
            ['Meilleures ventes du mois', 'Que dois-je commander ?']
        );
    }

    private function debts(array $words): array
    {
        // "Combien doit Amadou ?" → a single client
        if (($client = $this->tools->findClient($this->meaningful($words))) !== null) {
            return $this->clientCard($client);
        }

        $debtors = $this->tools->debtors();
        if (!$debtors) {
            return $this->reply('Aucun client ne vous doit d\'argent. Toutes les ventes à crédit sont soldées. ✅', [], [], ['Ventes du jour']);
        }

        $total = array_sum(array_column($debtors, 'due'));
        $over = array_filter($debtors, fn ($d) => $d['over_limit']);
        $text = count($debtors) . ' client(s) vous doivent au total **' . $this->money($total) . '**.';
        if ($over) {
            $text .= ' ⚠️ ' . count($over) . ' dépasse(nt) leur plafond de crédit.';
        }

        $items = array_map(fn ($d) => [
            'title' => $d['name'],
            'subtitle' => $d['sales'] . ' vente(s) · depuis le ' . Carbon::parse($d['oldest'])->format('d/m/Y') . ($d['over_limit'] ? ' · plafond dépassé' : ''),
            'value' => $this->money($d['due']),
            'tone' => $d['over_limit'] ? 'danger' : 'warning',
            'whatsapp' => $this->whatsapp($d['phone'], $this->reminderText($d['name'], $d['due'])),
        ], $debtors);

        return $this->reply(
            $text,
            [$this->list('Créances clients', $items)],
            [['label' => 'Ventes à encaisser', 'icon' => 'fa-hand-holding-dollar', 'link' => '/sales', 'query' => ['status' => 'due']]],
            ['Relance ' . $debtors[0]['name'], 'Ventes du jour']
        );
    }

    private function reminder(array $words): array
    {
        $client = $this->tools->findClient($this->meaningful($words));
        if (!$client) {
            $top = $this->tools->debtors(3);
            return $this->reply(
                'Pour quel client voulez-vous un message de relance ? Écrivez par exemple « Relance ' . ($top[0]['name'] ?? 'Amadou') . ' ».',
                [],
                [],
                array_map(fn ($d) => 'Relance ' . $d['name'], $top)
            );
        }

        if ($client['due'] <= 0) {
            return $this->reply("**{$client['name']}** ne vous doit rien actuellement : pas besoin de relance. ✅", [], [], ['Qui me doit de l\'argent ?']);
        }

        $message = $this->reminderText($client['name'], $client['due']);
        $actions = [];
        if ($wa = $this->whatsapp($client['phone'], $message)) {
            $actions[] = ['label' => 'Envoyer sur WhatsApp', 'icon' => 'fa-whatsapp', 'brand' => true, 'href' => $wa];
        }

        return $this->reply(
            "Voici un message de relance pour **{$client['name']}**" . ($client['phone'] ? '' : ' (aucun numéro enregistré : copiez le message)') . ' :',
            [['type' => 'quote', 'text' => $message]],
            $actions,
            ['Qui me doit de l\'argent ?']
        );
    }

    private function cash(): array
    {
        $c = $this->tools->cashToday();
        $labels = ['cash' => 'Espèces', 'wave' => 'Wave', 'orange_money' => 'Orange Money', 'card' => 'Carte', 'transfer' => 'Virement', 'cheque' => 'Chèque'];

        if ($c['total'] == 0.0) {
            return $this->reply('Aucun encaissement aujourd\'hui pour l\'instant.', [], [['label' => 'Clôture de caisse', 'icon' => 'fa-vault', 'link' => '/cash']], ['Ventes du jour']);
        }

        $stats = [];
        foreach ($c['by_method'] as $method => $amount) {
            $stats[] = ['label' => $labels[$method] ?? $method, 'value' => $this->money($amount)];
        }

        return $this->reply(
            "Aujourd'hui : **" . $this->money($c['total']) . "** encaissés sur {$c['sales_count']} vente(s). Dans le tiroir, il devrait y avoir **" . $this->money($c['by_method']['cash'] ?? 0) . '** en espèces.',
            [['type' => 'stats', 'items' => $stats]],
            [['label' => 'Clôturer la caisse', 'icon' => 'fa-vault', 'link' => '/cash']],
            ['Ventes du jour']
        );
    }

    private function productSold(string $text, array $words): array
    {
        [$start, $end, $label] = $this->period($text);
        $products = $this->tools->findProducts($this->meaningful($words), 1);
        if (!$products) {
            return $this->fallback();
        }
        $p = $products[0];
        $s = $this->tools->productSales($p['id'], $start, $end);

        return $this->reply(
            "**{$p['name']}** {$label} : **{$s['quantity']} {$p['unit']}** vendu(s) en {$s['sales']} vente(s), pour " . $this->money($s['revenue']) . ' HT. Il en reste ' . $p['stock'] . ' ' . $p['unit'] . ' en stock.',
            [],
            [['label' => 'Fiche produit', 'icon' => 'fa-box', 'link' => '/products', 'query' => ['search' => $p['reference'] ?? $p['name']]]],
            ['Meilleures ventes du mois']
        );
    }

    private function productAnswer(array $words): ?array
    {
        $products = $this->tools->findProducts($this->meaningful($words));
        if (!$products) {
            return null;
        }

        $status = ['in_stock' => 'En stock', 'low_stock' => 'Stock faible', 'out_of_stock' => 'Rupture'];
        $tone = ['in_stock' => 'success', 'low_stock' => 'warning', 'out_of_stock' => 'danger'];

        if (count($products) === 1) {
            $p = $products[0];
            $text = "**{$p['name']}** : **{$p['stock']} {$p['unit']}** en stock (seuil d'alerte {$p['threshold']}). Prix de vente : " . $this->money($p['selling_price']) . ' HT';
            if ($p['wholesale_price'] !== null) {
                $text .= ', prix de gros ' . $this->money($p['wholesale_price']);
            }
            if ($p['purchase_price'] !== null) {
                $text .= ', prix d\'achat ' . $this->money($p['purchase_price']);
            }
            $text .= '.';
            if ($p['status'] !== 'in_stock') {
                $text .= "\n\n⚠️ Ce produit est en **" . mb_strtolower($status[$p['status']]) . '** : pensez à le commander.';
            }

            return $this->reply($text, [], [['label' => 'Fiche produit', 'icon' => 'fa-box', 'link' => '/products', 'query' => ['search' => $p['reference'] ?? $p['name']]]], ['Combien de ' . $this->shortName($p['name']) . ' vendu ce mois ?', 'Que dois-je commander ?']);
        }

        return $this->reply(
            count($products) . ' produits correspondent à votre recherche :',
            [$this->list('Produits', array_map(fn ($p) => [
                'title' => $p['name'],
                'subtitle' => ($p['category'] ?? '') . ' · ' . $this->money($p['selling_price']),
                'value' => $p['stock'] . ' ' . $p['unit'],
                'tone' => $tone[$p['status']],
            ], $products))],
            [],
            ['Que dois-je commander ?']
        );
    }

    private function clientAnswer(array $words): ?array
    {
        $client = $this->tools->findClient($this->meaningful($words));

        return $client ? $this->clientCard($client) : null;
    }

    private function clientCard(array $c): array
    {
        $text = "**{$c['name']}**" . ($c['type'] === 'professionnel' ? ' (professionnel)' : '') . " : {$c['sales_count']} achat(s) pour " . $this->money($c['total_spent']) . '.';
        $text .= $c['due'] > 0 ? "\nIl reste **" . $this->money($c['due']) . '** à payer.' : "\nAucune dette en cours. ✅";
        if ($c['credit_limit'] !== null) {
            $text .= "\nPlafond de crédit : " . $this->money($c['credit_limit']) . ($c['due'] > $c['credit_limit'] ? ' — **dépassé**.' : '.');
        }

        $suggestions = $c['due'] > 0 ? ['Relance ' . $c['name']] : [];
        $suggestions[] = 'Qui me doit de l\'argent ?';

        return $this->reply($text, [], [['label' => 'Voir ses achats', 'icon' => 'fa-receipt', 'link' => '/sales', 'query' => ['search' => $c['name']]]], $suggestions);
    }

    /** Step-by-step help on using the app */
    private function howTo(string $text): ?array
    {
        $guides = [
            ['keys' => ['retour', 'rembours', 'avoir', 'rapporte'], 'title' => 'Faire un retour de marchandise', 'steps' => [
                'Ouvrez **Ventes** et cliquez sur la vente concernée.',
                'En bas du panneau, cliquez sur **Retour**.',
                'Indiquez la quantité rapportée pour chaque article et le motif.',
                'Validez : l\'article revient en stock, un **avoir** est créé et l\'application indique s\'il faut rendre de l\'argent.',
            ], 'link' => '/sales'],
            ['keys' => ['devis', 'proforma'], 'title' => 'Faire un devis', 'steps' => [
                'Ouvrez **Devis** puis **Nouveau devis** (ou, au point de vente, remplissez le panier et cliquez sur **Devis**).',
                'Choisissez le client ou tapez le nom du prospect, puis ajoutez les produits et les lignes libres (transport…).',
                'Enregistrez, téléchargez le PDF ou envoyez-le par WhatsApp.',
                'Quand le client accepte : **Convertir en vente**. Le stock n\'est déduit qu\'à ce moment-là.',
            ], 'link' => '/quotes'],
            ['keys' => ['clotur', 'fermer la caisse', 'fin de journee', 'compter'], 'title' => 'Clôturer la caisse', 'steps' => [
                'Ouvrez **Caisse** en fin de journée.',
                'Vérifiez les encaissements par moyen de paiement et les **espèces attendues**.',
                'Comptez le tiroir (l\'**aide au comptage** calcule le total billet par billet).',
                'Cliquez sur **Clôturer la caisse** : l\'écart éventuel est enregistré dans l\'historique.',
            ], 'link' => '/cash'],
            ['keys' => ['approvision', 'livraison', 'reception', 'fournisseur livre', 'commande fournisseur'], 'title' => 'Enregistrer une livraison fournisseur', 'steps' => [
                'Ouvrez **Approvisionnements** puis **Nouvel approvisionnement**.',
                'Choisissez le fournisseur ; cliquez sur **Ajouter les produits en alerte** ou recherchez les produits.',
                'Vérifiez les quantités reçues et les coûts, puis **Valider la réception** : le stock augmente.',
            ], 'link' => '/purchases', 'manage' => true],
            ['keys' => ['paiement', 'payer le reste', 'versement', 'encaisser le reste'], 'title' => 'Enregistrer un paiement sur une vente à crédit', 'steps' => [
                'Ouvrez **Ventes**, filtre **À encaisser**, puis cliquez sur la vente.',
                'Dans **Enregistrer un paiement**, choisissez le moyen (Wave, espèces…) et le montant.',
                'Cliquez sur **Encaisser** : le statut passe à **Payée** quand tout est réglé.',
            ], 'link' => '/sales'],
            ['keys' => ['imprim', 'facture', 'ticket'], 'title' => 'Imprimer une facture', 'steps' => [
                'Juste après une vente au point de vente : bouton **Imprimer**.',
                'Plus tard : **Ventes** → cliquez sur la vente → **Imprimer** (ou le menu **PDF** pour un autre format).',
                'Le format par défaut (ticket 80 mm, A5 ou A4) se règle dans **Paramètres**.',
            ], 'link' => '/sales'],
            ['keys' => ['vendre', 'vente', 'encaisser', 'point de vente'], 'title' => 'Faire une vente', 'steps' => [
                'Ouvrez **Point de vente** (ou le bouton **Nouvelle vente** en haut).',
                'Cliquez sur les produits pour les ajouter au panier ; choisissez le client si besoin.',
                'Cliquez sur **Encaisser**, choisissez le moyen de paiement et le montant reçu.',
                'Validez puis imprimez le ticket.',
            ], 'link' => '/pos'],
            ['keys' => ['ajouter un produit', 'nouveau produit', 'creer un produit', 'produit'], 'title' => 'Ajouter un produit', 'steps' => [
                'Ouvrez **Produits** puis **Nouveau produit**.',
                'Renseignez la désignation, la catégorie, les prix (vente, achat, gros) et le seuil d\'alerte.',
                'Le stock initial est enregistré dans le journal des mouvements.',
            ], 'link' => '/products', 'manage' => true],
            ['keys' => ['client'], 'title' => 'Ajouter un client', 'steps' => [
                'Ouvrez **Clients** puis **Nouveau client** (ou le bouton 👤+ au point de vente).',
                'Choisissez **Professionnel** pour lui appliquer les prix de gros, et un **plafond de crédit** si besoin.',
            ], 'link' => '/clients'],
        ];

        foreach ($guides as $guide) {
            if ($this->has($text, $guide['keys'])) {
                if (($guide['manage'] ?? false) && !$this->tools->canManage()) {
                    return $this->reply("Cette opération (« {$guide['title']} ») est réservée aux gestionnaires et administrateurs.", [], [], $this->suggestions());
                }
                $steps = implode("\n", array_map(fn ($s, $i) => ($i + 1) . '. ' . $s, $guide['steps'], array_keys($guide['steps'])));

                return $this->reply("**{$guide['title']}**\n{$steps}", [], [['label' => 'Y aller', 'icon' => 'fa-arrow-right', 'link' => $guide['link']]], ['Que peux-tu faire ?']);
            }
        }

        return null;
    }

    private function fallback(): array
    {
        return $this->reply(
            "Je n'ai pas bien compris. Je réponds aux questions sur **le stock, les ventes, les clients, la caisse** et l'utilisation de l'application. Essayez une de ces questions :",
            [],
            [],
            array_slice($this->suggestions(), 0, 5)
        );
    }

    // ---------------------------------------------------------------- parsing

    private function normalize(string $message): string
    {
        $text = Str::lower(Str::ascii($message));
        $text = preg_replace('/[^a-z0-9\s]/', ' ', $text);

        return ' ' . trim(preg_replace('/\s+/', ' ', $text)) . ' ';
    }

    private function words(string $text): array
    {
        return array_values(array_filter(explode(' ', trim($text))));
    }

    /** Words that may name a product or a client */
    private function meaningful(array $words): array
    {
        $skip = array_merge(self::STOPWORDS, array_keys(self::MONTHS), ['doit', 'dette', 'dettes', 'credit', 'paye', 'combien', 'argent', 'nombre', 'mieux', 'bonsoir']);

        return array_values(array_filter($words, fn ($w) => !in_array($w, $skip, true) && !ctype_digit($w) && mb_strlen($w) >= 3));
    }

    private function mentionsProduct(array $words): bool
    {
        return (bool) $this->tools->findProducts($this->meaningful($words), 1);
    }

    private function has(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($text, $needle)) {
                return true;
            }
        }

        return false;
    }

    /** @return array{0: Carbon, 1: Carbon, 2: string} */
    private function period(string $text): array
    {
        $now = now();

        if ($this->has($text, [' aujourd hui ', ' ce jour ', ' du jour ', ' today '])) {
            return [$now->copy()->startOfDay(), $now, "aujourd'hui"];
        }
        if ($this->has($text, [' hier '])) {
            return [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay(), 'hier'];
        }
        if ($this->has($text, ['semaine derniere', 'semaine passee'])) {
            $s = $now->copy()->subWeek()->startOfWeek();
            return [$s, $s->copy()->endOfWeek(), 'la semaine dernière'];
        }
        if ($this->has($text, ['semaine', '7 jours', '7 derniers'])) {
            return [$now->copy()->startOfWeek(), $now, 'cette semaine'];
        }
        if ($this->has($text, ['mois dernier', 'mois passe', 'mois precedent'])) {
            $s = $now->copy()->subMonthNoOverflow()->startOfMonth();
            return [$s, $s->copy()->endOfMonth(), 'le mois dernier (' . $s->locale('fr')->translatedFormat('F Y') . ')'];
        }
        foreach (self::MONTHS as $name => $num) {
            if (preg_match('/ ' . $name . '(?: (\d{4}))? /', $text, $m)) {
                $year = isset($m[1]) ? (int) $m[1] : ($num > $now->month ? $now->year - 1 : $now->year);
                $s = Carbon::create($year, $num, 1)->startOfMonth();
                return [$s, $s->copy()->endOfMonth()->min($now), 'en ' . $s->locale('fr')->translatedFormat('F Y')];
            }
        }
        if ($this->has($text, ['annee derniere'])) {
            $s = $now->copy()->subYear()->startOfYear();
            return [$s, $s->copy()->endOfYear(), 'l\'année dernière'];
        }
        if ($this->has($text, ['annee', ' an '])) {
            return [$now->copy()->startOfYear(), $now, 'cette année'];
        }

        return [$now->copy()->startOfMonth(), $now, 'ce mois-ci'];
    }

    // ---------------------------------------------------------------- output

    private function reply(string $text, array $cards = [], array $actions = [], array $suggestions = []): array
    {
        return [
            'reply' => $text,
            'cards' => $cards,
            'actions' => $actions,
            'suggestions' => array_values(array_unique($suggestions)),
            'source' => 'rules',
        ];
    }

    private function table(string $title, array $columns, array $rows): array
    {
        return ['type' => 'table', 'title' => $title, 'columns' => $columns, 'rows' => $rows];
    }

    private function list(string $title, array $items): array
    {
        return ['type' => 'list', 'title' => $title, 'items' => $items];
    }

    private function money(float|int|null $value): string
    {
        return number_format((float) $value, 0, ',', ' ') . ' ' . $this->currency;
    }

    private function shortName(string $name): string
    {
        return mb_strtolower(explode(' ', $name)[0]);
    }

    private function reminderText(string $name, float $due): string
    {
        $shop = Setting::get('company_name', 'la quincaillerie');

        return "Bonjour {$name},\n\nSauf erreur de notre part, il reste " . $this->money($due) . " à régler sur vos achats chez {$shop}.\nVous pouvez payer au magasin, par Wave ou par Orange Money.\n\nMerci et bonne journée !";
    }

    private function whatsapp(?string $phone, string $message): ?string
    {
        $digits = preg_replace('/[^\d+]/', '', (string) $phone);
        if ($digits === '') {
            return null;
        }
        if (str_starts_with($digits, '+')) {
            $digits = substr($digits, 1);
        } elseif (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        } elseif (strlen($digits) === 9) {
            $digits = '221' . $digits;
        }

        return 'https://wa.me/' . $digits . '?text=' . rawurlencode($message);
    }
}
