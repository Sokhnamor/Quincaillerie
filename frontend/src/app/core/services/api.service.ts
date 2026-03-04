import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface DashboardStats {
  today_sales: number;
  month_sales: number;
  month_purchases: number;
  stock_value: number;
  low_stock_count: number;
  out_of_stock_count?: number;
  sales_growth: number;
  purchases_growth: number;
}

export interface SalesChart {
  labels: string[];
  data: number[];
}

export interface RecentSale {
  id: number;
  invoice_number: string;
  client_name: string;
  total: number;
  status: string;
  created_at: string;
  client?: {
    name: string;
  };
}

export interface LowStockAlert {
  id: number;
  name: string;
  stock: number;
  alert_threshold: number;
}

export interface Product {
  id: number;
  name: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  alert_threshold: number;
  category_id: number;
  supplier_id: number;
  category?: Category;
  supplier?: Supplier;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  products_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  client_id: number;
  user_id: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: 'paid' | 'unpaid' | 'partial';
  payment_status: string;
  created_at: string;
  client?: Client;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  getSalesChart(): Observable<SalesChart> {
    return this.http.get<SalesChart>(`${this.apiUrl}/dashboard/charts`);
  }

  getRecentSales(): Observable<RecentSale[]> {
    return this.http.get<{sales: RecentSale[]}>(`${this.apiUrl}/dashboard/recent-sales`).pipe(
      map(response => response.sales.map(sale => ({
        ...sale,
        client_name: sale.client_name || sale.client?.name || 'Client inconnu'
      })))
    );
  }

  getLowStockAlerts(): Observable<LowStockAlert[]> {
    return this.http.get<{low_stock: LowStockAlert[], out_of_stock: LowStockAlert[]}>(`${this.apiUrl}/dashboard/alerts`).pipe(
      map(response => [...response.low_stock, ...response.out_of_stock])
    );
  }

  // Products
  getProducts(page = 1, search = '', categoryId?: number): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('search', search);
    
    if (categoryId) {
      params = params.set('category_id', categoryId.toString());
    }
    
    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}/products`, { params });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, data);
  }

  updateProduct(id: number, data: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${id}`, data);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`);
  }

  // Categories - returns array directly (using /categories/all endpoint)
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories/all`);
  }

  getCategory(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/categories/${id}`);
  }

  createCategory(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, data);
  }

  updateCategory(id: number, data: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/categories/${id}`, data);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`);
  }

  // Suppliers - returns array directly (using /suppliers/all endpoint)
  getSuppliers(page = 1, search = ''): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.apiUrl}/suppliers/all`);
  }

  getSupplier(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.apiUrl}/suppliers/${id}`);
  }

  createSupplier(data: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.apiUrl}/suppliers`, data);
  }

  updateSupplier(id: number, data: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.apiUrl}/suppliers/${id}`, data);
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/suppliers/${id}`);
  }

  // Clients - returns array directly (using /clients/all endpoint)
  getClients(page = 1, search = ''): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}/clients/all`);
  }

  getClient(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/clients/${id}`);
  }

  createClient(data: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(`${this.apiUrl}/clients`, data);
  }

  updateClient(id: number, data: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/clients/${id}`, data);
  }

  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clients/${id}`);
  }

  // Sales
  getSales(page = 1, search = '', status?: string, startDate?: string, endDate?: string): Observable<PaginatedResponse<Sale>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('search', search);
    
    if (status) params = params.set('status', status);
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get<PaginatedResponse<Sale>>(`${this.apiUrl}/sales`, { params });
  }

  getSale(id: number): Observable<Sale> {
    return this.http.get<{sale: Sale}>(`${this.apiUrl}/sales/${id}`).pipe(
      map(response => response.sale)
    );
  }

  createSale(data: any): Observable<Sale> {
    return this.http.post<{sale: Sale}>(`${this.apiUrl}/sales`, data).pipe(
      map(response => response.sale)
    );
  }

  updateSale(id: number, data: any): Observable<Sale> {
    return this.http.put<{sale: Sale}>(`${this.apiUrl}/sales/${id}`, data).pipe(
      map(response => response.sale)
    );
  }

  updateSaleStatus(id: number, status: string): Observable<Sale> {
    return this.http.put<{sale: Sale}>(`${this.apiUrl}/sales/${id}`, { status }).pipe(
      map(response => response.sale)
    );
  }

  deleteSale(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sales/${id}`);
  }

  exportSalesPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/sales/export/pdf`, { responseType: 'blob' });
  }

  exportSalesExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/sales/export/excel`, { responseType: 'blob' });
  }
}
