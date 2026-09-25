import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NotifyService } from '../../core/services/notify.service';
import { CashClosing, CashSummary, Paginated, PaymentMethod } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { PAYMENT_LABEL, PAYMENT_METHODS, todayIso } from '../../shared/labels';
import { PaginationComponent } from '../../shared/components/pagination.component';

/** Bank notes and coins in circulation (FCFA), for the counting helper */
const DENOMINATIONS = [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25, 10, 5];

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [FormsModule, DatePipe, MoneyPipe, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Clôture de caisse</h1>
          <p class="page-subtitle">Comparez en fin de journée l'argent compté avec ce que le système attend.</p>
        </div>
        <div class="page-actions">
          <input class="input" type="date" [ngModel]="date()" (ngModelChange)="setDate($event)" [max]="today" aria-label="Journée">
        </div>
      </div>

      @if (summary(); as s) {
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">Ventes de la journée</span><span class="kpi-icon brand"><i class="fa-solid fa-receipt"></i></span></div><div class="kpi-value">{{ s.sales_count }}</div><div class="kpi-meta">{{ s.sales_total | money }} TTC</div></div>
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">Total encaissé</span><span class="kpi-icon success"><i class="fa-solid fa-wallet"></i></span></div><div class="kpi-value">{{ s.collected_total | money }}</div><div class="kpi-meta">tous moyens confondus</div></div>
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">Retours</span><span class="kpi-icon warning"><i class="fa-solid fa-arrow-rotate-left"></i></span></div><div class="kpi-value">{{ s.returns_total | money }}</div><div class="kpi-meta">dont {{ s.refunded | money }} remboursés</div></div>
          <div class="kpi"><div class="kpi-top"><span class="kpi-label">Espèces attendues</span><span class="kpi-icon info"><i class="fa-solid fa-money-bill-wave"></i></span></div><div class="kpi-value">{{ s.expected_cash | money }}</div><div class="kpi-meta">dans le tiroir-caisse</div></div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header"><div><div class="card-title">Encaissements par moyen de paiement</div><div class="card-subtitle">{{ s.date | date: 'EEEE d MMMM y' }}</div></div></div>
            <div class="card-body" style="padding-top:6px;padding-bottom:6px">
              @for (m of methods; track m.value) {
                <div class="method-row" [class.dim]="!s.by_method[m.value]">
                  <span class="tile-icon"><i class="fa-solid {{ m.icon }}"></i></span>
                  <div class="grow"><div class="strong small">{{ m.label }}</div><div class="xs subtle">{{ s.by_method[m.value]?.count ?? 0 }} opération(s)</div></div>
                  <strong class="num">{{ s.by_method[m.value]?.total ?? 0 | money }}</strong>
                </div>
              }
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div><div class="card-title">Comptage des espèces</div><div class="card-subtitle">Saisissez le total ou comptez billet par billet</div></div>
              <button type="button" class="btn btn-ghost btn-sm" (click)="helper.set(!helper())"><i class="fa-solid fa-calculator"></i> {{ helper() ? 'Masquer' : 'Aide au comptage' }}</button>
            </div>
            <div class="card-body stack" style="gap:14px">
              @if (helper()) {
                <div class="denoms">
                  @for (d of denominations; track d; let i = $index) {
                    <label class="denom">
                      <span class="num small strong">{{ d | money: '' }}</span>
                      <span class="xs subtle">×</span>
                      <input class="input input-sm num" type="number" min="0" [ngModel]="counts()[i]" (ngModelChange)="setCount(i, $event)" [attr.aria-label]="'Nombre de ' + d">
                    </label>
                  }
                </div>
              }
              <div class="field">
                <label class="label" for="counted">Espèces comptées</label>
                <div class="input-suffix"><input id="counted" class="input num" style="height:48px;font-size:18px;font-weight:700" type="number" min="0" [ngModel]="counted()" (ngModelChange)="counted.set(+$event || 0)"><span>FCFA</span></div>
              </div>
              <div class="diff" [class.ok]="difference() === 0" [class.plus]="difference() > 0" [class.minus]="difference() < 0">
                <span>{{ difference() === 0 ? 'Caisse juste' : difference() > 0 ? 'Excédent' : 'Manquant' }}</span>
                <strong class="num">{{ difference() > 0 ? '+' : '' }}{{ difference() | money }}</strong>
              </div>
              <div class="field">
                <label class="label" for="cash-notes">Commentaire</label>
                <input id="cash-notes" class="input" [(ngModel)]="notes" placeholder="Ex. : 500 F rendus en trop à un client">
              </div>
              <button type="button" class="btn btn-primary btn-lg btn-block" [disabled]="saving()" (click)="close()">
                @if (saving()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-lock"></i> } Clôturer la caisse
              </button>
              @if (s.closings.length) {
                <p class="xs subtle text-center">Déjà clôturée {{ s.closings.length }} fois ce jour-là (dernière : {{ s.closings[0].created_at | date: 'HH:mm' }} par {{ s.closings[0].user?.name }}).</p>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="loading-block"><span class="spinner spinner-lg"></span></div>
      }

      <div class="card" style="margin-top:20px">
        <div class="card-header"><div><div class="card-title">Historique des clôtures</div></div></div>
        @if (history()?.data?.length === 0) {
          <div class="empty empty-sm"><div class="empty-icon"><i class="fa-solid fa-vault"></i></div><p class="muted small">Aucune clôture enregistrée.</p></div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Journée</th><th class="hide-sm">Par</th><th class="text-right hide-sm">Ventes</th><th class="text-right">Attendu</th><th class="text-right">Compté</th><th class="text-right">Écart</th></tr></thead>
              <tbody>
                @for (c of history()?.data; track c.id) {
                  <tr>
                    <td><div class="strong">{{ c.business_date | date: 'dd/MM/yyyy' }}</div><div class="cell-sub">clôturée à {{ c.created_at | date: 'HH:mm' }}</div></td>
                    <td class="hide-sm muted">{{ c.user?.name }}</td>
                    <td class="text-right num hide-sm">{{ c.sales_count }}</td>
                    <td class="text-right num">{{ c.expected_cash | money }}</td>
                    <td class="text-right num">{{ c.counted_cash | money }}</td>
                    <td class="text-right num strong" [class.text-success]="+c.difference === 0" [class.text-danger]="+c.difference < 0" [class.text-warning]="+c.difference > 0">
                      {{ +c.difference > 0 ? '+' : '' }}{{ c.difference | money }}
                      @if (c.notes) { <div class="cell-sub" style="font-weight:400">{{ c.notes }}</div> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="history()?.current_page ?? 1" [lastPage]="history()?.last_page ?? 1" [total]="history()?.total ?? 0"
                          [from]="history()?.from ?? 0" [to]="history()?.to ?? 0" (pageChange)="loadHistory($event)"></app-pagination>
        }
      </div>
    </div>
  `,
  styles: [`
    .method-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .method-row:last-child { border-bottom: 0; }
    .method-row.dim { opacity: 0.45; }
    .denoms { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; }
    .denom { display: flex; align-items: center; gap: 6px; }
    .denom .num { min-width: 46px; text-align: right; }
    .denom .input { min-width: 0; }
    .diff { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 10px; font-weight: 600; background: var(--surface-3); }
    .diff strong { font-size: 20px; }
    .diff.ok { background: var(--success-soft); color: var(--success-text); }
    .diff.plus { background: var(--warning-soft); color: var(--warning-text); }
    .diff.minus { background: var(--danger-soft); color: var(--danger-text); }
    @media (max-width: 640px) { .denoms { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `]
})
export class CashComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);

  methods = PAYMENT_METHODS;
  methodLabel = PAYMENT_LABEL;
  denominations = DENOMINATIONS;
  today = todayIso();

  date = signal(todayIso());
  summary = signal<CashSummary | null>(null);
  history = signal<Paginated<CashClosing> | null>(null);
  counted = signal(0);
  counts = signal<number[]>(DENOMINATIONS.map(() => 0));
  helper = signal(false);
  saving = signal(false);
  notes = '';

  difference = computed(() => Math.round((this.counted() - (this.summary()?.expected_cash ?? 0)) * 100) / 100);

  ngOnInit(): void {
    this.loadSummary();
    this.loadHistory(1);
  }

  setDate(value: string): void {
    this.date.set(value || this.today);
    this.loadSummary();
  }

  loadSummary(): void {
    this.summary.set(null);
    this.api.getCashSummary(this.date()).subscribe({
      next: s => this.summary.set(s),
      error: err => this.notify.error(err),
    });
  }

  loadHistory(page: number): void {
    this.api.getCashClosings({ page }).subscribe({ next: h => this.history.set(h), error: err => this.notify.error(err) });
  }

  setCount(index: number, value: unknown): void {
    const counts = [...this.counts()];
    counts[index] = Math.max(0, Math.floor(Number(value) || 0));
    this.counts.set(counts);
    this.counted.set(counts.reduce((sum, n, i) => sum + n * DENOMINATIONS[i], 0));
  }

  async close(): Promise<void> {
    const diff = this.difference();
    if (diff !== 0) {
      const ok = await this.notify.confirm({
        title: diff < 0 ? 'Il manque de l\'argent' : 'Il y a un excédent',
        text: `Écart de ${diff > 0 ? '+' : ''}${diff.toLocaleString('fr-FR')} FCFA par rapport aux espèces attendues. Clôturer quand même ?`,
        confirmText: 'Clôturer',
        danger: diff < 0,
      });
      if (!ok) {
        return;
      }
    }
    this.saving.set(true);
    this.api.closeCash({ date: this.date(), counted_cash: this.counted(), notes: this.notes || undefined }).subscribe({
      next: res => {
        this.saving.set(false);
        this.notify.success(res.message);
        this.notes = '';
        this.counted.set(0);
        this.counts.set(DENOMINATIONS.map(() => 0));
        this.loadSummary();
        this.loadHistory(1);
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }
}
