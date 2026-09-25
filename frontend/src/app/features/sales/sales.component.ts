import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { InvoiceFormat, Paginated, PaymentMethod, Sale, SalePayment, SaleReturn, SalesSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { INVOICE_FORMATS, PAYMENT_LABEL, PAYMENT_METHODS, SALE_STATUS, downloadBlob, printBlob, todayIso, whatsappUrl } from '../../shared/labels';
import { formatMoney } from '../../shared/money.pipe';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

type StatusFilter = '' | 'paid' | 'partial' | 'unpaid' | 'due' | 'returned';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, DrawerComponent, ModalComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Ventes</h1>
          <p class="page-subtitle">Historique des ventes, factures et encaissements.</p>
        </div>
        <div class="page-actions">
          @if (auth.canManage()) {
            <button type="button" class="btn btn-secondary" (click)="export('excel')" [disabled]="exporting()"><i class="fa-solid fa-file-excel"></i> Excel</button>
            <button type="button" class="btn btn-secondary" (click)="export('pdf')" [disabled]="exporting()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
          }
          <a routerLink="/pos" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Nouvelle vente</a>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-top"><span class="kpi-label">Ventes</span><span class="kpi-icon"><i class="fa-solid fa-receipt"></i></span></div><div class="kpi-value">{{ summary()?.count ?? '—' }}</div><div class="kpi-meta">selon les filtres</div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-label">Montant total</span><span class="kpi-icon brand"><i class="fa-solid fa-sack-dollar"></i></span></div><div class="kpi-value">{{ summary()?.total | money }}</div><div class="kpi-meta">TTC</div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-label">Encaissé</span><span class="kpi-icon success"><i class="fa-solid fa-wallet"></i></span></div><div class="kpi-value">{{ summary()?.paid | money }}</div><div class="kpi-meta">paiements reçus</div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-label">Reste à encaisser</span><span class="kpi-icon danger"><i class="fa-solid fa-hand-holding-dollar"></i></span></div><div class="kpi-value">{{ summary()?.remaining | money }}</div><div class="kpi-meta">créances</div></div>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="input-icon search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="N° de facture ou client…" [(ngModel)]="search" (ngModelChange)="search$.next()">
          </div>
          <div class="segmented">
            @for (f of statusFilters; track f.value) {
              <button type="button" [class.active]="status() === f.value" (click)="setStatus(f.value)">{{ f.label }}</button>
            }
          </div>
          <div class="row">
            <input class="input" type="date" [(ngModel)]="startDate" (change)="reload()" [max]="endDate || today" aria-label="Date de début">
            <span class="subtle">→</span>
            <input class="input" type="date" [(ngModel)]="endDate" (change)="reload()" [min]="startDate" aria-label="Date de fin">
          </div>
          @if (hasFilters()) {
            <button type="button" class="btn btn-ghost btn-sm" (click)="resetFilters()"><i class="fa-solid fa-xmark"></i> Effacer</button>
          }
        </div>

        @if (loading() && !page()) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else if (page()?.data?.length === 0) {
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-receipt"></i></div>
            <div class="empty-title">{{ hasFilters() ? 'Aucune vente ne correspond' : 'Aucune vente enregistrée' }}</div>
            <p class="empty-text">{{ hasFilters() ? 'Modifiez vos filtres pour élargir la recherche.' : 'Les ventes réalisées au point de vente apparaîtront ici.' }}</p>
            @if (!hasFilters()) { <a routerLink="/pos" class="btn btn-primary"><i class="fa-solid fa-cash-register"></i> Ouvrir le point de vente</a> }
          </div>
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <thead>
                <tr>
                  <th>Facture</th><th>Client</th><th class="hide-sm">Vendeur</th><th class="hide-sm">Date</th>
                  <th>Statut</th><th class="text-right">Total</th><th class="text-right hide-sm">Reste</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (s of page()?.data; track s.id) {
                  <tr class="clickable" (click)="open(s.id)">
                    <td><span class="mono strong">{{ s.invoice_number }}</span><div class="cell-sub">{{ s.items_count }} article{{ (s.items_count ?? 0) > 1 ? 's' : '' }}</div></td>
                    <td>{{ s.client?.name ?? 'Client comptoir' }}</td>
                    <td class="hide-sm muted">{{ s.user?.name }}</td>
                    <td class="hide-sm muted">{{ s.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td><span class="badge {{ statusMap[s.status].badge }}">{{ statusMap[s.status].label }}</span></td>
                    <td class="text-right num strong">
                      {{ (s.net_total ?? s.total) | money }}
                      @if (+(s.returned_amount ?? 0) > 0) { <div class="cell-sub text-warning" style="font-weight:500"><i class="fa-solid fa-arrow-rotate-left"></i> avoir {{ s.returned_amount | money }}</div> }
                    </td>
                    <td class="text-right num hide-sm" [class.text-danger]="s.remaining_amount > 0" [class.subtle]="s.remaining_amount <= 0">{{ s.remaining_amount | money }}</td>
                    <td class="text-right" (click)="$event.stopPropagation()">
                      <div class="actions">
                        <button type="button" class="icon-btn brand" (click)="print(s)" title="Imprimer la facture" aria-label="Imprimer la facture"><i class="fa-solid fa-print"></i></button>
                        <button type="button" class="icon-btn" (click)="open(s.id)" title="Détails" aria-label="Détails"><i class="fa-solid fa-chevron-right"></i></button>
                      </div>
                    </td>
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

    <!-- Detail drawer -->
    <app-drawer [open]="!!selected()" [title]="selected()?.invoice_number ?? ''" [subtitle]="(selected()?.created_at | date: 'EEEE d MMMM y à HH:mm') ?? ''" (closed)="close()">
      @if (selected(); as s) {
        <div class="row-between">
          <span class="badge {{ statusMap[s.status].badge }}">{{ statusMap[s.status].label }}</span>
          <span class="small muted">Vendeur : <strong>{{ s.user?.name }}</strong></span>
        </div>

        <div class="summary-box">
          <div class="row">
            <span class="avatar">{{ (s.client?.name ?? 'C').charAt(0) }}</span>
            <div class="grow">
              <div class="strong">{{ s.client?.name ?? 'Client comptoir' }}</div>
              <div class="xs subtle">{{ s.client?.phone ?? 'Aucun contact' }}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="section-title">Articles</div>
          <table class="table table-compact">
            <thead><tr><th>Produit</th><th class="text-right">Qté</th><th class="text-right">P.U.</th><th class="text-right">Montant</th></tr></thead>
            <tbody>
              @for (item of s.items; track item.id) {
                <tr>
                  <td><div class="strong small">{{ item.product_name }}</div><div class="cell-sub mono">{{ item.product?.reference }}</div></td>
                  <td class="text-right num">{{ item.quantity }}
                    @if ((item.returned_quantity ?? 0) > 0) { <div class="cell-sub text-warning">−{{ item.returned_quantity }} retourné</div> }
                  </td>
                  <td class="text-right num">{{ item.unit_price | money: '' }}</td>
                  <td class="text-right num strong">{{ item.subtotal | money: '' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="summary-box">
          <div class="summary-line"><span class="muted">Sous-total HT</span><span class="num">{{ s.subtotal | money }}</span></div>
          <div class="summary-line"><span class="muted">TVA ({{ +s.tax_rate }} %)</span><span class="num">{{ s.tax_amount | money }}</span></div>
          @if (+s.discount > 0) {
            <div class="summary-line"><span class="muted">Remise</span><span class="num">− {{ s.discount | money }}</span></div>
          }
          <div class="summary-line total"><span>Total TTC</span><span class="num">{{ s.total | money }}</span></div>
          @if (+(s.returned_amount ?? 0) > 0) {
            <div class="summary-line"><span class="text-warning">Avoirs (retours)</span><span class="num text-warning">− {{ s.returned_amount | money }}</span></div>
            <div class="summary-line"><span class="strong">Net à payer</span><span class="num strong">{{ s.net_total | money }}</span></div>
          }
          <div class="summary-line"><span class="text-success strong">Payé</span><span class="num text-success strong">{{ s.paid_amount | money }}</span></div>
          @if (s.remaining_amount > 0) {
            <div class="summary-line"><span class="text-danger strong">Reste à payer</span><span class="num text-danger strong">{{ s.remaining_amount | money }}</span></div>
          }
        </div>

        @if (s.remaining_amount > 0) {
          <div class="card" style="box-shadow:none">
            <div class="card-body stack" style="gap:12px">
              <div class="section-title" style="margin:0">Enregistrer un paiement</div>
              <div class="choices">
                @for (m of methods; track m.value) {
                  <button type="button" class="choice" [class.active]="payMethod === m.value" (click)="payMethod = m.value"><i class="fa-solid {{ m.icon }}"></i> {{ m.label }}</button>
                }
              </div>
              <div class="row">
                <div class="input-suffix grow">
                  <input class="input num" type="number" min="1" [max]="s.remaining_amount" [(ngModel)]="payAmount" aria-label="Montant">
                  <span>FCFA</span>
                </div>
                <button type="button" class="btn btn-secondary" (click)="payAmount = s.remaining_amount">Solde</button>
              </div>
              <button type="button" class="btn btn-success" [disabled]="paying() || !payAmount || payAmount <= 0" (click)="addPayment(s)">
                @if (paying()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-check"></i> } Encaisser {{ payAmount | money }}
              </button>
            </div>
          </div>
        }

        @if (s.payments?.length) {
          <div>
            <div class="section-title">Paiements reçus</div>
            <div class="timeline">
              @for (p of s.payments; track p.id) {
                <div class="timeline-item">
                  <span class="timeline-dot {{ +p.amount < 0 ? 'out' : 'in' }}"><i class="fa-solid" [class.fa-arrow-down]="+p.amount >= 0" [class.fa-arrow-up]="+p.amount < 0"></i></span>
                  <div class="grow">
                    <div class="row-between">
                      <strong class="small">{{ +p.amount < 0 ? 'Remboursement · ' : '' }}{{ paymentLabel[p.method] }}</strong>
                      <span class="row" style="gap:4px">
                        <strong class="num small" [class.text-success]="+p.amount >= 0" [class.text-danger]="+p.amount < 0">{{ p.amount | money }}</strong>
                        @if (auth.isAdmin()) {
                          <button type="button" class="icon-btn danger" style="width:26px;height:26px" (click)="deletePayment(s, p)" title="Supprimer ce paiement (correction)" aria-label="Supprimer ce paiement"><i class="fa-solid fa-trash-can xs"></i></button>
                        }
                      </span>
                    </div>
                    <div class="xs subtle">{{ p.created_at | date: 'dd/MM/yyyy HH:mm' }} · {{ p.user?.name }}</div>
                    @if (p.note) { <div class="xs muted">{{ p.note }}</div> }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (s.returns?.length) {
          <div>
            <div class="section-title">Retours / avoirs</div>
            <div class="timeline">
              @for (r of s.returns; track r.id) {
                <div class="timeline-item">
                  <span class="timeline-dot"><i class="fa-solid fa-arrow-rotate-left"></i></span>
                  <div class="grow">
                    <div class="row-between">
                      <strong class="small mono">{{ r.number }}</strong>
                      <span class="row" style="gap:4px">
                        <strong class="num small text-warning">− {{ r.total | money }}</strong>
                        <button type="button" class="icon-btn" style="width:26px;height:26px" (click)="downloadReturn(s, r)" title="Avoir PDF" aria-label="Avoir PDF"><i class="fa-solid fa-file-pdf xs"></i></button>
                      </span>
                    </div>
                    <div class="xs subtle">{{ r.created_at | date: 'dd/MM/yyyy HH:mm' }} · {{ r.user?.name }}
                      @if (+r.refund_amount > 0) { · remboursé {{ r.refund_amount | money }} ({{ paymentLabel[r.refund_method ?? 'cash'] }}) }
                    </div>
                    <div class="xs muted">
                      @for (it of r.items; track it.id; let last = $last) { {{ it.quantity }} × {{ it.product?.name }}{{ last ? '' : ', ' }} }
                      @if (r.reason) { — {{ r.reason }} }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (s.notes) {
          <div class="alert alert-info"><i class="fa-regular fa-note-sticky"></i> {{ s.notes }}</div>
        }
      }

      <ng-container footer>
        @if (auth.canManage()) {
          <button type="button" class="icon-btn danger" (click)="cancelSale()" title="Annuler la vente" aria-label="Annuler la vente"><i class="fa-solid fa-ban"></i></button>
        }
        @if (selected(); as cur) {
          @if (canReturn(cur)) {
            <button type="button" class="btn btn-secondary" (click)="openReturn(cur)"><i class="fa-solid fa-arrow-rotate-left"></i> Retour</button>
          }
          @if (whatsapp(cur); as wa) {
            <a class="btn btn-secondary" [href]="wa" target="_blank" rel="noopener" title="Envoyer par WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
          }
        }
        <span class="grow"></span>
        <div class="menu-anchor">
          <button type="button" class="btn btn-secondary" (click)="formatMenu.set(!formatMenu())"><i class="fa-solid fa-download"></i> PDF <i class="fa-solid fa-chevron-up xs"></i></button>
          @if (formatMenu()) {
            <div class="format-menu">
              @for (fmt of formats; track fmt.value) {
                <button type="button" (click)="selected() && download(selected()!, fmt.value)"><i class="fa-solid {{ fmt.icon }}"></i> {{ fmt.label }}</button>
              }
            </div>
          }
        </div>
        <button type="button" class="btn btn-primary" (click)="selected() && print(selected()!)"><i class="fa-solid fa-print"></i> Imprimer</button>
      </ng-container>
    </app-drawer>

    <!-- Return / credit note -->
    <app-modal [open]="!!returning()" title="Retour de marchandise" [subtitle]="'Facture ' + (returning()?.invoice_number ?? '')" size="lg" (closed)="returning.set(null)">
      @if (returning(); as s) {
        <div class="stack" style="gap:16px">
          <table class="table table-compact">
            <thead><tr><th>Produit</th><th class="text-right">Vendu</th><th class="text-right">Déjà retourné</th><th style="width:150px">À retourner</th><th class="text-right">Montant</th></tr></thead>
            <tbody>
              @for (item of s.items; track item.id; let i = $index) {
                <tr [style.opacity]="returnable(item) === 0 ? 0.45 : 1">
                  <td><div class="strong small">{{ item.product_name }}</div><div class="cell-sub">{{ item.unit_price | money }} l'unité</div></td>
                  <td class="text-right num">{{ item.quantity }}</td>
                  <td class="text-right num">{{ item.returned_quantity ?? 0 }}</td>
                  <td>
                    <div class="row" style="gap:4px">
                      <input class="input input-sm num" style="width:72px" type="number" min="0" [max]="returnable(item)" [disabled]="returnable(item) === 0"
                             [ngModel]="returnQty()[i]" (ngModelChange)="setReturnQty(i, $event, returnable(item))" [attr.aria-label]="'Quantité à retourner pour ' + item.product_name">
                      <button type="button" class="btn btn-ghost btn-sm" [disabled]="returnable(item) === 0" (click)="setReturnQty(i, returnable(item), returnable(item))">Tout</button>
                    </div>
                  </td>
                  <td class="text-right num strong">{{ (returnQty()[i] || 0) * +item.unit_price | money }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div class="form-grid">
            <div class="field">
              <label class="label" for="ret-reason">Motif</label>
              <input id="ret-reason" class="input" [(ngModel)]="returnReason" list="ret-reasons" placeholder="Défectueux, erreur de commande…">
              <datalist id="ret-reasons"><option value="Produit défectueux"></option><option value="Erreur de commande"></option><option value="Surplus de chantier"></option><option value="Ne convient pas"></option></datalist>
            </div>
            <div class="summary-box">
              <div class="summary-line"><span class="muted">Articles HT</span><span class="num">{{ returnSubtotal() | money }}</span></div>
              <div class="summary-line"><span class="muted">TVA + part de remise</span><span class="num">{{ returnCredit() - returnSubtotal() | money }}</span></div>
              <div class="summary-line total"><span>Avoir</span><span class="num">{{ returnCredit() | money }}</span></div>
            </div>
          </div>

          @if (returnRefund() > 0) {
            <div class="field">
              <span class="label">Remboursement de {{ returnRefund() | money }} au client par</span>
              <div class="choices">
                @for (m of methods; track m.value) {
                  <button type="button" class="choice" [class.active]="refundMethod === m.value" (click)="refundMethod = m.value"><i class="fa-solid {{ m.icon }}"></i> {{ m.label }}</button>
                }
              </div>
            </div>
          } @else if (returnCredit() > 0) {
            <div class="alert alert-info"><i class="fa-solid fa-circle-info"></i> L'avoir sera déduit du reste à payer : aucun argent à rendre.</div>
          }
        </div>
      }
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="returning.set(null)">Annuler</button>
        <button type="button" class="btn btn-primary" [disabled]="paying() || returnCredit() <= 0" (click)="saveReturn()">
          @if (paying()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-check"></i> } Valider le retour
        </button>
      </ng-container>
    </app-modal>
  `,
  styles: [`
    .menu-anchor { position: relative; }
    .format-menu { position: absolute; bottom: calc(100% + 6px); right: 0; min-width: 170px; padding: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-md); z-index: 5; }
    .format-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--text); font-size: 13px; cursor: pointer; text-align: left; }
    .format-menu button:hover { background: var(--surface-3); }
    .format-menu i { width: 14px; color: var(--text-3); }
  `]
})
export class SalesComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  statusMap = SALE_STATUS;
  methods = PAYMENT_METHODS;
  paymentLabel = PAYMENT_LABEL;
  today = todayIso();
  statusFilters: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'Toutes' },
    { value: 'paid', label: 'Payées' },
    { value: 'partial', label: 'Partielles' },
    { value: 'unpaid', label: 'Impayées' },
    { value: 'due', label: 'À encaisser' },
    { value: 'returned', label: 'Avec retours' },
  ];

  page = signal<Paginated<Sale> | null>(null);
  summary = signal<SalesSummary | null>(null);
  loading = signal(false);
  exporting = signal(false);
  selected = signal<Sale | null>(null);
  paying = signal(false);
  formatMenu = signal(false);
  returning = signal<Sale | null>(null);
  returnQty = signal<number[]>([]);
  returnReason = '';
  refundMethod: PaymentMethod = 'cash';

  returnSubtotal = computed(() => {
    const s = this.returning();
    return s ? (s.items ?? []).reduce((sum, it, i) => sum + (this.returnQty()[i] || 0) * Number(it.unit_price), 0) : 0;
  });
  /** Same formula as the server: goods + VAT − proportional share of the discount */
  returnCredit = computed(() => {
    const s = this.returning();
    const sub = this.returnSubtotal();
    if (!s || sub <= 0) {
      return 0;
    }
    const tax = Math.round(sub * Number(s.tax_rate)) / 100;
    const discountShare = Number(s.subtotal) > 0 ? Math.round((Number(s.discount) * sub / Number(s.subtotal)) * 100) / 100 : 0;
    return Math.round((sub + tax - discountShare) * 100) / 100;
  });
  returnRefund = computed(() => {
    const s = this.returning();
    if (!s) {
      return 0;
    }
    const netAfter = (s.net_total ?? Number(s.total)) - this.returnCredit();
    return Math.max(0, Math.round((Number(s.paid_amount) - netAfter) * 100) / 100);
  });
  formats = INVOICE_FORMATS;
  status = signal<StatusFilter>('');

  search = '';
  startDate = '';
  endDate = '';
  payAmount = 0;
  payMethod: PaymentMethod = 'cash';
  search$ = new Subject<void>();
  private currentPage = 1;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.status.set((params.get('status') as StatusFilter) ?? '');
    this.search = params.get('search') ?? '';
    this.search$.pipe(debounceTime(300)).subscribe(() => this.reload());
    this.reload();

    const openId = Number(params.get('open'));
    if (openId) {
      this.open(openId);
    }
  }

  private query() {
    return { search: this.search, status: this.status(), start_date: this.startDate, end_date: this.endDate };
  }

  hasFilters(): boolean {
    return !!(this.search || this.status() || this.startDate || this.endDate);
  }

  reload(): void {
    this.load(1);
    this.api.getSalesSummary(this.query()).subscribe({ next: s => this.summary.set(s) });
  }

  load(page: number): void {
    this.currentPage = page;
    this.loading.set(true);
    this.api.getSales({ ...this.query(), page }).subscribe({
      next: res => {
        this.page.set(res);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(err, 'Impossible de charger les ventes');
      },
    });
  }

  setStatus(value: StatusFilter): void {
    this.status.set(value);
    this.reload();
  }

  resetFilters(): void {
    this.search = '';
    this.startDate = '';
    this.endDate = '';
    this.status.set('');
    this.reload();
  }

  open(id: number): void {
    this.api.getSale(id).subscribe({
      next: sale => {
        this.selected.set(sale);
        this.payAmount = sale.remaining_amount;
        this.payMethod = 'cash';
      },
      error: err => this.notify.error(err),
    });
  }

  close(): void {
    this.selected.set(null);
    if (this.route.snapshot.queryParamMap.has('open')) {
      this.router.navigate([], { queryParams: { open: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  addPayment(sale: Sale): void {
    this.paying.set(true);
    this.api.addPayment(sale.id, { amount: Number(this.payAmount), method: this.payMethod }).subscribe({
      next: updated => {
        this.paying.set(false);
        this.selected.set(updated);
        this.payAmount = updated.remaining_amount;
        this.notify.success(updated.status === 'paid' ? 'Vente soldée' : 'Paiement enregistré');
        this.load(this.currentPage);
        this.api.getSalesSummary(this.query()).subscribe({ next: s => this.summary.set(s) });
      },
      error: err => {
        this.paying.set(false);
        this.notify.error(err);
      },
    });
  }

  async cancelSale(): Promise<void> {
    const sale = this.selected();
    if (!sale) {
      return;
    }
    const ok = await this.notify.confirm({
      title: `Annuler la vente ${sale.invoice_number} ?`,
      text: 'Les produits seront remis en stock et la vente sera supprimée définitivement.',
      confirmText: 'Annuler la vente',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.api.deleteSale(sale.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.close();
        this.reload();
      },
      error: err => this.notify.error(err),
    });
  }

  canReturn(sale: Sale): boolean {
    return (sale.items ?? []).some(it => this.returnable(it) > 0);
  }

  returnable(item: { quantity: number; returned_quantity?: number }): number {
    return Math.max(0, item.quantity - (item.returned_quantity ?? 0));
  }

  openReturn(sale: Sale): void {
    this.returnQty.set((sale.items ?? []).map(() => 0));
    this.returnReason = '';
    this.refundMethod = 'cash';
    this.returning.set(sale);
  }

  setReturnQty(index: number, value: unknown, max: number): void {
    const qty = [...this.returnQty()];
    qty[index] = Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
    this.returnQty.set(qty);
  }

  saveReturn(): void {
    const sale = this.returning();
    if (!sale) {
      return;
    }
    const items = (sale.items ?? [])
      .map((it, i) => ({ sale_item_id: it.id, quantity: this.returnQty()[i] || 0 }))
      .filter(l => l.quantity > 0);
    this.paying.set(true);
    this.api.createReturn(sale.id, { items, reason: this.returnReason || undefined, refund_method: this.refundMethod }).subscribe({
      next: res => {
        this.paying.set(false);
        this.returning.set(null);
        this.selected.set(res.sale);
        this.notify.success(res.message);
        this.reload();
      },
      error: err => {
        this.paying.set(false);
        this.notify.error(err);
      },
    });
  }

  downloadReturn(sale: Sale, r: SaleReturn): void {
    this.api.downloadReturnPdf(sale.id, r.id).subscribe({
      next: blob => downloadBlob(blob, `avoir-${r.number}.pdf`),
      error: err => this.notify.error(err, 'Téléchargement impossible'),
    });
  }

  async deletePayment(sale: Sale, payment: SalePayment): Promise<void> {
    const ok = await this.notify.confirm({
      title: 'Supprimer ce paiement ?',
      text: `${formatMoney(payment.amount)} (${this.paymentLabel[payment.method]}) sera retiré et le reste à payer recalculé. À utiliser pour corriger une erreur de saisie.`,
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.api.deletePayment(sale.id, payment.id).subscribe({
      next: res => {
        this.selected.set(res.sale);
        this.notify.success(res.message);
        this.reload();
      },
      error: err => this.notify.error(err),
    });
  }

  whatsapp(sale: Sale): string | null {
    const name = sale.client?.name ?? '';
    const remaining = sale.remaining_amount > 0 ? `\nReste à payer : ${formatMoney(sale.remaining_amount)}` : '\nFacture entièrement réglée. Merci !';
    return whatsappUrl(sale.client?.phone,
      `Bonjour ${name},\n\nVotre facture ${sale.invoice_number} du ${new Date(sale.created_at).toLocaleDateString('fr-FR')} :\nTotal : ${formatMoney(sale.net_total ?? sale.total)}\nPayé : ${formatMoney(sale.paid_amount)}${remaining}\n\nMerci de votre confiance !`);
  }

  download(sale: Sale, format?: InvoiceFormat): void {
    this.formatMenu.set(false);
    this.api.downloadInvoicePdf(sale.id, format).subscribe({
      next: blob => downloadBlob(blob, `facture-${sale.invoice_number}${format ? '-' + format : ''}.pdf`),
      error: err => this.notify.error(err, 'Téléchargement impossible'),
    });
  }

  print(sale: Sale): void {
    this.api.downloadInvoicePdf(sale.id).subscribe({
      next: blob => printBlob(blob),
      error: err => this.notify.error(err, 'Impression impossible'),
    });
  }

  export(format: 'pdf' | 'excel'): void {
    this.exporting.set(true);
    this.api.exportSales(format, this.query()).subscribe({
      next: blob => {
        this.exporting.set(false);
        downloadBlob(blob, `ventes-${this.today}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      },
      error: err => {
        this.exporting.set(false);
        this.notify.error(err, 'Export impossible');
      },
    });
  }
}
