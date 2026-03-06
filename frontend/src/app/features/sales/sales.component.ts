import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Sale, Product, Client, PaginatedResponse, SaleItem } from '../../core/services/api.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sales-page fade-in">
      <div class="page-header">
        <div>
          <h1>Ventes</h1>
          <p>Gérez les ventes et factures</p>
        </div>
        <button class="btn btn-primary" (click)="openModal()">
          <i class="fas fa-plus"></i> Nouvelle vente
        </button>
      </div>

      <!-- Filters -->
      <div class="card filter-card">
        <div class="filter-row">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" class="form-control" placeholder="Rechercher (N° facture, client)..." [(ngModel)]="searchQuery" (input)="onSearch()">
          </div>
          <select class="form-control" [(ngModel)]="statusFilter" (change)="onSearch()">
            <option value="">Tous les statuts</option>
            <option value="paid">Payé</option>
            <option value="unpaid">Impayé</option>
            <option value="partial">Partiel</option>
          </select>
          <input type="date" class="form-control" [(ngModel)]="startDate" (change)="onSearch()">
          <input type="date" class="form-control" [(ngModel)]="endDate" (change)="onSearch()">
        </div>
        <div class="export-buttons">
          <button class="btn btn-secondary" (click)="exportPdf()"><i class="fas fa-file-pdf"></i> PDF</button>
          <button class="btn btn-secondary" (click)="exportExcel()"><i class="fas fa-file-excel"></i> Excel</button>
        </div>
      </div>

      <!-- Sales Table -->
      <div class="card">
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Client</th>
                <th>Total</th>
                <th>TVA</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sale of sales()">
                <td>{{ sale.invoice_number }}</td>
                <td>{{ sale.client?.name || 'Client inconnu' }}</td>
                <td>{{ sale.total | number:'1.2-2' }} CFA</td>
                <td>{{ sale.tax_amount | number:'1.2-2' }} CFA</td>
                <td>
                  <span class="badge" [class.badge-success]="sale.status === 'paid'" [class.badge-warning]="sale.status === 'partial'" [class.badge-danger]="sale.status === 'unpaid'">
                    {{ getStatusLabel(sale.status) }}
                  </span>
                </td>
                <td>{{ sale.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" (click)="viewSale(sale)"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon text-danger" (click)="confirmDelete(sale)"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="pagination">
            <button *ngFor="let page of getPageNumbers()" [class.active]="page === currentPage()" (click)="goToPage(page)">{{ page }}</button>
          </div>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-content modal-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingSale() ? 'Modifier' : 'Nouvelle' }} vente</h3>
            <button class="btn-icon" (click)="closeModal()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div class="sale-form">
              <div class="form-section">
                <h4>Informations</h4>
                <div class="form-group">
                  <label class="form-label">Client</label>
                  <select class="form-control" [(ngModel)]="saleForm.client_id">
                    <option value="">Sélectionner un client</option>
                    <option *ngFor="let client of clients()" [value]="client.id">{{ client.name }}</option>
                  </select>
                </div>
              </div>
              
              <div class="form-section">
                <h4>Produits</h4>
                <div class="product-selector">
                  <select class="form-control" [(ngModel)]="selectedProductId">
                    <option value="">Sélectionner un produit</option>
                    <option *ngFor="let product of products()" [value]="product.id">{{ product.name }} ({{ product.selling_price }}CFA)</option>
                  </select>
                  <input type="number" class="form-control" [(ngModel)]="selectedQuantity" placeholder="Quantité" min="1">
                  <button class="btn btn-primary" (click)="addProduct()"><i class="fas fa-plus"></i></button>
                </div>
                
                <table class="table" *ngIf="saleForm.items.length > 0">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Prix</th>
                      <th>Quantité</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of saleForm.items; let i = index">
                      <td>{{ item.product_name }}</td>
                      <td>{{ item.unit_price | number:'1.2-2' }} CFA</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ item.subtotal | number:'1.2-2' }} CFA</td>
                      <td><button class="btn-icon text-danger" (click)="removeProduct(i)"><i class="fas fa-times"></i></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="totals-section">
                <div class="total-row"><span>Sous-total:</span><span>{{ calculateSubtotal() | number:'1.2-2' }} CFA</span></div>
                <div class="total-row"><span>TVA (18%):</span><span>{{ calculateTax() | number:'1.2-2' }} CFA</span></div>
                <div class="total-row total-final"><span>Total:</span><span>{{ calculateTotal() | number:'1.2-2' }} CFA</span></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button class="btn btn-primary" (click)="saveSale()">Enregistrer</button>
          </div>
        </div>
      </div>

      <!-- View Sale Drawer -->
      <div class="drawer-overlay" *ngIf="showDrawer()" (click)="closeDrawer()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h3>Détails de la vente</h3>
            <button class="btn btn-primary" (click)="downloadInvoice()"><i class="fas fa-file-pdf"></i> PDF</button>
          </div>
          <div class="drawer-body" *ngIf="selectedSale()">
            <div class="sale-details">
              <div class="detail-row"><span>N° Facture:</span><span>{{ selectedSale()?.invoice_number }}</span></div>
              <div class="detail-row"><span>Client:</span><span>{{ selectedSale()?.client?.name || 'Client inconnu' }}</span></div>
              <div class="detail-row"><span>Date:</span><span>{{ selectedSale()?.created_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
              <div class="detail-row">
                <span>Statut:</span>
                <div class="status-edit">
                  <select class="form-control status-select" [(ngModel)]="selectedSale()!.status" (change)="updateStatus()">
                    <option value="paid">Payé</option>
                    <option value="unpaid">Impayé</option>
                    <option value="partial">Partiel</option>
                  </select>
                </div>
              </div>
            </div>
            
            <h4>Articles</h4>
            <table class="table">
              <thead><tr><th>Produit</th><th>Prix</th><th>Qté</th><th>Total</th></tr></thead>
              <tbody>
                <tr *ngFor="let item of selectedSale()?.items">
                  <td>{{ item.product_name }}</td>
                  <td>{{ item.unit_price | number:'1.2-2' }} CFA</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ item.subtotal | number:'1.2-2' }} CFA</td>
                </tr>
              </tbody>
            </table>
            
            <div class="totals-section">
              <div class="total-row"><span>Sous-total:</span><span>{{ selectedSale()?.subtotal | number:'1.2-2' }} CFA</span></div>
              <div class="total-row"><span>TVA:</span><span>{{ selectedSale()?.tax_amount | number:'1.2-2' }} CFA</span></div>
              <div class="total-row total-final"><span>Total:</span><span>{{ selectedSale()?.total | number:'1.2-2' }} CFA</span></div>
            </div>
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
    .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .filter-row .search-box { flex: 1; min-width: 200px; }
    .export-buttons { display: flex; gap: 0.5rem; }
    .action-buttons { display: flex; gap: 0.5rem; }
    .text-danger { color: #ef4444; }
    .modal-large { max-width: 700px; max-height: 90vh; overflow-y: auto; }
    .sale-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .form-section h4 { margin-bottom: 1rem; color: var(--text-primary); }
    .product-selector { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .product-selector select { flex: 2; }
    .product-selector input { flex: 1; }
    .totals-section { background: var(--light-color); padding: 1rem; border-radius: 8px; }
    .total-row { display: flex; justify-content: space-between; padding: 0.5rem 0; }
    .total-final { font-weight: 700; font-size: 1.125rem; border-top: 1px solid var(--border-color); margin-top: 0.5rem; padding-top: 0.5rem; }
    .drawer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; justify-content: flex-end; }
    .drawer { background: white; width: 100%; max-width: 500px; height: 100%; overflow-y: auto; animation: slideIn 0.3s ease-out; }
    .drawer-header { padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
    .drawer-body { padding: 1.5rem; }
    .sale-details { margin-bottom: 1.5rem; }
    .detail-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); align-items: center; }
    .status-edit { display: flex; gap: 0.5rem; }
    .status-select { padding: 0.375rem 0.75rem; font-size: 0.875rem; min-width: 120px; }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `]
})
export class SalesComponent implements OnInit {
  sales = signal<Sale[]>([]);
  products = signal<Product[]>([]);
  clients = signal<Client[]>([]);
  showModal = signal(false);
  showDrawer = signal(false);
  editingSale = signal<Sale | null>(null);
  selectedSale = signal<Sale | null>(null);
  searchQuery = '';
  statusFilter = '';
  startDate = '';
  endDate = '';
  currentPage = signal(1);
  totalPages = signal(1);
  selectedProductId = '';
  selectedQuantity = 1;

  saleForm: any = { client_id: '', items: [] };

  constructor(private api: ApiService) {}
  ngOnInit(): void { this.loadSales(); this.loadProducts(); this.loadClients(); }

  loadSales(): void {
    this.api.getSales(this.currentPage(), this.searchQuery, this.statusFilter, this.startDate, this.endDate).subscribe({
      next: (response: PaginatedResponse<Sale>) => { this.sales.set(response.data); this.totalPages.set(response.last_page); }
    });
  }

  loadProducts(): void { this.api.getProducts().subscribe({ next: (r) => this.products.set(r.data) }); }
  loadClients(): void { this.api.getClients().subscribe({ next: (data) => this.clients.set(data) }); }

  onSearch(): void { this.currentPage.set(1); this.loadSales(); }
  goToPage(page: number): void { this.currentPage.set(page); this.loadSales(); }
  getPageNumbers(): number[] { const pages: number[] = []; for (let i = 1; i <= this.totalPages(); i++) pages.push(i); return pages; }

  getStatusLabel(status: string): string { const labels: any = { paid: 'Payé', unpaid: 'Impayé', partial: 'Partiel' }; return labels[status] || status; }

  openModal(): void {
    this.editingSale.set(null);
    this.saleForm = { client_id: '', items: [] };
    this.showModal.set(true);
  }

  addProduct(): void {
    if (!this.selectedProductId) return;
    const product = this.products().find(p => p.id === parseInt(this.selectedProductId));
    if (!product) return;
    const item = { product_id: product.id, product_name: product.name, unit_price: product.selling_price, quantity: this.selectedQuantity, subtotal: product.selling_price * this.selectedQuantity };
    this.saleForm.items.push(item);
    this.selectedProductId = '';
    this.selectedQuantity = 1;
  }

  removeProduct(index: number): void { this.saleForm.items.splice(index, 1); }
  calculateSubtotal(): number { return this.saleForm.items.reduce((sum: number, item: any) => sum + item.subtotal, 0); }
  calculateTax(): number { return this.calculateSubtotal() * 0.19; }
  calculateTotal(): number { return this.calculateSubtotal() + this.calculateTax(); }

  closeModal(): void { this.showModal.set(false); this.editingSale.set(null); }

  saveSale(): void {
    if (!this.saleForm.client_id) {
      alert('Veuillez sélectionner un client');
      return;
    }
    if (this.saleForm.items.length === 0) {
      alert('Veuillez ajouter au moins un produit');
      return;
    }

    const data = {
      client_id: parseInt(this.saleForm.client_id),
      items: this.saleForm.items.map((item: any) => ({
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price)
      }))
    };
    
    if (this.editingSale()) {
      this.api.updateSale(this.editingSale()!.id, data).subscribe({ 
        next: () => { this.loadSales(); this.closeModal(); },
        error: (err) => { alert(err.error?.message || 'Erreur lors de la mise à jour'); }
      });
    } else {
      this.api.createSale(data).subscribe({ 
        next: () => { this.loadSales(); this.closeModal(); },
        error: (err) => { alert(err.error?.message || 'Erreur lors de la création'); }
      });
    }
  }

  viewSale(sale: Sale): void { 
    this.api.getSale(sale.id).subscribe({
      next: (saleDetails) => {
        this.selectedSale.set(saleDetails);
        this.showDrawer.set(true);
      }
    });
  }
  
  updateStatus(): void {
    const sale = this.selectedSale();
    if (!sale) return;
    
    this.api.updateSaleStatus(sale.id, sale.status).subscribe({
      next: () => { this.loadSales(); },
      error: () => { alert('Erreur lors de la mise à jour du statut'); }
    });
  }

  closeDrawer(): void { this.showDrawer.set(false); this.selectedSale.set(null); }

  confirmDelete(sale: Sale): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la vente "${sale.invoice_number}"?`)) {
      this.api.deleteSale(sale.id).subscribe({ next: () => this.loadSales() });
    }
  }

  exportPdf(): void { this.api.exportSalesPdf().subscribe({ next: (blob) => { const url = window.URL.createObjectURL(blob); window.open(url); } }); }
  exportExcel(): void { this.api.exportSalesExcel().subscribe({ next: (blob) => { const url = window.URL.createObjectURL(blob); window.open(url); } }); }

  downloadInvoice(): void {
    const sale = this.selectedSale();
    if (!sale) return;
    
    this.api.downloadInvoicePdf(sale.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `facture-${sale.invoice_number}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        alert('Erreur lors du téléchargement du PDF');
        console.error(err);
      }
    });
  }
}
