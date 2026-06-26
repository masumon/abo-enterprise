import axios from "axios";
import type { ApiResponse, PaginatedResponse, Product, Order, Booking, Lead } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
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
  list: (params?: { category?: string; featured?: boolean; page?: number }) =>
    api.get<PaginatedResponse<Product>>("/api/v1/products", { params }),

  get: (slug: string) =>
    api.get<ApiResponse<Product>>(`/api/v1/products/${slug}`),

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

  list: (params?: { status?: string; page?: number }) =>
    api.get<PaginatedResponse<Order>>("/api/v1/orders", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Order>>(`/api/v1/orders/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Order>>(`/api/v1/orders/${id}/status`, { status }),
};

export const bookingsApi = {
  create: (data: Booking) =>
    api.post<ApiResponse<Booking>>("/api/v1/bookings", data),

  list: (params?: { service_type?: string; status?: string; page?: number }) =>
    api.get<PaginatedResponse<Booking>>("/api/v1/bookings", { params }),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Booking>>(`/api/v1/bookings/${id}/status`, { status }),
};

export const leadsApi = {
  create: (data: Lead) =>
    api.post<ApiResponse<Lead>>("/api/v1/leads", data),

  list: (params?: { lead_type?: string; status?: string; page?: number }) =>
    api.get<PaginatedResponse<Lead>>("/api/v1/leads", { params }),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/status`, { status }),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ access_token: string; token_type: string }>>("/api/v1/auth/login", {
      email,
      password,
    }),
};

export default api;
