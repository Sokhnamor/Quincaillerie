import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService, ROLE_LABELS } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { Role, RoleName, User } from '../../core/models';
import { initials } from '../../shared/labels';
import { ModalComponent } from '../../shared/components/modal.component';

const ROLE_INFO: Record<RoleName, { icon: string; badge: string; text: string }> = {
  admin: { icon: 'fa-user-shield', badge: 'badge-brand', text: 'Accès complet, utilisateurs et paramètres' },
  gestionnaire: { icon: 'fa-user-tie', badge: 'badge-info', text: 'Catalogue, stock, approvisionnements, exports' },
  caissier: { icon: 'fa-cash-register', badge: 'badge-success', text: 'Point de vente, ventes, paiements, clients' },
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, ModalComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Utilisateurs</h1>
          <p class="page-subtitle">Comptes de l'équipe et droits d'accès.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-user-plus"></i> Nouvel utilisateur</button>
        </div>
      </div>

      <div class="roles-grid">
        @for (r of roles(); track r.id) {
          <div class="card role-card">
            <span class="tile-icon"><i class="fa-solid {{ roleInfo[r.name].icon }}"></i></span>
            <div class="grow">
              <div class="strong">{{ roleLabels[r.name] }} <span class="subtle small">· {{ countByRole(r.id) }}</span></div>
              <div class="xs muted">{{ roleInfo[r.name].text }}</div>
            </div>
          </div>
        }
      </div>

      <div class="card">
        @if (loading()) {
          <div class="loading-block"><span class="spinner spinner-lg"></span></div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Utilisateur</th><th>Rôle</th><th class="hide-sm">Téléphone</th><th class="text-right hide-sm">Ventes</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td>
                      <div class="row">
                        <span class="avatar avatar-sm">{{ initials(u.name) }}</span>
                        <div><div class="cell-main">{{ u.name }} @if (u.id === auth.currentUser()?.id) { <span class="badge no-dot badge-brand" style="margin-left:4px">Vous</span> }</div><div class="cell-sub">{{ u.email }}</div></div>
                      </div>
                    </td>
                    <td>
                      @if (u.role) {
                        <span class="badge no-dot {{ roleInfo[u.role.name].badge }}"><i class="fa-solid {{ roleInfo[u.role.name].icon }}"></i> {{ roleLabels[u.role.name] }}</span>
                      } @else {
                        <span class="badge badge-warning">Aucun rôle</span>
                      }
                    </td>
                    <td class="hide-sm muted">{{ u.phone || '—' }}</td>
                    <td class="text-right num hide-sm">{{ u.sales_count ?? 0 }}</td>
                    <td>
                      <label class="switch" [attr.title]="u.id === auth.currentUser()?.id ? 'Vous ne pouvez pas vous désactiver' : ''">
                        <input type="checkbox" [checked]="u.is_active !== false" (change)="toggleActive(u)" [disabled]="u.id === auth.currentUser()?.id">
                        <span class="track"></span>
                        <span class="small" [class.muted]="u.is_active === false">{{ u.is_active === false ? 'Désactivé' : 'Actif' }}</span>
                      </label>
                    </td>
                    <td class="text-right">
                      <div class="actions">
                        <button type="button" class="icon-btn" (click)="openForm(u)" aria-label="Modifier" title="Modifier"><i class="fa-solid fa-pen"></i></button>
                        @if (u.id !== auth.currentUser()?.id) {
                          <button type="button" class="icon-btn danger" (click)="remove(u)" aria-label="Supprimer" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <app-modal [open]="formOpen()" [title]="editing() ? 'Modifier l\\'utilisateur' : 'Nouvel utilisateur'" (closed)="formOpen.set(false)">
      <form id="userForm" class="form-grid" (ngSubmit)="save()">
        <div class="field span-2"><label class="label" for="u-name">Nom complet <span class="req">*</span></label><input id="u-name" class="input" name="name" [(ngModel)]="form.name" required></div>
        <div class="field"><label class="label" for="u-email">Email <span class="req">*</span></label><input id="u-email" class="input" type="email" name="email" [(ngModel)]="form.email" required autocomplete="off"></div>
        <div class="field"><label class="label" for="u-phone">Téléphone</label><input id="u-phone" class="input" name="phone" [(ngModel)]="form.phone"></div>
        <div class="field span-2">
          <span class="label">Rôle <span class="req">*</span></span>
          <div class="choices" style="grid-template-columns:repeat(3,1fr)">
            @for (r of roles(); track r.id) {
              <button type="button" class="choice" [class.active]="form.role_id === r.id" (click)="form.role_id = r.id" [disabled]="editing()?.id === auth.currentUser()?.id">
                <i class="fa-solid {{ roleInfo[r.name].icon }}"></i> {{ roleLabels[r.name] }}
              </button>
            }
          </div>
        </div>
        <div class="field span-2">
          <label class="label" for="u-pass">{{ editing() ? 'Nouveau mot de passe' : 'Mot de passe' }} @if (!editing()) { <span class="req">*</span> }</label>
          <input id="u-pass" class="input" type="password" name="password" [(ngModel)]="form.password" [required]="!editing()" minlength="8" autocomplete="new-password" [placeholder]="editing() ? 'Laisser vide pour ne pas changer' : '8 caractères minimum'">
        </div>
      </form>
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
        <button type="submit" form="userForm" class="btn btn-primary" [disabled]="saving()">@if (saving()) { <span class="spinner"></span> } Enregistrer</button>
      </ng-container>
    </app-modal>
  `,
  styles: [`
    .roles-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
    .role-card { display: flex; gap: 12px; align-items: center; padding: 14px 16px; }
    @media (max-width: 900px) { .roles-grid { grid-template-columns: minmax(0, 1fr); } }
  `]
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  auth = inject(AuthService);

  roleLabels = ROLE_LABELS;
  roleInfo = ROLE_INFO;
  initials = initials;
  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  saving = signal(false);
  formOpen = signal(false);
  editing = signal<User | null>(null);
  form: { name: string; email: string; phone: string; role_id: number | null; password: string } = { name: '', email: '', phone: '', role_id: null, password: '' };

  ngOnInit(): void {
    this.api.getRoles().subscribe({ next: r => this.roles.set(r) });
    this.load();
  }

  load(): void {
    this.api.getUsers().subscribe({
      next: u => {
        this.users.set(u);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }

  countByRole(roleId: number): number {
    return this.users().filter(u => u.role_id === roleId).length;
  }

  openForm(user?: User): void {
    this.editing.set(user ?? null);
    const defaultRole = this.roles().find(r => r.name === 'caissier')?.id ?? null;
    this.form = { name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', role_id: user?.role_id ?? defaultRole, password: '' };
    this.formOpen.set(true);
  }

  save(): void {
    const f = this.form;
    const editing = this.editing();
    if (!f.name.trim() || !f.email.trim() || !f.role_id || (!editing && f.password.length < 8)) {
      this.notify.error('Nom, email, rôle et mot de passe (8 caractères min.) sont obligatoires');
      return;
    }
    const payload: Record<string, unknown> = { name: f.name.trim(), email: f.email.trim(), phone: f.phone || null, role_id: f.role_id };
    if (f.password) {
      payload['password'] = f.password;
    }
    this.saving.set(true);
    this.api.saveUser(payload as Partial<User>, editing?.id).subscribe({
      next: res => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notify.success(res.message);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  toggleActive(user: User): void {
    const active = user.is_active === false;
    this.api.saveUser({ is_active: active }, user.id).subscribe({
      next: () => {
        this.notify.success(active ? `${user.name} est réactivé` : `${user.name} est désactivé et déconnecté`);
        this.load();
      },
      error: err => {
        this.notify.error(err);
        this.load();
      },
    });
  }

  async remove(user: User): Promise<void> {
    const ok = await this.notify.confirm({ title: `Supprimer ${user.name} ?`, text: 'Un utilisateur ayant enregistré des ventes doit être désactivé plutôt que supprimé.', confirmText: 'Supprimer', danger: true });
    if (!ok) {
      return;
    }
    this.api.deleteUser(user.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.load();
      },
      error: err => this.notify.error(err),
    });
  }
}
