export type RoleName = 'admin' | 'gestionnaire' | 'caissier';
export type SaleStatus = 'paid' | 'partial' | 'unpaid';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type PaymentMethod = 'cash' | 'wave' | 'orange_money' | 'card' | 'transfer' | 'cheque';
export type InvoiceFormat = 'ticket' | 'a5' | 'a4';
export type MovementType = 'initial' | 'sale' | 'sale_cancel' | 'return' | 'purchase' | 'purchase_cancel' | 'adjustment';
export type ClientType = 'particulier' | 'professionnel';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';

export interface Role {
  id: number;
  name: RoleName;
  description?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  role_id: number | null;
  is_active?: boolean;
  role?: Role | null;
  sales_count?: number;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  products_count?: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  products_count?: number;
  purchases_sum_total?: number | string | null;
}

export interface Client {
  id: number;
  name: string;
  type?: ClientType;
  credit_limit?: number | string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  sales_count?: number;
  sales_sum_total?: number | string | null;
  balance_due?: number;
}

export interface ClientStats {
  sales_count: number;
  total_spent: number;
  balance_due: number;
  credit_limit: number | null;
}

export interface Product {
  id: number;
  name: string;
  reference: string | null;
  unit: string;
  description?: string | null;
  purchase_price: number | string;
  selling_price: number | string;
  wholesale_price?: number | string | null;
  wholesale_min_qty?: number | null;
  stock: number;
  alert_threshold: number;
  stock_status: StockStatus;
  category_id: number;
  supplier_id: number | null;
  category?: Pick<Category, 'id' | 'name'> | null;
  supplier?: Pick<Supplier, 'id' | 'name'> | null;
}

export interface SaleItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  returned_quantity?: number;
  unit_price: number | string;
  subtotal: number | string;
  product?: Pick<Product, 'id' | 'name' | 'reference' | 'unit'> | null;
}

export interface SalePayment {
  id: number;
  amount: number | string;
  method: PaymentMethod;
  note?: string | null;
  created_at: string;
  user?: Pick<User, 'id' | 'name'> | null;
}

export interface Sale {
  id: number;
  invoice_number: string;
  client_id: number | null;
  user_id: number;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  discount: number | string;
  total: number | string;
  returned_amount?: number | string;
  net_total?: number;
  paid_amount: number | string;
  remaining_amount: number;
  status: SaleStatus;
  notes?: string | null;
  created_at: string;
  items_count?: number;
  client?: Client | null;
  user?: Pick<User, 'id' | 'name'> | null;
  items?: SaleItem[];
  payments?: SalePayment[];
  returns?: SaleReturn[];
}

export interface SaleReturn {
  id: number;
  number: string;
  sale_id: number;
  reason?: string | null;
  subtotal: number | string;
  tax_amount: number | string;
  discount_share: number | string;
  total: number | string;
  refund_amount: number | string;
  refund_method?: PaymentMethod | null;
  created_at: string;
  user?: Pick<User, 'id' | 'name'> | null;
  items?: { id: number; quantity: number; unit_price: number | string; subtotal: number | string; product?: Pick<Product, 'id' | 'name'> | null }[];
}

export interface QuoteItem {
  id?: number;
  product_id: number | null;
  designation: string;
  quantity: number;
  unit_price: number | string;
  subtotal?: number | string;
  product?: (Pick<Product, 'id' | 'name' | 'reference' | 'unit'> & { stock?: number }) | null;
}

export interface Quote {
  id: number;
  number: string;
  client_id: number | null;
  client_name?: string | null;
  customer_name: string;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  discount: number | string;
  total: number | string;
  status: QuoteStatus;
  is_expired: boolean;
  valid_until: string | null;
  notes?: string | null;
  created_at: string;
  items_count?: number;
  client?: Client | null;
  user?: Pick<User, 'id' | 'name'> | null;
  items?: QuoteItem[];
  sale?: Pick<Sale, 'id' | 'invoice_number'> | null;
}

export interface CashSummary {
  date: string;
  sales_count: number;
  sales_total: number;
  returns_total: number;
  refunded: number;
  by_method: Partial<Record<PaymentMethod, { total: number; count: number }>>;
  collected_total: number;
  expected_cash: number;
  closings: CashClosing[];
}

export interface CashClosing {
  id: number;
  business_date: string;
  sales_count: number;
  sales_total: number | string;
  returns_total: number | string;
  collected_by_method: Partial<Record<PaymentMethod, { total: number; count: number }>>;
  expected_cash: number | string;
  counted_cash: number | string;
  difference: number | string;
  notes?: string | null;
  created_at: string;
  user?: Pick<User, 'id' | 'name'> | null;
}

export interface Report {
  period: { start: string; end: string };
  totals: {
    sales_count: number;
    gross_revenue: number;
    returns: number;
    net_revenue: number;
    discounts: number;
    tax: number;
    collected: number;
    unpaid: number;
    margin: number;
    margin_rate: number;
    average_basket: number;
  };
  daily: { date: string; count: number; revenue: number }[];
  by_seller: { name: string; count: number; revenue: number | string }[];
  by_payment_method: { method: PaymentMethod; total: number | string; count: number }[];
  by_category: { category: string; quantity: number | string; revenue: number | string; margin: number | string }[];
  top_products: { id: number; name: string; reference: string; quantity: number | string; revenue: number | string; margin: number | string }[];
  sleeping_products: { id: number; name: string; reference: string; unit: string; stock: number; value: number }[];
}

export interface Backup {
  name: string;
  size: number;
  created_at: string;
}

export interface PurchaseItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  product?: Pick<Product, 'id' | 'name' | 'reference' | 'unit'> | null;
}

export interface Purchase {
  id: number;
  invoice_number: string;
  supplier_reference?: string | null;
  supplier_id: number;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  status: string;
  notes?: string | null;
  created_at: string;
  items_count?: number;
  supplier?: Pick<Supplier, 'id' | 'name'> & Partial<Supplier>;
  user?: Pick<User, 'id' | 'name'> | null;
  items?: PurchaseItem[];
}

export interface StockMovement {
  id: number;
  product_id: number;
  type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference?: string | null;
  note?: string | null;
  created_at: string;
  product?: Pick<Product, 'id' | 'name' | 'reference' | 'unit'> | null;
  user?: Pick<User, 'id' | 'name'> | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface DashboardStats {
  today_sales: number;
  today_sales_count: number;
  sales_growth: number;
  month_sales: number;
  month_sales_growth: number;
  month_collected: number;
  month_purchases: number;
  month_margin: number;
  receivables: number;
  receivables_count: number;
  stock_value: number;
  stock_retail_value: number;
  products_count: number;
  clients_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  charts: {
    monthly_sales: { month: string; label: string; total: number; collected: number; count: number }[];
    daily_sales: { date: string; label: string; total: number; count: number }[];
    sales_by_category: { category: string; total: number | string }[];
    top_products: { id: number; name: string; reference: string; quantity_sold: number | string; total_sales: number | string }[];
    payment_methods: { method: PaymentMethod; total: number | string; count: number }[];
  };
  recent_sales: { id: number; invoice_number: string; client_name: string; total: number; remaining_amount: number; status: SaleStatus; created_at: string }[];
  alerts: { low_stock: Product[]; out_of_stock: Product[] };
}

export interface Settings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_ninea: string;
  company_rccm: string;
  currency: string;
  tax_rate: string | number;
  invoice_format: InvoiceFormat;
  invoice_footer: string;
}

export interface SalesSummary {
  count: number;
  total: number;
  paid: number;
  remaining: number;
}
