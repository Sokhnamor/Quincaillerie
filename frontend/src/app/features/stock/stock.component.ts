import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotifyService } from '../../core/services/notify.service';
import { MovementType, Paginated, StockMovement } from '../../core/models';
import { MOVEMENT_TYPES, todayIso } from '../../shared/labels';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [FormsModule, DatePipe, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mouvements de stock</h1>
          <p class="page-subtitle">Journal complet : chaque entrée et sortie de marchandise est tracée.</p>
        </div>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="input-icon search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="Produit, référence, n° de facture…" [(ngModel)]="search" (ngModelChange)="search$.next()">
          </div>
          <select class="select" [(ngModel)]="type" (ngModelChange)="load(1)" aria-label="Type de mouvement">
            <option value="">Tous les types</option>
            @for (t of types; track t.key) { <option [value]="t.key">{{ t.label }}</option> }
          </select>
          <div class="row">
            <input class="input" type="date" [(ngModel)]="startDate" (change)="load(1)" [max]="endDate || today" aria-label="Date de début">
            <span class="subtle">→</span>
            <input class="input" type="date" [(ngModel)]="endDate" (change)="load(1)" [min]="startDate" aria-label="Date de fin">
          </div>
        </div>

        @if (loading() && !page()) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else if (page()?.data?.length === 0) {
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-arrow-right-arrow-left"></i></div>
            <div class="empty-title">Aucun mouvement</div>
            <p class="empty-text">Les ventes, approvisionnements et ajustements apparaîtront ici.</p>
          </div>
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <thead><tr><th>Date</th><th>Produit</th><th>Type</th><th class="text-right">Quantité</th><th class="text-right hide-sm">Stock</th><th class="hide-sm">Référence / motif</th><th class="hide-sm">Par</th></tr></thead>
              <tbody>
                @for (m of page()?.data; track m.id) {
                  <tr>
                    <td class="muted small num">{{ m.created_at | date: 'dd/MM/yy HH:mm' }}</td>
                    <td><div class="cell-main">{{ m.product?.name ?? '—' }}</div><div class="cell-sub mono">{{ m.product?.reference }}</div></td>
                    <td><span class="type-chip {{ typeMap[m.type].tone }}"><i class="fa-solid {{ typeMap[m.type].icon }}"></i> {{ typeMap[m.type].label }}</span></td>
                    <td class="text-right num" [class.qty-in]="m.quantity > 0" [class.qty-out]="m.quantity < 0">{{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}</td>
                    <td class="text-right num muted hide-sm">{{ m.stock_before }} → <strong style="color:var(--text)">{{ m.stock_after }}</strong></td>
                    <td class="hide-sm small"><span class="mono">{{ m.reference }}</span> <span class="muted">{{ m.note }}</span></td>
                    <td class="hide-sm small muted">{{ m.user?.name ?? 'Système' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="page()?.current_page ?? 1" [lastPage]="page()?.last_page ?? 1" [total]="page()?.total ?? 0"
                          [from]="page()?.from ?? 0" [to]="page()?.to ?? 0" (pageChange)="load($event)"></app-pagination>
        }
      </div>
    </div>
  `,
  styles: [`
    .type-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; padding: 3px 9px; border-radius: 7px; background: var(--surface-3); color: var(--text-2); white-space: nowrap; }
    .type-chip.in { background: var(--success-soft); color: var(--success-text); }
    .type-chip.out { background: var(--danger-soft); color: var(--danger-text); }
  `]
})
export class StockComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);

  today = todayIso();
  typeMap = MOVEMENT_TYPES;
  types = (Object.keys(MOVEMENT_TYPES) as MovementType[]).map(key => ({ key, label: MOVEMENT_TYPES[key].label }));
  page = signal<Paginated<StockMovement> | null>(null);
  loading = signal(false);
  search = '';
  type = '';
  startDate = '';
  endDate = '';
  search$ = new Subject<void>();

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe(() => this.load(1));
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.getStockMovements({ page, search: this.search, type: this.type, start_date: this.startDate, end_date: this.endDate }).subscribe({
      next: res => {
        this.page.set(res);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }
}
