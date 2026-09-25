import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotifyService } from '../../../core/services/notify.service';
import { ThemeService } from '../../../core/services/theme.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth">
      <section class="auth-aside">
        <div class="aside-inner">
          <div class="brand">
            <span class="brand-mark"><i class="fa-solid fa-screwdriver-wrench"></i></span>
            <span><strong>Quincaillerie</strong> <small>PRO</small></span>
          </div>

          <div class="pitch">
            <h1>Votre quincaillerie,<br><span>parfaitement en main.</span></h1>
            <p>Stock, ventes, factures, clients et fournisseurs réunis dans un seul outil, pensé pour le comptoir.</p>
            <ul>
              <li><i class="fa-solid fa-cash-register"></i> Point de vente rapide avec Wave, Orange Money et espèces</li>
              <li><i class="fa-solid fa-bell"></i> Alertes automatiques avant la rupture de stock</li>
              <li><i class="fa-solid fa-file-invoice"></i> Factures PDF et suivi des paiements partiels</li>
            </ul>
          </div>

          <p class="aside-foot">© {{ year }} Quincaillerie Pro</p>
        </div>
      </section>

      <section class="auth-main">
        <button type="button" class="icon-btn theme-toggle" (click)="theme.toggle()" [attr.aria-label]="theme.dark() ? 'Mode clair' : 'Mode sombre'">
          <i class="fa-solid" [class.fa-moon]="!theme.dark()" [class.fa-sun]="theme.dark()"></i>
        </button>

        <div class="form-card">
          <div class="mobile-brand">
            <span class="brand-mark"><i class="fa-solid fa-screwdriver-wrench"></i></span>
          </div>
          <h2>Connexion</h2>
          <p class="muted">Accédez à votre espace de gestion.</p>

          @if (expired) {
            <div class="alert alert-warning" style="margin-top:20px"><i class="fa-solid fa-clock"></i> Votre session a expiré, reconnectez-vous.</div>
          }
          @if (error()) {
            <div class="alert alert-danger" style="margin-top:20px" role="alert"><i class="fa-solid fa-circle-exclamation"></i> {{ error() }}</div>
          }

          <form (ngSubmit)="submit()" #f="ngForm" class="form" novalidate>
            <div class="field">
              <label class="label" for="email">Adresse email</label>
              <div class="input-icon">
                <i class="fa-regular fa-envelope"></i>
                <input id="email" class="input input-lg" type="email" name="email" [(ngModel)]="email" required autocomplete="username" placeholder="vous@exemple.sn" autofocus>
              </div>
            </div>

            <div class="field">
              <label class="label" for="password">Mot de passe</label>
              <div class="input-icon pwd">
                <i class="fa-solid fa-lock"></i>
                <input id="password" class="input input-lg" [type]="showPassword() ? 'text' : 'password'" name="password" [(ngModel)]="password" required autocomplete="current-password" placeholder="••••••••">
                <button type="button" class="icon-btn eye" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                  <i class="fa-regular" [class.fa-eye]="!showPassword()" [class.fa-eye-slash]="showPassword()"></i>
                </button>
              </div>
            </div>

            <label class="checkbox">
              <input type="checkbox" name="remember" [(ngModel)]="remember"> Rester connecté 30 jours
            </label>

            <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading() || !email || !password">
              @if (loading()) { <span class="spinner"></span> Connexion… } @else { Se connecter <i class="fa-solid fa-arrow-right"></i> }
            </button>
          </form>

          @if (demo) {
            <div class="demo">
              <div class="demo-title"><span>Comptes de démonstration</span></div>
              <div class="demo-list">
                @for (account of demoAccounts; track account.email) {
                  <button type="button" class="demo-btn" (click)="fill(account.email)" [disabled]="loading()">
                    <i class="fa-solid {{ account.icon }}"></i>
                    <span class="stack" style="gap:0; align-items:flex-start">
                      <strong>{{ account.label }}</strong>
                      <small>{{ account.email }}</small>
                    </span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .auth { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); background: var(--surface); }

    .auth-aside {
      position: relative; overflow: hidden; color: #cbd5e1; background: #0f172a;
      background-image:
        radial-gradient(circle at 85% 10%, rgba(234, 88, 12, 0.35), transparent 45%),
        radial-gradient(circle at 10% 95%, rgba(234, 88, 12, 0.18), transparent 40%),
        linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
      background-size: auto, auto, 32px 32px, 32px 32px;
    }
    .aside-inner { position: relative; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 56px; }
    .brand { display: flex; align-items: center; gap: 12px; color: #fff; font-size: 17px; }
    .brand small { margin-left: 6px; color: var(--brand); font-weight: 800; letter-spacing: 0.12em; font-size: 11px; }
    .brand-mark { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--brand); color: #fff; font-size: 18px; box-shadow: 0 8px 24px rgba(234, 88, 12, 0.45); }
    .pitch h1 { color: #fff; font-size: 40px; line-height: 1.12; letter-spacing: -0.03em; font-weight: 800; }
    .pitch h1 span { color: #fdba74; }
    .pitch p { margin-top: 18px; font-size: 16px; max-width: 440px; color: #94a3b8; }
    .pitch ul { list-style: none; padding: 0; margin: 32px 0 0; display: flex; flex-direction: column; gap: 14px; }
    .pitch li { display: flex; align-items: center; gap: 14px; font-size: 14.5px; color: #e2e8f0; }
    .pitch li i { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(255,255,255,0.07); color: #fdba74; flex-shrink: 0; font-size: 14px; }
    .aside-foot { font-size: 12.5px; color: #64748b; }

    .auth-main { position: relative; display: grid; place-items: center; padding: 40px 24px; background: var(--bg); }
    .theme-toggle { position: absolute; top: 20px; right: 20px; }
    .form-card { width: 100%; max-width: 400px; }
    .form-card h2 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
    .form-card > .muted { margin-top: 6px; }
    .mobile-brand { display: none; margin-bottom: 24px; }
    .form { display: flex; flex-direction: column; gap: 18px; margin-top: 28px; }
    .input-lg { height: 46px; font-size: 15px; }
    .pwd .input { padding-right: 46px; }
    .eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); }

    .demo { margin-top: 32px; }
    .demo-title { display: flex; align-items: center; gap: 12px; color: var(--text-3); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .demo-title::before, .demo-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .demo-list { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
    .demo-btn { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; text-align: left; color: var(--text); transition: all 0.15s; }
    .demo-btn:hover:not(:disabled) { border-color: var(--brand); background: var(--brand-soft); }
    .demo-btn i { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: var(--surface-3); color: var(--brand-text); }
    .demo-btn strong { font-size: 13.5px; }
    .demo-btn small { font-size: 12px; color: var(--text-3); }

    @media (max-width: 960px) {
      .auth { grid-template-columns: minmax(0, 1fr); }
      .auth-aside { display: none; }
      .mobile-brand { display: block; }
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotifyService);
  theme = inject(ThemeService);

  email = '';
  password = '';
  remember = false;
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  year = new Date().getFullYear();
  expired = this.route.snapshot.queryParamMap.has('expired');

  demo = environment.showDemoAccounts;
  demoAccounts = [
    { label: 'Administrateur', email: 'admin@quincaillerie.fr', icon: 'fa-user-shield' },
    { label: 'Gestionnaire', email: 'gestionnaire@quincaillerie.fr', icon: 'fa-user-tie' },
    { label: 'Caissier', email: 'caissier@quincaillerie.fr', icon: 'fa-cash-register' },
  ];

  fill(email: string): void {
    this.email = email;
    this.password = 'password123';
    this.submit();
  }

  submit(): void {
    if (!this.email || !this.password || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login({ email: this.email.trim(), password: this.password, remember: this.remember }).subscribe({
      next: ({ user }) => {
        this.notify.success(`Bienvenue, ${user.name.split(' ')[0]} !`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl && returnUrl !== '/login' ? returnUrl : '/dashboard');
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.status === 429
          ? 'Trop de tentatives. Patientez une minute avant de réessayer.'
          : NotifyService.message(err, 'Connexion impossible'));
      },
    });
  }
}
