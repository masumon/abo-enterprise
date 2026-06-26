export type Language = "en" | "bn";

export interface BilingualText {
  en: string;
  bn: string;
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
  category: ProductCategory;
  badge?: "HOT" | "NEW" | "SALE";
  image_url?: string;
  images?: string[];
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  specifications?: Record<string, string>;
}

export type ProductCategory = "accessories" | "gadgets" | "electronics" | "computer";

export interface CartItem {
  product_id: string;
  name_en: string;
  name_bn: string;
  price: number;
  image_url?: string;
  quantity: number;
}

export interface Order {
  id?: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  payment_method: PaymentMethod;
  payment_number?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_charge: number;
  total: number;
  notes?: string;
  status?: OrderStatus;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = "bkash" | "rocket" | "bank" | "cod";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export type ServiceType = "printing" | "legal" | "web_development" | "ai_solutions" | "automation" | "software";

export interface Booking {
  id?: string;
  booking_number?: string;
  service_type: ServiceType;
  service_subtype?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  details?: string;
  status?: "pending" | "contacted" | "in_progress" | "completed" | "cancelled";
}

export interface Lead {
  id?: string;
  lead_type: "software_development" | "ai_solutions" | "automation" | "erp" | "general";
  name: string;
  company?: string;
  phone: string;
  email?: string;
  budget_range?: string;
  project_description?: string;
  requirements?: string;
  status?: "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> {
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
