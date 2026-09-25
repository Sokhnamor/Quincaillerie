import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

const MANAGERS = { roles: ['admin', 'gestionnaire'] };
const ADMINS = { roles: ['admin'] };

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Connexion · Quincaillerie Pro',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Tableau de bord · Quincaillerie Pro',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'pos',
        title: 'Point de vente · Quincaillerie Pro',
        loadComponent: () => import('./features/pos/pos.component').then(m => m.PosComponent)
      },
      {
        path: 'sales',
        title: 'Ventes · Quincaillerie Pro',
        loadComponent: () => import('./features/sales/sales.component').then(m => m.SalesComponent)
      },
      {
        path: 'clients',
        title: 'Clients · Quincaillerie Pro',
        loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent)
      },
      {
        path: 'products',
        title: 'Produits · Quincaillerie Pro',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'categories',
        title: 'Catégories · Quincaillerie Pro',
        loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent)
      },
      {
        path: 'suppliers',
        title: 'Fournisseurs · Quincaillerie Pro',
        loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent)
      },
      {
        path: 'purchases',
        title: 'Approvisionnements · Quincaillerie Pro',
        canActivate: [roleGuard],
        data: MANAGERS,
        loadComponent: () => import('./features/purchases/purchases.component').then(m => m.PurchasesComponent)
      },
      {
        path: 'stock',
        title: 'Mouvements de stock · Quincaillerie Pro',
        canActivate: [roleGuard],
        data: MANAGERS,
        loadComponent: () => import('./features/stock/stock.component').then(m => m.StockComponent)
      },
      {
        path: 'users',
        title: 'Utilisateurs · Quincaillerie Pro',
        canActivate: [roleGuard],
        data: ADMINS,
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'settings',
        title: 'Paramètres · Quincaillerie Pro',
        canActivate: [roleGuard],
        data: ADMINS,
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'profile',
        title: 'Mon profil · Quincaillerie Pro',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
