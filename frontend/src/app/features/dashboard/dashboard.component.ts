import { Component, OnInit, signal, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, DashboardStats, SalesChart, RecentSale, LowStockAlert } from '../../core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard fade-in">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Bienvenue sur votre tableau de bord</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-icon" style="background: #dbeafe; color: #1e40af;">
            <i class="fas fa-shopping-cart"></i>
          </div>
          <div class="stats-content">
            <div class="stats-value">{{ stats()?.today_sales | number:'1.0-0' }} CFA</div>
            <div class="stats-label">Ventes du jour</div>
            <div class="stats-change" [class.positive]="(stats()?.sales_growth || 0) > 0" [class.negative]="(stats()?.sales_growth || 0) < 0">
              <i class="fas" [class.fa-arrow-up]="(stats()?.sales_growth || 0) > 0" [class.fa-arrow-down]="(stats()?.sales_growth || 0) < 0"></i>
              {{ stats()?.sales_growth || 0 }}%
            </div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon" style="background: #d1fae5; color: #065f46;">
            <i class="fas fa-truck"></i>
          </div>
          <div class="stats-content">
            <div class="stats-value">{{ stats()?.monthly_purchases | number:'1.0-0' }} CFA</div>
            <div class="stats-label">Achats du mois</div>
            <div class="stats-change" [class.positive]="(stats()?.purchases_growth || 0) > 0" [class.negative]="(stats()?.purchases_growth || 0) < 0">
              <i class="fas" [class.fa-arrow-up]="(stats()?.purchases_growth || 0) > 0" [class.fa-arrow-down]="(stats()?.purchases_growth || 0) < 0"></i>
              {{ stats()?.purchases_growth || 0 }}%
            </div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon" style="background: #fef3c7; color: #92400e;">
            <i class="fas fa-warehouse"></i>
          </div>
          <div class="stats-content">
            <div class="stats-value">{{ stats()?.stock_value | number:'1.0-0' }} CFA</div>
            <div class="stats-label">Valeur du stock</div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon" style="background: #fee2e2; color: #991b1b;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="stats-content">
            <div class="stats-value">{{ stats()?.low_stock_count }}</div>
            <div class="stats-label">Articles en stock faible</div>
          </div>
        </div>
      </div>

      <!-- Charts & Alerts -->
      <div class="dashboard-grid">
        <!-- Sales Chart -->
        <div class="card chart-card">
          <div class="card-header">
            <h3>Ventes par catégorie</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas #salesChartCanvas></canvas>
            </div>
          </div>
        </div>

        <!-- Low Stock Alerts -->
        <div class="card alerts-card">
          <div class="card-header">
            <h3>Alertes stock faible</h3>
          </div>
          <div class="card-body">
            <div class="alerts-list">
              <div class="alert-item" *ngFor="let alert of alerts()">
                <div class="alert-info">
                  <i class="fas fa-box text-warning"></i>
                  <span>{{ alert.name }}</span>
                </div>
                <div class="alert-stock">
                  <span class="badge badge-warning">{{ alert.stock }} unités</span>
                </div>
              </div>
              <div class="empty-state" *ngIf="alerts().length === 0">
                <i class="fas fa-check-circle text-success"></i>
                <p>Aucun produit en rupture</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Sales -->
      <div class="card">
        <div class="card-header">
          <h3>Ventes récentes</h3>
        </div>
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Client</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sale of recentSales()">
                <td>{{ sale.invoice_number }}</td>
                <td>{{ sale.client_name }}</td>
                <td>{{ sale.total | number:'1.2-2' }} CFA</td>
                <td>
                  <span class="badge" [class.badge-success]="sale.status === 'paid'" [class.badge-warning]="sale.status === 'partial'" [class.badge-danger]="sale.status === 'unpaid'">
                    {{ getStatusLabel(sale.status) }}
                  </span>
                </td>
                <td>{{ sale.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
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
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .stats-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .stats-content {
      flex: 1;
    }
    
    .stats-change {
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .stats-change.positive {
      color: #10b981;
    }
    
    .stats-change.negative {
      color: #ef4444;
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .chart-container {
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .alert-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: var(--light-color);
      border-radius: 8px;
    }
    
    .alert-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }
    
    .empty-state i {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    
    .text-warning {
      color: #f59e0b;
    }
    
    .text-success {
      color: #10b981;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChartCanvas') salesChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  stats = signal<DashboardStats | null>(null);
  salesChartData = signal<any>(null);
  recentSales = signal<RecentSale[]>([]);
  alerts = signal<LowStockAlert[]>([]);
  private chart: Chart | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    // Chart will be created after data is loaded
  }

  loadDashboard(): void {
    this.api.getDashboardStats().subscribe(data => this.stats.set(data));
    this.api.getSalesChart().subscribe(data => {
      this.salesChartData.set(data);
      setTimeout(() => this.createChart(), 100);
    });
    this.api.getRecentSales().subscribe(data => this.recentSales.set(data));
    this.api.getLowStockAlerts().subscribe(data => this.alerts.set(data));
  }

  createChart(): void {
    const chartData = this.salesChartData();
    if (!chartData || !this.salesChartCanvas?.nativeElement) return;
    
    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = chartData.sales_by_category?.map((item: any) => item.category) || [];
    const data = chartData.sales_by_category?.map((item: any) => parseFloat(item.total)) || [];

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventes par catégorie',
          data: data,
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#ec4899'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'paid': 'Payé',
      'unpaid': 'Impayé',
      'partial': 'Partiel'
    };
    return labels[status] || status;
  }
}
