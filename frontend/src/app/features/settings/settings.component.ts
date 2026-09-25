import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NotifyService } from '../../core/services/notify.service';
import { Backup, Settings } from '../../core/models';
import { INVOICE_FORMATS, downloadBlob } from '../../shared/labels';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page" style="max-width:980px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Paramètres</h1>
          <p class="page-subtitle">Informations de l'entreprise affichées sur les factures, et fiscalité.</p>
        </div>
      </div>

      @if (!form()) {
        <div class="loading-block"><span class="spinner spinner-lg"></span></div>
      }
      @if (form(); as f) {
        <form (ngSubmit)="save()" class="stack" style="gap:20px">
          <div class="card">
            <div class="card-header"><div><div class="card-title">Entreprise</div><div class="card-subtitle">En-tête et pied de page des factures</div></div></div>
            <div class="card-body form-grid">
              <div class="field span-2"><label class="label" for="s-name">Nom commercial <span class="req">*</span></label><input id="s-name" class="input" name="company_name" [(ngModel)]="f.company_name" required></div>
              <div class="field span-2"><label class="label" for="s-address">Adresse</label><input id="s-address" class="input" name="company_address" [(ngModel)]="f.company_address"></div>
              <div class="field"><label class="label" for="s-phone">Téléphone</label><input id="s-phone" class="input" name="company_phone" [(ngModel)]="f.company_phone"></div>
              <div class="field"><label class="label" for="s-email">Email</label><input id="s-email" class="input" type="email" name="company_email" [(ngModel)]="f.company_email"></div>
              <div class="field"><label class="label" for="s-ninea">NINEA</label><input id="s-ninea" class="input mono" name="company_ninea" [(ngModel)]="f.company_ninea"></div>
              <div class="field"><label class="label" for="s-rccm">RCCM</label><input id="s-rccm" class="input mono" name="company_rccm" [(ngModel)]="f.company_rccm"></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div><div class="card-title">Facturation</div><div class="card-subtitle">S'applique aux nouvelles ventes uniquement</div></div></div>
            <div class="card-body form-grid">
              <div class="field">
                <label class="label" for="s-tax">Taux de TVA <span class="req">*</span></label>
                <div class="input-suffix"><input id="s-tax" class="input num" type="number" min="0" max="100" step="0.01" name="tax_rate" [(ngModel)]="f.tax_rate" required><span>%</span></div>
                <span class="hint">18 % au Sénégal. Mettez 0 si vous n'êtes pas assujetti.</span>
              </div>
              <div class="field">
                <label class="label" for="s-cur">Devise</label>
                <input id="s-cur" class="input" name="currency" [(ngModel)]="f.currency" required maxlength="10">
              </div>
              <div class="field span-2">
                <span class="label">Format des factures</span>
                <div class="choices">
                  @for (fmt of formats; track fmt.value) {
                    <button type="button" class="choice format-choice" [class.active]="f.invoice_format === fmt.value" (click)="f.invoice_format = fmt.value">
                      <i class="fa-solid {{ fmt.icon }}"></i>
                      <span class="stack" style="gap:0;align-items:flex-start"><span>{{ fmt.label }}</span><small>{{ fmt.hint }}</small></span>
                    </button>
                  }
                </div>
                <span class="hint">Utilisé pour l'impression et le téléchargement des factures. Les autres formats restent disponibles depuis chaque vente.</span>
              </div>
              <div class="field span-2">
                <label class="label" for="s-footer">Mention en bas de facture</label>
                <textarea id="s-footer" class="textarea" name="invoice_footer" rows="2" [(ngModel)]="f.invoice_footer"></textarea>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div><div class="card-title">Sauvegardes de la base de données</div><div class="card-subtitle">Automatique chaque soir à 21 h · les 30 dernières sont conservées</div></div>
              <button type="button" class="btn btn-secondary btn-sm" (click)="backupNow()" [disabled]="backingUp()">
                @if (backingUp()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-database"></i> } Sauvegarder maintenant
              </button>
            </div>
            @if (backups().length === 0) {
              <div class="empty empty-sm"><div class="empty-icon"><i class="fa-solid fa-database"></i></div><p class="muted small">Aucune sauvegarde pour l'instant.</p></div>
            } @else {
              <div class="table-wrap">
                <table class="table table-compact">
                  <tbody>
                    @for (b of backups().slice(0, 8); track b.name) {
                      <tr>
                        <td><div class="mono small">{{ b.name }}</div><div class="cell-sub">{{ b.created_at | date: 'EEEE d MMMM y à HH:mm' }}</div></td>
                        <td class="text-right muted small num">{{ b.size / 1024 | number: '1.0-0' }} Ko</td>
                        <td class="text-right"><button type="button" class="icon-btn" (click)="download(b)" title="Télécharger" aria-label="Télécharger"><i class="fa-solid fa-download"></i></button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            <div class="card-footer xs subtle">Pour restaurer : phpMyAdmin → base « quincaillerie » → Importer → choisir le fichier .sql.</div>
          </div>

          <div class="row" style="justify-content:flex-end">
            <button type="button" class="btn btn-secondary" (click)="load()">Annuler les modifications</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">@if (saving()) { <span class="spinner"></span> } @else { <i class="fa-solid fa-check"></i> } Enregistrer</button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .format-choice { align-items: flex-start; padding: 12px; }
    .format-choice i { margin-top: 2px; }
    .format-choice small { font-weight: 500; font-size: 11.5px; color: var(--text-3); }
  `]
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);

  formats = INVOICE_FORMATS;
  form = signal<Settings | null>(null);
  saving = signal(false);
  backups = signal<Backup[]>([]);
  backingUp = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getSettings().subscribe({ next: s => this.form.set({ ...s }), error: err => this.notify.error(err) });
    this.api.getBackups().subscribe({ next: b => this.backups.set(b) });
  }

  backupNow(): void {
    this.backingUp.set(true);
    this.api.createBackup().subscribe({
      next: res => {
        this.backingUp.set(false);
        this.notify.success(res.message);
        this.api.getBackups().subscribe({ next: b => this.backups.set(b) });
      },
      error: err => {
        this.backingUp.set(false);
        this.notify.error(err);
      },
    });
  }

  download(backup: Backup): void {
    this.api.downloadBackup(backup.name).subscribe({
      next: blob => downloadBlob(blob, backup.name),
      error: err => this.notify.error(err, 'Téléchargement impossible'),
    });
  }

  save(): void {
    const data = this.form();
    if (!data) {
      return;
    }
    this.saving.set(true);
    this.api.updateSettings(data).subscribe({
      next: res => {
        this.saving.set(false);
        this.form.set({ ...res.settings });
        this.notify.success(res.message);
      },
      error: err => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }
}
