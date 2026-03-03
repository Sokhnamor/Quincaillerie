import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Client, PaginatedResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="clients-page fade-in">
      <div class="page-header">
        <div>
          <h1>Clients</h1>
          <p>Gérez vos clients</p>
        </div>
        <button class="btn btn-primary" (click)="openModal()">
          <i class="fas fa-plus"></i> Nouveau client
        </button>
      </div>

      <!-- Filters -->
      <div class="card filter-card">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" class="form-control" placeholder="Rechercher..." [(ngModel)]="searchQuery" (input)="onSearch()">
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Ville</th>
                <th>Adresse</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let client of clients()">
                <td>{{ client.name }}</td>
                <td>{{ client.phone }}</td>
                <td>{{ client.city }}</td>
                <td>{{ client.address }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" (click)="editClient(client)"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon text-danger" (click)="confirmDelete(client)"><i class="fas fa-trash"></i></button>
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

      <!-- Modal -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingClient() ? 'Modifier' : 'Nouveau' }} client</h3>
            <button class="btn-icon" (click)="closeModal()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-group">
                <label class="form-label">Nom</label>
                <input type="text" class="form-control" [(ngModel)]="clientForm.name" name="name" required>
              </div>
              <div class="form-group">
                <label class="form-label">Téléphone</label>
                <input type="text" class="form-control" [(ngModel)]="clientForm.phone" name="phone" required>
              </div>
              <div class="form-group">
                <label class="form-label">Ville</label>
                <input type="text" class="form-control" [(ngModel)]="clientForm.city" name="city" required>
              </div>
              <div class="form-group">
                <label class="form-label">Adresse</label>
                <textarea class="form-control" [(ngModel)]="clientForm.address" name="address" rows="3"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button class="btn btn-primary" (click)="saveClient()">Enregistrer</button>
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
export class ClientsComponent implements OnInit {
  clients = signal<Client[]>([]);
  showModal = signal(false);
  editingClient = signal<Client | null>(null);
  searchQuery = '';
  currentPage = signal(1);
  totalPages = signal(1);
  clientForm: any = { name: '', phone: '', city: '', address: '' };

  constructor(private api: ApiService) {}
  ngOnInit(): void { this.loadClients(); }

  loadClients(): void {
    this.api.getClients().subscribe({
      next: (data: Client[]) => { this.clients.set(data); }
    });
  }

  onSearch(): void { this.currentPage.set(1); this.loadClients(); }
  goToPage(page: number): void { this.currentPage.set(page); this.loadClients(); }
  getPageNumbers(): number[] { const pages: number[] = []; for (let i = 1; i <= this.totalPages(); i++) pages.push(i); return pages; }

  openModal(): void { this.editingClient.set(null); this.clientForm = { name: '', phone: '', city: '', address: '' }; this.showModal.set(true); }
  editClient(client: Client): void { this.editingClient.set(client); this.clientForm = { ...client }; this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); this.editingClient.set(null); }

  saveClient(): void {
    if (this.editingClient()) {
      this.api.updateClient(this.editingClient()!.id, this.clientForm).subscribe({ next: () => { this.loadClients(); this.closeModal(); } });
    } else {
      this.api.createClient(this.clientForm).subscribe({ next: () => { this.loadClients(); this.closeModal(); } });
    }
  }

  confirmDelete(client: Client): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${client.name}"?`)) {
      this.api.deleteClient(client.id).subscribe({ next: () => this.loadClients() });
    }
  }
}
