import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService, Product, Category, PaginatedResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="products-page fade-in">
      <div class="page-header">
        <div>
          <h1>Produits</h1>
          <p class="text-secondary">Gérez votre inventaire</p>
        </div>
        <button class="btn btn-primary" (click)="openModal()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
          Nouveau produit
        </button>
      </div>

      <div class="filter-card">
        <div class="filter-row">
          <div class="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input type="text" class="form-control" placeholder="Rechercher un produit..." [(ngModel)]="searchQuery" (input)="onSearch()">
          </div>
          <select class="form-control" [(ngModel)]="selectedCategory" (change)="onSearch()">
            <option value="">Toutes les catégories</option>
            <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.name }}</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Fournisseur</th>
                <th>Prix achat</th>
                <th>Prix vente</th>
                <th>Stock</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let product of products()">
                <td class="fw-semibold">{{ product.name }}</td>
                <td>{{ product.category?.name }}</td>
                <td>{{ product.supplier?.name }}</td>
                <td>{{ product.purchase_price | number:'1.2-2' }} CFA</td>
                <td class="fw-semibold">{{ product.selling_price | number:'1.2-2' }} CFA</td>
                <td>
                  <span class="stock-value" [class.low]="product.stock <= product.alert_threshold" [class.out]="product.stock === 0">{{ product.stock }}</span>
                </td>
                <td>
                  <span class="badge" [class.badge-success]="product.stock > product.alert_threshold" [class.badge-warning]="product.stock <= product.alert_threshold && product.stock > 0" [class.badge-danger]="product.stock === 0">
                    {{ getStockStatus(product) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" (click)="editProduct(product)" title="Modifier">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                    </button>
                    <button class="btn-icon text-danger" (click)="confirmDelete(product)" title="Supprimer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="products().length === 0">
                <td colspan="8" class="text-center py-4">
                  <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path></svg>
                    <h4>Aucun produit</h4>
                    <p>Commencez par ajouter un produit</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination" *ngIf="totalPages() > 1">
          <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"></path></svg></button>
          <button *ngFor="let page of getPageNumbers()" [class.active]="page === currentPage()" (click)="goToPage(page)">{{ page }}</button>
          <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"></path></svg></button>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingProduct() ? 'Modifier' : 'Nouveau' }} produit</h3>
            <button class="btn-icon" (click)="closeModal()"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nom du produit</label>
              <input type="text" class="form-control" [(ngModel)]="productForm.name" name="name" required placeholder="Nom du produit">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Prix d'achat</label>
                <input type="number" step="0.01" class="form-control" [(ngModel)]="productForm.purchase_price" name="purchase_price" required placeholder="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Prix de vente</label>
                <input type="number" step="0.01" class="form-control" [(ngModel)]="productForm.selling_price" name="selling_price" required placeholder="0.00">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stock</label>
                <input type="number" class="form-control" [(ngModel)]="productForm.stock" name="stock" required placeholder="0">
              </div>
              <div class="form-group">
                <label class="form-label">Seuil d'alerte</label>
                <input type="number" class="form-control" [(ngModel)]="productForm.alert_threshold" name="alert_threshold" required placeholder="10">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select class="form-control" [(ngModel)]="productForm.category_id" name="category_id" required>
                <option value="">Sélectionner une catégorie</option>
                <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fournisseur</label>
              <select class="form-control" [(ngModel)]="productForm.supplier_id" name="supplier_id" required>
                <option value="">Sélectionner un fournisseur</option>
                <option *ngFor="let sup of suppliers()" [value]="sup.id">{{ sup.name }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button class="btn btn-primary" (click)="saveProduct()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .products-page { animation: fadeIn 0.4s ease-out; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }
    .text-secondary { color: var(--text-secondary); }
    .filter-card { margin-bottom: 1.5rem; padding: 1.25rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 20px; }
    .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .filter-row .search-box { flex: 1; min-width: 200px; }
    .filter-row select { min-width: 200px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .action-buttons { display: flex; gap: 0.375rem; }
    .text-danger { color: #ef4444; }
    .text-danger:hover { background: rgba(239, 68, 68, 0.1); }
    .stock-value { font-weight: 600; }
    .stock-value.low { color: #f59e0b; }
    .stock-value.out { color: #ef4444; }
    .fw-semibold { font-weight: 600; }
    .text-center { text-align: center; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.4s ease-out; }
  `]
})
export class ProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  suppliers = signal<any[]>([]);
  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  searchQuery = '';
  selectedCategory = '';
  currentPage = signal(1);
  totalPages = signal(1);
  productForm: any = { name: '', purchase_price: 0, selling_price: 0, stock: 0, alert_threshold: 10, category_id: '', supplier_id: '' };

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.loadProducts(); this.loadCategories(); this.loadSuppliers(); }

  loadProducts(): void {
    const categoryId = this.selectedCategory ? parseInt(this.selectedCategory) : undefined;
    this.api.getProducts(this.currentPage(), this.searchQuery, categoryId).subscribe({
      next: (response) => { this.products.set(response.data); this.totalPages.set(response.last_page); }
    });
  }

  loadCategories(): void { this.api.getCategories().subscribe(data => this.categories.set(data)); }
  loadSuppliers(): void { this.api.getSuppliers().subscribe(data => this.suppliers.set(data)); }
  onSearch(): void { this.currentPage.set(1); this.loadProducts(); }
  goToPage(page: number): void { this.currentPage.set(page); this.loadProducts(); }
  getPageNumbers(): number[] { const pages: number[] = []; for (let i = 1; i <= this.totalPages(); i++) pages.push(i); return pages; }

  getStockStatus(product: Product): string {
    if (product.stock === 0) return 'Rupture';
    if (product.stock <= product.alert_threshold) return 'Faible';
    return 'En stock';
  }

  openModal(): void {
    this.editingProduct.set(null);
    this.productForm = { name: '', purchase_price: 0, selling_price: 0, stock: 0, alert_threshold: 10, category_id: '', supplier_id: '' };
    this.showModal.set(true);
  }

  editProduct(product: Product): void { this.editingProduct.set(product); this.productForm = { ...product }; this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); this.editingProduct.set(null); }

  saveProduct(): void {
    const data = { ...this.productForm, category_id: parseInt(this.productForm.category_id), supplier_id: parseInt(this.productForm.supplier_id) };
    if (this.editingProduct()) {
      this.api.updateProduct(this.editingProduct()!.id, data).subscribe({ next: () => { this.loadProducts(); this.closeModal(); } });
    } else {
      this.api.createProduct(data).subscribe({ next: () => { this.loadProducts(); this.closeModal(); } });
    }
  }

  confirmDelete(product: Product): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer "' + product.name + '"?')) {
      this.api.deleteProduct(product.id).subscribe({ next: () => this.loadProducts() });
    }
  }
}
