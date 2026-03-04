import { Component, OnInit, signal, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, DashboardStats, SalesChart, RecentSale, LowStockAlert } from '../../core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard fade-in">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p class="text-secondary">Bienvenue sur votre tableau de bord</p>
        </div>
        <div class="header-actions">
          <span class="date-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {{ today | date:'dd MMMM yyyy' }}
          </span>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stats-card stagger-1">
          <div class="stats-icon sales">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
          </div>
          <div class="stats-content">
            <span class="stats-label">Ventes du jour</span>
            <span class="stats-value">{{ animatedSales() | number:'1.0-0' }} CFA</span>
            <div class="stats-change" [class.positive]="(stats()?.sales_growth || 0) > 0" [class.negative]="(stats()?.sales_growth || 0) < 0" *ngIf="stats()?.sales_growth">
              <svg *ngIf="(stats()?.sales_growth || 0) > 0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              {{ stats()?.sales_growth }}% vs hier
            </div>
          </div>
        </div>

        <div class="stats-card stagger-2">
          <div class="stats-icon purchases">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m7.5 4.27 9 5.15"></path>
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
            </svg>
          </div>
<div class="stats-content">
            <span class="stats-label">Ventes du mois</span>
            <span class="stats-value">{{ animatedPurchases() | number:'1.0-0' }} CFA</span>
            <div class="stats-change" [class.positive]="(stats()?.purchases_growth || 0) > 0" [class.negative]="(stats()?.purchases_growth || 0) < 0" *ngIf="stats()?.purchases_growth">
              <svg *ngIf="(stats()?.purchases_growth || 0) > 0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              {{ stats()?.purchases_growth }}% vs mois dernier
            </div>
          </div>
        </div>

        <div class="stats-card stagger-3">
          <div class="stats-icon stock">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m7.5 4.27 9 5.15"></path>
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
              <path d="m3.3 7 8.7 5 8.7-5"></path>
              <path d="M12 22V12"></path>
            </svg>
          </div>
          <div class="stats-content">
            <span class="stats-label">Valeur du stock</span>
            <span class="stats-value">{{ animatedStock() | number:'1.0-0' }} CFA</span>
          </div>
        </div>

        <div class="stats-card stagger-4">
          <div class="stats-icon alerts">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
          </div>
          <div class="stats-content">
            <span class="stats-label">Stock faible</span>
            <span class="stats-value">{{ stats()?.low_stock_count || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Charts & Alerts -->
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3>Ventes par catégorie</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas #salesChartCanvas></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Alertes stock</h3>
            <span class="badge badge-warning" *ngIf="alerts().length > 0">{{ alerts().length }}</span>
          </div>
          <div class="card-body">
            <div class="alerts-list" *ngIf="alerts().length > 0; else emptyAlerts">
              <div class="alert-item" *ngFor="let alert of alerts()">
                <div class="alert-info">
                  <div class="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m7.5 4.27 9 5.15"></path>
                    </svg>
                  </div>
                  <span>{{ alert.name }}</span>
                </div>
                <span class="badge badge-warning">{{ alert.stock }}</span>
              </div>
            </div>
            <ng-template #emptyAlerts>
              <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h4>Tout va bien!</h4>
                <p>Aucun produit en rupture</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Recent Sales -->
      <div class="card">
        <div class="card-header">
          <h3>Ventes récentes</h3>
          <a routerLink="/sales" class="view-all">Voir tout</a>
        </div>
        <div class="card-body no-padding">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Facture</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let sale of recentSales()">
                  <td class="fw-semibold">{{ sale.invoice_number }}</td>
                  <td>{{ sale.client_name }}</td>
                  <td class="fw-semibold">{{ sale.total | number:'1.2-2' }} CFA</td>
                  <td>
                    <span class="badge" 
                          [class.badge-paid]="sale.status === 'paid'" 
                          [class.badge-partial]="sale.status === 'partial'" 
                          [class.badge-unpaid]="sale.status === 'unpaid'">
                      {{ getStatusLabel(sale.status) }}
                    </span>
                  </td>
                  <td class="text-secondary">{{ sale.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                </tr>
                <tr *ngIf="recentSales().length === 0">
                  <td colspan="5" class="text-center py-4">
                    <p class="text-secondary">Aucune vente récente</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      animation: fadeIn 0.4s ease-out;
    }

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

    .text-secondary {
      color: var(--text-secondary);
    }

    .date-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    /* Stats Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .stats-card {
      background: var(--bg-secondary);
      border-radius: 24px;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .stats-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%);
      opacity: 0;
      transition: opacity 250ms ease;
    }

    .stats-card:hover {
      transform: translateY(-4px) scale(1.01);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .stats-card:hover::before {
      opacity: 1;
    }

    .stats-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .stats-icon.sales {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .stats-icon.purchases {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .stats-icon.stock {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .stats-icon.alerts {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .stats-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
      display: block;
      margin-bottom: 0.25rem;
    }

    .stats-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .stats-change {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }

    .stats-change.positive {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .stats-change.negative {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 1200px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-header h3 {
      font-size: 1rem;
      font-weight: 600;
    }

    .chart-container {
      height: 280px;
    }

    .view-all {
      font-size: 0.875rem;
      font-weight: 500;
      color: #3b82f6;
    }

    .view-all:hover {
      color: #2563eb;
    }

    .alert-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem;
      background: var(--bg-tertiary);
      border-radius: 12px;
      margin-bottom: 0.5rem;
      transition: background 150ms ease;
    }

    .alert-item:hover {
      background: var(--border-color);
    }

    .alert-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .alert-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border-radius: 8px;
    }

    /* Table */
    .no-padding .card-body {
      padding: 0;
    }

    .table-container {
      border-radius: 24px;
      overflow: hidden;
    }

    .fw-semibold {
      font-weight: 600;
    }

    .text-center {
      text-align: center;
    }

    .py-4 {
      padding-top: 1rem;
      padding-bottom: 1rem;
    }

    /* Animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .stagger-1 { animation-delay: 0.1s; }
    .stagger-2 { animation-delay: 0.2s; }
    .stagger-3 { animation-delay: 0.3s; }
    .stagger-4 { animation-delay: 0.4s; }

    .fade-in {
      animation: fadeIn 0.4s ease-out forwards;
      opacity: 0;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('salesChartCanvas') salesChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  today = new Date();
  stats = signal<DashboardStats | null>(null);
  salesChartData = signal<any>(null);
  recentSales = signal<RecentSale[]>([]);
  alerts = signal<LowStockAlert[]>([]);
  private chart: Chart | null = null;

  animatedSales = signal(0);
  animatedPurchases = signal(0);
  animatedStock = signal(0);

  private animationFrame: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }

  loadDashboard(): void {
    this.api.getDashboardStats().subscribe(data => {
      this.stats.set(data);
      this.animateValues(data);
    });
    
    this.api.getSalesChart().subscribe(data => {
      this.salesChartData.set(data);
      setTimeout(() => this.createChart(), 100);
    });
    
    this.api.getRecentSales().subscribe(data => this.recentSales.set(data));
    this.api.getLowStockAlerts().subscribe(data => this.alerts.set(data));
  }

  private animateValues(data: DashboardStats): void {
    const duration = 1000;
    let step = 0;
    const steps = 60;
const salesTarget = data.today_sales || 0;
    const purchasesTarget = data.month_sales || 0;
    const stockTarget = data.stock_value || 0;
    
    const animate = () => {
      step++;
      const progress = step / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      this.animatedSales.set(Math.round(salesTarget * easeOut));
      this.animatedPurchases.set(Math.round(purchasesTarget * easeOut));
      this.animatedStock.set(Math.round(stockTarget * easeOut));
      
      if (step < steps) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };
    animate();
  }

  createChart(): void {
    const chartData = this.salesChartData();
    if (!chartData || !this.salesChartCanvas?.nativeElement) return;
    
    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const labels = chartData.sales_by_category?.map((item: any) => item.category) || [];
    const data = chartData.sales_by_category?.map((item: any) => parseFloat(item.total)) || [];

    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventes',
          data: data,
          backgroundColor: colors.map(c => c + '99'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#F9FAFB',
            bodyColor: '#F9FAFB',
            padding: 12,
            cornerRadius: 8,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#E5E7EB' },
            ticks: { color: '#6B7280', font: { size: 12 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#6B7280', font: { size: 12 } }
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

