import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Category } from '../../core/services/api.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="categories-page fade-in">
      <div class="page-header">
        <div>
          <h1>Catégories</h1>
          <p>Gérez les catégories de produits</p>
        </div>
        <button class="btn btn-primary" (click)="openModal()">
          <i class="fas fa-plus"></i> Nouvelle catégorie
        </button>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Nombre de produits</th>
                <th>Date de création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let category of categories()">
                <td>{{ category.name }}</td>
                <td>{{ category.products_count || 0 }}</td>
                <td>{{ category.created_at | date:'dd/MM/yyyy' }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" (click)="editCategory(category)">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon text-danger" (click)="confirmDelete(category)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingCategory() ? 'Modifier' : 'Nouvelle' }} catégorie</h3>
            <button class="btn-icon" (click)="closeModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-group">
                <label class="form-label">Nom</label>
                <input type="text" class="form-control" [(ngModel)]="categoryForm.name" name="name" required>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button class="btn btn-primary" (click)="saveCategory()">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .page-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    
    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }
    
    .text-danger {
      color: #ef4444;
    }
  `]
})
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  showModal = signal(false);
  editingCategory = signal<Category | null>(null);
  
  categoryForm = {
    name: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.api.getCategories().subscribe(data => this.categories.set(data));
  }

  openModal(): void {
    this.editingCategory.set(null);
    this.categoryForm = { name: '' };
    this.showModal.set(true);
  }

  editCategory(category: Category): void {
    this.editingCategory.set(category);
    this.categoryForm = { name: category.name };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCategory.set(null);
  }

  saveCategory(): void {
    if (this.editingCategory()) {
      this.api.updateCategory(this.editingCategory()!.id, this.categoryForm).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
        }
      });
    } else {
      this.api.createCategory(this.categoryForm).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
        }
      });
    }
  }

  confirmDelete(category: Category): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${category.name}"?`)) {
      this.api.deleteCategory(category.id).subscribe({
        next: () => this.loadCategories()
      });
    }
  }
}
