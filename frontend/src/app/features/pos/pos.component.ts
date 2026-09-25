import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, finalize, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotifyService } from '../../core/services/notify.service';
import { Category, Client, PaymentMethod, Product, Sale } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { PAYMENT_METHODS, downloadBlob, printBlob } from '../../shared/labels';
import { ModalComponent } from '../../shared/components/modal.component';

interface CartLine {
  product: Product;
  quantity: number;
  unit_price: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, MoneyPipe, ModalComponent],
  template: `
    <div class="pos">
      <!-- Catalogue -->
      <section class="catalog">
        <div class="catalog-head">
          <div>
            <h1 class="page-title">Point de vente</h1>
            <p class="page-subtitle">Cliquez sur un produit pour l'ajouter au panier · <kbd>F2</kbd> pour rechercher</p>
          </div>
        </div>

        <div class="search-row">
          <div class="input-icon grow">
            <i class="fa-solid fa-barcode"></i>
            <input #searchBox class="input input-search" type="search" placeholder="Nom ou référence du produit…"
                   [ngModel]="search()" (ngModelChange)="onSearch($event)" (keydown.enter)="addFirstResult()" autocomplete="off" autofocus>
          </div>
        </div>

        <div class="chips">
          <button type="button" class="chip" [class.active]="!categoryId()" (click)="setCategory(null)">Tout</button>
          @for (c of categories(); track c.id) {
            <button type="button" class="chip" [class.active]="categoryId() === c.id" (click)="setCategory(c.id)">{{ c.name }}</button>
          }
        </div>

        @if (loadingProducts() && products().length === 0) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else if (products().length === 0) {
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
            <div class="empty-title">Aucun produit disponible</div>
            <p class="empty-text">Aucun produit en stock ne correspond à votre recherche.</p>
          </div>
        } @else {
          <div class="product-grid">
            @for (p of products(); track p.id) {
              <button type="button" class="product-card" (click)="add(p)" [class.in-cart]="qtyInCart(p.id) > 0" [disabled]="remaining(p) <= 0">
                @if (qtyInCart(p.id) > 0) {
                  <span class="in-cart-badge">{{ qtyInCart(p.id) }}</span>
                }
                <span class="pc-cat">{{ p.category?.name }}</span>
                <span class="pc-name">{{ p.name }}</span>
                <span class="pc-ref mono">{{ p.reference }}</span>
                <span class="pc-foot">
                  <span class="pc-price num">{{ p.selling_price | money }}</span>
                  <span class="pc-stock" [class.low]="p.stock <= p.alert_threshold">
                    {{ remaining(p) }} {{ p.unit }}
                  </span>
                </span>
              </button>
            }
          </div>
        }
      </section>

      <!-- Cart -->
      <aside class="cart card">
        <div class="cart-head">
          <div class="row">
            <span class="tile-icon" style="background:var(--brand-soft);color:var(--brand-text)"><i class="fa-solid fa-basket-shopping"></i></span>
            <div>
              <div class="card-title">Panier</div>
              <div class="xs subtle">{{ itemCount() }} article{{ itemCount() > 1 ? 's' : '' }}</div>
            </div>
          </div>
          @if (cart().length) {
            <button type="button" class="btn btn-ghost btn-sm" (click)="clear()"><i class="fa-solid fa-trash-can"></i> Vider</button>
          }
        </div>

        <div class="cart-client">
          <label class="label" for="client">Client</label>
          <div class="row">
            <select id="client" class="select grow" [ngModel]="clientId()" (ngModelChange)="clientId.set($event)">
              <option [ngValue]="null">Client comptoir (anonyme)</option>
              @for (c of clients(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}{{ c.phone ? ' · ' + c.phone : '' }}</option>
              }
            </select>
            <button type="button" class="btn btn-secondary" style="width:40px;padding:0" (click)="openClientModal()" title="Nouveau client" aria-label="Nouveau client">
              <i class="fa-solid fa-user-plus"></i>
            </button>
          </div>
        </div>

        <div class="cart-lines">
          @if (cart().length === 0) {
            <div class="empty empty-sm">
              <div class="empty-icon"><i class="fa-solid fa-cart-plus"></i></div>
              <div class="empty-title">Panier vide</div>
              <p class="empty-text small">Ajoutez des produits depuis le catalogue.</p>
            </div>
          }
          @for (line of cart(); track line.product.id; let i = $index) {
            <div class="line">
              <div class="line-top">
                <div class="grow">
                  <div class="strong small truncate">{{ line.product.name }}</div>
                  <div class="xs subtle">Stock : {{ line.product.stock }} {{ line.product.unit }}</div>
                </div>
                <button type="button" class="icon-btn danger" (click)="remove(i)" aria-label="Retirer"><i class="fa-solid fa-xmark"></i></button>
              </div>
              <div class="line-bottom">
                <div class="stepper">
                  <button type="button" (click)="setQty(i, line.quantity - 1)" aria-label="Diminuer"><i class="fa-solid fa-minus"></i></button>
                  <input type="number" min="1" [max]="line.product.stock" [ngModel]="line.quantity" (ngModelChange)="setQty(i, $event)" aria-label="Quantité">
                  <button type="button" (click)="setQty(i, line.quantity + 1)" [disabled]="line.quantity >= line.product.stock" aria-label="Augmenter"><i class="fa-solid fa-plus"></i></button>
                </div>
                <span class="xs subtle">×</span>
                <input class="input input-sm price-input num" type="number" min="0" [ngModel]="line.unit_price" (ngModelChange)="setPrice(i, $event)" aria-label="Prix unitaire">
                <span class="num strong line-total">{{ line.quantity * line.unit_price | money }}</span>
              </div>
            </div>
          }
        </div>

        <div class="cart-foot">
          <div class="summary-line"><span class="muted">Sous-total HT</span><span class="num">{{ subtotal() | money }}</span></div>
          <div class="summary-line"><span class="muted">TVA ({{ taxRate() }} %)</span><span class="num">{{ tax() | money }}</span></div>
          <div class="summary-line align-center">
            <span class="muted">Remise</span>
            <div class="input-suffix" style="width:140px">
              <input class="input input-sm num text-right" type="number" min="0" [ngModel]="discount()" (ngModelChange)="discount.set(toNumber($event))" aria-label="Remise">
              <span>FCFA</span>
            </div>
          </div>
          <div class="summary-line total"><span>Total TTC</span><span class="num">{{ total() | money }}</span></div>

          <button type="button" class="btn btn-primary btn-lg btn-block" style="margin-top:14px" [disabled]="cart().length === 0" (click)="openCheckout()">
            <i class="fa-solid fa-cash-register"></i> Encaisser {{ total() | money }}
          </button>
        </div>
      </aside>
    </div>

    <!-- Mobile cart bar -->
    @if (cart().length) {
      <button type="button" class="mobile-cart-bar" (click)="openCheckout()">
        <span><i class="fa-solid fa-basket-shopping"></i> {{ itemCount() }} article{{ itemCount() > 1 ? 's' : '' }}</span>
        <strong>Encaisser {{ total() | money }}</strong>
      </button>
    }

    <!-- Checkout -->
    <app-modal [open]="checkoutOpen()" title="Encaissement" [subtitle]="'Total à payer : ' + (total() | money)" (closed)="checkoutOpen.set(false)">
      <div class="stack" style="gap:18px">
        <div class="field">
          <span class="label">Moyen de paiement</span>
          <div class="choices">
            @for (m of methods; track m.value) {
              <button type="button" class="choice" [class.active]="method() === m.value" (click)="method.set(m.value)">
                <i class="fa-solid {{ m.icon }}"></i> {{ m.label }}
              </button>
            }
          </div>
        </div>

        <div class="field">
          <label class="label" for="received">Montant reçu</label>
          <div class="input-suffix">
            <input id="received" class="input num" style="height:48px;font-size:18px;font-weight:700" type="number" min="0"
                   [ngModel]="received()" (ngModelChange)="received.set(toNumber($event))">
            <span>FCFA</span>
          </div>
          <div class="row wrap" style="margin-top:4px">
            <button type="button" class="btn btn-secondary btn-sm" (click)="received.set(total())">Montant exact</button>
            @for (q of quickAmounts(); track q) {
              <button type="button" class="btn btn-secondary btn-sm num" (click)="received.set(q)">{{ q | money }}</button>
            }
            <button type="button" class="btn btn-ghost btn-sm" (click)="received.set(0)">À crédit</button>
          </div>
        </div>

        @if (received() >= total()) {
          <div class="change-box">
            <span>Monnaie à rendre</span>
            <strong class="num">{{ received() - total() | money }}</strong>
          </div>
        } @else {
          <div class="alert alert-warning">
            <i class="fa-solid fa-hand-holding-dollar"></i>
            <div>
              Paiement partiel : <strong>{{ total() - received() | money }}</strong> resteront dus.
              @if (!clientId()) {
                <div style="margin-top:4px"><strong>Choisissez un client</strong> dans le panier pour une vente à crédit.</div>
              }
            </div>
          </div>
        }

        <div class="field">
          <label class="label" for="notes">Note (facultatif)</label>
          <input id="notes" class="input" type="text" [(ngModel)]="notes" placeholder="Ex. : livraison prévue samedi">
        </div>
      </div>

      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="checkoutOpen.set(false)">Retour</button>
        <button type="button" class="btn btn-primary" [disabled]="saving() || (received() < total() && !clientId())" (click)="confirmSale()">
          @if (saving()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-check"></i> }
          Valider la vente
        </button>
      </ng-container>
    </app-modal>

    <!-- Success -->
    <app-modal [open]="!!lastSale()" title="Vente enregistrée" size="sm" (closed)="lastSale.set(null)">
      @if (lastSale(); as s) {
        <div class="success">
          <div class="success-icon"><i class="fa-solid fa-check"></i></div>
          <div class="mono strong">{{ s.invoice_number }}</div>
          <div class="success-total num">{{ s.total | money }}</div>
          <span class="badge {{ s.status === 'paid' ? 'badge-success' : 'badge-warning' }}">
            {{ s.status === 'paid' ? 'Payée' : 'Reste ' + (s.remaining_amount | money) }}
          </span>
          @if (lastChange() > 0) {
            <p class="muted small">Monnaie rendue : <strong>{{ lastChange() | money }}</strong></p>
          }
        </div>
      }
      <ng-container footer>
        <button type="button" class="icon-btn" (click)="downloadInvoice()" [disabled]="downloading()" title="Télécharger le PDF" aria-label="Télécharger le PDF"><i class="fa-solid fa-download"></i></button>
        <button type="button" class="btn btn-secondary" (click)="printInvoice()" [disabled]="downloading()">
          @if (downloading()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-print"></i> } Imprimer
        </button>
        <button type="button" class="btn btn-primary" (click)="lastSale.set(null)"><i class="fa-solid fa-plus"></i> Nouvelle vente</button>
      </ng-container>
    </app-modal>

    <!-- Quick client -->
    <app-modal [open]="clientModal()" title="Nouveau client" size="sm" (closed)="clientModal.set(false)">
      <form class="stack" style="gap:14px" (ngSubmit)="saveClient()" id="clientForm">
        <div class="field">
          <label class="label" for="cname">Nom <span class="req">*</span></label>
          <input id="cname" class="input" name="name" [(ngModel)]="newClient.name" required>
        </div>
        <div class="field">
          <label class="label" for="cphone">Téléphone</label>
          <input id="cphone" class="input" name="phone" [(ngModel)]="newClient.phone" placeholder="77 000 00 00">
        </div>
      </form>
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="clientModal.set(false)">Annuler</button>
        <button type="submit" form="clientForm" class="btn btn-primary" [disabled]="!newClient.name.trim()">Ajouter</button>
      </ng-container>
    </app-modal>
  `,
  styles: [`
    .pos { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 20px; padding: 24px 28px; height: calc(100vh - var(--topbar-h)); }
    .catalog { display: flex; flex-direction: column; min-height: 0; }
    .catalog-head { margin-bottom: 16px; }
    kbd { font: 600 11px var(--font); background: var(--surface); border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; padding: 1px 5px; }
    .input-search { height: 46px; font-size: 15px; }
    .chips { display: flex; gap: 8px; overflow-x: auto; padding: 14px 0; flex-shrink: 0; scrollbar-width: none; }
    .chip { flex-shrink: 0; height: 32px; padding: 0 14px; border-radius: 99px; border: 1px solid var(--border); background: var(--surface); color: var(--text-2); font-size: 13px; font-weight: 600; cursor: pointer; }
    .chip:hover { border-color: var(--border-strong); color: var(--text); }
    .chip.active { background: var(--text); color: var(--surface); border-color: var(--text); }

    .product-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; align-content: start; padding: 2px 4px 20px 2px; }
    .product-card {
      position: relative; display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 14px; min-height: 138px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; color: var(--text);
      transition: border-color 0.15s, box-shadow 0.15s, transform 0.08s;
    }
    .product-card:hover:not(:disabled) { border-color: var(--brand); box-shadow: var(--shadow-md); }
    .product-card:active:not(:disabled) { transform: scale(0.98); }
    .product-card:disabled { opacity: 0.5; cursor: not-allowed; }
    .product-card.in-cart { border-color: var(--brand); box-shadow: inset 0 0 0 1px var(--brand); }
    .in-cart-badge { position: absolute; top: -8px; right: -8px; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 99px; background: var(--brand); color: #fff; font-size: 12px; font-weight: 700; display: grid; place-items: center; box-shadow: 0 0 0 3px var(--bg); }
    .pc-cat { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); }
    .pc-name { font-weight: 650; font-size: 14px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pc-ref { color: var(--text-3); font-size: 11px; }
    .pc-foot { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; padding-top: 8px; }
    .pc-price { font-weight: 700; font-size: 14.5px; color: var(--brand-text); }
    .pc-stock { font-size: 11.5px; color: var(--text-3); white-space: nowrap; }
    .pc-stock.low { color: var(--warning-text); font-weight: 600; }

    .cart { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .cart-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); }
    .cart-client { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
    .cart-lines { flex: 1; overflow-y: auto; padding: 4px 16px; }
    .line { padding: 12px 0; border-bottom: 1px dashed var(--border); }
    .line:last-child { border-bottom: 0; }
    .line-top { display: flex; align-items: flex-start; gap: 8px; }
    .line-bottom { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .stepper { display: inline-flex; align-items: center; border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; height: 32px; }
    .stepper button { width: 28px; height: 100%; border: 0; background: var(--surface-2); color: var(--text-2); cursor: pointer; font-size: 11px; }
    .stepper button:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
    .stepper button:disabled { opacity: 0.4; cursor: not-allowed; }
    .stepper input { width: 42px; height: 100%; border: 0; text-align: center; font: 600 13px var(--font); background: var(--surface); color: var(--text); -moz-appearance: textfield; }
    .stepper input::-webkit-inner-spin-button, .price-input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .stepper input:focus { outline: none; }
    .price-input { width: 96px; text-align: right; }
    .line-total { margin-left: auto; font-size: 13.5px; }
    .cart-foot { padding: 14px 16px 16px; border-top: 1px solid var(--border); background: var(--surface-2); }
    .align-center { align-items: center; }

    .change-box { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 10px; background: var(--success-soft); color: var(--success-text); font-weight: 600; }
    .change-box strong { font-size: 20px; }

    .success { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 8px 0; }
    .success-icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--success-soft); color: var(--success-text); font-size: 26px; margin-bottom: 6px; animation: pop 0.3s var(--ease); }
    .success-total { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }

    .mobile-cart-bar { display: none; }

    @media (max-width: 1100px) {
      .pos { grid-template-columns: minmax(0, 1fr) 340px; padding: 20px; }
    }
    @media (max-width: 860px) {
      .pos { grid-template-columns: minmax(0, 1fr); height: auto; padding: 16px 16px 90px; }
      .cart { order: 2; }
      .product-grid { overflow: visible; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .mobile-cart-bar {
        display: flex; position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 40; align-items: center; justify-content: space-between;
        height: 54px; padding: 0 18px; border: 0; border-radius: 14px; background: var(--brand); color: #fff; font: 600 14px var(--font); box-shadow: var(--shadow-lg); cursor: pointer;
      }
    }
  `]
})
export class PosComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');
  private search$ = new Subject<string>();

  methods = PAYMENT_METHODS;

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  clients = signal<Client[]>([]);
  loadingProducts = signal(false);
  search = signal('');
  categoryId = signal<number | null>(null);

  cart = signal<CartLine[]>([]);
  clientId = signal<number | null>(null);
  discount = signal(0);
  taxRate = signal(18);

  checkoutOpen = signal(false);
  method = signal<PaymentMethod>('cash');
  received = signal(0);
  notes = '';
  saving = signal(false);
  lastSale = signal<Sale | null>(null);
  lastChange = signal(0);
  downloading = signal(false);

  clientModal = signal(false);
  newClient = { name: '', phone: '' };

  itemCount = computed(() => this.cart().reduce((n, l) => n + l.quantity, 0));
  subtotal = computed(() => this.cart().reduce((s, l) => s + l.quantity * l.unit_price, 0));
  tax = computed(() => Math.round(this.subtotal() * this.taxRate()) / 100);
  total = computed(() => Math.max(0, Math.round((this.subtotal() + this.tax() - this.discount()) * 100) / 100));

  /** Round-up suggestions for cash payments (e.g. 12 300 -> 12 500, 13 000, 15 000) */
  quickAmounts = computed(() => {
    const t = this.total();
    if (t <= 0) {
      return [];
    }
    const steps = [500, 1000, 5000, 10000];
    const values = new Set(steps.map(s => Math.ceil(t / s) * s).filter(v => v > t));
    return [...values].sort((a, b) => a - b).slice(0, 3);
  });

  ngOnInit(): void {
    this.api.getCategories().subscribe({ next: c => this.categories.set(c) });
    this.loadClients();
    this.api.getSettings().subscribe({ next: s => this.taxRate.set(Number(s.tax_rate)) });

    this.search$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(() => this.fetchProducts())
    ).subscribe(products => this.products.set(products));

    this.fetchProducts().subscribe(products => this.products.set(products));
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'F2') {
      event.preventDefault();
      this.searchBox()?.nativeElement.focus();
    }
  }

  private fetchProducts() {
    this.loadingProducts.set(true);
    return this.api.getProductsForSale({ search: this.search(), category_id: this.categoryId(), limit: 120 }).pipe(
      catchError(err => {
        this.notify.error(err);
        return of([] as Product[]);
      }),
      finalize(() => this.loadingProducts.set(false))
    );
  }

  private loadClients(selectId?: number): void {
    this.api.getAllClients().subscribe({
      next: c => {
        this.clients.set(c);
        if (selectId) {
          this.clientId.set(selectId);
        }
      },
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.search$.next(value);
  }

  setCategory(id: number | null): void {
    this.categoryId.set(id);
    this.fetchProducts().subscribe(products => this.products.set(products));
  }

  addFirstResult(): void {
    const q = this.search().trim().toLowerCase();
    const list = this.products();
    const exact = list.find(p => p.reference?.toLowerCase() === q);
    const target = exact ?? (list.length === 1 ? list[0] : null);
    if (target) {
      this.add(target);
      this.onSearch('');
    }
  }

  qtyInCart(productId: number): number {
    return this.cart().find(l => l.product.id === productId)?.quantity ?? 0;
  }

  remaining(p: Product): number {
    return p.stock - this.qtyInCart(p.id);
  }

  add(product: Product): void {
    const lines = [...this.cart()];
    const index = lines.findIndex(l => l.product.id === product.id);
    if (index >= 0) {
      if (lines[index].quantity >= product.stock) {
        this.notify.info(`Stock maximum atteint pour ${product.name}`);
        return;
      }
      lines[index] = { ...lines[index], quantity: lines[index].quantity + 1 };
    } else {
      lines.unshift({ product, quantity: 1, unit_price: Number(product.selling_price) });
    }
    this.cart.set(lines);
  }

  setQty(index: number, value: number | string): void {
    const lines = [...this.cart()];
    const line = lines[index];
    const qty = Math.floor(Number(value));
    if (!Number.isFinite(qty) || qty < 1) {
      if (Number(value) <= 0) {
        this.remove(index);
      }
      return;
    }
    lines[index] = { ...line, quantity: Math.min(qty, line.product.stock) };
    this.cart.set(lines);
  }

  setPrice(index: number, value: number | string): void {
    const lines = [...this.cart()];
    lines[index] = { ...lines[index], unit_price: Math.max(0, this.toNumber(value)) };
    this.cart.set(lines);
  }

  remove(index: number): void {
    this.cart.set(this.cart().filter((_, i) => i !== index));
  }

  async clear(): Promise<void> {
    if (await this.notify.confirm({ title: 'Vider le panier ?', confirmText: 'Vider', danger: true })) {
      this.reset();
    }
  }

  openCheckout(): void {
    if (!this.cart().length) {
      return;
    }
    this.received.set(this.total());
    this.method.set('cash');
    this.checkoutOpen.set(true);
  }

  confirmSale(): void {
    const paid = Math.min(this.received(), this.total());
    this.saving.set(true);

    this.api.createSale({
      client_id: this.clientId(),
      items: this.cart().map(l => ({ product_id: l.product.id, quantity: l.quantity, unit_price: l.unit_price })),
      discount: this.discount(),
      paid_amount: paid,
      payment_method: this.method(),
      notes: this.notes || null,
    }).subscribe({
      next: sale => {
        this.saving.set(false);
        this.checkoutOpen.set(false);
        this.lastChange.set(Math.max(0, this.received() - this.total()));
        this.lastSale.set(sale);
        this.reset();
        this.fetchProducts().subscribe(products => this.products.set(products));
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err, 'La vente n\'a pas pu être enregistrée');
      },
    });
  }

  downloadInvoice(): void {
    const sale = this.lastSale();
    if (!sale) {
      return;
    }
    this.downloading.set(true);
    this.api.downloadInvoicePdf(sale.id).subscribe({
      next: blob => {
        downloadBlob(blob, `facture-${sale.invoice_number}.pdf`);
        this.downloading.set(false);
      },
      error: err => {
        this.downloading.set(false);
        this.notify.error(err, 'Téléchargement impossible');
      },
    });
  }

  printInvoice(): void {
    const sale = this.lastSale();
    if (!sale) {
      return;
    }
    this.downloading.set(true);
    this.api.downloadInvoicePdf(sale.id).subscribe({
      next: blob => {
        printBlob(blob);
        this.downloading.set(false);
      },
      error: err => {
        this.downloading.set(false);
        this.notify.error(err, 'Impression impossible');
      },
    });
  }

  openClientModal(): void {
    this.newClient = { name: '', phone: '' };
    this.clientModal.set(true);
  }

  saveClient(): void {
    if (!this.newClient.name.trim()) {
      return;
    }
    this.api.saveClient({ name: this.newClient.name.trim(), phone: this.newClient.phone || null }).subscribe({
      next: ({ client }) => {
        this.clientModal.set(false);
        this.notify.success('Client ajouté');
        this.loadClients(client.id);
      },
      error: err => this.notify.error(err),
    });
  }

  toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private reset(): void {
    this.cart.set([]);
    this.clientId.set(null);
    this.discount.set(0);
    this.notes = '';
  }
}
