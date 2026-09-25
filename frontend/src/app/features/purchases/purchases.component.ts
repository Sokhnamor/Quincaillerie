import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotifyService } from '../../core/services/notify.service';
import { Paginated, Product, Purchase, Supplier } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { todayIso } from '../../shared/labels';
import { ModalComponent } from '../../shared/components/modal.component';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

interface Line {
  product: Product;
  quantity: number;
  unit_price: number;
}

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [FormsModule, DatePipe, MoneyPipe, ModalComponent, DrawerComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Approvisionnements</h1>
          <p class="page-subtitle">Réceptions de marchandises : le stock et les prix d'achat sont mis à jour automatiquement.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Nouvel approvisionnement</button>
        </div>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="input-icon search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="N° d'achat, fournisseur, réf. facture…" [(ngModel)]="search" (ngModelChange)="search$.next()">
          </div>
          <select class="select" [(ngModel)]="supplierFilter" (ngModelChange)="load(1)" aria-label="Fournisseur">
            <option [ngValue]="null">Tous les fournisseurs</option>
            @for (s of suppliers(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
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
            <div class="empty-icon"><i class="fa-solid fa-truck-ramp-box"></i></div>
            <div class="empty-title">Aucun approvisionnement</div>
            <p class="empty-text">Enregistrez chaque livraison fournisseur pour garder un stock exact et des prix d'achat à jour.</p>
            <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Nouvel approvisionnement</button>
          </div>
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <thead><tr><th>N° d'achat</th><th>Fournisseur</th><th class="hide-sm">Réf. fournisseur</th><th class="hide-sm">Date</th><th class="text-right hide-sm">Lignes</th><th class="text-right">Total</th><th></th></tr></thead>
              <tbody>
                @for (p of page()?.data; track p.id) {
                  <tr class="clickable" (click)="openDetail(p.id)">
                    <td><span class="mono strong">{{ p.invoice_number }}</span><div class="cell-sub">par {{ p.user?.name }}</div></td>
                    <td>{{ p.supplier?.name }}</td>
                    <td class="hide-sm muted mono">{{ p.supplier_reference || '—' }}</td>
                    <td class="hide-sm muted">{{ p.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td class="text-right num hide-sm">{{ p.items_count }}</td>
                    <td class="text-right num strong">{{ p.total | money }}</td>
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

    <!-- New purchase -->
    <app-modal [open]="formOpen()" title="Nouvel approvisionnement" subtitle="Les quantités reçues seront ajoutées au stock." size="xl" (closed)="closeForm()">
      <div class="purchase-form">
        <div class="form-grid">
          <div class="field">
            <label class="label" for="pu-sup">Fournisseur <span class="req">*</span></label>
            <select id="pu-sup" class="select" [(ngModel)]="supplierId">
              <option [ngValue]="null" disabled>Choisir un fournisseur…</option>
              @for (s of suppliers(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label class="label" for="pu-ref">N° de facture / bon de livraison</label>
            <input id="pu-ref" class="input mono" [(ngModel)]="supplierRef" placeholder="Référence du fournisseur">
          </div>
        </div>

        <div class="add-row">
          <div class="picker grow">
            <div class="input-icon">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input class="input" type="search" placeholder="Rechercher un produit à ajouter…" [ngModel]="productSearch()" (ngModelChange)="onProductSearch($event)" (focus)="pickerOpen.set(true)" (blur)="closePickerSoon()">
            </div>
            @if (pickerOpen() && productResults().length) {
              <div class="picker-list">
                @for (p of productResults(); track p.id) {
                  <button type="button" class="picker-item" (mousedown)="addLine(p)">
                    <span class="grow">
                      <span class="strong small" style="display:block">{{ p.name }}</span>
                      <span class="xs subtle mono">{{ p.reference }}</span>
                    </span>
                    <span class="xs" [class.text-danger]="p.stock <= p.alert_threshold">Stock {{ p.stock }}</span>
                  </button>
                }
              </div>
            }
          </div>
          <button type="button" class="btn btn-secondary" (click)="addAlerts()" [disabled]="loadingAlerts()">
            @if (loadingAlerts()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-wand-magic-sparkles"></i> } Ajouter les produits en alerte
          </button>
        </div>

        @if (lines().length === 0) {
          <div class="empty empty-sm" style="border:1px dashed var(--border-strong);border-radius:12px">
            <div class="empty-icon"><i class="fa-solid fa-boxes-packing"></i></div>
            <p class="muted small">Recherchez des produits ou ajoutez d'un clic ceux qui sont en alerte.</p>
          </div>
        } @else {
          <div class="table-wrap" style="border:1px solid var(--border);border-radius:12px">
            <table class="table table-compact">
              <thead><tr><th>Produit</th><th class="text-right">Stock actuel</th><th style="width:120px">Qté reçue</th><th style="width:160px">Coût unitaire</th><th class="text-right">Montant</th><th></th></tr></thead>
              <tbody>
                @for (l of lines(); track l.product.id; let i = $index) {
                  <tr>
                    <td><div class="strong small">{{ l.product.name }}</div><div class="cell-sub mono">{{ l.product.reference }}</div></td>
                    <td class="text-right num small">{{ l.product.stock }} → <strong class="text-success">{{ l.product.stock + l.quantity }}</strong></td>
                    <td><input class="input input-sm num" type="number" min="1" [ngModel]="l.quantity" (ngModelChange)="update(i, 'quantity', $event)" aria-label="Quantité"></td>
                    <td><div class="input-suffix"><input class="input input-sm num" type="number" min="0" [ngModel]="l.unit_price" (ngModelChange)="update(i, 'unit_price', $event)" aria-label="Coût unitaire"><span>FCFA</span></div></td>
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
            <label class="label" for="pu-notes">Notes</label>
            <textarea id="pu-notes" class="textarea" rows="2" [(ngModel)]="notes"></textarea>
          </div>
          <div class="summary-box totals">
            <div class="summary-line"><span class="muted">Sous-total</span><span class="num">{{ subtotal() | money }}</span></div>
            <div class="summary-line" style="align-items:center">
              <span class="muted">Remise</span>
              <div class="input-suffix" style="width:130px"><input class="input input-sm num" type="number" min="0" [(ngModel)]="discount" aria-label="Remise"><span>FCFA</span></div>
            </div>
            <div class="summary-line total"><span>Total</span><span class="num">{{ subtotal() - (discount || 0) | money }}</span></div>
          </div>
        </div>
      </div>

      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="closeForm()">Annuler</button>
        <button type="button" class="btn btn-primary" [disabled]="saving() || !supplierId || lines().length === 0" (click)="save()">
          @if (saving()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-check"></i> } Valider la réception
        </button>
      </ng-container>
    </app-modal>

    <!-- Detail -->
    <app-drawer [open]="!!selected()" [title]="selected()?.invoice_number ?? ''" [subtitle]="(selected()?.created_at | date: 'dd/MM/yyyy HH:mm') ?? ''" (closed)="selected.set(null)">
      @if (selected(); as p) {
        <dl class="dl">
          <dt>Fournisseur</dt><dd>{{ p.supplier?.name }}</dd>
          <dt>Réf. fournisseur</dt><dd class="mono">{{ p.supplier_reference || '—' }}</dd>
          <dt>Réceptionné par</dt><dd>{{ p.user?.name }}</dd>
        </dl>
        <table class="table table-compact">
          <thead><tr><th>Produit</th><th class="text-right">Qté</th><th class="text-right">Coût</th><th class="text-right">Montant</th></tr></thead>
          <tbody>
            @for (it of p.items; track it.id) {
              <tr>
                <td><div class="strong small">{{ it.product?.name ?? 'Produit supprimé' }}</div><div class="cell-sub mono">{{ it.product?.reference }}</div></td>
                <td class="text-right num">{{ it.quantity }}</td>
                <td class="text-right num">{{ it.unit_price | money: '' }}</td>
                <td class="text-right num strong">{{ it.subtotal | money: '' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="summary-box">
          <div class="summary-line"><span class="muted">Sous-total</span><span class="num">{{ p.subtotal | money }}</span></div>
          @if (+p.discount > 0) { <div class="summary-line"><span class="muted">Remise</span><span class="num">− {{ p.discount | money }}</span></div> }
          <div class="summary-line total"><span>Total</span><span class="num">{{ p.total | money }}</span></div>
        </div>
        @if (p.notes) { <div class="alert alert-info"><i class="fa-regular fa-note-sticky"></i> {{ p.notes }}</div> }
      }
      <ng-container footer>
        <button type="button" class="btn btn-soft-danger" (click)="cancelPurchase()"><i class="fa-solid fa-ban"></i> Annuler la réception</button>
      </ng-container>
    </app-drawer>
  `,
  styles: [`
    .purchase-form { display: flex; flex-direction: column; gap: 18px; }
    .add-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
    .picker { position: relative; min-width: 260px; }
    .picker-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 5; max-height: 260px; overflow-y: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-md); padding: 4px; }
    .picker-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; background: transparent; border-radius: 8px; cursor: pointer; text-align: left; color: var(--text); }
    .picker-item:hover { background: var(--surface-3); }
    .form-bottom { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
    .totals { width: 320px; max-width: 100%; }
  `]
})
export class PurchasesComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  today = todayIso();
  page = signal<Paginated<Purchase> | null>(null);
  suppliers = signal<Supplier[]>([]);
  loading = signal(false);
  saving = signal(false);
  selected = signal<Purchase | null>(null);

  formOpen = signal(false);
  lines = signal<Line[]>([]);
  productSearch = signal('');
  productResults = signal<Product[]>([]);
  pickerOpen = signal(false);
  loadingAlerts = signal(false);
  supplierId: number | null = null;
  supplierRef = '';
  discount = 0;
  notes = '';

  search = '';
  supplierFilter: number | null = null;
  startDate = '';
  endDate = '';
  search$ = new Subject<void>();
  private productSearch$ = new Subject<string>();

  subtotal = computed(() => this.lines().reduce((s, l) => s + l.quantity * l.unit_price, 0));

  ngOnInit(): void {
    this.api.getAllSuppliers().subscribe({ next: s => this.suppliers.set(s) });
    this.search$.pipe(debounceTime(300)).subscribe(() => this.load(1));
    this.productSearch$.pipe(debounceTime(250)).subscribe(q => {
      this.api.getProductsForSale({ search: q, include_out_of_stock: 1, limit: 15 }).subscribe({ next: p => this.productResults.set(p) });
    });
    this.load(1);

    const params = this.route.snapshot.queryParamMap;
    if (params.has('new')) {
      this.openForm(params.get('supplier') ? Number(params.get('supplier')) : null);
    }
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.getPurchases({ page, search: this.search, supplier_id: this.supplierFilter, start_date: this.startDate, end_date: this.endDate }).subscribe({
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

  openForm(supplierId: number | null = null): void {
    this.lines.set([]);
    this.supplierId = supplierId;
    this.supplierRef = '';
    this.discount = 0;
    this.notes = '';
    this.productSearch.set('');
    this.productSearch$.next('');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    if (this.route.snapshot.queryParamMap.has('new')) {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
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

  addLine(product: Product, quantity = 1): void {
    if (this.lines().some(l => l.product.id === product.id)) {
      this.notify.info(`${product.name} est déjà dans la liste`);
      return;
    }
    this.lines.update(lines => [...lines, { product, quantity, unit_price: Number(product.purchase_price) }]);
    this.productSearch.set('');
    this.pickerOpen.set(false);
  }

  /** Adds every product under its alert threshold, with a quantity bringing it to twice the threshold */
  addAlerts(): void {
    this.loadingAlerts.set(true);
    this.api.getProducts({ stock_status: 'alert', supplier_id: this.supplierId, per_page: 100 }).subscribe({
      next: res => {
        this.loadingAlerts.set(false);
        const existing = new Set(this.lines().map(l => l.product.id));
        const toAdd = res.data.filter(p => !existing.has(p.id));
        if (!toAdd.length) {
          this.notify.info(this.supplierId ? 'Aucun produit en alerte pour ce fournisseur' : 'Aucun produit en alerte');
          return;
        }
        this.lines.update(lines => [
          ...lines,
          ...toAdd.map(p => ({ product: p, quantity: Math.max(1, p.alert_threshold * 2 - p.stock), unit_price: Number(p.purchase_price) })),
        ]);
        this.notify.success(`${toAdd.length} produit(s) ajouté(s)`);
      },
      error: err => {
        this.loadingAlerts.set(false);
        this.notify.error(err);
      },
    });
  }

  update(index: number, field: 'quantity' | 'unit_price', value: unknown): void {
    const n = Number(value);
    this.lines.update(lines => lines.map((l, i) => (i === index ? { ...l, [field]: Number.isFinite(n) && n >= 0 ? (field === 'quantity' ? Math.max(1, Math.floor(n)) : n) : 0 } : l)));
  }

  removeLine(index: number): void {
    this.lines.update(lines => lines.filter((_, i) => i !== index));
  }

  save(): void {
    this.saving.set(true);
    this.api.createPurchase({
      supplier_id: this.supplierId,
      supplier_reference: this.supplierRef || null,
      discount: this.discount || 0,
      notes: this.notes || null,
      items: this.lines().map(l => ({ product_id: l.product.id, quantity: l.quantity, unit_price: l.unit_price })),
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.closeForm();
        this.notify.success(res.message);
        this.load(1);
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  openDetail(id: number): void {
    this.api.getPurchase(id).subscribe({ next: p => this.selected.set(p), error: err => this.notify.error(err) });
  }

  async cancelPurchase(): Promise<void> {
    const p = this.selected();
    if (!p) {
      return;
    }
    const ok = await this.notify.confirm({
      title: `Annuler ${p.invoice_number} ?`,
      text: 'Les quantités reçues seront retirées du stock. Impossible si la marchandise a déjà été vendue.',
      confirmText: 'Annuler la réception',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.api.deletePurchase(p.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.selected.set(null);
        this.load(1);
      },
      error: err => this.notify.error(err),
    });
  }
}
