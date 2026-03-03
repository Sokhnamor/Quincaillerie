import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Supplier, PaginatedResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="suppliers-page fade-in">
      <div class="page-header">
        <div>
          <h1>Fournisseurs</h1>
          <p>Gérez vos fournisseurs</p>
        </div>
        <button class="btn btn-primary" (click)="openModal()">
          <i class="fas fa-plus"></i> Nouveau fournisseur
        </button>
      </div>

      <!-- Filters -->
      <div class="card filter-card">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" class="form-control" placeholder="Rechercher..."
            [(ngModel)]="searchQuery" (input)="onSearch()">
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Adresse</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let supplier of suppliers()">
                <td>{{ supplier.name }}</td>
                <td>{{ supplier.phone }}</td>
                <td>{{ supplier.email }}</td>
                <td>{{ supplier.address }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" (click)="editSupplier(supplier)">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon text-danger" (click)="confirmDelete(supplier)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="pagination">
            <button *ngFor="let page of getPageNumbers()" [class.active]="page === currentPage()" (click)="goToPage(page)">
              {{ page }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingSupplier() ? 'Modifier' : 'Nouveau' }} fournisseur</h3>
            <button class="btn-icon" (click)="closeModal()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-group">
                <label class="form-label">Nom</label>
                <input type="text" class="form-control" [(ngModel)]="supplierForm.name" name="name" required>
              </div>
              <div class="form-group">
                <label class="form-label">Téléphone</label>
                <input type="text" class="form-control" [(ngModel)]="supplierForm.phone" name="phone" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" [(ngModel)]="supplierForm.email" name="email" required>
              </div>
              <div class="form-group">
                <label class="form-label">Adresse</label>
                <textarea class="form-control" [(ngModel)]="supplierForm.address" name="address" rows="3"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button class="btn btn-primary" (click)="saveSupplier()">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }
    .page-header p { color: var(--text-secondary); font-size: 0.875rem; }
    .filter-card { margin-bottom: 1.5rem; padding: 1rem; }
    .action-buttons { display: flex; gap: 0.5rem; }
    .text-danger { color: #ef4444; }
  `]
})
export class SuppliersComponent implements OnInit {
  suppliers = signal<Supplier[]>([]);
  showModal = signal(false);
  editingSupplier = signal<Supplier | null>(null);
  searchQuery = '';
  currentPage = signal(1);
  totalPages = signal(1);

  supplierForm: any = { name: '', phone: '', email: '', address: '' };

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.loadSuppliers(); }

  loadSuppliers(): void {
    this.api.getSuppliers().subscribe({
      next: (data: Supplier[]) => {
        this.suppliers.set(data);
      }
    });
  }

  onSearch(): void { this.currentPage.set(1); this.loadSuppliers(); }
  goToPage(page: number): void { this.currentPage.set(page); this.loadSuppliers(); }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) pages.push(i);
    return pages;
  }

  openModal(): void {
    this.editingSupplier.set(null);
    this.supplierForm = { name: '', phone: '', email: '', address: '' };
    this.showModal.set(true);
  }

  editSupplier(supplier: Supplier): void {
    this.editingSupplier.set(supplier);
    this.supplierForm = { ...supplier };
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.editingSupplier.set(null); }

  saveSupplier(): void {
    if (this.editingSupplier()) {
      this.api.updateSupplier(this.editingSupplier()!.id, this.supplierForm).subscribe({ next: () => { this.loadSuppliers(); this.closeModal(); } });
    } else {
      this.api.createSupplier(this.supplierForm).subscribe({ next: () => { this.loadSuppliers(); this.closeModal(); } });
    }
  }

  confirmDelete(supplier: Supplier): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${supplier.name}"?`)) {
      this.api.deleteSupplier(supplier.id).subscribe({ next: () => this.loadSuppliers() });
    }
  }
}
