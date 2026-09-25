import { Component, DestroyRef, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, interval, startWith, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ApiService } from '../../../core/services/api.service';
import { Product, RoleName } from '../../../core/models';
import { initials } from '../../labels';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  roles?: RoleName[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const MANAGERS: RoleName[] = ['admin', 'gestionnaire'];

const NAV: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Tableau de bord', icon: 'fa-gauge-high', link: '/dashboard' },
      { label: 'Point de vente', icon: 'fa-cash-register', link: '/pos' },
      { label: 'Ventes', icon: 'fa-receipt', link: '/sales' },
      { label: 'Clients', icon: 'fa-users', link: '/clients' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { label: 'Produits', icon: 'fa-boxes-stacked', link: '/products' },
      { label: 'Catégories', icon: 'fa-tags', link: '/categories' },
      { label: 'Approvisionnements', icon: 'fa-truck-ramp-box', link: '/purchases', roles: MANAGERS },
      { label: 'Mouvements', icon: 'fa-arrow-right-arrow-left', link: '/stock', roles: MANAGERS },
      { label: 'Fournisseurs', icon: 'fa-industry', link: '/suppliers' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Utilisateurs', icon: 'fa-user-shield', link: '/users', roles: ['admin'] },
      { label: 'Paramètres', icon: 'fa-gear', link: '/settings', roles: ['admin'] },
    ],
  },
];

const COLLAPSE_KEY = 'sidebar-collapsed';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">
      <!-- Sidebar -->
      <aside class="sidebar" aria-label="Navigation principale">
        <a routerLink="/dashboard" class="brand" (click)="mobileOpen.set(false)">
          <span class="brand-mark"><i class="fa-solid fa-screwdriver-wrench"></i></span>
          <span class="brand-text">
            <strong>Quincaillerie</strong>
            <small>PRO</small>
          </span>
        </a>

        <nav class="nav">
          @for (section of sections(); track section.title) {
            <div class="nav-section">
              <div class="nav-title">{{ section.title }}</div>
              @for (item of section.items; track item.link) {
                <a class="nav-item" [routerLink]="item.link" routerLinkActive="active" [attr.title]="collapsed() ? item.label : null" (click)="mobileOpen.set(false)">
                  <i class="fa-solid {{ item.icon }}"></i>
                  <span class="nav-label">{{ item.label }}</span>
                  @if (item.link === '/products' && alertCount() > 0) {
                    <span class="nav-badge">{{ alertCount() }}</span>
                  }
                </a>
              }
            </div>
          }
        </nav>

        <div class="sidebar-foot">
          <a routerLink="/profile" class="me" (click)="mobileOpen.set(false)" [attr.title]="collapsed() ? userName() : null">
            <span class="avatar avatar-sm">{{ userInitials() }}</span>
            <span class="me-text">
              <strong class="truncate">{{ userName() }}</strong>
              <small>{{ auth.roleLabel() }}</small>
            </span>
          </a>
          <button type="button" class="collapse-btn hide-mobile" (click)="toggleCollapse()" [attr.aria-label]="collapsed() ? 'Déplier le menu' : 'Replier le menu'">
            <i class="fa-solid" [class.fa-angles-left]="!collapsed()" [class.fa-angles-right]="collapsed()"></i>
          </button>
        </div>
      </aside>
      <div class="scrim" (click)="mobileOpen.set(false)"></div>

      <!-- Topbar -->
      <header class="topbar">
        <button type="button" class="icon-btn show-mobile" (click)="mobileOpen.set(true)" aria-label="Ouvrir le menu">
          <i class="fa-solid fa-bars"></i>
        </button>

        <form class="global-search" (submit)="search($event)" role="search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input #searchInput type="search" name="q" placeholder="Rechercher un produit…" aria-label="Rechercher un produit" autocomplete="off">
          <kbd>Ctrl K</kbd>
        </form>

        <div class="topbar-actions">
          <a routerLink="/pos" class="btn btn-primary btn-sm new-sale">
            <i class="fa-solid fa-plus"></i><span>Nouvelle vente</span>
          </a>

          <button type="button" class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="theme.dark() ? 'Passer en mode clair' : 'Passer en mode sombre'" [attr.title]="theme.dark() ? 'Mode clair' : 'Mode sombre'">
            <i class="fa-solid" [class.fa-moon]="!theme.dark()" [class.fa-sun]="theme.dark()"></i>
          </button>

          <div class="menu-anchor">
            <button type="button" class="icon-btn bell" (click)="toggleMenu('alerts', $event)" aria-label="Alertes de stock" title="Alertes de stock">
              <i class="fa-regular fa-bell"></i>
              @if (alertCount() > 0) {
                <span class="dot">{{ alertCount() > 9 ? '9+' : alertCount() }}</span>
              }
            </button>
            @if (openMenu() === 'alerts') {
              <div class="dropdown dropdown-alerts" (click)="$event.stopPropagation()">
                <div class="dropdown-head">
                  <strong>Alertes de stock</strong>
                  <span class="badge {{ alertCount() ? 'badge-warning' : 'badge-success' }}">{{ alertCount() }}</span>
                </div>
                @if (alerts().length === 0) {
                  <div class="empty empty-sm">
                    <div class="empty-icon"><i class="fa-solid fa-check"></i></div>
                    <p class="muted small">Aucun produit en alerte.</p>
                  </div>
                } @else {
                  <div class="alert-list">
                    @for (p of alerts(); track p.id) {
                      <a class="alert-row" [routerLink]="['/products']" [queryParams]="{ search: p.reference || p.name }" (click)="openMenu.set(null)">
                        <span class="alert-ico" [class.out]="p.stock <= 0"><i class="fa-solid" [class.fa-ban]="p.stock <= 0" [class.fa-triangle-exclamation]="p.stock > 0"></i></span>
                        <span class="grow">
                          <span class="truncate strong small" style="display:block">{{ p.name }}</span>
                          <span class="xs subtle">{{ p.stock <= 0 ? 'Rupture de stock' : 'Reste ' + p.stock + ' ' + p.unit + ' (seuil ' + p.alert_threshold + ')' }}</span>
                        </span>
                      </a>
                    }
                  </div>
                  @if (auth.canManage()) {
                    <a routerLink="/purchases" [queryParams]="{ new: 1 }" class="dropdown-foot" (click)="openMenu.set(null)">
                      <i class="fa-solid fa-truck-ramp-box"></i> Réapprovisionner
                    </a>
                  }
                }
              </div>
            }
          </div>

          <div class="menu-anchor">
            <button type="button" class="user-btn" (click)="toggleMenu('user', $event)" aria-label="Menu utilisateur">
              <span class="avatar avatar-sm">{{ userInitials() }}</span>
              <i class="fa-solid fa-chevron-down xs subtle hide-sm"></i>
            </button>
            @if (openMenu() === 'user') {
              <div class="dropdown" (click)="$event.stopPropagation()">
                <div class="dropdown-user">
                  <span class="avatar">{{ userInitials() }}</span>
                  <span class="stack grow" style="gap:0">
                    <strong class="truncate">{{ userName() }}</strong>
                    <span class="xs subtle truncate">{{ auth.currentUser()?.email }}</span>
                  </span>
                </div>
                <a routerLink="/profile" class="dropdown-item" (click)="openMenu.set(null)"><i class="fa-regular fa-user"></i> Mon profil</a>
                @if (auth.isAdmin()) {
                  <a routerLink="/settings" class="dropdown-item" (click)="openMenu.set(null)"><i class="fa-solid fa-gear"></i> Paramètres</a>
                  <a routerLink="/users" class="dropdown-item" (click)="openMenu.set(null)"><i class="fa-solid fa-user-shield"></i> Utilisateurs</a>
                }
                <div class="dropdown-sep"></div>
                <button type="button" class="dropdown-item danger" (click)="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Déconnexion</button>
              </div>
            }
          </div>
        </div>
      </header>

      <main class="main">
        @if (!auth.role()) {
          <div class="role-warning">
            <i class="fa-solid fa-circle-info"></i>
            Aucun rôle n'est attribué à votre compte : certaines fonctions sont masquées. Demandez à un administrateur de vous en attribuer un.
          </div>
        }
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .shell { min-height: 100vh; }

    /* Sidebar */
    .sidebar {
      position: fixed; inset: 0 auto 0 0; width: var(--sidebar-w); z-index: 60;
      background: var(--sidebar-bg); color: var(--sidebar-text); display: flex; flex-direction: column;
      border-right: 1px solid var(--sidebar-border); transition: width 0.22s var(--ease), transform 0.22s var(--ease);
    }
    .brand { display: flex; align-items: center; gap: 12px; height: var(--topbar-h); padding: 0 20px; text-decoration: none !important; border-bottom: 1px solid var(--sidebar-border); flex-shrink: 0; }
    .brand-mark { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--brand); color: #fff; font-size: 16px; flex-shrink: 0; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35); }
    .brand-text { display: flex; align-items: baseline; gap: 6px; white-space: nowrap; }
    .brand-text strong { color: var(--sidebar-text-strong); font-size: 16px; letter-spacing: -0.01em; }
    .brand-text small { color: var(--brand); font-weight: 800; font-size: 11px; letter-spacing: 0.12em; }

    .nav { flex: 1; overflow-y: auto; padding: 12px 12px 20px; }
    .nav-section + .nav-section { margin-top: 18px; }
    .nav-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5b667a; padding: 0 12px 8px; white-space: nowrap; }
    .nav-item {
      display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 12px; margin-bottom: 2px; border-radius: 9px;
      color: var(--sidebar-text); font-size: 13.5px; font-weight: 500; text-decoration: none !important; position: relative; white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    .nav-item i { width: 18px; text-align: center; font-size: 14.5px; flex-shrink: 0; }
    .nav-item:hover { background: var(--sidebar-hover); color: var(--sidebar-text-strong); }
    .nav-item.active { background: var(--sidebar-active); color: #fff; }
    .nav-item.active i { color: var(--brand); }
    .nav-item.active::before { content: ''; position: absolute; left: -12px; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0; background: var(--brand); }
    .nav-badge { margin-left: auto; background: var(--brand); color: #fff; font-size: 11px; font-weight: 700; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; display: grid; place-items: center; }

    .sidebar-foot { display: flex; align-items: center; gap: 6px; padding: 12px; border-top: 1px solid var(--sidebar-border); }
    .me { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 9px; text-decoration: none !important; }
    .me:hover { background: var(--sidebar-hover); }
    .me-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
    .me-text strong { color: var(--sidebar-text-strong); font-size: 13px; }
    .me-text small { color: var(--sidebar-text); font-size: 11.5px; }
    .collapse-btn { width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: var(--sidebar-text); cursor: pointer; flex-shrink: 0; }
    .collapse-btn:hover { background: var(--sidebar-hover); color: #fff; }

    .collapsed .sidebar { width: var(--sidebar-w-collapsed); }
    .collapsed .brand { padding: 0; justify-content: center; }
    .collapsed .brand-text, .collapsed .nav-label, .collapsed .me-text, .collapsed .nav-badge { display: none; }
    .collapsed .nav-title { text-align: center; padding: 0 0 8px; font-size: 0; }
    .collapsed .nav-title::after { content: '•••'; font-size: 9px; letter-spacing: 1px; }
    .collapsed .nav-item { justify-content: center; padding: 0; }
    .collapsed .sidebar-foot { flex-direction: column; }
    .collapsed .me { justify-content: center; padding: 6px 0; }

    /* Topbar */
    .topbar {
      position: fixed; top: 0; right: 0; left: var(--sidebar-w); height: var(--topbar-h); z-index: 50;
      display: flex; align-items: center; gap: 16px; padding: 0 24px;
      background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: saturate(1.4) blur(10px);
      border-bottom: 1px solid var(--border); transition: left 0.22s var(--ease);
    }
    .collapsed .topbar { left: var(--sidebar-w-collapsed); }
    .global-search { position: relative; flex: 1; max-width: 440px; }
    .global-search i { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text-3); font-size: 13px; }
    .global-search input {
      width: 100%; height: 38px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2);
      padding: 0 60px 0 36px; font: inherit; font-size: 13.5px; color: var(--text); transition: all 0.15s;
    }
    .global-search input:focus { outline: none; border-color: var(--brand); background: var(--surface); box-shadow: var(--focus-ring); }
    .global-search kbd { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font: 600 10.5px var(--font); color: var(--text-3); background: var(--surface); border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; padding: 2px 6px; }
    .topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
    .new-sale { margin-right: 6px; }

    .menu-anchor { position: relative; }
    .bell { position: relative; }
    .bell .dot { position: absolute; top: 3px; right: 2px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 99px; background: var(--danger); color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; border: 2px solid var(--surface); }
    .user-btn { display: flex; align-items: center; gap: 8px; padding: 3px 8px 3px 3px; border-radius: 99px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; margin-left: 4px; }
    .user-btn:hover { border-color: var(--border-strong); }

    .dropdown {
      position: absolute; right: 0; top: calc(100% + 8px); width: 250px; z-index: 70; padding: 6px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-md); animation: drop 0.14s var(--ease);
    }
    @keyframes drop { from { opacity: 0; transform: translateY(-4px); } }
    .dropdown-user { display: flex; align-items: center; gap: 10px; padding: 8px 8px 12px; border-bottom: 1px solid var(--border); margin-bottom: 6px; }
    .dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border-radius: 8px; border: 0; background: transparent; color: var(--text); font-size: 13.5px; text-align: left; cursor: pointer; text-decoration: none !important; }
    .dropdown-item i { width: 16px; text-align: center; color: var(--text-3); }
    .dropdown-item:hover { background: var(--surface-3); }
    .dropdown-item.danger, .dropdown-item.danger i { color: var(--danger-text); }
    .dropdown-sep { height: 1px; background: var(--border); margin: 6px 0; }
    .dropdown-alerts { width: 330px; padding: 0; }
    .dropdown-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); }
    .alert-list { max-height: 320px; overflow-y: auto; padding: 6px; }
    .alert-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; color: var(--text); text-decoration: none !important; }
    .alert-row:hover { background: var(--surface-3); }
    .alert-ico { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: var(--warning-soft); color: var(--warning-text); font-size: 12px; flex-shrink: 0; }
    .alert-ico.out { background: var(--danger-soft); color: var(--danger-text); }
    .dropdown-foot { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border-top: 1px solid var(--border); font-weight: 600; font-size: 13px; color: var(--brand-text); text-decoration: none !important; border-radius: 0 0 12px 12px; }
    .dropdown-foot:hover { background: var(--brand-soft); }

    .main { margin-left: var(--sidebar-w); padding-top: var(--topbar-h); min-height: 100vh; transition: margin-left 0.22s var(--ease); }
    .collapsed .main { margin-left: var(--sidebar-w-collapsed); }
    .role-warning { margin: 16px 32px 0; padding: 10px 14px; border-radius: 10px; background: var(--info-soft); color: var(--info-text); font-size: 13px; display: flex; gap: 10px; align-items: center; }

    .scrim { display: none; }
    .show-mobile { display: none; }

    @media (max-width: 1024px) {
      .sidebar { transform: translateX(-100%); width: var(--sidebar-w) !important; box-shadow: var(--shadow-lg); }
      .mobile-open .sidebar { transform: none; }
      .mobile-open .scrim { display: block; position: fixed; inset: 0; background: rgba(8, 12, 20, 0.5); z-index: 55; }
      .collapsed .brand-text, .collapsed .nav-label, .collapsed .me-text { display: initial; }
      .topbar, .collapsed .topbar { left: 0; padding: 0 16px; gap: 10px; }
      .main, .collapsed .main { margin-left: 0; }
      .show-mobile { display: inline-grid; }
      .hide-mobile { display: none; }
      .role-warning { margin: 12px 16px 0; }
    }
    @media (max-width: 640px) {
      .global-search kbd { display: none; }
      .global-search input { padding-right: 12px; }
      .new-sale span { display: none; }
      .new-sale { width: 34px; padding: 0; margin-right: 0; }
      .dropdown-alerts { position: fixed; left: 12px; right: 12px; top: 60px; width: auto; }
    }
  `]
})
export class LayoutComponent implements OnInit {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private api = inject(ApiService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  collapsed = signal(this.readCollapsed());
  mobileOpen = signal(false);
  openMenu = signal<'user' | 'alerts' | null>(null);
  alerts = signal<Product[]>([]);

  alertCount = computed(() => this.alerts().length);
  userName = computed(() => this.auth.currentUser()?.name ?? 'Utilisateur');
  userInitials = computed(() => initials(this.auth.currentUser()?.name));

  sections = computed(() => {
    const role = this.auth.role();
    return NAV
      .map(section => ({ ...section, items: section.items.filter(i => !i.roles || (role && i.roles.includes(role))) }))
      .filter(section => section.items.length > 0);
  });

  ngOnInit(): void {
    // Refresh stock alerts on load, every 2 minutes and after each navigation
    const navigations = this.router.events.pipe(filter(e => e instanceof NavigationEnd));
    interval(120_000).pipe(startWith(0), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAlerts());
    navigations.pipe(
      switchMap(() => this.api.getAlerts().pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => data && this.alerts.set([...data.out_of_stock, ...data.low_stock]));
  }

  private loadAlerts(): void {
    this.api.getAlerts().subscribe({
      next: data => this.alerts.set([...data.out_of_stock, ...data.low_stock]),
      error: () => undefined,
    });
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    try {
      localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? '1' : '0');
    } catch {
      // ignore
    }
  }

  toggleMenu(menu: 'user' | 'alerts', event: Event): void {
    event.stopPropagation();
    this.openMenu.update(current => (current === menu ? null : menu));
  }

  search(event: Event): void {
    event.preventDefault();
    const input = this.searchInput()?.nativeElement;
    const q = input?.value.trim();
    if (q) {
      this.router.navigate(['/products'], { queryParams: { search: q } });
      input!.value = '';
      input!.blur();
    }
  }

  logout(): void {
    this.openMenu.set(null);
    this.auth.logout();
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.openMenu.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
    if (event.key === 'Escape') {
      this.openMenu.set(null);
      this.mobileOpen.set(false);
    }
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
