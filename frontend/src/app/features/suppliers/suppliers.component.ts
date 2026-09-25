import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { Paginated, Product, Purchase, Supplier } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { initials } from '../../shared/labels';
import { ModalComponent } from '../../shared/components/modal.component';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, ModalComponent, DrawerComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Fournisseurs</h1>
          <p class="page-subtitle">Vos partenaires d'approvisionnement.</p>
        </div>
        @if (auth.canManage()) {
          <div class="page-actions">
            <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Nouveau fournisseur</button>
          </div>
        }
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="input-icon search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="Nom, téléphone, ville…" [(ngModel)]="search" (ngModelChange)="search$.next()">
          </div>
        </div>

        @if (loading() && !page()) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else if (page()?.data?.length === 0) {
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-industry"></i></div>
            <div class="empty-title">Aucun fournisseur</div>
            @if (auth.canManage()) { <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Ajouter un fournisseur</button> }
          </div>
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <thead><tr><th>Fournisseur</th><th class="hide-sm">Contact</th><th class="text-right">Produits</th><th class="text-right hide-sm">Total acheté</th><th></th></tr></thead>
              <tbody>
                @for (s of page()?.data; track s.id) {
                  <tr class="clickable" (click)="openDetail(s)">
                    <td><div class="row"><span class="avatar avatar-sm" style="background:var(--info-soft);color:var(--info-text)">{{ initials(s.name) }}</span><div><div class="cell-main">{{ s.name }}</div><div class="cell-sub">{{ s.city || '—' }}</div></div></div></td>
                    <td class="hide-sm"><div class="small">{{ s.phone || '—' }}</div><div class="cell-sub">{{ s.email }}</div></td>
                    <td class="text-right num">{{ s.products_count ?? 0 }}</td>
                    <td class="text-right num strong hide-sm">{{ s.purchases_sum_total ?? 0 | money }}</td>
                    <td class="text-right" (click)="$event.stopPropagation()">
                      @if (auth.canManage()) {
                        <div class="actions">
                          <button type="button" class="icon-btn" (click)="openForm(s)" aria-label="Modifier" title="Modifier"><i class="fa-solid fa-pen"></i></button>
                          <button type="button" class="icon-btn danger" (click)="remove(s)" aria-label="Supprimer" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
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

    <app-modal [open]="formOpen()" [title]="editing() ? 'Modifier le fournisseur' : 'Nouveau fournisseur'" (closed)="formOpen.set(false)">
      <form id="supForm" class="form-grid" (ngSubmit)="save()">
        <div class="field span-2"><label class="label" for="s-name">Raison sociale <span class="req">*</span></label><input id="s-name" class="input" name="name" [(ngModel)]="form.name" required></div>
        <div class="field"><label class="label" for="s-phone">Téléphone</label><input id="s-phone" class="input" name="phone" [(ngModel)]="form.phone"></div>
        <div class="field"><label class="label" for="s-email">Email</label><input id="s-email" class="input" type="email" name="email" [(ngModel)]="form.email"></div>
        <div class="field"><label class="label" for="s-address">Adresse</label><input id="s-address" class="input" name="address" [(ngModel)]="form.address"></div>
        <div class="field"><label class="label" for="s-city">Ville</label><input id="s-city" class="input" name="city" [(ngModel)]="form.city"></div>
      </form>
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
        <button type="submit" form="supForm" class="btn btn-primary" [disabled]="saving() || !form.name.trim()">@if (saving()) { <span class="spinner"></span> } Enregistrer</button>
      </ng-container>
    </app-modal>

    <app-drawer [open]="!!detail()" [title]="detail()?.supplier?.name ?? ''" [subtitle]="detail()?.supplier?.phone ?? ''" (closed)="detail.set(null)">
      @if (detail(); as d) {
        <dl class="dl">
          <dt>Email</dt><dd>{{ d.supplier.email || '—' }}</dd>
          <dt>Adresse</dt><dd>{{ d.supplier.address || '—' }} {{ d.supplier.city }}</dd>
          <dt>Total acheté</dt><dd class="num">{{ d.supplier.purchases_sum_total ?? 0 | money }}</dd>
        </dl>
        <div>
          <div class="section-title">Produits fournis ({{ d.products.length }})</div>
          @if (d.products.length === 0) { <p class="muted small">Aucun produit rattaché.</p> }
          <table class="table table-compact">
            <tbody>
              @for (p of d.products; track p.id) {
                <tr>
                  <td><div class="strong small">{{ p.name }}</div><div class="cell-sub mono">{{ p.reference }}</div></td>
                  <td class="text-right num small" [class.text-danger]="p.stock <= p.alert_threshold">{{ p.stock }} en stock</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (d.purchases.length) {
          <div>
            <div class="section-title">Derniers approvisionnements</div>
            <table class="table table-compact">
              <tbody>
                @for (pu of d.purchases; track pu.id) {
                  <tr><td class="mono small strong">{{ pu.invoice_number }}</td><td class="small muted">{{ pu.created_at | date: 'dd/MM/yyyy' }}</td><td class="text-right num small strong">{{ pu.total | money }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
      <ng-container footer>
        @if (auth.canManage() && detail()) {
          <a class="btn btn-secondary" routerLink="/purchases" [queryParams]="{ new: 1, supplier: detail()!.supplier.id }"><i class="fa-solid fa-truck-ramp-box"></i> Commander</a>
          <button type="button" class="btn btn-primary" (click)="openForm(detail()!.supplier)"><i class="fa-solid fa-pen"></i> Modifier</button>
        }
      </ng-container>
    </app-drawer>
  `,
})
export class SuppliersComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  auth = inject(AuthService);

  initials = initials;
  page = signal<Paginated<Supplier> | null>(null);
  loading = signal(false);
  saving = signal(false);
  formOpen = signal(false);
  editing = signal<Supplier | null>(null);
  detail = signal<{ supplier: Supplier; products: Product[]; purchases: Purchase[] } | null>(null);
  form = { name: '', phone: '', email: '', address: '', city: '' };
  search = '';
  search$ = new Subject<void>();
  private currentPage = 1;

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe(() => this.load(1));
    this.load(1);
  }

  load(page: number): void {
    this.currentPage = page;
    this.loading.set(true);
    this.api.getSuppliers({ page, search: this.search }).subscribe({
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

  openDetail(supplier: Supplier): void {
    this.api.getSupplierDetail(supplier.id).subscribe({ next: d => this.detail.set(d), error: err => this.notify.error(err) });
  }

  openForm(supplier?: Supplier): void {
    this.editing.set(supplier ?? null);
    this.form = {
      name: supplier?.name ?? '', phone: supplier?.phone ?? '', email: supplier?.email ?? '',
      address: supplier?.address ?? '', city: supplier?.city ?? '',
    };
    this.formOpen.set(true);
  }

  save(): void {
    const f = this.form;
    this.saving.set(true);
    const payload = { name: f.name.trim(), phone: f.phone || null, email: f.email || null, address: f.address || null, city: f.city || null };
    const editing = this.editing();
    this.api.saveSupplier(payload, editing?.id).subscribe({
      next: res => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notify.success(res.message);
        this.load(editing ? this.currentPage : 1);
        if (editing && this.detail()?.supplier.id === editing.id) {
          this.openDetail(res.supplier);
        }
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  async remove(supplier: Supplier): Promise<void> {
    const ok = await this.notify.confirm({ title: `Supprimer ${supplier.name} ?`, text: 'Un fournisseur ayant des produits ou des achats ne peut pas être supprimé.', confirmText: 'Supprimer', danger: true });
    if (!ok) {
      return;
    }
    this.api.deleteSupplier(supplier.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.load(this.currentPage);
      },
      error: err => this.notify.error(err),
    });
  }
}
