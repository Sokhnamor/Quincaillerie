import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-layout" [class.sidebar-collapsed]="sidebarCollapsed()">
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <span class="sidebar-logo-text" *ngIf="!sidebarCollapsed()">Quincaillerie</span>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="sidebar-item" [title]="sidebarCollapsed() ? 'Dashboard' : ''">
            <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>
            <span class="sidebar-label" *ngIf="!sidebarCollapsed()">Dashboard</span>
          </a>
          <a routerLink="/products" routerLinkActive="active" class="sidebar-item" [title]="sidebarCollapsed() ? 'Produits' : ''">
            <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg></span>
            <span class="sidebar-label" *ngIf="!sidebarCollapsed()">Produits</span>
          </a>
          <a routerLink="/categories" routerLinkActive="active" class="sidebar-item" [title]="sidebarCollapsed() ? 'Catégories' : ''">
            <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg></span>
            <span class="sidebar-label" *ngIf="!sidebarCollapsed()">Catégories</span>
          </a>
          <a routerLink="/suppliers" routerLinkActive="active" class="sidebar-item" [title]="sidebarCollapsed() ? 'Fournisseurs' : ''">
            <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="13" x="4" y="3" rx="2"/><path d="M4 8h16"/><path d="m4 16 4-4 4 4 4-4 4 4"/></svg></span>
            <span class="sidebar-label" *ngIf="!sidebarCollapsed()">Fournisseurs</span>
          </a>
          <a routerLink="/clients" routerLinkActive="active" class="sidebar-item" [title]="sidebarCollapsed() ? 'Clients' : ''">
            <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
            <span class="sidebar-label" *ngIf="!sidebarCollapsed()">Clients</span>
          </a>
          <a routerLink="/sales" routerLinkActive="active" class="sidebar-item" [title]="sidebarCollapsed() ? 'Ventes' : ''">
            <span class="sidebar-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg></span>
            <span class="sidebar-label" *ngIf="!sidebarCollapsed()">Ventes</span>
          </a>
        </nav>
      </aside>

      <header class="topbar" [class.sidebar-collapsed]="sidebarCollapsed()">
        <div class="topbar-left">
          <button class="topbar-toggle" (click)="toggleSidebar()"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>
          <div class="topbar-search"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input type="text" placeholder="Rechercher... (Ctrl+K)"></div>
        </div>
        <div class="topbar-right">
          <button class="topbar-icon-btn" (click)="toggleDarkMode()"><svg *ngIf="!darkMode()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg><svg *ngIf="darkMode()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg></button>
          <button class="topbar-icon-btn notification-btn"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg><span class="notification-badge" *ngIf="notificationCount() > 0">{{ notificationCount() }}</span></button>
          <div class="user-menu" (click)="toggleUserMenu()">
            <div class="user-avatar">{{ getUserInitials() }}</div>
            <span class="user-name" *ngIf="!isMobile()">{{ userName() }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
            <div class="dropdown-menu" *ngIf="userMenuOpen()" (click)="$event.stopPropagation()">
              <a class="dropdown-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Profil</a>
              <a class="dropdown-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path></svg>Paramètres</a>
              <div class="dropdown-divider"></div>
              <a class="dropdown-item text-danger" (click)="logout()"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Déconnexion</a>
            </div>
          </div>
        </div>
      </header>

      <main class="main-content" [class.sidebar-collapsed]="sidebarCollapsed()">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout { min-height: 100vh; }
    .sidebar { width: 260px; height: 100vh; background: var(--glass-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-right: 1px solid var(--border-color); position: fixed; left: 0; top: 0; z-index: 50; transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; }
    .sidebar.collapsed { width: 72px; }
    .sidebar-logo { height: 64px; display: flex; align-items: center; padding: 0 1.25rem; border-bottom: 1px solid var(--border-light); }
    .sidebar-logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
    .sidebar-logo-icon svg { color: white; }
    .sidebar-logo-text { margin-left: 0.75rem; font-size: 1.125rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; }
    .sidebar.collapsed .sidebar-logo-text { display: none; }
    .sidebar-nav { flex: 1; padding: 1rem 0.75rem; overflow-y: auto; }
    .sidebar-item { display: flex; align-items: center; padding: 0.75rem 1rem; color: var(--text-secondary); text-decoration: none; transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1); gap: 0.75rem; margin-bottom: 0.25rem; border-radius: 12px; position: relative; }
    .sidebar-item:hover { background: var(--bg-tertiary); color: var(--text-primary); transform: translateX(4px); }
    .sidebar-item.active { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%); color: var(--primary-500); }
    .sidebar-item.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 24px; background: linear-gradient(180deg, #3b82f6 0%, #6366f1 100%); border-radius: 0 4px 4px 0; }
    .sidebar-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sidebar-icon svg { width: 20px; height: 20px; }
    .sidebar-label { white-space: nowrap; font-size: 0.9375rem; font-weight: 500; }
    .sidebar.collapsed .sidebar-label { display: none; }
    .topbar { height: 64px; background: var(--glass-bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; position: fixed; top: 0; right: 0; left: 260px; z-index: 40; transition: left 400ms cubic-bezier(0.4, 0, 0.2, 1); }
    .topbar.sidebar-collapsed { left: 72px; }
    .topbar-left { display: flex; align-items: center; gap: 1rem; }
    .topbar-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); transition: all 150ms ease; }
    .topbar-toggle:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .topbar-search { position: relative; display: flex; align-items: center; }
    .topbar-search svg { position: absolute; left: 14px; color: var(--text-tertiary); }
    .topbar-search input { width: 320px; padding: 0.5rem 1rem 0.5rem 2.75rem; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-tertiary); font-size: 0.875rem; color: var(--text-primary); transition: all 150ms ease; }
    .topbar-search input:focus { outline: none; border-color: var(--primary-500); background: var(--bg-secondary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .topbar-search input::placeholder { color: var(--text-tertiary); }
    .topbar-right { display: flex; align-items: center; gap: 0.5rem; }
    .topbar-icon-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); transition: all 150ms ease; position: relative; }
    .topbar-icon-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); transform: scale(1.05); }
    .notification-badge { position: absolute; top: 6px; right: 6px; min-width: 16px; height: 16px; background: #ef4444; color: white; font-size: 0.625rem; font-weight: 600; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .user-menu { display: flex; align-items: center; gap: 0.75rem; padding: 0.375rem 0.75rem; border-radius: 12px; cursor: pointer; position: relative; transition: all 150ms ease; margin-left: 0.5rem; }
    .user-menu:hover { background: var(--bg-tertiary); }
    .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); }
    .user-name { font-weight: 500; font-size: 0.875rem; color: var(--text-primary); }
    .user-menu svg { color: var(--text-tertiary); transition: transform 150ms ease; }
    .user-menu:hover svg { transform: translateY(2px); }
    .dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); min-width: 200px; padding: 0.5rem; z-index: 100; animation: fadeIn 0.15s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .dropdown-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem; color: var(--text-primary); font-size: 0.875rem; border-radius: 10px; cursor: pointer; transition: all 150ms ease; }
    .dropdown-item:hover { background: var(--bg-tertiary); }
    .dropdown-item svg { color: var(--text-tertiary); }
    .dropdown-item.text-danger { color: #ef4444; }
    .dropdown-item.text-danger svg { color: #ef4444; }
    .dropdown-divider { height: 1px; background: var(--border-color); margin: 0.5rem 0; }
    .main-content { margin-left: 260px; margin-top: 64px; padding: 1.5rem; min-height: calc(100vh - 64px); transition: margin-left 400ms cubic-bezier(0.4, 0, 0.2, 1); }
    .main-content.sidebar-collapsed { margin-left: 72px; }
    @media (max-width: 1024px) { .sidebar { transform: translateX(-100%); } .sidebar.mobile-open { transform: translateX(0); } .topbar { left: 0; } .main-content { margin-left: 0; } .topbar-search { display: none; } .user-name { display: none; } }
  `]
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  darkMode = signal(false);
  userMenuOpen = signal(false);
  userName = signal('');
  notificationCount = signal(3);

  constructor(private authService: AuthService, private router: Router) {
    const user = this.authService.getUser();
    if (user) { this.userName.set(user.name); }
  }

  isMobile(): boolean { return window.innerWidth <= 1024; }
  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }
  toggleDarkMode(): void { this.darkMode.update(v => !v); document.body.classList.toggle('dark', this.darkMode()); }
  toggleUserMenu(): void { this.userMenuOpen.update(v => !v); }
  getUserInitials(): string { const user = this.authService.getUser(); if (user) { return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); } return 'U'; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
