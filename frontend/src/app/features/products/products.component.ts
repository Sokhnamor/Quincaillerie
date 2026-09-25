import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { Category, Paginated, Product, StockMovement, Supplier } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { MOVEMENT_TYPES, STOCK_STATUS, UNITS } from '../../shared/labels';
import { ModalComponent } from '../../shared/components/modal.component';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

type StockFilter = '' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'alert';

interface ProductForm {
  name: string;
  reference: string;
  unit: string;
  category_id: number | null;
  supplier_id: number | null;
  purchase_price: number | null;
  selling_price: number | null;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  stock: number | null;
  alert_threshold: number | null;
  description: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, MoneyPipe, ModalComponent, DrawerComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Produits</h1>
          <p class="page-subtitle">Catalogue, prix et niveaux de stock.</p>
        </div>
        @if (auth.canManage()) {
          <div class="page-actions">
            <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Nouveau produit</button>
          </div>
        }
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="input-icon search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="Nom ou référence…" [(ngModel)]="search" (ngModelChange)="search$.next()">
          </div>
          <select class="select" [(ngModel)]="categoryId" (ngModelChange)="load(1)" aria-label="Catégorie">
            <option [ngValue]="null">Toutes les catégories</option>
            @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
          <div class="segmented">
            @for (f of stockFilters; track f.value) {
              <button type="button" [class.active]="stockStatus() === f.value" (click)="setStock(f.value)">{{ f.label }}</button>
            }
          </div>
          <select class="select" [(ngModel)]="sort" (ngModelChange)="load(1)" aria-label="Trier par">
            <option value="id:desc">Plus récents</option>
            <option value="name:asc">Nom A → Z</option>
            <option value="stock:asc">Stock croissant</option>
            <option value="stock:desc">Stock décroissant</option>
            <option value="selling_price:desc">Prix décroissant</option>
          </select>
        </div>

        @if (loading() && !page()) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else if (page()?.data?.length === 0) {
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
            <div class="empty-title">Aucun produit trouvé</div>
            <p class="empty-text">Modifiez la recherche ou les filtres{{ auth.canManage() ? ', ou ajoutez un nouveau produit.' : '.' }}</p>
            @if (auth.canManage()) { <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Nouveau produit</button> }
          </div>
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <thead>
                <tr>
                  <th>Produit</th><th class="hide-sm">Catégorie</th>
                  @if (auth.canManage()) { <th class="text-right hide-sm">Prix d'achat</th> }
                  <th class="text-right">Prix de vente</th>
                  @if (auth.canManage()) { <th class="text-right hide-sm">Marge</th> }
                  <th>Stock</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of page()?.data; track p.id) {
                  <tr class="clickable" (click)="openDetail(p)">
                    <td>
                      <div class="cell-main">{{ p.name }}</div>
                      <div class="cell-sub"><span class="mono">{{ p.reference }}</span> · {{ p.supplier?.name ?? 'Sans fournisseur' }}</div>
                    </td>
                    <td class="hide-sm"><span class="badge no-dot">{{ p.category?.name }}</span></td>
                    @if (auth.canManage()) { <td class="text-right num muted hide-sm">{{ p.purchase_price | money }}</td> }
                    <td class="text-right num strong">{{ p.selling_price | money }}</td>
                    @if (auth.canManage()) {
                      <td class="text-right num hide-sm" [class.text-success]="margin(p) > 0" [class.text-danger]="margin(p) <= 0">{{ margin(p) | number: '1.0-1' }} %</td>
                    }
                    <td>
                      <div class="stock-cell">
                        <span class="num strong">{{ p.stock }}</span> <span class="xs subtle">{{ p.unit }}</span>
                        <span class="badge {{ stockMap[p.stock_status].badge }}">{{ stockMap[p.stock_status].label }}</span>
                      </div>
                    </td>
                    <td class="text-right" (click)="$event.stopPropagation()">
                      @if (auth.canManage()) {
                        <div class="actions">
                          <button type="button" class="icon-btn brand" (click)="openAdjust(p)" title="Ajuster le stock" aria-label="Ajuster le stock"><i class="fa-solid fa-sliders"></i></button>
                          <button type="button" class="icon-btn" (click)="openForm(p)" title="Modifier" aria-label="Modifier"><i class="fa-solid fa-pen"></i></button>
                          <button type="button" class="icon-btn danger" (click)="remove(p)" title="Supprimer" aria-label="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                      }
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

    <!-- Create / edit -->
    <app-modal [open]="formOpen()" [title]="editing() ? 'Modifier le produit' : 'Nouveau produit'" size="lg" (closed)="formOpen.set(false)">
      <form id="productForm" class="form-grid" (ngSubmit)="save()">
        <div class="field span-2">
          <label class="label" for="p-name">Désignation <span class="req">*</span></label>
          <input id="p-name" class="input" name="name" [(ngModel)]="form.name" required placeholder="Ex. : Marteau de charpentier 500 g">
        </div>
        <div class="field">
          <label class="label" for="p-ref">Référence</label>
          <input id="p-ref" class="input mono" name="reference" [(ngModel)]="form.reference" placeholder="Générée automatiquement si vide">
        </div>
        <div class="field">
          <label class="label" for="p-unit">Unité de vente</label>
          <select id="p-unit" class="select" name="unit" [(ngModel)]="form.unit">
            @for (u of units; track u) { <option [value]="u">{{ u }}</option> }
          </select>
        </div>
        <div class="field">
          <label class="label" for="p-cat">Catégorie <span class="req">*</span></label>
          <select id="p-cat" class="select" name="category_id" [(ngModel)]="form.category_id" required>
            <option [ngValue]="null" disabled>Choisir…</option>
            @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
        </div>
        <div class="field">
          <label class="label" for="p-sup">Fournisseur</label>
          <select id="p-sup" class="select" name="supplier_id" [(ngModel)]="form.supplier_id">
            <option [ngValue]="null">Aucun</option>
            @for (s of suppliers(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
          </select>
        </div>
        <div class="field">
          <label class="label" for="p-buy">Prix d'achat <span class="req">*</span></label>
          <div class="input-suffix"><input id="p-buy" class="input num" type="number" min="0" name="purchase_price" [(ngModel)]="form.purchase_price" required><span>FCFA</span></div>
        </div>
        <div class="field">
          <label class="label" for="p-sell">Prix de vente HT <span class="req">*</span></label>
          <div class="input-suffix"><input id="p-sell" class="input num" type="number" min="0" name="selling_price" [(ngModel)]="form.selling_price" required><span>FCFA</span></div>
          @if (formMargin() !== null) {
            <span class="hint" [class.text-danger]="formMargin()! <= 0">Marge : {{ formMargin() | number: '1.0-1' }} % · {{ (form.selling_price ?? 0) - (form.purchase_price ?? 0) | money }} par {{ form.unit }}</span>
          }
        </div>
        <div class="field">
          <label class="label" for="p-whole">Prix de gros HT</label>
          <div class="input-suffix"><input id="p-whole" class="input num" type="number" min="0" name="wholesale_price" [(ngModel)]="form.wholesale_price" placeholder="Facultatif"><span>FCFA</span></div>
          <span class="hint">Appliqué aux clients professionnels.</span>
        </div>
        <div class="field">
          <label class="label" for="p-wqty">À partir de (quantité)</label>
          <input id="p-wqty" class="input num" type="number" min="1" name="wholesale_min_qty" [(ngModel)]="form.wholesale_min_qty" placeholder="Ex. : 10" [disabled]="!form.wholesale_price">
          <span class="hint">Prix de gros aussi pour tout client qui achète cette quantité.</span>
        </div>
        <div class="field">
          <label class="label" for="p-stock">{{ editing() ? 'Stock actuel' : 'Stock initial' }}</label>
          <input id="p-stock" class="input num" type="number" min="0" name="stock" [(ngModel)]="form.stock" [disabled]="!!editing()">
          @if (editing()) { <span class="hint">Utilisez « Ajuster le stock » pour le modifier.</span> }
        </div>
        <div class="field">
          <label class="label" for="p-alert">Seuil d'alerte <span class="req">*</span></label>
          <input id="p-alert" class="input num" type="number" min="0" name="alert_threshold" [(ngModel)]="form.alert_threshold" required>
          <span class="hint">Alerte quand le stock descend à ce niveau.</span>
        </div>
        <div class="field span-2">
          <label class="label" for="p-desc">Description</label>
          <textarea id="p-desc" class="textarea" name="description" [(ngModel)]="form.description" rows="2"></textarea>
        </div>
      </form>
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
        <button type="submit" form="productForm" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) { <span class="spinner"></span> } Enregistrer
        </button>
      </ng-container>
    </app-modal>

    <!-- Adjust stock -->
    <app-modal [open]="!!adjusting()" title="Ajuster le stock" [subtitle]="adjusting()?.name ?? ''" size="sm" (closed)="adjusting.set(null)">
      @if (adjusting(); as p) {
        <div class="stack" style="gap:16px">
          <div class="summary-box row-between">
            <span class="muted">Stock actuel</span>
            <strong class="num" style="font-size:18px">{{ p.stock }} {{ p.unit }}</strong>
          </div>
          <div class="choices" style="grid-template-columns:repeat(3,1fr)">
            <button type="button" class="choice" [class.active]="adjust.mode === 'add'" (click)="adjust.mode = 'add'"><i class="fa-solid fa-plus"></i> Ajouter</button>
            <button type="button" class="choice" [class.active]="adjust.mode === 'remove'" (click)="adjust.mode = 'remove'"><i class="fa-solid fa-minus"></i> Retirer</button>
            <button type="button" class="choice" [class.active]="adjust.mode === 'set'" (click)="adjust.mode = 'set'"><i class="fa-solid fa-equals"></i> Fixer</button>
          </div>
          <div class="field">
            <label class="label" for="adj-qty">{{ adjust.mode === 'set' ? 'Nouveau stock (inventaire)' : 'Quantité' }}</label>
            <input id="adj-qty" class="input num" type="number" min="0" [(ngModel)]="adjust.quantity">
            <span class="hint">Nouveau stock : <strong>{{ adjustedStock(p) }} {{ p.unit }}</strong></span>
          </div>
          <div class="field">
            <label class="label" for="adj-note">Motif <span class="req">*</span></label>
            <input id="adj-note" class="input" [(ngModel)]="adjust.note" placeholder="Inventaire, casse, perte, retour…" list="adj-reasons">
            <datalist id="adj-reasons">
              <option value="Inventaire"></option><option value="Casse"></option><option value="Perte / vol"></option><option value="Retour client"></option><option value="Erreur de saisie"></option>
            </datalist>
          </div>
          @if (adjustedStock(p) < 0) {
            <div class="alert alert-danger"><i class="fa-solid fa-circle-exclamation"></i> Le stock ne peut pas devenir négatif.</div>
          }
        </div>
      }
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="adjusting.set(null)">Annuler</button>
        <button type="button" class="btn btn-primary" [disabled]="saving() || !adjust.note.trim() || adjust.quantity === null || adjustedStock(adjusting()!) < 0" (click)="saveAdjust()">
          @if (saving()) { <span class="spinner"></span> } Valider
        </button>
      </ng-container>
    </app-modal>

    <!-- Detail -->
    <app-drawer [open]="!!detail()" [title]="detail()?.product?.name ?? ''" [subtitle]="detail()?.product?.reference ?? ''" (closed)="detail.set(null)">
      @if (detail(); as d) {
        <div class="grid grid-2" style="gap:12px">
          <div class="summary-box"><div class="xs subtle">Stock</div><div class="strong num" style="font-size:20px">{{ d.product.stock }} <span class="small muted">{{ d.product.unit }}</span></div><span class="badge {{ stockMap[d.product.stock_status].badge }}" style="margin-top:6px">{{ stockMap[d.product.stock_status].label }}</span></div>
          <div class="summary-box"><div class="xs subtle">Prix de vente HT</div><div class="strong num" style="font-size:20px">{{ d.product.selling_price | money }}</div>@if (auth.canManage()) {<div class="xs subtle" style="margin-top:6px">Achat : {{ d.product.purchase_price | money }}</div>}</div>
          <div class="summary-box"><div class="xs subtle">Quantité vendue</div><div class="strong num" style="font-size:20px">{{ d.stats.quantity_sold }}</div></div>
          <div class="summary-box"><div class="xs subtle">Chiffre d'affaires HT</div><div class="strong num" style="font-size:20px">{{ d.stats.revenue | money }}</div></div>
        </div>

        <dl class="dl">
          <dt>Catégorie</dt><dd>{{ d.product.category?.name }}</dd>
          <dt>Fournisseur</dt><dd>{{ d.product.supplier?.name ?? '—' }}</dd>
          <dt>Seuil d'alerte</dt><dd>{{ d.product.alert_threshold }} {{ d.product.unit }}</dd>
          @if (d.product.wholesale_price) {
            <dt>Prix de gros</dt><dd>{{ d.product.wholesale_price | money }}{{ d.product.wholesale_min_qty ? ' dès ' + d.product.wholesale_min_qty + ' ' + d.product.unit : ' (pros)' }}</dd>
          }
        </dl>
        @if (d.product.description) { <p class="muted small">{{ d.product.description }}</p> }

        <div>
          <div class="section-title">Historique du stock</div>
          @if (d.movements.length === 0) {
            <p class="muted small">Aucun mouvement enregistré depuis la mise en place du suivi.</p>
          }
          <div class="timeline">
            @for (m of d.movements; track m.id) {
              <div class="timeline-item">
                <span class="timeline-dot {{ m.quantity > 0 ? 'in' : 'out' }}"><i class="fa-solid {{ movementMap[m.type].icon }}"></i></span>
                <div class="grow">
                  <div class="row-between">
                    <strong class="small">{{ movementMap[m.type].label }}</strong>
                    <span class="num small" [class.qty-in]="m.quantity > 0" [class.qty-out]="m.quantity < 0">{{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}</span>
                  </div>
                  <div class="xs subtle">{{ m.created_at | date: 'dd/MM/yyyy HH:mm' }} · {{ m.user?.name ?? 'Système' }} · {{ m.stock_before }} → {{ m.stock_after }}</div>
                  @if (m.reference || m.note) { <div class="xs muted">{{ m.reference }} {{ m.note }}</div> }
                </div>
              </div>
            }
          </div>
        </div>
      }
      <ng-container footer>
        @if (auth.canManage() && detail()) {
          <button type="button" class="btn btn-secondary" (click)="openAdjust(detail()!.product)"><i class="fa-solid fa-sliders"></i> Ajuster</button>
          <button type="button" class="btn btn-primary" (click)="openForm(detail()!.product)"><i class="fa-solid fa-pen"></i> Modifier</button>
        }
      </ng-container>
    </app-drawer>
  `,
  styles: [`
    .stock-cell { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .stock-cell .badge { margin-left: 4px; }
  `]
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  stockMap = STOCK_STATUS;
  movementMap = MOVEMENT_TYPES;
  units = UNITS;
  stockFilters: { value: StockFilter; label: string }[] = [
    { value: '', label: 'Tous' },
    { value: 'in_stock', label: 'En stock' },
    { value: 'low_stock', label: 'Faible' },
    { value: 'out_of_stock', label: 'Rupture' },
  ];

  page = signal<Paginated<Product> | null>(null);
  categories = signal<Category[]>([]);
  suppliers = signal<Supplier[]>([]);
  loading = signal(false);
  saving = signal(false);
  stockStatus = signal<StockFilter>('');

  formOpen = signal(false);
  editing = signal<Product | null>(null);
  form: ProductForm = this.emptyForm();

  adjusting = signal<Product | null>(null);
  adjust: { mode: 'add' | 'remove' | 'set'; quantity: number | null; note: string } = { mode: 'add', quantity: 0, note: '' };

  detail = signal<{ product: Product; stats: { quantity_sold: number; revenue: number }; movements: StockMovement[] } | null>(null);

  search = '';
  categoryId: number | null = null;
  sort = 'id:desc';
  search$ = new Subject<void>();
  private currentPage = 1;

  ngOnInit(): void {
    this.api.getCategories().subscribe({ next: c => this.categories.set(c) });
    this.api.getAllSuppliers().subscribe({ next: s => this.suppliers.set(s) });
    this.search$.pipe(debounceTime(300)).subscribe(() => this.load(1));

    // React to the global search box and dashboard links
    this.route.queryParamMap.subscribe(params => {
      this.search = params.get('search') ?? '';
      this.categoryId = params.has('category') ? Number(params.get('category')) : null;
      const status = params.get('stock_status') as StockFilter | null;
      if (status === 'alert') {
        this.stockFilters = [...this.stockFilters.filter(f => f.value !== 'alert'), { value: 'alert', label: 'Alertes' }];
      }
      this.stockStatus.set(status ?? '');
      this.load(1);
    });
  }

  load(page: number): void {
    this.currentPage = page;
    this.loading.set(true);
    const [sort, direction] = this.sort.split(':');
    this.api.getProducts({ page, search: this.search, category_id: this.categoryId, stock_status: this.stockStatus(), sort, direction }).subscribe({
      next: res => {
        this.page.set(res);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(err, 'Impossible de charger les produits');
      },
    });
  }

  setStock(value: StockFilter): void {
    this.stockStatus.set(value);
    this.load(1);
  }

  margin(p: Pick<Product, 'purchase_price' | 'selling_price'>): number {
    const buy = Number(p.purchase_price);
    const sell = Number(p.selling_price);
    return sell > 0 ? ((sell - buy) / sell) * 100 : 0;
  }

  formMargin(): number | null {
    const sell = Number(this.form.selling_price);
    return sell > 0 && this.form.purchase_price !== null ? this.margin({ purchase_price: this.form.purchase_price, selling_price: sell }) : null;
  }

  openForm(product?: Product): void {
    this.editing.set(product ?? null);
    this.form = product
      ? {
          name: product.name,
          reference: product.reference ?? '',
          unit: product.unit || 'pièce',
          category_id: product.category_id,
          supplier_id: product.supplier_id,
          purchase_price: Number(product.purchase_price),
          selling_price: Number(product.selling_price),
          wholesale_price: product.wholesale_price !== null && product.wholesale_price !== undefined ? Number(product.wholesale_price) : null,
          wholesale_min_qty: product.wholesale_min_qty ?? null,
          stock: product.stock,
          alert_threshold: product.alert_threshold,
          description: product.description ?? '',
        }
      : this.emptyForm();
    this.formOpen.set(true);
  }

  save(): void {
    const f = this.form;
    if (!f.name.trim() || !f.category_id || f.purchase_price === null || f.selling_price === null || f.alert_threshold === null) {
      this.notify.error('Remplissez les champs obligatoires (*)');
      return;
    }
    const editing = this.editing();
    const payload: Record<string, unknown> = {
      name: f.name.trim(),
      unit: f.unit,
      category_id: f.category_id,
      supplier_id: f.supplier_id,
      purchase_price: f.purchase_price,
      selling_price: f.selling_price,
      wholesale_price: f.wholesale_price || null,
      wholesale_min_qty: f.wholesale_price ? f.wholesale_min_qty || null : null,
      alert_threshold: f.alert_threshold,
      description: f.description || null,
    };
    if (f.reference.trim()) {
      payload['reference'] = f.reference.trim();
    }
    if (!editing) {
      payload['stock'] = f.stock ?? 0;
    }

    this.saving.set(true);
    this.api.saveProduct(payload as Partial<Product>, editing?.id).subscribe({
      next: res => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notify.success(res.message);
        this.load(editing ? this.currentPage : 1);
        if (this.detail()?.product.id === res.product.id) {
          this.refreshDetail(res.product.id);
        }
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  openAdjust(product: Product): void {
    this.adjust = { mode: 'add', quantity: 0, note: '' };
    this.adjusting.set(product);
  }

  adjustedStock(p: Product): number {
    const q = Number(this.adjust.quantity ?? 0);
    return this.adjust.mode === 'add' ? p.stock + q : this.adjust.mode === 'remove' ? p.stock - q : q;
  }

  saveAdjust(): void {
    const product = this.adjusting();
    if (!product) {
      return;
    }
    this.saving.set(true);
    this.api.adjustStock(product.id, { mode: this.adjust.mode, quantity: Number(this.adjust.quantity ?? 0), note: this.adjust.note.trim() }).subscribe({
      next: res => {
        this.saving.set(false);
        this.adjusting.set(null);
        this.notify.success(res.message);
        this.load(this.currentPage);
        if (this.detail()?.product.id === product.id) {
          this.refreshDetail(product.id);
        }
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  openDetail(product: Product): void {
    this.refreshDetail(product.id);
  }

  private refreshDetail(id: number): void {
    this.api.getProduct(id).subscribe({
      next: d => this.detail.set(d),
      error: err => this.notify.error(err),
    });
  }

  async remove(product: Product): Promise<void> {
    const ok = await this.notify.confirm({
      title: `Supprimer « ${product.name} » ?`,
      text: 'Cette action est définitive. Un produit déjà vendu ou acheté ne peut pas être supprimé.',
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.api.deleteProduct(product.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.load(this.currentPage);
      },
      error: err => this.notify.error(err),
    });
  }

  private emptyForm(): ProductForm {
    return {
      name: '', reference: '', unit: 'pièce', category_id: null, supplier_id: null,
      purchase_price: null, selling_price: null, wholesale_price: null, wholesale_min_qty: null, stock: 0, alert_threshold: 5, description: '',
    };
  }
}
