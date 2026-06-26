// Core types matching the ABO Enterprise backend schema

export type Language = "en" | "bn";

export type ProductCategory = "accessories" | "gadgets" | "electronics" | "computer";

export type PaymentMethod = "bkash" | "rocket" | "bank" | "cod";

export interface Product {
  id?: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en?: string;
  description_bn?: string;
  price: number;
  original_price?: number;
  category: ProductCategory;
  badge?: string;
  image_url?: string;
  images?: string[];
  stock_quantity?: number;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  specifications?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product_id: string;
  name_en: string;
  name_bn: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface OrderItem {
  product_id?: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  id?: string;
  order_id?: string;
  created_at?: string;
}

export interface Order {
  id?: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  payment_method: string;
  order_status?: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  notes?: string;
  items: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id?: string;
  booking_number?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_type: string;
  service_subtype?: string;
  details?: string;
  requirements?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  lead_type: string;
  project_description?: string;
  requirements?: string;
  budget_range?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: PaginatedMeta;
}

export interface PaginatedMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T = unknown> {
  success?: boolean;
  data: T[];
  message?: string;
  meta?: PaginatedMeta;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active?: boolean;
  created_at?: string;
}

export interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  total_bookings: number;
  pending_bookings: number;
  new_leads: number;
  total_leads: number;
  total_products: number;
  recent_orders: unknown[];
  recent_leads: unknown[];
}
