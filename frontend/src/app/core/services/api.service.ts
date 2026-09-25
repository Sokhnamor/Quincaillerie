import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Backup, CashClosing, CashSummary, Category, Client, ClientStats, DashboardData, InvoiceFormat, Paginated, Product, Purchase,
  Quote, Report, Role, Sale, SaleReturn, SalesSummary, Settings, StockMovement, Supplier, User,
} from '../models';

type Query = Record<string, string | number | boolean | null | undefined>;

/** Builds HttpParams, skipping empty values */
function toParams(query: Query = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;

  // Dashboard
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.url}/dashboard`);
  }

  getAlerts(): Observable<DashboardData['alerts']> {
    return this.http.get<DashboardData['alerts']>(`${this.url}/dashboard/alerts`);
  }

  // Settings
  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(`${this.url}/settings`);
  }

  updateSettings(data: Settings): Observable<{ settings: Settings; message: string }> {
    return this.http.put<{ settings: Settings; message: string }>(`${this.url}/settings`, data);
  }

  // Products
  getProducts(query: Query = {}): Observable<Paginated<Product>> {
    return this.http.get<Paginated<Product>>(`${this.url}/products`, { params: toParams(query) });
  }

  getProductsForSale(query: Query = {}): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/products/for-sale`, { params: toParams(query) });
  }

  getProduct(id: number): Observable<{ product: Product; stats: { quantity_sold: number; revenue: number }; movements: StockMovement[] }> {
    return this.http.get<{ product: Product; stats: { quantity_sold: number; revenue: number }; movements: StockMovement[] }>(`${this.url}/products/${id}`);
  }

  saveProduct(data: Partial<Product>, id?: number): Observable<{ product: Product; message: string }> {
    return id
      ? this.http.put<{ product: Product; message: string }>(`${this.url}/products/${id}`, data)
      : this.http.post<{ product: Product; message: string }>(`${this.url}/products`, data);
  }

  adjustStock(id: number, data: { mode: 'add' | 'remove' | 'set'; quantity: number; note: string }): Observable<{ product: Product; message: string }> {
    return this.http.post<{ product: Product; message: string }>(`${this.url}/products/${id}/adjust-stock`, data);
  }

  deleteProduct(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/products/${id}`);
  }

  // Stock journal
  getStockMovements(query: Query = {}): Observable<Paginated<StockMovement>> {
    return this.http.get<Paginated<StockMovement>>(`${this.url}/stock-movements`, { params: toParams(query) });
  }

  // Categories
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.url}/categories/all`);
  }

  saveCategory(data: Partial<Category>, id?: number): Observable<{ category: Category; message: string }> {
    return id
      ? this.http.put<{ category: Category; message: string }>(`${this.url}/categories/${id}`, data)
      : this.http.post<{ category: Category; message: string }>(`${this.url}/categories`, data);
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/categories/${id}`);
  }

  // Suppliers
  getSuppliers(query: Query = {}): Observable<Paginated<Supplier>> {
    return this.http.get<Paginated<Supplier>>(`${this.url}/suppliers`, { params: toParams(query) });
  }

  getAllSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.url}/suppliers/all`);
  }

  getSupplierDetail(id: number): Observable<{ supplier: Supplier; products: Product[]; purchases: Purchase[] }> {
    return this.http.get<{ supplier: Supplier; products: Product[]; purchases: Purchase[] }>(`${this.url}/suppliers/${id}`);
  }

  saveSupplier(data: Partial<Supplier>, id?: number): Observable<{ supplier: Supplier; message: string }> {
    return id
      ? this.http.put<{ supplier: Supplier; message: string }>(`${this.url}/suppliers/${id}`, data)
      : this.http.post<{ supplier: Supplier; message: string }>(`${this.url}/suppliers`, data);
  }

  deleteSupplier(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/suppliers/${id}`);
  }

  // Clients
  getClients(query: Query = {}): Observable<Paginated<Client>> {
    return this.http.get<Paginated<Client>>(`${this.url}/clients`, { params: toParams(query) });
  }

  getAllClients(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.url}/clients/all`);
  }

  getClient(id: number): Observable<{ client: Client; sales: Sale[]; stats: ClientStats }> {
    return this.http.get<{ client: Client; sales: Sale[]; stats: ClientStats }>(`${this.url}/clients/${id}`);
  }

  saveClient(data: Partial<Client>, id?: number): Observable<{ client: Client; message: string }> {
    return id
      ? this.http.put<{ client: Client; message: string }>(`${this.url}/clients/${id}`, data)
      : this.http.post<{ client: Client; message: string }>(`${this.url}/clients`, data);
  }

  deleteClient(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/clients/${id}`);
  }

  // Sales
  getSales(query: Query = {}): Observable<Paginated<Sale>> {
    return this.http.get<Paginated<Sale>>(`${this.url}/sales`, { params: toParams(query) });
  }

  getSalesSummary(query: Query = {}): Observable<SalesSummary> {
    return this.http.get<SalesSummary>(`${this.url}/sales/summary`, { params: toParams(query) });
  }

  getSale(id: number): Observable<Sale> {
    return this.http.get<{ sale: Sale }>(`${this.url}/sales/${id}`).pipe(map(r => r.sale));
  }

  createSale(data: unknown): Observable<Sale> {
    return this.http.post<{ sale: Sale }>(`${this.url}/sales`, data).pipe(map(r => r.sale));
  }

  updateSale(id: number, data: { client_id?: number | null; notes?: string | null }): Observable<Sale> {
    return this.http.put<{ sale: Sale }>(`${this.url}/sales/${id}`, data).pipe(map(r => r.sale));
  }

  addPayment(id: number, data: { amount: number; method: string; note?: string }): Observable<Sale> {
    return this.http.post<{ sale: Sale }>(`${this.url}/sales/${id}/payments`, data).pipe(map(r => r.sale));
  }

  deletePayment(saleId: number, paymentId: number): Observable<{ sale: Sale; message: string }> {
    return this.http.delete<{ sale: Sale; message: string }>(`${this.url}/sales/${saleId}/payments/${paymentId}`);
  }

  createReturn(saleId: number, data: { items: { sale_item_id: number; quantity: number }[]; reason?: string; refund_method?: string }): Observable<{ sale: Sale; return: SaleReturn; message: string }> {
    return this.http.post<{ sale: Sale; return: SaleReturn; message: string }>(`${this.url}/sales/${saleId}/returns`, data);
  }

  downloadReturnPdf(saleId: number, returnId: number): Observable<Blob> {
    return this.http.get(`${this.url}/sales/${saleId}/returns/${returnId}/pdf`, { responseType: 'blob' });
  }

  deleteSale(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/sales/${id}`);
  }

  /** Invoice PDF; without a format the one chosen in the settings is used */
  downloadInvoicePdf(id: number, format?: InvoiceFormat): Observable<Blob> {
    return this.http.get(`${this.url}/sales/${id}/pdf`, { params: toParams({ format }), responseType: 'blob' });
  }

  exportSales(format: 'pdf' | 'excel', query: Query = {}): Observable<Blob> {
    return this.http.get(`${this.url}/sales/export/${format}`, { params: toParams(query), responseType: 'blob' });
  }

  // Purchases
  getPurchases(query: Query = {}): Observable<Paginated<Purchase>> {
    return this.http.get<Paginated<Purchase>>(`${this.url}/purchases`, { params: toParams(query) });
  }

  getPurchase(id: number): Observable<Purchase> {
    return this.http.get<{ purchase: Purchase }>(`${this.url}/purchases/${id}`).pipe(map(r => r.purchase));
  }

  createPurchase(data: unknown): Observable<{ purchase: Purchase; message: string }> {
    return this.http.post<{ purchase: Purchase; message: string }>(`${this.url}/purchases`, data);
  }

  deletePurchase(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/purchases/${id}`);
  }

  // Quotes
  getQuotes(query: Query = {}): Observable<Paginated<Quote>> {
    return this.http.get<Paginated<Quote>>(`${this.url}/quotes`, { params: toParams(query) });
  }

  getQuote(id: number): Observable<Quote> {
    return this.http.get<{ quote: Quote }>(`${this.url}/quotes/${id}`).pipe(map(r => r.quote));
  }

  saveQuote(data: unknown, id?: number): Observable<{ quote: Quote; message: string }> {
    return id
      ? this.http.put<{ quote: Quote; message: string }>(`${this.url}/quotes/${id}`, data)
      : this.http.post<{ quote: Quote; message: string }>(`${this.url}/quotes`, data);
  }

  setQuoteStatus(id: number, status: string): Observable<{ quote: Quote; message: string }> {
    return this.http.put<{ quote: Quote; message: string }>(`${this.url}/quotes/${id}`, { status });
  }

  convertQuote(id: number, data: { paid_amount?: number; payment_method?: string }): Observable<{ quote: Quote; sale: Pick<Sale, 'id' | 'invoice_number' | 'total' | 'status'>; message: string }> {
    return this.http.post<{ quote: Quote; sale: Pick<Sale, 'id' | 'invoice_number' | 'total' | 'status'>; message: string }>(`${this.url}/quotes/${id}/convert`, data);
  }

  deleteQuote(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/quotes/${id}`);
  }

  downloadQuotePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.url}/quotes/${id}/pdf`, { responseType: 'blob' });
  }

  // Cash register closing
  getCashSummary(date?: string): Observable<CashSummary> {
    return this.http.get<CashSummary>(`${this.url}/cash-closings/summary`, { params: toParams({ date }) });
  }

  getCashClosings(query: Query = {}): Observable<Paginated<CashClosing>> {
    return this.http.get<Paginated<CashClosing>>(`${this.url}/cash-closings`, { params: toParams(query) });
  }

  closeCash(data: { date?: string; counted_cash: number; notes?: string }): Observable<{ closing: CashClosing; message: string }> {
    return this.http.post<{ closing: CashClosing; message: string }>(`${this.url}/cash-closings`, data);
  }

  // Reports
  getReport(query: Query = {}): Observable<Report> {
    return this.http.get<Report>(`${this.url}/reports/summary`, { params: toParams(query) });
  }

  exportReport(query: Query = {}): Observable<Blob> {
    return this.http.get(`${this.url}/reports/export`, { params: toParams(query), responseType: 'blob' });
  }

  // Backups
  getBackups(): Observable<Backup[]> {
    return this.http.get<Backup[]>(`${this.url}/backups`);
  }

  createBackup(): Observable<{ name: string; message: string }> {
    return this.http.post<{ name: string; message: string }>(`${this.url}/backups`, {});
  }

  downloadBackup(name: string): Observable<Blob> {
    return this.http.get(`${this.url}/backups/${encodeURIComponent(name)}`, { responseType: 'blob' });
  }

  // Users
  getUsers(query: Query = {}): Observable<User[]> {
    return this.http.get<User[]>(`${this.url}/users`, { params: toParams(query) });
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.url}/roles`);
  }

  saveUser(data: Partial<User> & { password?: string }, id?: number): Observable<{ user: User; message: string }> {
    return id
      ? this.http.put<{ user: User; message: string }>(`${this.url}/users/${id}`, data)
      : this.http.post<{ user: User; message: string }>(`${this.url}/users`, data);
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/users/${id}`);
  }
}
