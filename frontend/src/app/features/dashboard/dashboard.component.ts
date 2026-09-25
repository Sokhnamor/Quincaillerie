import { Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { ThemeService } from '../../core/services/theme.service';
import { DashboardData } from '../../core/models';
import { MoneyPipe, formatMoney } from '../../shared/money.pipe';
import { PAYMENT_LABEL, SALE_STATUS } from '../../shared/labels';

Chart.register(...registerables);

/** Chart series colors, validated for colour-vision deficiency on both surfaces */
const SERIES = {
  light: { sales: '#ea580c', collected: '#2a78d6' },
  dark: { sales: '#ea580c', collected: '#3987e5' },
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MoneyPipe, DatePipe, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ greeting() }}, {{ firstName() }}</h1>
          <p class="page-subtitle">{{ today | date: 'EEEE d MMMM y' }} · Voici l'activité de votre quincaillerie.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" (click)="load()" [disabled]="loading()">
            <i class="fa-solid fa-rotate" [class.fa-spin]="loading()"></i> Actualiser
          </button>
          <a routerLink="/pos" class="btn btn-primary"><i class="fa-solid fa-cash-register"></i> Nouvelle vente</a>
        </div>
      </div>

      @if (loading() && !data()) {
        <div class="kpi-grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="kpi"><div class="skeleton" style="width:50%"></div><div class="skeleton" style="height:26px;width:70%"></div><div class="skeleton" style="width:40%"></div></div>
          }
        </div>
      }

      @if (data(); as d) {
        <!-- Headline KPIs -->
        <div class="kpi-grid">
          <div class="kpi">
            <div class="kpi-top"><span class="kpi-label">Ventes du jour</span><span class="kpi-icon brand"><i class="fa-solid fa-sack-dollar"></i></span></div>
            <div class="kpi-value">{{ d.stats.today_sales | money }}</div>
            <div class="kpi-meta">
              <span class="trend {{ trendClass(d.stats.sales_growth) }}"><i class="fa-solid {{ trendIcon(d.stats.sales_growth) }}"></i>{{ d.stats.sales_growth | number: '1.0-1' }} %</span>
              vs hier · {{ d.stats.today_sales_count }} vente{{ d.stats.today_sales_count > 1 ? 's' : '' }}
            </div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><span class="kpi-label">Chiffre d'affaires du mois</span><span class="kpi-icon info"><i class="fa-solid fa-chart-line"></i></span></div>
            <div class="kpi-value">{{ d.stats.month_sales | money }}</div>
            <div class="kpi-meta">
              <span class="trend {{ trendClass(d.stats.month_sales_growth) }}"><i class="fa-solid {{ trendIcon(d.stats.month_sales_growth) }}"></i>{{ d.stats.month_sales_growth | number: '1.0-1' }} %</span>
              vs même période du mois dernier
            </div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><span class="kpi-label">Encaissé ce mois</span><span class="kpi-icon success"><i class="fa-solid fa-wallet"></i></span></div>
            <div class="kpi-value">{{ d.stats.month_collected | money }}</div>
            <div class="kpi-meta">Marge estimée : <strong class="text-success">{{ d.stats.month_margin | money }}</strong></div>
          </div>
          <a class="kpi" routerLink="/sales" [queryParams]="{ status: 'due' }">
            <div class="kpi-top"><span class="kpi-label">Créances clients</span><span class="kpi-icon {{ d.stats.receivables > 0 ? 'danger' : 'success' }}"><i class="fa-solid fa-hand-holding-dollar"></i></span></div>
            <div class="kpi-value">{{ d.stats.receivables | money }}</div>
            <div class="kpi-meta">{{ d.stats.receivables_count }} vente{{ d.stats.receivables_count > 1 ? 's' : '' }} à encaisser <i class="fa-solid fa-arrow-right xs"></i></div>
          </a>
        </div>

        <div class="grid grid-main-side">
          <!-- Sales chart -->
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Évolution des ventes</div>
                <div class="card-subtitle">Chiffre d'affaires TTC et montants encaissés</div>
              </div>
              <div class="segmented" role="tablist">
                <button type="button" [class.active]="range() === 'month'" (click)="range.set('month')">12 mois</button>
                <button type="button" [class.active]="range() === 'day'" (click)="range.set('day')">30 jours</button>
              </div>
            </div>
            <div class="card-body">
              <div class="legend">
                <span><i class="swatch" [style.background]="colors().sales"></i> Ventes</span>
                @if (range() === 'month') {
                  <span><i class="swatch" [style.background]="colors().collected"></i> Encaissé</span>
                }
                <span class="grow"></span>
                <span class="muted small">Total période : <strong class="num">{{ rangeTotal() | money }}</strong></span>
              </div>
              <div class="chart-box"><canvas #salesCanvas aria-label="Graphique des ventes" role="img"></canvas></div>
            </div>
          </div>

          <!-- Stock alerts -->
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Alertes de stock</div>
                <div class="card-subtitle">{{ d.stats.out_of_stock_count }} en rupture · {{ d.stats.low_stock_count }} en stock faible</div>
              </div>
              <a routerLink="/products" [queryParams]="{ stock_status: 'alert' }" class="btn btn-ghost btn-sm">Tout voir</a>
            </div>
            @if (alertList().length === 0) {
              <div class="empty empty-sm">
                <div class="empty-icon" style="background:var(--success-soft);color:var(--success-text)"><i class="fa-solid fa-circle-check"></i></div>
                <div class="empty-title">Tout est en ordre</div>
                <p class="empty-text small">Aucun produit sous son seuil d'alerte.</p>
              </div>
            } @else {
              <div class="alert-list">
                @for (p of alertList(); track p.id) {
                  <div class="alert-item">
                    <div class="grow">
                      <div class="row-between">
                        <span class="strong truncate">{{ p.name }}</span>
                        <span class="badge {{ p.stock <= 0 ? 'badge-danger' : 'badge-warning' }}">{{ p.stock <= 0 ? 'Rupture' : p.stock + ' ' + p.unit }}</span>
                      </div>
                      <div class="progress {{ p.stock <= 0 ? 'danger' : 'warning' }}" style="margin-top:8px">
                        <span [style.width.%]="stockRatio(p.stock, p.alert_threshold)"></span>
                      </div>
                      <div class="xs subtle" style="margin-top:4px">{{ p.category?.name }} · seuil {{ p.alert_threshold }}</div>
                    </div>
                  </div>
                }
              </div>
              @if (auth.canManage()) {
                <div class="card-footer">
                  <a routerLink="/purchases" [queryParams]="{ new: 1 }" class="btn btn-secondary btn-sm btn-block"><i class="fa-solid fa-truck-ramp-box"></i> Réapprovisionner</a>
                </div>
              }
            }
          </div>
        </div>

        <div class="grid grid-3" style="margin-top:20px">
          <!-- Categories -->
          <div class="card">
            <div class="card-header"><div><div class="card-title">Ventes par catégorie</div><div class="card-subtitle">6 derniers mois</div></div></div>
            <div class="card-body">
              @if (categories().length === 0) {
                <p class="muted small text-center">Pas encore de ventes.</p>
              }
              <div class="bars">
                @for (c of categories(); track c.label) {
                  <div class="bar-row" [attr.title]="c.label + ' : ' + formatMoney(c.value)">
                    <div class="row-between small"><span class="truncate">{{ c.label }}</span><span class="num strong">{{ c.value | money }}</span></div>
                    <div class="bar-track"><span [style.width.%]="c.pct"></span></div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Top products -->
          <div class="card">
            <div class="card-header"><div><div class="card-title">Meilleures ventes</div><div class="card-subtitle">30 derniers jours, en quantité</div></div></div>
            <div class="card-body" style="padding-top:8px;padding-bottom:8px">
              @if (d.charts.top_products.length === 0) {
                <p class="muted small text-center" style="padding:12px 0">Pas encore de ventes.</p>
              }
              @for (p of d.charts.top_products; track p.id; let i = $index) {
                <div class="rank-row">
                  <span class="rank">{{ i + 1 }}</span>
                  <div class="grow">
                    <div class="strong truncate small">{{ p.name }}</div>
                    <div class="xs subtle">{{ p.quantity_sold }} vendus</div>
                  </div>
                  <span class="num small strong">{{ p.total_sales | money }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Snapshot -->
          <div class="card">
            <div class="card-header"><div><div class="card-title">Vue d'ensemble</div><div class="card-subtitle">Stock et encaissements du mois</div></div></div>
            <div class="card-body">
              <dl class="dl">
                <dt>Valeur du stock (achat)</dt><dd class="num">{{ d.stats.stock_value | money }}</dd>
                <dt>Valeur du stock (vente)</dt><dd class="num">{{ d.stats.stock_retail_value | money }}</dd>
                <dt>Produits référencés</dt><dd class="num">{{ d.stats.products_count }}</dd>
                <dt>Clients</dt><dd class="num">{{ d.stats.clients_count }}</dd>
                <dt>Achats du mois</dt><dd class="num">{{ d.stats.month_purchases | money }}</dd>
              </dl>
              @if (d.charts.payment_methods.length) {
                <hr class="divider">
                <div class="section-title">Moyens de paiement (mois)</div>
                <div class="bars">
                  @for (m of paymentMethods(); track m.label) {
                    <div class="bar-row">
                      <div class="row-between small"><span>{{ m.label }}</span><span class="num strong">{{ m.value | money }}</span></div>
                      <div class="bar-track"><span [style.width.%]="m.pct"></span></div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Recent sales -->
        <div class="card" style="margin-top:20px">
          <div class="card-header">
            <div><div class="card-title">Ventes récentes</div><div class="card-subtitle">Les 8 dernières transactions</div></div>
            <a routerLink="/sales" class="btn btn-ghost btn-sm">Toutes les ventes <i class="fa-solid fa-arrow-right"></i></a>
          </div>
          @if (d.recent_sales.length === 0) {
            <div class="empty">
              <div class="empty-icon"><i class="fa-solid fa-receipt"></i></div>
              <div class="empty-title">Aucune vente pour l'instant</div>
              <a routerLink="/pos" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Enregistrer une vente</a>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Facture</th><th>Client</th><th class="hide-sm">Date</th><th>Statut</th><th class="text-right">Total</th></tr></thead>
                <tbody>
                  @for (s of d.recent_sales; track s.id) {
                    <tr class="clickable" [routerLink]="['/sales']" [queryParams]="{ open: s.id }">
                      <td><span class="mono strong">{{ s.invoice_number }}</span></td>
                      <td>{{ s.client_name }}</td>
                      <td class="hide-sm muted">{{ s.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                      <td><span class="badge {{ status[s.status].badge }}">{{ status[s.status].label }}</span></td>
                      <td class="text-right num strong">{{ s.total | money }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .chart-box { position: relative; height: 290px; }
    .legend { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; font-size: 12.5px; color: var(--text-2); flex-wrap: wrap; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
    .alert-list { padding: 4px 20px; max-height: 360px; overflow-y: auto; }
    .alert-item { padding: 12px 0; border-bottom: 1px solid var(--border); }
    .alert-item:last-child { border-bottom: 0; }
    .bars { display: flex; flex-direction: column; gap: 14px; }
    .bar-track { height: 8px; border-radius: 99px; background: var(--surface-3); margin-top: 6px; overflow: hidden; }
    .bar-track span { display: block; height: 100%; border-radius: 99px; background: var(--brand); min-width: 4px; }
    .rank-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .rank-row:last-child { border-bottom: 0; }
    .rank { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-text); font-weight: 700; font-size: 12px; flex-shrink: 0; }
    .dl dd { font-weight: 600; }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private theme = inject(ThemeService);
  auth = inject(AuthService);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('salesCanvas');
  private chart?: Chart;

  data = signal<DashboardData | null>(null);
  loading = signal(false);
  range = signal<'month' | 'day'>('month');
  today = new Date();
  status = SALE_STATUS;
  formatMoney = formatMoney;

  firstName = computed(() => (this.auth.currentUser()?.name ?? '').split(' ')[0]);
  greeting = computed(() => (new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'));
  colors = computed(() => (this.theme.dark() ? SERIES.dark : SERIES.light));

  alertList = computed(() => {
    const d = this.data();
    return d ? [...d.alerts.out_of_stock, ...d.alerts.low_stock].slice(0, 6) : [];
  });

  categories = computed(() => this.toBars((this.data()?.charts.sales_by_category ?? []).map(c => ({ label: c.category, value: Number(c.total) }))));

  paymentMethods = computed(() => this.toBars((this.data()?.charts.payment_methods ?? []).map(m => ({ label: PAYMENT_LABEL[m.method] ?? m.method, value: Number(m.total) }))));

  rangeTotal = computed(() => {
    const charts = this.data()?.charts;
    if (!charts) {
      return 0;
    }
    const rows = this.range() === 'month' ? charts.monthly_sales : charts.daily_sales;
    return rows.reduce((sum, r) => sum + Number(r.total), 0);
  });

  constructor() {
    // Redraw when the data, the range or the theme changes
    effect(() => {
      const d = this.data();
      this.range();
      this.theme.dark();
      const canvas = this.canvas();
      if (d && canvas) {
        queueMicrotask(() => this.renderChart());
      }
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  load(): void {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: d => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(err, 'Impossible de charger le tableau de bord');
      },
    });
  }

  trendClass(v: number): string {
    return v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  }

  trendIcon(v: number): string {
    return v > 0 ? 'fa-arrow-trend-up' : v < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
  }

  stockRatio(stock: number, threshold: number): number {
    return threshold > 0 ? Math.max(4, Math.min(100, (stock / threshold) * 100)) : 0;
  }

  private toBars(rows: { label: string; value: number }[]): { label: string; value: number; pct: number }[] {
    const max = Math.max(...rows.map(r => r.value), 1);
    return rows.map(r => ({ ...r, pct: (r.value / max) * 100 }));
  }

  private renderChart(): void {
    const d = this.data();
    const el = this.canvas()?.nativeElement;
    if (!d || !el) {
      return;
    }

    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--text-3').trim();
    const grid = css.getPropertyValue('--border').trim();
    const surface = css.getPropertyValue('--surface').trim();
    const ink = css.getPropertyValue('--text').trim();
    const colors = this.colors();
    const monthly = this.range() === 'month';

    const labels = monthly ? d.charts.monthly_sales.map(m => m.label) : d.charts.daily_sales.map(m => m.label);
    const datasets = monthly
      ? [
          { label: 'Ventes', data: d.charts.monthly_sales.map(m => m.total), backgroundColor: colors.sales },
          { label: 'Encaissé', data: d.charts.monthly_sales.map(m => m.collected), backgroundColor: colors.collected },
        ]
      : [{ label: 'Ventes', data: d.charts.daily_sales.map(m => m.total), backgroundColor: colors.sales }];

    this.chart?.destroy();
    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          ...ds,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom',
          borderColor: surface,
          borderWidth: { left: 1, right: 1 },
          maxBarThickness: monthly ? 22 : 14,
          categoryPercentage: 0.7,
          barPercentage: 0.9,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: surface,
            titleColor: ink,
            bodyColor: ink,
            borderColor: grid,
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: { label: ctx => ` ${ctx.dataset.label} : ${formatMoney(ctx.parsed.y)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: text, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: monthly ? 12 : 10 } },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: grid },
            ticks: {
              color: text,
              font: { size: 11 },
              maxTicksLimit: 5,
              callback: v => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v)),
            },
          },
        },
      },
    });
  }
}
