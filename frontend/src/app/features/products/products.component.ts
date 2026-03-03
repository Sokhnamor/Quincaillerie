import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Product, Category, PaginatedResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="products-page fade-in">
      <div class="page-header">
        <div>
          <h1>Produits</h1>
          <p>Gérez votre inventaire</p>
        </div>
        <button class="btn btn-primary" (click)="openModal()">
          <i class="fas fa-plus"></i> Nouveau produit
        </button>
      </div>

      <!-- Filters -->
      <div class="card filter-card">
        <div class="filter-row">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Rechercher un produit..."
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
            >
          </div>
          
          <select class="form-control" [(ngModel)]="selectedCategory" (change)="onSearch()">
            <option value="">Toutes les catégories</option>
            <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.name }}</option>
          </select>
        </div>
      </div>

      <!-- Products Table -->
      <div class="card">
        <div class="card-body">
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
                <td>{{ product.name }}</td>
                <td>{{ product.category?.name }}</td>
                <td>{{ product.supplier?.name }}</td>
                <td>{{ product.purchase_price | number:'1.2-2' }} €</td>
                <td>{{ product.selling_price | number:'1.2-2' }} €</td>
                <td>{{ product.stock }}</td>
                <td>
                  <span class="badge" [class.badge-success]="product.stock > product.alert_threshold" [class.badge-warning]="product.stock <= product.alert_threshold && product.stock > 0" [class.badge-danger]="product.stock === 0">
                    {{ getStockStatus(product) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" (click)="editProduct(product)">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon text-danger" (click)="confirmDelete(product)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Pagination -->
          <div class="pagination">
            <button 
              *ngFor="let page of getPageNumbers()" 
              [class.active]="page === currentPage()"
              (click)="goToPage(page)"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingProduct() ? 'Modifier' : 'Nouveau' }} produit</h3>
            <button class="btn-icon" (click)="closeModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveProduct()">
              <div class="form-group">
                <label class="form-label">Nom</label>
                <input type="text" class="form-control" [(ngModel)]="productForm.name" name="name" required>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Prix d'achat</label>
                  <input type="number" step="0.01" class="form-control" [(ngModel)]="productForm.purchase_price" name="purchase_price" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Prix de vente</label>
                  <input type="number" step="0.01" class="form-control" [(ngModel)]="productForm.selling_price" name="selling_price" required>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Stock</label>
                  <input type="number" class="form-control" [(ngModel)]="productForm.stock" name="stock" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Seuil d'alerte</label>
                  <input type="number" class="form-control" [(ngModel)]="productForm.alert_threshold" name="alert_threshold" required>
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
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button class="btn btn-primary" (click)="saveProduct()">Enregistrer</button>
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
    
    .filter-card {
      margin-bottom: 1.5rem;
      padding: 1rem;
    }
    
    .filter-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .filter-row .search-box {
      flex: 1;
      min-width: 200px;
    }
    
    .filter-row select {
      min-width: 200px;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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
  
  productForm: any = {
    name: '',
    purchase_price: 0,
    selling_price: 0,
    stock: 0,
    alert_threshold: 10,
    category_id: '',
    supplier_id: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.loadSuppliers();
  }

  loadProducts(): void {
    const categoryId = this.selectedCategory ? parseInt(this.selectedCategory) : undefined;
    this.api.getProducts(this.currentPage(), this.searchQuery, categoryId).subscribe({
      next: (response) => {
        this.products.set(response.data);
        this.totalPages.set(response.last_page);
      }
    });
  }

  loadCategories(): void {
    this.api.getCategories().subscribe(data => this.categories.set(data));
  }

  loadSuppliers(): void {
    this.api.getSuppliers().subscribe(data => this.suppliers.set(data));
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadProducts();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadProducts();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  }

  getStockStatus(product: Product): string {
    if (product.stock === 0) return 'Rupture';
    if (product.stock <= product.alert_threshold) return 'Faible';
    return 'En stock';
  }

  openModal(): void {
    this.editingProduct.set(null);
    this.productForm = {
      name: '',
      purchase_price: 0,
      selling_price: 0,
      stock: 0,
      alert_threshold: 10,
      category_id: '',
      supplier_id: ''
    };
    this.showModal.set(true);
  }

  editProduct(product: Product): void {
    this.editingProduct.set(product);
    this.productForm = { ...product };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  saveProduct(): void {
    const data = {
      ...this.productForm,
      category_id: parseInt(this.productForm.category_id),
      supplier_id: parseInt(this.productForm.supplier_id)
    };

    if (this.editingProduct()) {
      this.api.updateProduct(this.editingProduct()!.id, data).subscribe({
        next: () => {
          this.loadProducts();
          this.closeModal();
        }
      });
    } else {
      this.api.createProduct(data).subscribe({
        next: () => {
          this.loadProducts();
          this.closeModal();
        }
      });
    }
  }

  confirmDelete(product: Product): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}"?`)) {
      this.api.deleteProduct(product.id).subscribe({
        next: () => this.loadProducts()
      });
    }
  }
}
