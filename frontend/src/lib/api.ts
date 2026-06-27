import axios from "axios";
import type { ApiResponse, PaginatedResponse, Product, Order, Booking, Lead, Service, ServicePricingTier, BookingV2, LeadV2, Review, BlogPost, ServiceBookingFormField } from "@/types";

// In production (Vercel) fall back to the Render service URL if the env var
// wasn't baked in at build time. For local dev the var should be set to
// http://localhost:8000 via .env.local.
const _prodFallback = "https://abo-enterprise.onrender.com";
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? _prodFallback : "http://localhost:8000");

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000, // 60s — Render free tier cold start can take 30-50s
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("abo_admin_token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("abo_admin_token");
      document.cookie = "abo_admin_token=; path=/; max-age=0";
      // Only redirect if not already on login page (prevent redirect loop)
      if (!window.location.pathname.includes("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export const productsApi = {
  list: (params?: { category?: string; featured?: boolean; search?: string; sort_by?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Product>>("/api/v1/products", { params }),

  get: (slug: string) =>
    api.get<ApiResponse<Product>>(`/api/v1/products/${slug}`),

  related: (slug: string) =>
    api.get<ApiResponse<Product[]>>(`/api/v1/products/${slug}/related`),

  suggest: (q: string) =>
    api.get<ApiResponse<{ slug: string; name_en: string; name_bn: string; price: number; image_url?: string }[]>>("/api/v1/products/suggest", { params: { q } }),

  validateStock: (items: { product_id: string; quantity: number }[]) =>
    api.post<ApiResponse<{ valid: boolean; items: { product_id: string; error?: string; available?: number; valid?: boolean }[] }>>("/api/v1/products/validate-stock", { items }),

  create: (data: Partial<Product>) =>
    api.post<ApiResponse<Product>>("/api/v1/products", data),

  update: (id: string, data: Partial<Product>) =>
    api.put<ApiResponse<Product>>(`/api/v1/products/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/products/${id}`),
};

export const ordersApi = {
  create: (data: Order) =>
    api.post<ApiResponse<Order>>("/api/v1/orders", data),

  // order_status matches backend query param name
  list: (params?: { order_status?: string; search?: string; page?: number }) =>
    api.get<PaginatedResponse<Order>>("/api/v1/orders", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Order>>(`/api/v1/orders/${id}`),

  track: (orderNumber: string) =>
    api.get<ApiResponse<{ order_number: string; order_status: string; payment_method: string; total: number; items_count: number; created_at: string }>>("/api/v1/orders/track", { params: { number: orderNumber } }),

  byPhone: (phone: string) =>
    api.get<ApiResponse<{ order_number: string; order_status: string; total: number; items_count: number; created_at: string }[]>>("/api/v1/orders/by-phone", { params: { phone } }),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Order>>(`/api/v1/orders/${id}/status`, { status }),

  bulkUpdateStatus: (order_ids: string[], status: string) =>
    api.post<ApiResponse<{ updated: number; ids: string[] }>>("/api/v1/admin/bulk/orders/status", { order_ids, status }),
};

export const bookingsApi = {
  create: (data: Booking) =>
    api.post<ApiResponse<Booking>>("/api/v1/bookings", data),

  list: (params?: { service_type?: string; status?: string; search?: string; page?: number }) =>
    api.get<PaginatedResponse<Booking>>("/api/v1/bookings", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Booking>>(`/api/v1/bookings/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Booking>>(`/api/v1/bookings/${id}/status`, { status }),
};

export const leadsApi = {
  create: (data: Lead) =>
    api.post<ApiResponse<Lead>>("/api/v1/leads", data),

  list: (params?: { lead_type?: string; status?: string; search?: string; page?: number }) =>
    api.get<PaginatedResponse<Lead>>("/api/v1/leads", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Lead>>(`/api/v1/leads/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/status`, { status }),
};

export const serviceBookingsAdminApi = {
  list: (params?: { status?: string; payment_status?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<BookingV2>>("/api/v1/service-bookings/admin/bookings", { params }),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<BookingV2>>(`/api/v1/service-bookings/admin/bookings/${id}/status`, { status }),
};

export const serviceLeadsApi = {
  create: (data: {
    lead_type: string;
    name: string;
    phone: string;
    email?: string;
    company?: string;
    project_description?: string;
    requirements?: string;
    budget_range?: string;
  }) =>
    api.post<ApiResponse<LeadV2>>("/api/v1/service-leads", data),
};

export const serviceLeadsAdminApi = {
  list: (params?: { status?: string; lead_type?: string; min_score?: number; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<LeadV2>>("/api/v1/service-leads/admin/leads", { params }),

  updateStatus: (id: string, status: string, reason_lost?: string) =>
    api.patch<ApiResponse<LeadV2>>(`/api/v1/service-leads/admin/leads/${id}/status`, { status, reason_lost }),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ access_token: string; token_type: string }>>("/api/v1/auth/login", {
      email,
      password,
    }),

  getMe: () =>
    api.get<ApiResponse<{ id: string; email: string; name: string; role: string }>>("/api/v1/auth/me"),
};

export const servicesApi = {
  list: (params?: { category?: string; featured?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Service>>("/api/v1/services", { params }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Service>>(`/api/v1/services/${slug}`),
};

export const reviewsApi = {
  list: (params?: { featured?: boolean; product_id?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Review>>("/api/v1/reviews", { params }),

  create: (data: Partial<Review>) =>
    api.post<ApiResponse<Review>>("/api/v1/reviews", data),
};

export const blogApi = {
  list: (params?: { category?: string; featured?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<BlogPost>>("/api/v1/blog", { params }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<BlogPost>>(`/api/v1/blog/${slug}`),
};

const API_BASE = baseURL;

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("abo_admin_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const adminBlogApi = {
  list: (params?: { status?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<BlogPost>>("/api/v1/blog/admin/posts", { params }),

  get: (id: string) =>
    api.get<ApiResponse<BlogPost>>(`/api/v1/blog/admin/posts/${id}`),

  create: (data: Partial<BlogPost>) =>
    api.post<ApiResponse<BlogPost>>("/api/v1/blog/admin/posts", data),

  update: (id: string, data: Partial<BlogPost>) =>
    api.put<ApiResponse<BlogPost>>(`/api/v1/blog/admin/posts/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/blog/admin/posts/${id}`),
};

export const servicesAdminApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Service>>("/api/v1/services/admin/services", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Service>>(`/api/v1/services/admin/services/${id}`),

  create: (data: Partial<Service>) =>
    api.post<ApiResponse<Service>>("/api/v1/services/admin/services", data),

  update: (id: string, data: Partial<Service>) =>
    api.put<ApiResponse<Service>>(`/api/v1/services/admin/services/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/services/admin/services/${id}`),

  createTier: (serviceId: string, data: Partial<ServicePricingTier>) =>
    api.post<ApiResponse<ServicePricingTier>>(`/api/v1/services/admin/services/${serviceId}/tiers`, data),

  updateTier: (serviceId: string, tierId: string, data: Partial<ServicePricingTier>) =>
    api.put<ApiResponse<ServicePricingTier>>(`/api/v1/services/admin/services/${serviceId}/tiers/${tierId}`, data),

  deleteTier: (serviceId: string, tierId: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/services/admin/services/${serviceId}/tiers/${tierId}`),

  createFormField: (serviceId: string, data: Partial<ServiceBookingFormField>) =>
    api.post<ApiResponse<ServiceBookingFormField>>(`/api/v1/services/admin/services/${serviceId}/form-fields`, data),

  updateFormField: (serviceId: string, fieldId: string, data: Partial<ServiceBookingFormField>) =>
    api.put<ApiResponse<ServiceBookingFormField>>(`/api/v1/services/admin/services/${serviceId}/form-fields/${fieldId}`, data),

  deleteFormField: (serviceId: string, fieldId: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/services/admin/services/${serviceId}/form-fields/${fieldId}`),
};

export const adminApi = {
  stats: () =>
    api.get<ApiResponse<{
      total_orders: number;
      pending_orders: number;
      total_bookings: number;
      pending_bookings: number;
      new_leads: number;
      total_leads: number;
      total_products: number;
      recent_orders: unknown[];
      recent_leads: unknown[];
    }>>("/api/v1/admin/stats"),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ApiResponse<{ url: string; public_id: string }>>("/api/v1/admin/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getSettings: () =>
    api.get<ApiResponse<Record<string, string>>>("/api/v1/settings"),

  updateSetting: (key: string, data: { value: string; is_editable?: boolean }) =>
    api.put<ApiResponse<{ key: string; value: string }>>(`/api/v1/settings/${key}`, data),

  upsertSettings: (items: { key: string; value: string; data_type?: string; description?: string }[]) =>
    api.post<ApiResponse<{ key: string; value: string }[]>>("/api/v1/settings/upsert", items),

  listUsers: (page = 1) =>
    api.get<PaginatedResponse<{ id: string; email: string; name: string; role: string; is_active: boolean; last_login: string | null }>>("/api/v1/admin/users", { params: { page } }),

  listAuditLogs: (page = 1) =>
    api.get<PaginatedResponse<{ id: string; action: string; entity_type: string; entity_id: string | null; created_at: string }>>("/api/v1/admin/audit-logs", { params: { page } }),
};

export interface PaymentMethodRecord {
  id: string;
  payment_gateway: string;
  is_active: boolean;
  account_identifier: string | null;
  commission_percentage: number;
  min_amount: number | null;
  max_amount: number | null;
  description: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export const paymentMethodsAdminApi = {
  list: () =>
    api.get<ApiResponse<PaymentMethodRecord[]>>("/api/v1/admin/payment-methods"),

  create: (data: Omit<PaymentMethodRecord, "id" | "created_at" | "updated_at">) =>
    api.post<ApiResponse<PaymentMethodRecord>>("/api/v1/admin/payment-methods", data),

  update: (id: string, data: Partial<Omit<PaymentMethodRecord, "id" | "created_at" | "updated_at">>) =>
    api.put<ApiResponse<PaymentMethodRecord>>(`/api/v1/admin/payment-methods/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/admin/payment-methods/${id}`),
};

export const paymentsApi = {
  initiateBkash: (order_id: string) =>
    api.post<ApiResponse<{ success: boolean; payment_url?: string; transaction_id?: string; payment_gateway: string }>>("/api/v1/payments/bkash/initiate", {
      order_id,
      payment_gateway: "bkash",
    }),

  initiateNagad: (order_id: string) =>
    api.post<ApiResponse<{ success: boolean; payment_url?: string; transaction_id?: string; payment_gateway: string }>>("/api/v1/payments/nagad/initiate", {
      order_id,
      payment_gateway: "nagad",
    }),

  verifyBkash: (payment_id: string) =>
    api.post<ApiResponse<{ success: boolean; status?: string; transaction_id?: string; payment_gateway: string }>>("/api/v1/payments/bkash/verify", {
      payment_id,
      payment_gateway: "bkash",
    }),

  verifyNagad: (payment_id: string) =>
    api.post<ApiResponse<{ success: boolean; status?: string; transaction_id?: string; payment_gateway: string }>>("/api/v1/payments/nagad/verify", {
      payment_id,
      payment_gateway: "nagad",
    }),

  getTransaction: (transaction_id: string, gateway: "bkash" | "nagad") =>
    api.get<ApiResponse<{ id: string; status: string; amount: number }>>("/api/v1/payments/transaction/" + transaction_id, {
      params: { gateway },
    }),
};

export const publicApi = {
  stats: () =>
    api.get<ApiResponse<{
      orders: number;
      products: number;
      services: number;
      clients: number;
      projects: number;
      years: number;
      reviews: number;
    }>>("/api/v1/public/stats"),

  activity: () =>
    api.get<ApiResponse<{
      type: string;
      icon: string;
      text_en: string;
      text_bn: string;
      time: string;
    }[]>>("/api/v1/public/activity"),
};

export default api;
