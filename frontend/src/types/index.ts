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
  category_id?: string | null;
  subcategory_id?: string | null;
  is_orderable?: boolean | null;
  is_bookable?: boolean | null;
  /** Computed by the API (single source: core/capabilities.py): e.g. ["orderable","bookable"]. */
  capabilities?: string[];
  badge?: string;
  image_url?: string;
  images?: string[];
  stock_quantity?: number;
  rating?: number;
  review_count?: number;
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
  flash_sale_ends_at?: string | null;
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
  is_active?: boolean;
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  created_at?: string;
}

export interface CartItem {
  product_id: string;
  name_en: string;
  name_bn: string;
  price: number;
  quantity: number;
  image_url?: string;
  stock_quantity?: number;
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
  payment_number?: string;
  order_status?: string;
  subtotal: number;
  discount_amount?: number;
  coupon_code?: string;
  courier_provider?: string | null;
  courier_tracking_id?: string | null;
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

/** Effective Call-To-Action, computed by the API (single source: core/capabilities.py). */
export interface ServiceCta {
  type: "book" | "order" | "quote" | "contact";
  label_en: string;
  label_bn: string;
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
  default_value?: string | null;
  validation_rules?: Record<string, unknown> | null;
  conditional_logic?: Record<string, unknown> | null;
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
  category_id?: string | null;
  subcategory_id?: string | null;
  is_orderable?: boolean | null;
  is_bookable?: boolean | null;
  /** Computed by the API (single source: core/capabilities.py): e.g. ["bookable","orderable"]. */
  capabilities?: string[];
  /** CTA override columns (null = infer) + the API-computed effective CTA. */
  cta_type?: string | null;
  cta_label_en?: string | null;
  cta_label_bn?: string | null;
  cta?: ServiceCta;
  tags?: string[];
  sort_order?: number;
  lead_priority?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image?: string;
  process_steps?: { step: number; title: string; description: string }[];
  benefits?: string[];
  requirements?: string[];
  required_documents?: string[];
  faq?: { question: string; answer: string }[];
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
  estimated_price?: string;
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

export interface BookingV2 {
  id: string;
  booking_number: string;
  service_id: string;
  service_name: string;
  service_tier?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_company?: string | null;
  booking_date?: string | null;
  estimated_completion_date?: string | null;
  pricing_type: string;
  quoted_price?: number | null;
  final_price?: number | null;
  hours_worked?: number | null;
  details?: string | null;
  requirements?: string | null;
  /** Customer answers to the service's dynamic booking form. */
  form_data?: Record<string, unknown> | null;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface LeadV2 {
  id: string;
  lead_number: string;
  service_id?: string | null;
  lead_type: string;
  source: string;
  name: string;
  email?: string | null;
  phone: string;
  company?: string | null;
  job_title?: string | null;
  company_size?: string | null;
  project_description?: string | null;
  requirements?: string | null;
  budget_range?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  timeline?: string | null;
  qualification_score: number;
  status: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  converted_at?: string | null;
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

// ---- Commerce taxonomy (Category -> Subcategory) ----
export interface Subcategory {
  id: string;
  category_id: string;
  slug: string;
  name_en: string;
  name_bn?: string | null;
  description_en?: string | null;
  description_bn?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  /** Parent category, embedded by the nested slug resolver endpoint. */
  category?: Category;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_bn?: string | null;
  description_en?: string | null;
  description_bn?: string | null;
  icon?: string | null;
  image_url?: string | null;
  applies_to: string[];
  sort_order: number;
  is_active: boolean;
  subcategories: Subcategory[];
  created_at?: string;
  updated_at?: string;
}
