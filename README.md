# Application de Gestion de Quincaillerie

## Description

Application web professionnelle de gestion de quincaillerie avec :
- **Backend** : Laravel 11 (API RESTful)
- **Frontend** : Angular 17+
- **Base de données** : MySQL
- **Authentification** : JWT (Laravel Sanctum)

## Structure du projet

```
c:/Users/HP/Desktop/PRO/
├── backend/          # Laravel 11 API
├── frontend/          # Angular 17+ Application
└── README.md
```

## Fonctionnalités

### Modules développés
- Dashboard avec statistiques et graphiques
- Gestion des produits (CRUD, stocks, alertes)
- Gestion des catégories
- Gestion des fournisseurs
- Gestion des clients
- Gestion des ventes (facturation, statut)
- Authentification avec rôles (Admin, Gestionnaire, Caissier)
- Export PDF et Excel des ventes
- Mode sombre
- Design moderne type Admin Dashboard

## Installation

### Prérequis
- PHP 8.5+
- Composer
- Node.js 18+
- MySQL 8.0+
- Angular CLI

### Backend (Laravel)

1. Naviguer vers le dossier backend :
```
bash
cd c:/Users/HP/Desktop/PRO/backend
```

2. Installer les dépendances :
```
bash
composer install
```

3. Configurer la base de données dans `.env` :
```
env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quincaillerie
DB_USERNAME=root
DB_PASSWORD=votre_mot_de_passe
```

4. Créer la base de données :
```
sql
CREATE DATABASE quincaillerie CHARACTER4 COLLATE utf SET utf8mb8mb4_unicode_ci;
```

5. Générer la clé d'application :
```
bash
php artisan key:generate
```

6. Exécuter les migrations et seeders :
```
bash
php artisan migrate --seed
```

7. Publier la configuration Sanctum :
```
bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

8. Lancer le serveur backend :
```
bash
php artisan serve
```

Le backend sera accessible sur `http://localhost:8000`

### Frontend (Angular)

1. Naviguer vers le dossier frontend :
```
bash
cd c:/Users/HP/Desktop/PRO/frontend
```

2. Installer les dépendances :
```
bash
npm install
```

3. Lancer le serveur de développement :
```
bash
ng serve
```

L'application sera accessible sur `http://localhost:4200`

## Comptes de test (après seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@quincaillerie.fr | password |
| Gestionnaire | gestionnaire@quincaillerie.fr | password |
| Caissier | caissier@quincaillerie.fr | password |

## API Endpoints

### Authentification
- `POST /api/login` - Connexion
- `POST /api/register` - Inscription
- `POST /api/logout` - Déconnexion
- `GET /api/user` - Utilisateur connecté

### Dashboard
- `GET /api/dashboard/stats` - Statistiques
- `GET /api/dashboard/charts` - Graphiques
- `GET /api/dashboard/recent-sales` - Ventes récentes
- `GET /api/dashboard/alerts` - Alertes stock

### Produits
- `GET /api/products` - Liste paginée
- `POST /api/products` - Créer
- `GET /api/products/{id}` - Détails
- `PUT /api/products/{id}` - Modifier
- `DELETE /api/products/{id}` - Supprimer

### Catégories
- `GET /api/categories` - Liste
- `POST /api/categories` - Créer
- `PUT /api/categories/{id}` - Modifier
- `DELETE /api/categories/{id}` - Supprimer

### Fournisseurs
- `GET /api/suppliers` - Liste paginée
- `POST /api/suppliers` - Créer
- `PUT /api/suppliers/{id}` - Modifier
- `DELETE /api/suppliers/{id}` - Supprimer

### Clients
- `GET /api/clients` - Liste paginée
- `POST /api/clients` - Créer
- `PUT /api/clients/{id}` - Modifier
- `DELETE /api/clients/{id}` - Supprimer

### Ventes
- `GET /api/sales` - Liste paginée
- `POST /api/sales` - Créer
- `GET /api/sales/{id}` - Détails
- `PUT /api/sales/{id}` - Modifier
- `DELETE /api/sales/{id}` - Supprimer
- `GET /api/sales/export/pdf` - Export PDF
- `GET /api/sales/export/excel` - Export Excel

## Technologies utilisées

### Backend
- Laravel 11
- Laravel Sanctum (JWT)
- barryvdh/laravel-dompdf
- maatwebsite/excel

### Frontend
- Angular 17+
- Tailwind CSS
- Chart.js
- SweetAlert2

## License

Ce projet est open-source et disponible sous licence MIT.
