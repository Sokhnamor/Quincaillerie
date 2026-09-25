# Quincaillerie Pro

Application web de gestion de quincaillerie : point de vente, stock, factures, paiements, approvisionnements, clients et fournisseurs.

| Couche | Technologie |
|---|---|
| Backend | Laravel 12 (API REST), Sanctum (jetons), DomPDF, Laravel Excel |
| Frontend | Angular 18 (composants standalone, signals), Chart.js, SweetAlert2 |
| Base de données | MySQL 8 (SQLite en mémoire pour les tests) |

## Fonctionnalités

- **Point de vente** : grille produits, panier, espèces / Wave / Orange Money / carte, calcul de la monnaie, vente à crédit, facture PDF immédiate.
- **Ventes** : filtres (statut, dates, recherche), totaux encaissés / restant dus, paiements échelonnés, annulation avec remise en stock, exports Excel et PDF.
- **Stock** : alertes de seuil, ajustements motivés (inventaire, casse…), journal complet des mouvements, historique par produit.
- **Approvisionnements** : réception fournisseur qui met à jour stock et prix d'achat, ajout automatique des produits en alerte.
- **Tableau de bord** : CA du jour / du mois, encaissements, créances, marge, graphiques 12 mois / 30 jours, top produits.
- **Administration** : utilisateurs et rôles, activation / désactivation, paramètres de l'entreprise (NINEA, RCCM, TVA, pied de facture).
- Mode sombre, interface responsive (mobile / tablette).

## Rôles

| Rôle | Accès |
|---|---|
| Administrateur | Tout, y compris utilisateurs et paramètres |
| Gestionnaire | Catalogue, stock, approvisionnements, annulation de ventes, exports |
| Caissier | Point de vente, ventes, paiements, clients (lecture seule du catalogue) |

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

Ils apparaissent en accès rapide sur la page de connexion tant que `showDemoAccounts` vaut `true` dans `environment.ts`. **Passez-le à `false` et changez ces mots de passe avant toute mise en production.**

## Tests

```bash
cd backend
php artisan test
```

Les tests couvrent : protection de l'API, calcul TVA et décrément du stock, annulation complète d'une vente en cas de stock insuffisant, unicité des numéros de facture, paiements partiels, droits par rôle, approvisionnements, ajustements de stock.

## Structure

```
backend/
  app/Http/Controllers/Api/   contrôleurs REST
  app/Http/Middleware/        EnsureRole (contrôle des rôles)
  app/Services/StockService   point d'entrée unique de tout mouvement de stock
  app/Models/                 Eloquent (Sale, SalePayment, StockMovement, Setting…)
  resources/views/            facture PDF et rapport des ventes
frontend/src/app/
  core/                       services API/auth, intercepteur, guards, modèles
  shared/                     layout, modale, tiroir, pagination, format monétaire
  features/                   une page par dossier (pos, sales, products, purchases…)
```
