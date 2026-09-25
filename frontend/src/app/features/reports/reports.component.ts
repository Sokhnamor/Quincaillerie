import { Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { NotifyService } from '../../core/services/notify.service';
import { ThemeService } from '../../core/services/theme.service';
import { Report } from '../../core/models';
import { MoneyPipe, formatMoney } from '../../shared/money.pipe';
import { PAYMENT_LABEL, downloadBlob, todayIso } from '../../shared/labels';

Chart.register(...registerables);

type Preset = 'today' | '7d' | 'month' | 'last-month' | 'year' | 'custom';

function iso(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, MoneyPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Rapports</h1>
          <p class="page-subtitle">Chiffre d'affaires, marge et performance sur la période choisie.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" (click)="export()" [disabled]="exporting() || !report()">
            @if (exporting()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-file-excel"></i> } Exporter en Excel
          </button>
        </div>
      </div>

      <div class="card period-bar">
        <div class="segmented">
          @for (p of presets; track p.value) {
            <button type="button" [class.active]="preset() === p.value" (click)="applyPreset(p.value)">{{ p.label }}</button>
          }
        </div>
        <div class="row">
          <input class="input" type="date" [(ngModel)]="start" (change)="custom()" [max]="end" aria-label="Du">
          <span class="subtle">→</span>
          <input class="input" type="date" [(ngModel)]="end" (change)="custom()" [min]="start" [max]="today" aria-label="Au">
        </div>
      </div>

      @if (!report()) {
        <div class="loading-block"><span class="spinner spinner-lg"></span></div>
      } @else {
        @let r = report()!;
        <div class="kpi-grid" [style.opacity]="loading() ? 0.6 : 1">
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">CA net TTC</span><span class="kpi-icon brand"><i class="fa-solid fa-sack-dollar"></i></span></div><div class="kpi-value">{{ r.totals.net_revenue | money }}</div><div class="kpi-meta">{{ r.totals.sales_count }} ventes · panier moyen {{ r.totals.average_basket | money }}</div></div>
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">Marge brute estimée</span><span class="kpi-icon success"><i class="fa-solid fa-chart-line"></i></span></div><div class="kpi-value">{{ r.totals.margin | money }}</div><div class="kpi-meta">taux de marge {{ r.totals.margin_rate | number: '1.0-1' }} % du CA HT</div></div>
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">Encaissé</span><span class="kpi-icon info"><i class="fa-solid fa-wallet"></i></span></div><div class="kpi-value">{{ r.totals.collected | money }}</div><div class="kpi-meta">reste à encaisser {{ r.totals.unpaid | money }}</div></div>
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">Retours & remises</span><span class="kpi-icon warning"><i class="fa-solid fa-arrow-rotate-left"></i></span></div><div class="kpi-value">{{ r.totals.returns | money }}</div><div class="kpi-meta">remises accordées {{ r.totals.discounts | money }} · TVA {{ r.totals.tax | money }}</div></div>
        </div>

        <div class="card">
          <div class="card-header"><div><div class="card-title">Ventes jour par jour</div><div class="card-subtitle">CA net TTC du {{ r.period.start | date: 'dd/MM/yyyy' }} au {{ r.period.end | date: 'dd/MM/yyyy' }}</div></div></div>
          <div class="card-body"><div class="chart-box"><canvas #dailyCanvas role="img" aria-label="Ventes par jour"></canvas></div></div>
        </div>

        <div class="grid grid-3" style="margin-top:20px">
          <div class="card">
            <div class="card-header"><div class="card-title">Par catégorie</div></div>
            <div class="card-body bars">
              @if (!r.by_category.length) { <p class="muted small">Aucune vente.</p> }
              @for (c of categoryBars(); track c.label) {
                <div>
                  <div class="row-between small"><span class="truncate">{{ c.label }}</span><span class="num strong">{{ c.value | money }}</span></div>
                  <div class="bar-track"><span [style.width.%]="c.pct"></span></div>
                  <div class="xs subtle">marge {{ c.extra | money }}</div>
                </div>
              }
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Par vendeur</div></div>
            <div class="card-body bars">
              @if (!r.by_seller.length) { <p class="muted small">Aucune vente.</p> }
              @for (s of sellerBars(); track s.label) {
                <div>
                  <div class="row-between small"><span class="truncate">{{ s.label }}</span><span class="num strong">{{ s.value | money }}</span></div>
                  <div class="bar-track"><span [style.width.%]="s.pct"></span></div>
                  <div class="xs subtle">{{ s.extra }} vente(s)</div>
                </div>
              }
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Moyens de paiement</div></div>
            <div class="card-body bars">
              @if (!r.by_payment_method.length) { <p class="muted small">Aucun encaissement.</p> }
              @for (m of methodBars(); track m.label) {
                <div>
                  <div class="row-between small"><span>{{ m.label }}</span><span class="num strong">{{ m.value | money }}</span></div>
                  <div class="bar-track"><span [style.width.%]="m.pct"></span></div>
                  <div class="xs subtle">{{ m.extra }} opération(s)</div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="grid grid-main-side" style="margin-top:20px">
          <div class="card">
            <div class="card-header"><div><div class="card-title">Produits les plus vendus</div><div class="card-subtitle">Classés par chiffre d'affaires HT</div></div></div>
            @if (!r.top_products.length) {
              <div class="empty empty-sm"><p class="muted small">Aucune vente sur la période.</p></div>
            } @else {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>#</th><th>Produit</th><th class="text-right">Qté</th><th class="text-right">CA HT</th><th class="text-right">Marge</th></tr></thead>
                  <tbody>
                    @for (p of r.top_products; track p.id; let i = $index) {
                      <tr>
                        <td class="subtle">{{ i + 1 }}</td>
                        <td><div class="cell-main">{{ p.name }}</div><div class="cell-sub mono">{{ p.reference }}</div></td>
                        <td class="text-right num">{{ p.quantity }}</td>
                        <td class="text-right num strong">{{ p.revenue | money }}</td>
                        <td class="text-right num" [class.text-success]="+p.margin > 0" [class.text-danger]="+p.margin <= 0">{{ p.margin | money }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
          <div class="card">
            <div class="card-header"><div><div class="card-title">Stock dormant</div><div class="card-subtitle">En stock mais aucune vente sur la période</div></div></div>
            @if (!r.sleeping_products.length) {
              <div class="empty empty-sm"><div class="empty-icon" style="background:var(--success-soft);color:var(--success-text)"><i class="fa-solid fa-check"></i></div><p class="muted small">Tout le stock a tourné.</p></div>
            } @else {
              <div class="card-body" style="padding-top:4px;padding-bottom:4px">
                @for (p of r.sleeping_products; track p.id) {
                  <div class="sleep-row">
                    <div class="grow"><div class="strong small truncate">{{ p.name }}</div><div class="xs subtle">{{ p.stock }} {{ p.unit }} en stock</div></div>
                    <span class="num small" title="Valeur d'achat immobilisée">{{ p.value | money }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .period-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .period-bar .input { height: 36px; width: auto; }
    .chart-box { position: relative; height: 260px; }
    .bars { display: flex; flex-direction: column; gap: 14px; }
    .bar-track { height: 8px; border-radius: 99px; background: var(--surface-3); margin: 6px 0 3px; overflow: hidden; }
    .bar-track span { display: block; height: 100%; border-radius: 99px; background: var(--brand); min-width: 4px; }
    .sleep-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
    .sleep-row:last-child { border-bottom: 0; }
  `]
})
export class ReportsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private theme = inject(ThemeService);
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('dailyCanvas');
  private chart?: Chart;

  today = todayIso();
  presets: { value: Preset; label: string }[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: '7d', label: '7 jours' },
    { value: 'month', label: 'Ce mois' },
    { value: 'last-month', label: 'Mois dernier' },
    { value: 'year', label: 'Cette année' },
  ];

  report = signal<Report | null>(null);
  loading = signal(false);
  exporting = signal(false);
  preset = signal<Preset>('month');
  start = '';
  end = '';

  categoryBars = computed(() => this.bars((this.report()?.by_category ?? []).map(c => ({ label: c.category, value: +c.revenue, extra: +c.margin }))));
  sellerBars = computed(() => this.bars((this.report()?.by_seller ?? []).map(s => ({ label: s.name, value: +s.revenue, extra: s.count }))));
  methodBars = computed(() => this.bars((this.report()?.by_payment_method ?? []).map(m => ({ label: PAYMENT_LABEL[m.method] ?? m.method, value: +m.total, extra: m.count }))));

  constructor() {
    effect(() => {
      const r = this.report();
      this.theme.dark();
      if (r && this.canvas()) {
        queueMicrotask(() => this.renderChart());
      }
    });
  }

  ngOnInit(): void {
    this.applyPreset('month');
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  applyPreset(p: Preset): void {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const ranges: Record<Exclude<Preset, 'custom'>, [Date, Date]> = {
      today: [now, now],
      '7d': [new Date(y, m, now.getDate() - 6), now],
      month: [new Date(y, m, 1), now],
      'last-month': [new Date(y, m - 1, 1), new Date(y, m, 0)],
      year: [new Date(y, 0, 1), now],
    };
    if (p !== 'custom') {
      [this.start, this.end] = ranges[p].map(iso);
    }
    this.preset.set(p);
    this.load();
  }

  custom(): void {
    if (this.start && this.end) {
      this.preset.set('custom');
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.api.getReport({ start_date: this.start, end_date: this.end }).subscribe({
      next: r => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(err, 'Impossible de charger le rapport');
      },
    });
  }

  export(): void {
    this.exporting.set(true);
    this.api.exportReport({ start_date: this.start, end_date: this.end }).subscribe({
      next: blob => {
        this.exporting.set(false);
        downloadBlob(blob, `rapport-${this.start}-au-${this.end}.xlsx`);
      },
      error: err => {
        this.exporting.set(false);
        this.notify.error(err, 'Export impossible');
      },
    });
  }

  private bars<T extends { label: string; value: number; extra: number }>(rows: T[]): (T & { pct: number })[] {
    const max = Math.max(...rows.map(r => r.value), 1);
    return rows.map(r => ({ ...r, pct: Math.max(0, (r.value / max) * 100) }));
  }

  private renderChart(): void {
    const r = this.report();
    const el = this.canvas()?.nativeElement;
    if (!r || !el) {
      return;
    }
    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--text-3').trim();
    const grid = css.getPropertyValue('--border').trim();
    const surface = css.getPropertyValue('--surface').trim();
    const ink = css.getPropertyValue('--text').trim();

    this.chart?.destroy();
    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels: r.daily.map(d => new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        datasets: [{
          label: 'CA net',
          data: r.daily.map(d => d.revenue),
          backgroundColor: '#ea580c',
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom',
          maxBarThickness: 26,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: surface, titleColor: ink, bodyColor: ink, borderColor: grid, borderWidth: 1, padding: 10,
            callbacks: { label: ctx => ` ${formatMoney(ctx.parsed.y)} · ${r.daily[ctx.dataIndex].count} vente(s)` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: text, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: {
            beginAtZero: true, border: { display: false }, grid: { color: grid },
            ticks: { color: text, font: { size: 11 }, maxTicksLimit: 5, callback: v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(Number(v)) },
          },
        },
      },
    });
  }
}
