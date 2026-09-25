import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotifyService } from '../../core/services/notify.service';
import { Client, Paginated, PaymentMethod, Product, Quote, QuoteStatus } from '../../core/models';
import { MoneyPipe, formatMoney } from '../../shared/money.pipe';
import { PAYMENT_METHODS, QUOTE_STATUS, downloadBlob, todayIso, whatsappUrl } from '../../shared/labels';
import { ModalComponent } from '../../shared/components/modal.component';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

interface Line {
  product: Product | null;
  designation: string;
  quantity: number;
  unit_price: number;
}

type Filter = '' | QuoteStatus | 'expired';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, ModalComponent, DrawerComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Devis & proformas</h1>
          <p class="page-subtitle">Préparez un chiffrage pour un chantier, puis transformez-le en vente en un clic.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openEditor()"><i class="fa-solid fa-plus"></i> Nouveau devis</button>
        </div>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="input-icon search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="N° de devis ou client…" [(ngModel)]="search" (ngModelChange)="search$.next()">
          </div>
          <div class="segmented">
            @for (f of filters; track f.value) {
              <button type="button" [class.active]="filter() === f.value" (click)="setFilter(f.value)">{{ f.label }}</button>
            }
          </div>
        </div>

        @if (loading() && !page()) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else if (page()?.data?.length === 0) {
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-file-signature"></i></div>
            <div class="empty-title">Aucun devis</div>
            <p class="empty-text">Un artisan prépare un chantier ? Faites-lui un devis : le stock n'est pas touché tant qu'il n'est pas converti en vente.</p>
            <button type="button" class="btn btn-primary" (click)="openEditor()"><i class="fa-solid fa-plus"></i> Nouveau devis</button>
          </div>
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <thead><tr><th>Devis</th><th>Client</th><th class="hide-sm">Date</th><th class="hide-sm">Validité</th><th>Statut</th><th class="text-right">Total</th><th></th></tr></thead>
              <tbody>
                @for (q of page()?.data; track q.id) {
                  <tr class="clickable" (click)="open(q.id)">
                    <td><span class="mono strong">{{ q.number }}</span><div class="cell-sub">{{ q.items_count }} ligne{{ (q.items_count ?? 0) > 1 ? 's' : '' }}</div></td>
                    <td>{{ q.customer_name }}</td>
                    <td class="hide-sm muted">{{ q.created_at | date: 'dd/MM/yyyy' }}</td>
                    <td class="hide-sm" [class.text-danger]="q.is_expired" [class.muted]="!q.is_expired">{{ q.valid_until | date: 'dd/MM/yyyy' }}</td>
                    <td>
                      @if (q.is_expired) { <span class="badge badge-warning">Expiré</span> }
                      @else { <span class="badge {{ statusMap[q.status].badge }}">{{ statusMap[q.status].label }}</span> }
                    </td>
                    <td class="text-right num strong">{{ q.total | money }}</td>
                    <td class="text-right"><i class="fa-solid fa-chevron-right subtle"></i></td>
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

    <!-- Editor -->
    <app-modal [open]="editorOpen()" [title]="editing() ? 'Modifier ' + editing()!.number : 'Nouveau devis'" size="xl" (closed)="editorOpen.set(false)">
      <div class="stack" style="gap:18px">
        <div class="form-grid" style="grid-template-columns:2fr 2fr 1fr">
          <div class="field">
            <label class="label" for="q-client">Client enregistré</label>
            <select id="q-client" class="select" [ngModel]="clientId()" (ngModelChange)="onClientChange($event)">
              <option [ngValue]="null">— Prospect (saisir le nom) —</option>
              @for (c of clients(); track c.id) { <option [ngValue]="c.id">{{ c.name }}{{ c.type === 'professionnel' ? ' · Pro' : '' }}</option> }
            </select>
          </div>
          <div class="field">
            <label class="label" for="q-name">Nom du prospect</label>
            <input id="q-name" class="input" [(ngModel)]="clientName" [disabled]="!!clientId()" placeholder="Ex. : Entreprise BTP Sall">
          </div>
          <div class="field">
            <label class="label" for="q-valid">Valable jusqu'au</label>
            <input id="q-valid" class="input" type="date" [(ngModel)]="validUntil" [min]="today">
          </div>
        </div>

        <div class="add-row">
          <div class="picker grow">
            <div class="input-icon">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input class="input" type="search" placeholder="Ajouter un produit du catalogue…" [ngModel]="productSearch()" (ngModelChange)="onProductSearch($event)" (focus)="pickerOpen.set(true)" (blur)="closePickerSoon()">
            </div>
            @if (pickerOpen() && productResults().length) {
              <div class="picker-list">
                @for (p of productResults(); track p.id) {
                  <button type="button" class="picker-item" (mousedown)="addProduct(p)">
                    <span class="grow"><span class="strong small" style="display:block">{{ p.name }}</span><span class="xs subtle mono">{{ p.reference }}</span></span>
                    <span class="xs muted num">{{ p.selling_price | money }}</span>
                  </button>
                }
              </div>
            }
          </div>
          <button type="button" class="btn btn-secondary" (click)="addFreeLine()"><i class="fa-solid fa-pen-to-square"></i> Ligne libre</button>
        </div>

        @if (lines().length === 0) {
          <div class="empty empty-sm" style="border:1px dashed var(--border-strong);border-radius:12px">
            <div class="empty-icon"><i class="fa-solid fa-list-check"></i></div>
            <p class="muted small">Ajoutez des produits du catalogue ou des lignes libres (main d'œuvre, transport…).</p>
          </div>
        } @else {
          <div class="table-wrap" style="border:1px solid var(--border);border-radius:12px">
            <table class="table table-compact">
              <thead><tr><th>Désignation</th><th style="width:110px">Qté</th><th style="width:160px">Prix unit. HT</th><th class="text-right">Montant HT</th><th></th></tr></thead>
              <tbody>
                @for (l of lines(); track $index; let i = $index) {
                  <tr>
                    <td>
                      @if (l.product) {
                        <div class="strong small">{{ l.product.name }}</div>
                        <div class="cell-sub"><span class="mono">{{ l.product.reference }}</span> · stock {{ l.product.stock }}
                          @if (l.quantity > l.product.stock) { <span class="text-warning">· stock insuffisant</span> }
                        </div>
                      } @else {
                        <input class="input input-sm" [ngModel]="l.designation" (ngModelChange)="update(i, 'designation', $event)" placeholder="Désignation (ex. : Transport chantier)">
                      }
                    </td>
                    <td><input class="input input-sm num" type="number" min="1" [ngModel]="l.quantity" (ngModelChange)="update(i, 'quantity', $event)" aria-label="Quantité"></td>
                    <td><div class="input-suffix"><input class="input input-sm num" type="number" min="0" [ngModel]="l.unit_price" (ngModelChange)="update(i, 'unit_price', $event)" aria-label="Prix"><span>FCFA</span></div></td>
                    <td class="text-right num strong">{{ l.quantity * l.unit_price | money }}</td>
                    <td><button type="button" class="icon-btn danger" (click)="removeLine(i)" aria-label="Retirer"><i class="fa-solid fa-xmark"></i></button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <div class="form-bottom">
          <div class="field grow">
            <label class="label" for="q-notes">Notes / conditions</label>
            <textarea id="q-notes" class="textarea" rows="3" [(ngModel)]="notes" placeholder="Ex. : livraison sur chantier incluse, acompte de 50 % à la commande"></textarea>
          </div>
          <div class="summary-box totals">
            <div class="summary-line"><span class="muted">Sous-total HT</span><span class="num">{{ subtotal() | money }}</span></div>
            <div class="summary-line"><span class="muted">TVA ({{ taxRate() }} %)</span><span class="num">{{ tax() | money }}</span></div>
            <div class="summary-line" style="align-items:center">
              <span class="muted">Remise</span>
              <div class="input-suffix" style="width:130px"><input class="input input-sm num" type="number" min="0" [ngModel]="discount()" (ngModelChange)="discount.set(+$event || 0)" aria-label="Remise"><span>FCFA</span></div>
            </div>
            <div class="summary-line total"><span>Total TTC</span><span class="num">{{ total() | money }}</span></div>
          </div>
        </div>
      </div>

      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="editorOpen.set(false)">Annuler</button>
        <button type="button" class="btn btn-primary" [disabled]="saving() || !lines().length || (!clientId() && !clientName.trim())" (click)="save()">
          @if (saving()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-check"></i> } Enregistrer le devis
        </button>
      </ng-container>
    </app-modal>

    <!-- Detail -->
    <app-drawer [open]="!!selected()" [title]="selected()?.number ?? ''" [subtitle]="selected()?.customer_name ?? ''" (closed)="close()">
      @if (selected(); as q) {
        <div class="row-between">
          @if (q.is_expired) { <span class="badge badge-warning">Expiré le {{ q.valid_until | date: 'dd/MM/yyyy' }}</span> }
          @else { <span class="badge {{ statusMap[q.status].badge }}">{{ statusMap[q.status].label }}</span> }
          <span class="small muted">Valable jusqu'au <strong>{{ q.valid_until | date: 'dd/MM/yyyy' }}</strong></span>
        </div>

        @if (q.status === 'converted' && q.sale) {
          <div class="alert alert-success"><i class="fa-solid fa-circle-check"></i>
            <div>Converti en vente <a [routerLink]="['/sales']" [queryParams]="{ open: q.sale.id }" class="strong">{{ q.sale.invoice_number }}</a>.</div>
          </div>
        } @else {
          <div>
            <div class="section-title">Suivi</div>
            <div class="segmented" style="width:100%">
              @for (s of trackStatuses; track s) {
                <button type="button" style="flex:1" [class.active]="q.status === s" (click)="setStatus(q, s)">{{ statusMap[s].label }}</button>
              }
            </div>
          </div>
        }

        <table class="table table-compact">
          <thead><tr><th>Désignation</th><th class="text-right">Qté</th><th class="text-right">P.U. HT</th><th class="text-right">Montant</th></tr></thead>
          <tbody>
            @for (it of q.items; track it.id) {
              <tr>
                <td><div class="strong small">{{ it.designation }}</div>
                  @if (it.product) { <div class="cell-sub mono">{{ it.product.reference }} · stock {{ it.product.stock }}</div> }
                  @else { <div class="cell-sub">Ligne libre</div> }
                </td>
                <td class="text-right num">{{ it.quantity }}</td>
                <td class="text-right num">{{ it.unit_price | money: '' }}</td>
                <td class="text-right num strong">{{ it.subtotal | money: '' }}</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-line"><span class="muted">Sous-total HT</span><span class="num">{{ q.subtotal | money }}</span></div>
          <div class="summary-line"><span class="muted">TVA ({{ +q.tax_rate }} %)</span><span class="num">{{ q.tax_amount | money }}</span></div>
          @if (+q.discount > 0) { <div class="summary-line"><span class="muted">Remise</span><span class="num">− {{ q.discount | money }}</span></div> }
          <div class="summary-line total"><span>Total TTC</span><span class="num">{{ q.total | money }}</span></div>
        </div>

        @if (q.notes) { <div class="alert alert-info"><i class="fa-regular fa-note-sticky"></i> {{ q.notes }}</div> }
        <p class="xs subtle">Établi le {{ q.created_at | date: 'dd/MM/yyyy à HH:mm' }} par {{ q.user?.name }}</p>
      }

      <ng-container footer>
        @if (selected(); as q) {
          @if (q.status !== 'converted') {
            <button type="button" class="icon-btn danger" (click)="remove(q)" title="Supprimer" aria-label="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
            <button type="button" class="icon-btn" (click)="openEditor(q)" title="Modifier" aria-label="Modifier"><i class="fa-solid fa-pen"></i></button>
          }
          <span class="grow"></span>
          @if (whatsapp(q); as wa) {
            <a class="btn btn-secondary" [href]="wa" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
          }
          <button type="button" class="btn btn-secondary" (click)="downloadPdf(q)"><i class="fa-solid fa-file-pdf"></i> PDF</button>
          @if (q.status !== 'converted' && q.status !== 'rejected') {
            <button type="button" class="btn btn-primary" (click)="openConvert(q)"><i class="fa-solid fa-cart-shopping"></i> Convertir en vente</button>
          }
        }
      </ng-container>
    </app-drawer>

    <!-- Convert -->
    <app-modal [open]="!!converting()" title="Convertir en vente" [subtitle]="(converting()?.number ?? '') + ' · ' + (converting()?.total | money)" size="sm" (closed)="converting.set(null)">
      @if (converting(); as q) {
        <div class="stack" style="gap:16px">
          <div class="alert alert-info"><i class="fa-solid fa-circle-info"></i> Le stock sera déduit maintenant. Les prix du devis sont conservés.</div>
          @if (!q.client_id) {
            <div class="alert alert-warning"><i class="fa-solid fa-user"></i> Prospect non enregistré : la vente sera au comptoir et doit être payée en totalité.</div>
          }
          <div class="choices">
            @for (m of methods; track m.value) {
              <button type="button" class="choice" [class.active]="convertMethod === m.value" (click)="convertMethod = m.value"><i class="fa-solid {{ m.icon }}"></i> {{ m.label }}</button>
            }
          </div>
          <div class="field">
            <label class="label" for="cv-paid">Montant encaissé maintenant</label>
            <div class="input-suffix"><input id="cv-paid" class="input num" type="number" min="0" [max]="+q.total" [(ngModel)]="convertPaid"><span>FCFA</span></div>
            <div class="row"><button type="button" class="btn btn-ghost btn-sm" (click)="convertPaid = +q.total">Totalité</button>@if (q.client_id) {<button type="button" class="btn btn-ghost btn-sm" (click)="convertPaid = 0">À crédit</button>}</div>
          </div>
        </div>
      }
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="converting.set(null)">Annuler</button>
        <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="convert()">@if (saving()) { <span class="spinner"></span> } Créer la vente</button>
      </ng-container>
    </app-modal>
  `,
  styles: [`
    .add-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
    .picker { position: relative; min-width: 260px; }
    .picker-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 5; max-height: 260px; overflow-y: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-md); padding: 4px; }
    .picker-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; background: transparent; border-radius: 8px; cursor: pointer; text-align: left; color: var(--text); }
    .picker-item:hover { background: var(--surface-3); }
    .form-bottom { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
    .totals { width: 320px; max-width: 100%; }
    @media (max-width: 900px) { .form-grid[style] { grid-template-columns: minmax(0, 1fr) !important; } }
  `]
})
export class QuotesComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  statusMap = QUOTE_STATUS;
  methods = PAYMENT_METHODS;
  today = todayIso();
  trackStatuses: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected'];
  filters: { value: Filter; label: string }[] = [
    { value: '', label: 'Tous' },
    { value: 'draft', label: 'Brouillons' },
    { value: 'sent', label: 'Envoyés' },
    { value: 'accepted', label: 'Acceptés' },
    { value: 'converted', label: 'Convertis' },
    { value: 'expired', label: 'Expirés' },
  ];

  page = signal<Paginated<Quote> | null>(null);
  loading = signal(false);
  saving = signal(false);
  filter = signal<Filter>('');
  selected = signal<Quote | null>(null);
  clients = signal<Client[]>([]);
  taxRate = signal(18);

  editorOpen = signal(false);
  editing = signal<Quote | null>(null);
  lines = signal<Line[]>([]);
  clientId = signal<number | null>(null);
  discount = signal(0);
  clientName = '';
  validUntil = '';
  notes = '';
  productSearch = signal('');
  productResults = signal<Product[]>([]);
  pickerOpen = signal(false);

  converting = signal<Quote | null>(null);
  convertPaid = 0;
  convertMethod: PaymentMethod = 'cash';

  search = '';
  search$ = new Subject<void>();
  private productSearch$ = new Subject<string>();
  private currentPage = 1;

  subtotal = computed(() => this.lines().reduce((s, l) => s + l.quantity * l.unit_price, 0));
  tax = computed(() => Math.round(this.subtotal() * this.taxRate()) / 100);
  total = computed(() => Math.max(0, this.subtotal() + this.tax() - this.discount()));

  ngOnInit(): void {
    this.api.getAllClients().subscribe({ next: c => this.clients.set(c) });
    this.api.getSettings().subscribe({ next: s => this.taxRate.set(Number(s.tax_rate)) });
    this.search$.pipe(debounceTime(300)).subscribe(() => this.load(1));
    this.productSearch$.pipe(debounceTime(250)).subscribe(q =>
      this.api.getProductsForSale({ search: q, include_out_of_stock: 1, limit: 15 }).subscribe({ next: p => this.productResults.set(p) })
    );
    this.load(1);

    const openId = Number(this.route.snapshot.queryParamMap.get('open'));
    if (openId) {
      this.open(openId);
    }
  }

  load(page: number): void {
    this.currentPage = page;
    this.loading.set(true);
    this.api.getQuotes({ page, search: this.search, status: this.filter() }).subscribe({
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

  setFilter(value: Filter): void {
    this.filter.set(value);
    this.load(1);
  }

  open(id: number): void {
    this.api.getQuote(id).subscribe({ next: q => this.selected.set(q), error: err => this.notify.error(err) });
  }

  close(): void {
    this.selected.set(null);
    if (this.route.snapshot.queryParamMap.has('open')) {
      this.router.navigate([], { queryParams: { open: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  // ---------- Editor ----------
  openEditor(quote?: Quote): void {
    this.editing.set(quote ?? null);
    this.clientId.set(quote?.client_id ?? null);
    this.clientName = quote?.client_name ?? '';
    this.validUntil = quote?.valid_until?.slice(0, 10) ?? this.inDays(15);
    this.notes = quote?.notes ?? '';
    this.discount.set(Number(quote?.discount ?? 0));
    this.lines.set((quote?.items ?? []).map(i => ({
      product: i.product ? ({ ...i.product, stock: i.product.stock ?? 0 } as Product) : null,
      designation: i.designation,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
    })));
    this.productSearch.set('');
    this.productSearch$.next('');
    this.selected.set(null);
    this.editorOpen.set(true);
  }

  onClientChange(id: number | null): void {
    this.clientId.set(id);
    if (id) {
      this.clientName = '';
    }
  }

  onProductSearch(q: string): void {
    this.productSearch.set(q);
    this.pickerOpen.set(true);
    this.productSearch$.next(q);
  }

  closePickerSoon(): void {
    setTimeout(() => this.pickerOpen.set(false), 150);
  }

  addProduct(p: Product): void {
    const pro = this.clients().find(c => c.id === this.clientId())?.type === 'professionnel';
    const price = pro && p.wholesale_price ? Number(p.wholesale_price) : Number(p.selling_price);
    this.lines.update(lines => [...lines, { product: p, designation: p.name, quantity: 1, unit_price: price }]);
    this.productSearch.set('');
    this.pickerOpen.set(false);
  }

  addFreeLine(): void {
    this.lines.update(lines => [...lines, { product: null, designation: '', quantity: 1, unit_price: 0 }]);
  }

  update(index: number, field: 'quantity' | 'unit_price' | 'designation', value: unknown): void {
    this.lines.update(lines => lines.map((l, i) => {
      if (i !== index) {
        return l;
      }
      if (field === 'designation') {
        return { ...l, designation: String(value) };
      }
      const n = Number(value);
      return { ...l, [field]: field === 'quantity' ? Math.max(1, Math.floor(n) || 1) : Math.max(0, n || 0) };
    }));
  }

  removeLine(index: number): void {
    this.lines.update(lines => lines.filter((_, i) => i !== index));
  }

  save(): void {
    if (this.lines().some(l => !l.product && !l.designation.trim())) {
      this.notify.error('Chaque ligne libre doit avoir une désignation');
      return;
    }
    const editing = this.editing();
    this.saving.set(true);
    this.api.saveQuote({
      client_id: this.clientId(),
      client_name: this.clientId() ? null : this.clientName.trim(),
      valid_until: this.validUntil || null,
      discount: this.discount(),
      notes: this.notes || null,
      items: this.lines().map(l => ({ product_id: l.product?.id ?? null, designation: l.product ? null : l.designation.trim(), quantity: l.quantity, unit_price: l.unit_price })),
    }, editing?.id).subscribe({
      next: res => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.notify.success(res.message);
        this.load(editing ? this.currentPage : 1);
        this.selected.set(res.quote);
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  // ---------- Actions ----------
  setStatus(q: Quote, status: QuoteStatus): void {
    if (q.status === status) {
      return;
    }
    this.api.setQuoteStatus(q.id, status).subscribe({
      next: res => {
        this.selected.set(res.quote);
        this.load(this.currentPage);
      },
      error: err => this.notify.error(err),
    });
  }

  openConvert(q: Quote): void {
    this.convertPaid = Number(q.total);
    this.convertMethod = 'cash';
    this.converting.set(q);
  }

  convert(): void {
    const q = this.converting();
    if (!q) {
      return;
    }
    this.saving.set(true);
    this.api.convertQuote(q.id, { paid_amount: Number(this.convertPaid) || 0, payment_method: this.convertMethod }).subscribe({
      next: res => {
        this.saving.set(false);
        this.converting.set(null);
        this.selected.set(res.quote);
        this.notify.success(res.message);
        this.load(this.currentPage);
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  downloadPdf(q: Quote): void {
    this.api.downloadQuotePdf(q.id).subscribe({
      next: blob => downloadBlob(blob, `${q.status === 'accepted' ? 'proforma' : 'devis'}-${q.number}.pdf`),
      error: err => this.notify.error(err, 'Téléchargement impossible'),
    });
  }

  whatsapp(q: Quote): string | null {
    const lines = (q.items ?? []).map(i => `• ${i.quantity} × ${i.designation} : ${formatMoney(i.subtotal)}`).join('\n');
    return whatsappUrl(q.client?.phone,
      `Bonjour ${q.customer_name},\n\nVoici votre devis ${q.number} :\n${lines}\n\nTotal TTC : ${formatMoney(q.total)}\nValable jusqu'au ${q.valid_until ? new Date(q.valid_until).toLocaleDateString('fr-FR') : '—'}.\n\nMerci de votre confiance !`);
  }

  async remove(q: Quote): Promise<void> {
    if (!(await this.notify.confirm({ title: `Supprimer le devis ${q.number} ?`, confirmText: 'Supprimer', danger: true }))) {
      return;
    }
    this.api.deleteQuote(q.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.close();
        this.load(this.currentPage);
      },
      error: err => this.notify.error(err),
    });
  }

  private inDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
}
