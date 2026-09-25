# Quincaillerie Pro

Application web de gestion de quincaillerie : point de vente, stock, factures, paiements, approvisionnements, clients et fournisseurs.

| Couche | Technologie |
|---|---|
| Backend | Laravel 12 (API REST), Sanctum (jetons), DomPDF, Laravel Excel |
| Frontend | Angular 18 (composants standalone, signals), Chart.js, SweetAlert2 |
| Base de données | MySQL 8 (SQLite en mémoire pour les tests) |

## Fonctionnalités

- **Point de vente** : grille produits, panier, espèces / Wave / Orange Money / carte, calcul de la monnaie, vente à crédit, prix de gros automatique, impression du ticket.
- **Ventes** : filtres (statut, dates, recherche), totaux encaissés / restant dus, paiements échelonnés, annulation avec remise en stock, exports Excel et PDF, envoi par WhatsApp.
- **Retours / avoirs** : retour partiel d'articles, remise en stock, avoir PDF, remboursement automatique si le client a trop payé.
- **Devis / proformas** : chiffrage sans impact sur le stock, lignes libres (transport, main d'œuvre), PDF, suivi (envoyé, accepté…), conversion en vente en un clic.
- **Factures** : ticket 80 mm (imprimante thermique), A5 ou A4, montant en toutes lettres.
- **Clients** : particuliers / professionnels (prix de gros), plafond de crédit, suivi des dettes, relance WhatsApp.
- **Clôture de caisse** : encaissements du jour par moyen de paiement, comptage des billets, écart constaté, historique.
- **Rapports** : CA net, marge, panier moyen, ventes par jour / catégorie / vendeur / moyen de paiement, top produits, stock dormant, export Excel.
- **Stock** : alertes de seuil, ajustements motivés (inventaire, casse…), journal complet des mouvements, historique par produit.
- **Approvisionnements** : réception fournisseur qui met à jour stock et prix d'achat, ajout automatique des produits en alerte.
- **Tableau de bord** : CA du jour / du mois, encaissements, créances, marge, graphiques 12 mois / 30 jours, top produits.
- **Administration** : utilisateurs et rôles, activation / désactivation, paramètres de l'entreprise (NINEA, RCCM, TVA, format de facture), correction d'un paiement erroné, sauvegardes de la base (automatiques chaque soir + manuelles).
- Mode sombre, interface responsive (mobile / tablette).

## Rôles

| Rôle | Accès |
|---|---|
| Administrateur | Tout, y compris utilisateurs et paramètres |
| Gestionnaire | Catalogue, stock, approvisionnements, rapports, annulation de ventes, exports |
| Caissier | Point de vente, ventes, paiements, retours, devis, clôture de caisse, clients (lecture seule du catalogue) |

Toutes les routes de l'API exigent une connexion, sauf `/api/login` (limitée à 5 tentatives par minute).

## Installation

Prérequis : PHP 8.2+, Composer, Node.js 18+, MySQL 8 (WAMP/XAMPP convient).

### Backend

```bash
cd backend
composer install
cp .env.example .env          # puis renseigner DB_DATABASE, DB_USERNAME, DB_PASSWORD
php artisan key:generate
php artisan migrate --seed    # crée les tables, les rôles et les comptes de démonstration
php artisan serve             # http://127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm install
npm start                     # http://localhost:4200
```

L'URL de l'API se règle dans `frontend/src/environments/environment.ts`.

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@quincaillerie.fr | password123 |
| Gestionnaire | gestionnaire@quincaillerie.fr | password123 |
| Caissier | caissier@quincaillerie.fr | password123 |

Ils apparaissent en accès rapide sur la page de connexion en développement (`environment.ts`). Le build de production (`environment.prod.ts`) ne les contient pas. **Avant une vraie mise en service, suivez [DEPLOIEMENT.md](DEPLOIEMENT.md).**

## Tests

```bash
cd backend && php artisan test        # 20 tests fonctionnels de l'API
cd frontend && npm run test:ci        # 25 tests unitaires Angular (Chrome headless)
```

Backend : protection de l'API, TVA et stock, annulation complète si stock insuffisant, numérotation des factures, paiements partiels, plafond de crédit, retours et avoirs, devis et conversion, clôture de caisse, rapports, droits par rôle, factures PDF dans les 3 formats.
Frontend : format monétaire, liens WhatsApp, pagination, authentification et gestion de la session expirée, prix de gros et totaux du point de vente.

## Structure

```text
backend/
  app/Http/Controllers/Api/   contrôleurs REST
  app/Http/Middleware/        EnsureRole (contrôle des rôles)
  app/Services/StockService   point d'entrée unique de tout mouvement de stock
  app/Services/SaleService    création, retours et annulation des ventes (règles de crédit)
  app/Services/BackupService  sauvegarde SQL de la base (commande `php artisan app:backup`)
  app/Models/                 Eloquent (Sale, SalePayment, StockMovement, Setting…)
  resources/views/invoices/   ticket 80 mm, facture A4/A5, devis, avoir
frontend/src/app/
  core/                       services API/auth, intercepteur, guards, modèles
  shared/                     layout, modale, tiroir, pagination, format monétaire
  features/                   une page par dossier (pos, sales, quotes, cash, reports…)
```
