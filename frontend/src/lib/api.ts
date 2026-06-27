import axios from "axios";
import type { ApiResponse, PaginatedResponse, Product, Order, Booking, Lead, Service } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
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
      window.location.href = "/admin/login";
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
  list: (params?: { order_status?: string; page?: number }) =>
    api.get<PaginatedResponse<Order>>("/api/v1/orders", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Order>>(`/api/v1/orders/${id}`),

  track: (orderNumber: string) =>
    api.get<ApiResponse<{ order_number: string; order_status: string; payment_method: string; total: number; items_count: number; created_at: string }>>("/api/v1/orders/track", { params: { number: orderNumber } }),

  byPhone: (phone: string) =>
    api.get<ApiResponse<{ order_number: string; order_status: string; total: number; items_count: number; created_at: string }[]>>("/api/v1/orders/by-phone", { params: { phone } }),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Order>>(`/api/v1/orders/${id}/status`, { status }),
};

export const bookingsApi = {
  create: (data: Booking) =>
    api.post<ApiResponse<Booking>>("/api/v1/bookings", data),

  list: (params?: { service_type?: string; status?: string; page?: number }) =>
    api.get<PaginatedResponse<Booking>>("/api/v1/bookings", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Booking>>(`/api/v1/bookings/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Booking>>(`/api/v1/bookings/${id}/status`, { status }),
};

export const leadsApi = {
  create: (data: Lead) =>
    api.post<ApiResponse<Lead>>("/api/v1/leads", data),

  list: (params?: { lead_type?: string; status?: string; page?: number }) =>
    api.get<PaginatedResponse<Lead>>("/api/v1/leads", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Lead>>(`/api/v1/leads/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/status`, { status }),
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
    api.get<PaginatedResponse<import("@/types").Review>>("/api/v1/reviews", { params }),

  create: (data: Partial<import("@/types").Review>) =>
    api.post<ApiResponse<import("@/types").Review>>("/api/v1/reviews", data),
};

export const blogApi = {
  list: (params?: { category?: string; featured?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<import("@/types").BlogPost>>("/api/v1/blog", { params }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<import("@/types").BlogPost>>(`/api/v1/blog/${slug}`),
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

  listUsers: (page = 1) =>
    api.get<PaginatedResponse<{ id: string; email: string; name: string; role: string; is_active: boolean; last_login: string | null }>>("/api/v1/admin/users", { params: { page } }),

  listAuditLogs: (page = 1) =>
    api.get<PaginatedResponse<{ id: string; action: string; entity_type: string; entity_id: string | null; created_at: string }>>("/api/v1/admin/audit-logs", { params: { page } }),
};

export default api;
