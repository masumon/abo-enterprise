// Core Business Types

export interface Service {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en?: string;
  description_bn?: string;
  short_description_en?: string;
  short_description_bn?: string;
  long_description_en?: string;
  long_description_bn?: string;
  category: string;
  icon_url?: string;
  featured_image_url?: string;
  icon_color?: string;
  pricing_type: "fixed" | "hourly" | "package" | "custom_quote";
  base_price?: number;
  min_price?: number;
  max_price?: number;
  hourly_rate?: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  lead_priority: number;
  lead_qualification_score: number;
  tags: string[];
  pricing_tiers?: ServicePricingTier[];
  booking_forms?: ServiceBookingForm[];
  created_at: string;
  updated_at: string;
}

export interface ServicePricingTier {
  id: string;
  service_id: string;
  tier_name: string;
  description_en?: string;
  description_bn?: string;
  price: number;
  duration_days?: number;
  features: string[];
  includes?: string;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceBookingForm {
  id: string;
  service_id: string;
  field_name: string;
  field_type: string;
  field_label_en: string;
  field_label_bn: string;
  is_required: boolean;
  placeholder?: string;
  options?: string[];
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  service_id: string;
  service_name: string;
  service_tier?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_company?: string;
  booking_date?: string;
  estimated_completion_date?: string;
  pricing_type: string;
  quoted_price?: number;
  final_price?: number;
  hours_worked?: number;
  details?: string;
  requirements?: string;
  attachments: string[];
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  payment_status: "pending" | "completed" | "failed";
  payment_method?: string;
  payment_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  service_id?: string;
  lead_type: string;
  source: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  job_title?: string;
  company_size?: string;
  project_description?: string;
  requirements?: string;
  budget_range?: string;
  budget_min?: number;
  budget_max?: number;
  timeline?: string;
  attachments: string[];
  qualification_score: number;
  status: "new" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "won" | "lost";
  reason_lost?: string;
  assigned_to?: string;
  next_action?: string;
  next_action_date?: string;
  created_at: string;
  updated_at: string;
  converted_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id?: string;
  booking_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: string;
  payment_status: "pending" | "paid" | "overdue";
  issued_date?: string;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  payment_method: string;
  payment_number?: string;
  payment_status: "pending" | "completed" | "failed";
  order_status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  subtotal: number;
  delivery_charge: number;
  total: number;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en?: string;
  description_bn?: string;
  price: number;
  original_price?: number;
  category: string;
  badge?: string;
  image_url?: string;
  images: string[];
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  specifications?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "editor" | "viewer";
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  total_bookings: number;
  pending_bookings: number;
  new_leads: number;
  total_leads: number;
  total_products: number;
  recent_orders: Order[];
  recent_leads: Lead[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  error_code?: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  message: string;
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface PaymentMethod {
  id: string;
  payment_gateway: "bkash" | "nagad" | "bank_transfer" | "cash_on_delivery";
  is_active: boolean;
  account_identifier?: string;
  commission_percentage: number;
  min_amount?: number;
  max_amount?: number;
  description?: string;
  sort_order?: number;
}

export interface AdminSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  data_type: "string" | "integer" | "boolean" | "json";
  description_en?: string;
  description_bn?: string;
  is_editable: boolean;
  is_secret: boolean;
  display_type?: string;
  sort_order?: number;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

export interface LanguageStore {
  language: "en" | "bn";
  setLanguage: (lang: "en" | "bn") => void;
  toggle: () => void;
  t: (key: string) => string;
}

export interface EmailTemplate {
  id: string;
  template_name: string;
  subject_en: string;
  subject_bn: string;
  body_en: string;
  body_bn: string;
  variables: string[];
  is_active: boolean;
}

export interface ActivityLog {
  id: string;
  admin_id: string;
  action: "create" | "update" | "delete" | "login" | "logout";
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
