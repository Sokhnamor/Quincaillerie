import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { Client, ClientStats, ClientType, Paginated, Sale } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { SALE_STATUS, initials, whatsappUrl } from '../../shared/labels';
import { formatMoney } from '../../shared/money.pipe';
import { ModalComponent } from '../../shared/components/modal.component';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, ModalComponent, DrawerComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Clients</h1>
          <p class="page-subtitle">Carnet clients, historique d'achats et créances.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-user-plus"></i> Nouveau client</button>
        </div>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="input-icon search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="Nom, téléphone, ville…" [(ngModel)]="search" (ngModelChange)="search$.next()">
          </div>
          <div class="segmented">
            <button type="button" [class.active]="!withDebt()" (click)="setDebt(false)">Tous</button>
            <button type="button" [class.active]="withDebt()" (click)="setDebt(true)"><i class="fa-solid fa-hand-holding-dollar"></i> Avec une dette</button>
          </div>
        </div>

        @if (loading() && !page()) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else if (page()?.data?.length === 0) {
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-users"></i></div>
            <div class="empty-title">Aucun client trouvé</div>
            <p class="empty-text">Enregistrez vos clients réguliers pour suivre leurs achats et leurs paiements.</p>
            <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-user-plus"></i> Nouveau client</button>
          </div>
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <thead><tr><th>Client</th><th class="hide-sm">Contact</th><th class="text-right hide-sm">Achats</th><th class="text-right">Total acheté</th><th class="text-right">Reste dû</th><th></th></tr></thead>
              <tbody>
                @for (c of page()?.data; track c.id) {
                  <tr class="clickable" (click)="openDetail(c)">
                    <td>
                      <div class="row"><span class="avatar avatar-sm">{{ initials(c.name) }}</span><div><div class="cell-main">{{ c.name }} @if (c.type === 'professionnel') { <span class="badge badge-info no-dot" style="margin-left:4px">Pro</span> }</div><div class="cell-sub">{{ c.city || '—' }}</div></div></div>
                    </td>
                    <td class="hide-sm"><div class="small">{{ c.phone || '—' }}</div><div class="cell-sub">{{ c.email }}</div></td>
                    <td class="text-right num hide-sm">{{ c.sales_count ?? 0 }}</td>
                    <td class="text-right num strong">{{ c.sales_sum_total ?? 0 | money }}</td>
                    <td class="text-right num" [class.text-danger]="(c.balance_due ?? 0) > 0" [class.subtle]="!(c.balance_due ?? 0)">{{ c.balance_due ?? 0 | money }}</td>
                    <td class="text-right" (click)="$event.stopPropagation()">
                      <div class="actions">
                        <button type="button" class="icon-btn" (click)="openForm(c)" aria-label="Modifier" title="Modifier"><i class="fa-solid fa-pen"></i></button>
                        @if (auth.isAdmin()) {
                          <button type="button" class="icon-btn danger" (click)="remove(c)" aria-label="Supprimer" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
                        }
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

    <app-modal [open]="formOpen()" [title]="editing() ? 'Modifier le client' : 'Nouveau client'" (closed)="formOpen.set(false)">
      <form id="clientForm" class="form-grid" (ngSubmit)="save()">
        <div class="field span-2"><label class="label" for="cl-name">Nom complet <span class="req">*</span></label><input id="cl-name" class="input" name="name" [(ngModel)]="form.name" required></div>
        <div class="field span-2">
          <span class="label">Type de client</span>
          <div class="choices" style="grid-template-columns:repeat(2,1fr)">
            <button type="button" class="choice" [class.active]="form.type === 'particulier'" (click)="form.type = 'particulier'"><i class="fa-solid fa-user"></i> Particulier</button>
            <button type="button" class="choice" [class.active]="form.type === 'professionnel'" (click)="form.type = 'professionnel'"><i class="fa-solid fa-helmet-safety"></i> Professionnel (prix de gros)</button>
          </div>
        </div>
        <div class="field"><label class="label" for="cl-phone">Téléphone</label><input id="cl-phone" class="input" name="phone" [(ngModel)]="form.phone" placeholder="77 000 00 00"></div>
        <div class="field"><label class="label" for="cl-email">Email</label><input id="cl-email" class="input" type="email" name="email" [(ngModel)]="form.email"></div>
        <div class="field"><label class="label" for="cl-address">Adresse</label><input id="cl-address" class="input" name="address" [(ngModel)]="form.address"></div>
        <div class="field"><label class="label" for="cl-city">Ville</label><input id="cl-city" class="input" name="city" [(ngModel)]="form.city" placeholder="Dakar"></div>
        <div class="field span-2">
          <label class="label" for="cl-limit">Plafond de crédit</label>
          <div class="input-suffix"><input id="cl-limit" class="input num" type="number" min="0" name="credit_limit" [(ngModel)]="form.credit_limit" placeholder="Vide = pas de plafond"><span>FCFA</span></div>
          <span class="hint">Une vente à crédit est refusée si la dette du client dépasse ce montant. Mettez 0 pour interdire le crédit.</span>
        </div>
      </form>
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
        <button type="submit" form="clientForm" class="btn btn-primary" [disabled]="saving() || !form.name.trim()">@if (saving()) { <span class="spinner"></span> } Enregistrer</button>
      </ng-container>
    </app-modal>

    <app-drawer [open]="!!detail()" [title]="detail()?.client?.name ?? ''" [subtitle]="detail()?.client?.phone ?? ''" (closed)="detail.set(null)">
      @if (detail(); as d) {
        <div class="grid grid-3" style="gap:10px">
          <div class="summary-box"><div class="xs subtle">Achats</div><div class="strong num" style="font-size:18px">{{ d.stats.sales_count }}</div></div>
          <div class="summary-box"><div class="xs subtle">Total</div><div class="strong num" style="font-size:15px">{{ d.stats.total_spent | money }}</div></div>
          <div class="summary-box"><div class="xs subtle">Reste dû</div><div class="strong num" style="font-size:15px" [class.text-danger]="d.stats.balance_due > 0">{{ d.stats.balance_due | money }}</div></div>
        </div>
        @if (d.stats.credit_limit !== null) {
          <div>
            <div class="row-between small"><span class="muted">Crédit utilisé</span><span class="num"><strong>{{ d.stats.balance_due | money }}</strong> / {{ d.stats.credit_limit | money }}</span></div>
            <div class="progress {{ creditRatio(d.stats) >= 100 ? 'danger' : creditRatio(d.stats) >= 75 ? 'warning' : 'success' }}" style="margin-top:6px"><span [style.width.%]="creditRatio(d.stats)"></span></div>
          </div>
        }
        <dl class="dl">
          <dt>Type</dt><dd>{{ d.client.type === 'professionnel' ? 'Professionnel' : 'Particulier' }}</dd>
          <dt>Email</dt><dd>{{ d.client.email || '—' }}</dd>
          <dt>Adresse</dt><dd>{{ d.client.address || '—' }}</dd>
          <dt>Ville</dt><dd>{{ d.client.city || '—' }}</dd>
        </dl>
        <div>
          <div class="section-title">Derniers achats</div>
          @if (d.sales.length === 0) { <p class="muted small">Aucun achat pour le moment.</p> }
          <table class="table table-compact">
            <tbody>
              @for (s of d.sales; track s.id) {
                <tr class="clickable" [routerLink]="['/sales']" [queryParams]="{ open: s.id }">
                  <td><div class="mono strong small">{{ s.invoice_number }}</div><div class="cell-sub">{{ s.created_at | date: 'dd/MM/yyyy' }}</div></td>
                  <td><span class="badge {{ statusMap[s.status].badge }}">{{ statusMap[s.status].label }}</span></td>
                  <td class="text-right num strong small">{{ s.total | money }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <ng-container footer>
        @if (detail(); as d) {
          @if (d.stats.balance_due > 0) {
            @if (reminder(d.client, d.stats); as wa) {
              <a class="btn btn-secondary" [href]="wa" target="_blank" rel="noopener" title="Relancer par WhatsApp"><i class="fa-brands fa-whatsapp"></i> Relancer</a>
            }
            <a class="btn btn-secondary" routerLink="/sales" [queryParams]="{ status: 'due', search: d.client.name }"><i class="fa-solid fa-hand-holding-dollar"></i> Encaisser</a>
          }
          <button type="button" class="btn btn-primary" (click)="openForm(d.client)"><i class="fa-solid fa-pen"></i> Modifier</button>
        }
      </ng-container>
    </app-drawer>
  `,
})
export class ClientsComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  auth = inject(AuthService);

  statusMap = SALE_STATUS;
  initials = initials;
  page = signal<Paginated<Client> | null>(null);
  loading = signal(false);
  saving = signal(false);
  withDebt = signal(false);
  formOpen = signal(false);
  editing = signal<Client | null>(null);
  detail = signal<{ client: Client; sales: Sale[]; stats: ClientStats } | null>(null);
  form: { name: string; type: ClientType; phone: string; email: string; address: string; city: string; credit_limit: number | null } = this.emptyForm();
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
    this.api.getClients({ page, search: this.search, with_debt: this.withDebt() ? 1 : null }).subscribe({
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

  setDebt(value: boolean): void {
    this.withDebt.set(value);
    this.load(1);
  }

  openDetail(client: Client): void {
    this.api.getClient(client.id).subscribe({ next: d => this.detail.set(d), error: err => this.notify.error(err) });
  }

  openForm(client?: Client): void {
    this.editing.set(client ?? null);
    this.form = client
      ? {
          name: client.name, type: client.type ?? 'particulier', phone: client.phone ?? '', email: client.email ?? '',
          address: client.address ?? '', city: client.city ?? '',
          credit_limit: client.credit_limit !== null && client.credit_limit !== undefined ? Number(client.credit_limit) : null,
        }
      : this.emptyForm();
    this.formOpen.set(true);
  }

  save(): void {
    const f = this.form;
    this.saving.set(true);
    const payload = {
      name: f.name.trim(), type: f.type, phone: f.phone || null, email: f.email || null, address: f.address || null, city: f.city || null,
      credit_limit: f.credit_limit === null || (f.credit_limit as unknown) === '' ? null : Number(f.credit_limit),
    };
    const editing = this.editing();
    this.api.saveClient(payload, editing?.id).subscribe({
      next: res => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notify.success(res.message);
        this.load(editing ? this.currentPage : 1);
        if (editing && this.detail()?.client.id === editing.id) {
          this.openDetail(res.client);
        }
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  creditRatio(stats: ClientStats): number {
    if (!stats.credit_limit) {
      return stats.balance_due > 0 ? 100 : 0;
    }
    return Math.min(100, (stats.balance_due / stats.credit_limit) * 100);
  }

  reminder(client: Client, stats: ClientStats): string | null {
    return whatsappUrl(client.phone,
      `Bonjour ${client.name},\n\nSauf erreur de notre part, il reste ${formatMoney(stats.balance_due)} à régler sur vos achats chez nous.\nVous pouvez payer au magasin, par Wave ou Orange Money.\n\nMerci et bonne journée !`);
  }

  private emptyForm() {
    return { name: '', type: 'particulier' as ClientType, phone: '', email: '', address: '', city: '', credit_limit: null as number | null };
  }

  async remove(client: Client): Promise<void> {
    const ok = await this.notify.confirm({ title: `Supprimer ${client.name} ?`, text: 'Un client ayant des ventes ne peut pas être supprimé.', confirmText: 'Supprimer', danger: true });
    if (!ok) {
      return;
    }
    this.api.deleteClient(client.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.load(this.currentPage);
      },
      error: err => this.notify.error(err),
    });
  }
}
