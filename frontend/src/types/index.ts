// Core types matching the ABO Enterprise backend schema

export type Language = "en" | "bn";

export type ProductCategory = "accessories" | "gadgets" | "electronics" | "computer";

export type PaymentMethod = "bkash" | "nagad" | "rocket" | "bank" | "cod";

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
  rating?: number;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  specifications?: Record<string, string>;
  sku?: string;
  barcode?: string;
  brand?: string;
  sub_category?: string;
  tags?: string[];
  weight?: number;
  warranty_info?: string;
  delivery_info?: string;
  is_flash_sale?: boolean;
  flash_sale_price?: number;
  low_stock_threshold?: number;
  is_best_seller?: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: string;
  product_id?: string | null;
  customer_name: string;
  company?: string | null;
  rating: number;
  review_en: string;
  review_bn?: string | null;
  photo_url?: string | null;
  source: string;
  is_verified: boolean;
  is_featured: boolean;
  created_at?: string;
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
  discount_amount?: number;
  coupon_code?: string;
  delivery_charge: number;
  total: number;
  notes?: string;
  items: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ServicePricingTier {
  id: string;
  service_id?: string;
  tier_name: string;
  price: number;
  description_en?: string;
  description_bn?: string;
  duration_days?: number;
  features?: string[];
  includes?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface ServiceBookingFormField {
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
  is_active?: boolean;
}

export interface Service {
  id: string;
  slug: string;
  name_en: string;
  name_bn?: string;
  description_en?: string;
  description_bn?: string;
  short_description_en?: string;
  short_description_bn?: string;
  long_description_en?: string;
  long_description_bn?: string;
  pricing_type: "fixed" | "package" | "hourly" | "custom" | "custom_quote";
  base_price?: number;
  min_price?: number;
  max_price?: number;
  hourly_rate?: number;
  pricing_tiers?: ServicePricingTier[];
  booking_forms?: ServiceBookingFormField[];
  is_active?: boolean;
  is_featured?: boolean;
  icon_url?: string;
  icon_color?: string;
  image_url?: string;
  featured_image_url?: string;
  category?: string;
  tags?: string[];
  sort_order?: number;
  lead_priority?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image?: string;
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

export interface BlogPost {
  id: string;
  slug: string;
  title_en: string;
  title_bn?: string;
  content_en: string;
  content_bn?: string;
  excerpt_en?: string;
  excerpt_bn?: string;
  featured_image_url?: string;
  category?: string;
  tags?: string[];
  author_name: string;
  status: "draft" | "published";
  is_featured?: boolean;
  sort_order?: number;
  published_at?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image?: string;
  created_at?: string;
  updated_at?: string;
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
