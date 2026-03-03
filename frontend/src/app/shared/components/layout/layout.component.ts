import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="layout" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <i class="fas fa-tools"></i>
          <span *ngIf="!sidebarCollapsed()">Quincaillerie</span>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="sidebar-item">
            <i class="fas fa-chart-line"></i>
            <span *ngIf="!sidebarCollapsed()">Dashboard</span>
          </a>
          
          <a routerLink="/products" routerLinkActive="active" class="sidebar-item">
            <i class="fas fa-box"></i>
            <span *ngIf="!sidebarCollapsed()">Produits</span>
          </a>
          
          <a routerLink="/categories" routerLinkActive="active" class="sidebar-item">
            <i class="fas fa-tags"></i>
            <span *ngIf="!sidebarCollapsed()">Catégories</span>
          </a>
          
          <a routerLink="/suppliers" routerLinkActive="active" class="sidebar-item">
            <i class="fas fa-truck"></i>
            <span *ngIf="!sidebarCollapsed()">Fournisseurs</span>
          </a>
          
          <a routerLink="/clients" routerLinkActive="active" class="sidebar-item">
            <i class="fas fa-users"></i>
            <span *ngIf="!sidebarCollapsed()">Clients</span>
          </a>
          
          <a routerLink="/sales" routerLinkActive="active" class="sidebar-item">
            <i class="fas fa-shopping-cart"></i>
            <span *ngIf="!sidebarCollapsed()">Ventes</span>
          </a>
        </nav>
      </aside>

      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="btn-icon" (click)="toggleSidebar()">
            <i class="fas fa-bars"></i>
          </button>
          
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Rechercher...">
          </div>
        </div>
        
        <div class="topbar-right">
          <button class="btn-icon" (click)="toggleDarkMode()">
            <i class="fas" [class.fa-moon]="!darkMode()" [class.fa-sun]="darkMode()"></i>
          </button>
          
          <button class="btn-icon">
            <i class="fas fa-bell"></i>
            <span class="notification-badge">3</span>
          </button>
          
          <div class="user-menu" (click)="toggleUserMenu()">
            <div class="user-avatar">
              {{ getUserInitials() }}
            </div>
            <span class="user-name">{{ userName() }}</span>
            <i class="fas fa-chevron-down"></i>
            
            <div class="user-dropdown" *ngIf="userMenuOpen()">
              <a class="dropdown-item">
                <i class="fas fa-user"></i> Profil
              </a>
              <a class="dropdown-item">
                <i class="fas fa-cog"></i> Paramètres
              </a>
              <hr>
              <a class="dropdown-item" (click)="logout()">
                <i class="fas fa-sign-out-alt"></i> Déconnexion
              </a>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      min-height: 100vh;
    }
    
    .btn-icon {
      background: none;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: all 0.2s ease;
      position: relative;
    }
    
    .btn-icon:hover {
      background: var(--light-color);
      color: var(--primary-color);
    }
    
    .notification-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--danger-color);
      color: white;
      font-size: 0.625rem;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    
    .user-menu:hover {
      background: var(--light-color);
    }
    
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-color);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .user-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-primary);
    }
    
    .user-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border-radius: 8px;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border-color);
      min-width: 180px;
      z-index: 100;
      animation: fadeIn 0.2s ease-out;
    }
    
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: var(--text-primary);
      text-decoration: none;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .dropdown-item:hover {
      background: var(--light-color);
    }
    
    .dropdown-item hr {
      margin: 0.5rem 0;
      border: none;
      border-top: 1px solid var(--border-color);
    }
  `]
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  darkMode = signal(false);
  userMenuOpen = signal(false);
  userName = signal('');

  constructor(private authService: AuthService, private router: Router) {
    const user = this.authService.getUser();
    if (user) {
      this.userName.set(user.name);
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleDarkMode(): void {
    this.darkMode.update(v => !v);
    document.body.classList.toggle('dark', this.darkMode());
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(v => !v);
  }

  getUserInitials(): string {
    const user = this.authService.getUser();
    if (user) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
