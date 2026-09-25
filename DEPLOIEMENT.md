# Mise en production — Quincaillerie Pro

Checklist pour installer l'application sur le poste du magasin ou sur un serveur.

## 1. Backend (Laravel)

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Dans `.env`, changez au minimum :

| Variable | Valeur en production |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` (sinon les erreurs techniques s'affichent aux utilisateurs) |
| `APP_URL` | l'adresse réelle de l'API, ex. `https://api.maquincaillerie.sn` |
| `FRONTEND_URL` | l'adresse du frontend, ex. `https://maquincaillerie.sn` |
| `DB_USERNAME` / `DB_PASSWORD` | un utilisateur MySQL dédié avec un **mot de passe** (pas `root` sans mot de passe) |

Puis :

```bash
php artisan migrate --force
php artisan db:seed --force --class=RoleSeeder   # rôles admin / gestionnaire / caissier
php artisan config:cache
php artisan route:cache
```

Créez le premier administrateur (les comptes de démonstration ne doivent pas exister en production) :

```bash
php artisan tinker
>>> App\Models\User::create(['name' => 'Gérant', 'email' => 'gerant@exemple.sn', 'password' => 'UnMotDePasseSolide!', 'role_id' => 1]);
```

Si les comptes de démo ont déjà été créés, supprimez-les ou changez leurs mots de passe depuis **Utilisateurs**.

## 2. Frontend (Angular)

1. Dans `frontend/src/environments/environment.prod.ts`, réglez `apiUrl` sur l'adresse de l'API
   (`/api` si le frontend et l'API sont servis par le même domaine).
2. Compilez :

```bash
cd frontend
npm ci
npm run build
```

3. Publiez le contenu de `frontend/dist/frontend/browser/` sur le serveur web.
   Configurez le serveur pour renvoyer `index.html` sur toutes les routes (application monopage).

Le build de production ne contient **ni les comptes de démonstration ni leurs mots de passe**.

## 3. HTTPS

Servez l'application en **HTTPS** (certificat Let's Encrypt gratuit sur un serveur Linux, ou via l'hébergeur).
Les jetons de connexion circulent dans chaque requête : sans HTTPS, ils peuvent être interceptés.

## 4. Sauvegardes automatiques

La base est sauvegardée chaque soir à 21 h dans `backend/storage/app/backups` (30 dernières conservées).
Le planificateur Laravel doit tourner :

- **Serveur Linux** : ajoutez à la crontab
  `* * * * * cd /chemin/backend && php artisan schedule:run >> /dev/null 2>&1`
- **Windows (poste du magasin)** : Planificateur de tâches → nouvelle tâche toutes les minutes
  qui lance `php C:\chemin\backend\artisan schedule:run`.

Sauvegarde manuelle à tout moment : `php artisan app:backup`, ou **Paramètres → Sauvegarder maintenant**.

**Copiez régulièrement ces fichiers hors du poste** (clé USB, Google Drive) : une sauvegarde sur le même disque ne protège pas d'une panne du disque.

Restauration : phpMyAdmin → base `quincaillerie` → **Importer** → fichier `.sql`.

## 5. Vérifications finales

- [ ] `APP_DEBUG=false`
- [ ] Mot de passe MySQL défini
- [ ] Comptes de démonstration supprimés ou mots de passe changés
- [ ] HTTPS actif
- [ ] Paramètres de l'entreprise remplis (nom, adresse, NINEA, RCCM, TVA, format de facture)
- [ ] Une sauvegarde manuelle réussie et téléchargée
- [ ] Tests : `php artisan test` (backend) et `npm run test:ci` (frontend)
