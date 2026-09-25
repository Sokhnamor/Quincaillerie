import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { Category } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [FormsModule, RouterLink, ModalComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Catégories</h1>
          <p class="page-subtitle">{{ categories().length }} catégories · {{ totalProducts() }} produits classés.</p>
        </div>
        <div class="page-actions">
          <div class="input-icon" style="min-width:240px">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="input" type="search" placeholder="Filtrer…" [ngModel]="filter()" (ngModelChange)="filter.set($event)">
          </div>
          @if (auth.canManage()) {
            <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Nouvelle catégorie</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading-block"><span class="spinner spinner-lg"></span></div>
      } @else if (filtered().length === 0) {
        <div class="card">
          <div class="empty">
            <div class="empty-icon"><i class="fa-solid fa-tags"></i></div>
            <div class="empty-title">{{ filter() ? 'Aucune catégorie ne correspond' : 'Aucune catégorie' }}</div>
            @if (auth.canManage() && !filter()) { <button type="button" class="btn btn-primary" (click)="openForm()"><i class="fa-solid fa-plus"></i> Créer une catégorie</button> }
          </div>
        </div>
      } @else {
        <div class="cat-grid">
          @for (c of filtered(); track c.id) {
            <div class="card cat-card">
              <div class="row-between">
                <span class="cat-icon" [style.--hue]="hue(c.name)"><i class="fa-solid fa-tag"></i></span>
                @if (auth.canManage()) {
                  <div class="actions">
                    <button type="button" class="icon-btn" (click)="openForm(c)" aria-label="Modifier"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icon-btn danger" (click)="remove(c)" aria-label="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
                  </div>
                }
              </div>
              <div class="cat-name">{{ c.name }}</div>
              <p class="cat-desc">{{ c.description || 'Aucune description' }}</p>
              <a class="cat-link" [routerLink]="['/products']" [queryParams]="{ category: c.id }">
                <span><strong>{{ c.products_count ?? 0 }}</strong> produit{{ (c.products_count ?? 0) > 1 ? 's' : '' }}</span>
                <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          }
        </div>
      }
    </div>

    <app-modal [open]="formOpen()" [title]="editing() ? 'Modifier la catégorie' : 'Nouvelle catégorie'" size="sm" (closed)="formOpen.set(false)">
      <form id="catForm" class="stack" style="gap:16px" (ngSubmit)="save()">
        <div class="field">
          <label class="label" for="c-name">Nom <span class="req">*</span></label>
          <input id="c-name" class="input" name="name" [(ngModel)]="form.name" required placeholder="Ex. : Plomberie">
        </div>
        <div class="field">
          <label class="label" for="c-desc">Description</label>
          <textarea id="c-desc" class="textarea" name="description" [(ngModel)]="form.description" rows="3" placeholder="Ce que contient cette catégorie"></textarea>
        </div>
      </form>
      <ng-container footer>
        <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
        <button type="submit" form="catForm" class="btn btn-primary" [disabled]="saving() || !form.name.trim()">
          @if (saving()) { <span class="spinner"></span> } Enregistrer
        </button>
      </ng-container>
    </app-modal>
  `,
  styles: [`
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
    .cat-card { padding: 18px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s, box-shadow 0.15s; }
    .cat-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
    .cat-icon { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; background: hsl(var(--hue) 70% 50% / 0.12); color: hsl(var(--hue) 60% 42%); }
    :host-context(html.dark) .cat-icon { color: hsl(var(--hue) 70% 68%); }
    .cat-name { font-weight: 700; font-size: 16px; margin-top: 6px; }
    .cat-desc { color: var(--text-2); font-size: 13px; min-height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .cat-link { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 12px; border-top: 1px solid var(--border); color: var(--text-2); font-size: 13px; text-decoration: none !important; }
    .cat-link:hover { color: var(--brand-text); }
  `]
})
export class CategoriesComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  auth = inject(AuthService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  filter = signal('');
  formOpen = signal(false);
  editing = signal<Category | null>(null);
  form = { name: '', description: '' };

  filtered = computed(() => {
    const q = this.filter().trim().toLowerCase();
    return q ? this.categories().filter(c => c.name.toLowerCase().includes(q)) : this.categories();
  });
  totalProducts = computed(() => this.categories().reduce((n, c) => n + (c.products_count ?? 0), 0));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getCategories().subscribe({
      next: c => {
        this.categories.set(c);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }

  /** Stable hue per category name, for a subtle visual identity */
  hue(name: string): number {
    let h = 0;
    for (const ch of name) {
      h = (h * 31 + ch.charCodeAt(0)) % 360;
    }
    return h;
  }

  openForm(category?: Category): void {
    this.editing.set(category ?? null);
    this.form = { name: category?.name ?? '', description: category?.description ?? '' };
    this.formOpen.set(true);
  }

  save(): void {
    if (!this.form.name.trim()) {
      return;
    }
    this.saving.set(true);
    this.api.saveCategory({ name: this.form.name.trim(), description: this.form.description || null }, this.editing()?.id).subscribe({
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

  async remove(category: Category): Promise<void> {
    if ((category.products_count ?? 0) > 0) {
      this.notify.error(`« ${category.name} » contient ${category.products_count} produit(s). Déplacez-les avant de supprimer la catégorie.`);
      return;
    }
    const ok = await this.notify.confirm({ title: `Supprimer « ${category.name} » ?`, confirmText: 'Supprimer', danger: true });
    if (!ok) {
      return;
    }
    this.api.deleteCategory(category.id).subscribe({
      next: res => {
        this.notify.success(res.message);
        this.load();
      },
      error: err => this.notify.error(err),
    });
  }
}
