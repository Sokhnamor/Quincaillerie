import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { initials } from '../../shared/labels';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page" style="max-width:880px">
      <div class="card profile-head">
        <span class="avatar avatar-lg">{{ initials(auth.currentUser()?.name) }}</span>
        <div>
          <h1 class="page-title" style="font-size:20px">{{ auth.currentUser()?.name }}</h1>
          <div class="muted small">{{ auth.currentUser()?.email }} · <span class="badge badge-brand no-dot">{{ auth.roleLabel() }}</span></div>
        </div>
      </div>

      <form (ngSubmit)="save()" class="stack" style="gap:20px;margin-top:20px">
        <div class="card">
          <div class="card-header"><div class="card-title">Informations personnelles</div></div>
          <div class="card-body form-grid">
            <div class="field"><label class="label" for="pr-name">Nom complet</label><input id="pr-name" class="input" name="name" [(ngModel)]="form.name" required></div>
            <div class="field"><label class="label" for="pr-email">Email</label><input id="pr-email" class="input" type="email" name="email" [(ngModel)]="form.email" required></div>
            <div class="field"><label class="label" for="pr-phone">Téléphone</label><input id="pr-phone" class="input" name="phone" [(ngModel)]="form.phone"></div>
            <div class="field"><label class="label" for="pr-address">Adresse</label><input id="pr-address" class="input" name="address" [(ngModel)]="form.address"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div><div class="card-title">Mot de passe</div><div class="card-subtitle">Laissez vide pour conserver le mot de passe actuel</div></div></div>
          <div class="card-body form-grid">
            <div class="field span-2"><label class="label" for="pr-cur">Mot de passe actuel</label><input id="pr-cur" class="input" type="password" name="current_password" [(ngModel)]="form.current_password" autocomplete="current-password"></div>
            <div class="field"><label class="label" for="pr-new">Nouveau mot de passe</label><input id="pr-new" class="input" type="password" name="password" [(ngModel)]="form.password" minlength="8" autocomplete="new-password" placeholder="8 caractères minimum"></div>
            <div class="field">
              <label class="label" for="pr-conf">Confirmation</label>
              <input id="pr-conf" class="input" type="password" name="password_confirmation" [(ngModel)]="form.password_confirmation" autocomplete="new-password" [class.is-invalid]="mismatch()">
              @if (mismatch()) { <span class="error-text">Les mots de passe ne correspondent pas.</span> }
            </div>
          </div>
        </div>

        <div class="row" style="justify-content:flex-end">
          <button type="submit" class="btn btn-primary" [disabled]="saving() || mismatch()">@if (saving()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-check"></i> } Enregistrer</button>
        </div>
      </form>
    </div>
  `,
  styles: [`.profile-head { display: flex; align-items: center; gap: 16px; padding: 20px; }`]
})
export class ProfileComponent {
  auth = inject(AuthService);
  private notify = inject(NotifyService);

  initials = initials;
  saving = signal(false);
  form = this.initialForm();

  mismatch(): boolean {
    return !!this.form.password && !!this.form.password_confirmation && this.form.password !== this.form.password_confirmation;
  }

  save(): void {
    const f = this.form;
    const payload: Record<string, string | null> = { name: f.name.trim(), email: f.email.trim(), phone: f.phone || null, address: f.address || null };
    if (f.password) {
      Object.assign(payload, { current_password: f.current_password, password: f.password, password_confirmation: f.password_confirmation });
    }
    this.saving.set(true);
    this.auth.updateProfile(payload).subscribe({
      next: res => {
        this.saving.set(false);
        this.notify.success(res.message);
        this.form = this.initialForm();
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }

  private initialForm() {
    const u = this.auth.currentUser();
    return { name: u?.name ?? '', email: u?.email ?? '', phone: u?.phone ?? '', address: u?.address ?? '', current_password: '', password: '', password_confirmation: '' };
  }
}
