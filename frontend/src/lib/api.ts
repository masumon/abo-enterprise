import axios from "axios";
import type { AxiosResponse } from "axios";
import type { ApiResponse, PaginatedResponse, Product, Order, Booking, Lead, Service, ServicePricingTier, BookingV2, LeadV2, Review, BlogPost, ServiceBookingFormField, Category, Subcategory } from "@/types";
import { getApiBaseUrl } from "@/lib/apiBase";
import { clearAdminToken, getAdminToken, isAdminProtectedPath } from "@/lib/adminAuth";
import { getAdaptiveTimeout, getAdaptiveRetry } from "@/lib/networkAwareApi";
import { isOffline } from "@/lib/networkStatus";
import { offlineSync } from "@/lib/offlineSync";

const baseURL = getApiBaseUrl();

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  // Default fallback timeout — overridden per-request in the interceptor below
  // so that network-quality changes (e.g. WiFi → mobile data) are always reflected.
  timeout: 30000,
  // withCredentials deliberately stays OFF by default: some BD mobile-carrier
  // proxies (GP/Robi/Banglalink) strip Access-Control-Allow-Credentials from
  // responses, making the browser reject every credentialed API call on
  // cellular data. Public pages never need cookies. The request interceptor
  // below turns credentials on ONLY under /admin, where the HttpOnly
  // cookie-session (see admin/login) requires them.
});

type RetryConfig = { __retryCount?: number; maxRetries?: number } & NonNullable<Parameters<typeof api.request>[0]>;

api.interceptors.request.use((config) => {
  // Re-evaluate timeout on every request so it adapts to the *current* network
  // quality rather than the quality at module-initialization time.
  // Fix: getAdaptiveTimeout() returns 60 000 ms on slow/cellular networks vs
  // 30 000 ms on fast WiFi — call it here so changes in network type are honoured.
  if (!config.timeout || config.timeout === 30000) {
    config.timeout = getAdaptiveTimeout(30000);
  }
  // Admin panel only (including /admin/login, so the login response's
  // Set-Cookie and the cookie-session probe work): send the HttpOnly
  // session cookie. Everywhere else requests stay credential-less so
  // carrier proxies that strip ACA-Credentials can't break the site.
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    config.withCredentials = true;
  }
  const token = getAdminToken();
  // Don't clobber an explicit per-request token (e.g. the customer OTP token)
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig | undefined;
    const maxRetries = config?.maxRetries ?? getAdaptiveRetry(3);
    if (config && (config.__retryCount ?? 0) < maxRetries) {
      // Writes (POST/PUT/PATCH/DELETE) are NOT idempotent: a timeout or 5xx
      // can occur AFTER the server processed the request, so blindly retrying
      // creates duplicate orders/bookings. Only 429 is provably unprocessed.
      const method = (config.method ?? "get").toLowerCase();
      const isIdempotent = ["get", "head", "options"].includes(method);
      const retryable = isIdempotent
        ? !error.response ||
          [408, 429, 500, 502, 503, 504].includes(error.response.status) ||
          ["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT", "ECONNRESET"].includes(error.code)
        : error.response?.status === 429;
      if (retryable && error.response?.status !== 401) {
        config.__retryCount = (config.__retryCount ?? 0) + 1;
        const delay = Math.min(12000, 1500 * 2 ** (config.__retryCount - 1));
        await new Promise((r) => setTimeout(r, delay + Math.random() * 500));
        return api.request(config);
      }
    }
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearAdminToken();
      if (isAdminProtectedPath(window.location.pathname)) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/admin/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(error);
  }
);

async function queueOfflineCreate<T>(
  type: "booking" | "lead" | "service_booking" | "service_lead",
  data: Record<string, unknown>
): Promise<AxiosResponse<ApiResponse<T | null> & { queued: true }>> {
  await offlineSync.addPendingAction(type, "create", data);
  return {
    data: { success: true, data: null, queued: true },
    status: 202,
    statusText: "Accepted",
    headers: {},
    config: { headers: {}, method: "post", url: "", data } as AxiosResponse["config"],
  };
}

export function isQueuedResponse(
  response?: { status?: number; data?: unknown } | null
): boolean {
  if (!response) return false;
  const data = response.data as { queued?: boolean } | null | undefined;
  return response.status === 202 || data?.queued === true;
}

export const productsApi = {
  list: (params?: { category?: string; category_slug?: string; subcategory_slug?: string; featured?: boolean; search?: string; sort_by?: string; page?: number; per_page?: number }, opts?: { timeout?: number; maxRetries?: number }) =>
    api.get<PaginatedResponse<Product>>("/api/v1/products", { params, ...opts }),

  adminList: (params?: { category?: string; search?: string; is_active?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Product>>("/api/v1/products/admin", { params }),

  get: (slug: string, opts?: { timeout?: number; maxRetries?: number }) =>
    api.get<ApiResponse<Product>>(`/api/v1/products/${slug}`, opts),

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
  list: (params?: { order_status?: string; search?: string; days?: number; page?: number }) =>
    api.get<PaginatedResponse<Order>>("/api/v1/orders", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Order>>(`/api/v1/orders/${id}`),

  track: (orderNumber: string) =>
    api.get<ApiResponse<{
      order_number: string;
      order_status: string;
      payment_method: string;
      payment_status: string;
      total: number;
      items_count: number;
      created_at: string;
      courier_provider?: string | null;
      courier_tracking_id?: string | null;
    }>>("/api/v1/orders/track", { params: { number: orderNumber } }),

  // Requires the customer OTP token — phone is derived server-side from it
  byPhone: (phone: string, customerToken: string) =>
    api.get<ApiResponse<{ order_number: string; order_status: string; total: number; items_count: number; created_at: string }[]>>("/api/v1/orders/by-phone", {
      params: { phone },
      headers: { Authorization: `Bearer ${customerToken}` },
    }),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Order>>(`/api/v1/orders/${id}/status`, { status }),

  updateCourier: (id: string, data: { courier_provider?: string; courier_tracking_id?: string }) =>
    api.patch<ApiResponse<Order>>(`/api/v1/orders/${id}/courier`, data),

  bulkUpdateStatus: (order_ids: string[], status: string) =>
    api.post<ApiResponse<{ updated: number; ids: string[] }>>("/api/v1/admin/bulk/orders/status", { order_ids, status }),
};

export const bookingsApi = {
  create: (data: Booking) =>
    isOffline()
      ? queueOfflineCreate<Booking>("booking", data as unknown as Record<string, unknown>)
      : api.post<ApiResponse<Booking>>("/api/v1/bookings", data),

  // Public tracking by booking number (BK-… v2, or ABO-B-… legacy v1).
  track: (bookingNumber: string) =>
    api.get<ApiResponse<{
      kind: "booking";
      booking_number: string;
      booking_status: string;
      service_name: string;
      payment_status?: string | null;
      total?: number | null;
      estimated_price?: string | null;
      created_at: string;
    }>>("/api/v1/bookings/track", { params: { number: bookingNumber } }),

  list: (params?: { service_type?: string; status?: string; search?: string; page?: number }) =>
    api.get<PaginatedResponse<Booking>>("/api/v1/bookings", { params }),

  get: (id: string) =>
    api.get<ApiResponse<Booking>>(`/api/v1/bookings/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Booking>>(`/api/v1/bookings/${id}/status`, { status }),
};

export const leadsApi = {
  create: (data: Lead) =>
    isOffline()
      ? queueOfflineCreate<Lead>("lead", data as unknown as Record<string, unknown>)
      : api.post<ApiResponse<Lead>>("/api/v1/leads", data),

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

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/service-bookings/admin/bookings/${id}`),
};

export const serviceBookingsApi = {
  create: (data: {
    service_id: string;
    service_tier?: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_company?: string;
    booking_date?: string;
    pricing_type: string;
    quoted_price?: number;
    details?: string;
    requirements?: string;
    /** Answers to the service's dynamic booking form (validated server-side). */
    form_data?: Record<string, unknown>;
  }) =>
    isOffline()
      ? queueOfflineCreate<BookingV2 & { invoice_id?: string | null }>("service_booking", data as unknown as Record<string, unknown>)
      : api.post<ApiResponse<BookingV2 & { invoice_id?: string | null }>>("/api/v1/service-bookings", data),

  get: (id: string) =>
    api.get<ApiResponse<BookingV2>>(`/api/v1/service-bookings/${id}`),
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
    budget_min?: number;
    budget_max?: number;
    timeline?: string;
  }) =>
    isOffline()
      ? queueOfflineCreate<LeadV2>("service_lead", data as unknown as Record<string, unknown>)
      : api.post<ApiResponse<LeadV2>>("/api/v1/service-leads", data),
};

export const serviceLeadsAdminApi = {
  list: (params?: { status?: string; lead_type?: string; min_score?: number; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<LeadV2>>("/api/v1/service-leads/admin/leads", { params }),

  updateStatus: (id: string, status: string, reason_lost?: string) =>
    api.patch<ApiResponse<LeadV2>>(`/api/v1/service-leads/admin/leads/${id}/status`, { status, reason_lost }),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/service-leads/admin/leads/${id}`),
};

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    api.post<ApiResponse<{ access_token: string; token_type: string }>>("/api/v1/auth/login", {
      email,
      password,
      ...(totpCode ? { totp_code: totpCode } : {}),
    }),

  totpStatus: () => api.get<ApiResponse<{ enabled: boolean }>>("/api/v1/auth/2fa/status"),
  totpSetup: () =>
    api.post<ApiResponse<{ secret: string; otpauth_uri: string; qr_data_uri: string }>>("/api/v1/auth/2fa/setup"),
  totpEnable: (code: string) => api.post<ApiResponse<{ enabled: boolean }>>("/api/v1/auth/2fa/enable", { code }),
  totpDisable: (code: string) => api.post<ApiResponse<{ enabled: boolean }>>("/api/v1/auth/2fa/disable", { code }),

  getMe: () =>
    api.get<ApiResponse<{ id: string; email: string; name: string; role: string }>>("/api/v1/auth/me"),

  logout: () =>
    api.post<ApiResponse<null>>("/api/v1/auth/logout"),
};

export const servicesApi = {
  list: (params?: { category?: string; category_slug?: string; subcategory_slug?: string; featured?: boolean; search?: string; page?: number; per_page?: number }, opts?: { timeout?: number; maxRetries?: number }) =>
    api.get<PaginatedResponse<Service>>("/api/v1/services", { params, ...opts }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Service>>(`/api/v1/services/${slug}`),
};

export const reviewsApi = {
  list: (params?: { featured?: boolean; product_id?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Review>>("/api/v1/reviews", { params }),

  create: (data: Partial<Review>) =>
    api.post<ApiResponse<Review>>("/api/v1/reviews", data),
};

const API_BASE = baseURL;

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include", // cookie-session mode
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

export async function downloadPublicOrderInvoice(orderNumber: string, phone: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/invoices/public/order/${encodeURIComponent(orderNumber)}/pdf?phone=${encodeURIComponent(phone)}`
  );
  if (!res.ok) throw new Error("Invoice not available");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${orderNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPublicBookingInvoice(bookingId: string, phone: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/invoices/public/booking/${encodeURIComponent(bookingId)}/pdf?phone=${encodeURIComponent(phone)}`
  );
  if (!res.ok) throw new Error("Invoice not available");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${bookingId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface PublicInvoiceData {
  invoice_number: string;
  payment_method: string | null;
  payment_status: string;
  customer_name: string;
  customer_phone: string | null;
  items: { name: string; quantity: number; price: number; subtotal?: number }[];
  subtotal: number;
  tax: number;
  total: number;
  issued_date: string | null;
  created_at: string | null;
  order_number?: string | null;
  order_status?: string | null;
  delivery_charge?: number | null;
  discount_amount?: number | null;
  courier_provider?: string | null;
  courier_tracking_id?: string | null;
  booking_number?: string | null;
  booking_status?: string | null;
  service_name?: string | null;
}

export const publicInvoicesApi = {
  orderInvoice: (orderNumber: string, phone: string) =>
    api.get<ApiResponse<PublicInvoiceData>>(
      `/api/v1/invoices/public/order/${encodeURIComponent(orderNumber)}`,
      { params: { phone } }
    ),

  bookingInvoice: (bookingId: string, phone: string) =>
    api.get<ApiResponse<PublicInvoiceData>>(
      `/api/v1/invoices/public/booking/${encodeURIComponent(bookingId)}`,
      { params: { phone } }
    ),
};

export async function downloadPdf(path: string, filename: string): Promise<void> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include", // cookie-session mode
  });
  if (!res.ok) throw new Error(`PDF download failed: ${res.statusText}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
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

  translate: (text: string, source = "bn", target = "en") =>
    api.post<ApiResponse<{ translated: string }>>("/api/v1/blog/admin/translate", { text, source, target }),
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

export const categoriesApi = {
  /** Public taxonomy tree. `applies_to` filters to 'product' or 'service'. */
  list: (params?: { applies_to?: "product" | "service"; include_inactive?: boolean }) =>
    api.get<ApiResponse<Category[]>>("/api/v1/categories", { params }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Category>>(`/api/v1/categories/${slug}`),
};

export const categoriesAdminApi = {
  list: () => api.get<ApiResponse<Category[]>>("/api/v1/categories/admin/all"),

  create: (data: Partial<Category>) =>
    api.post<ApiResponse<Category>>("/api/v1/categories/admin", data),

  update: (id: string, data: Partial<Category>) =>
    api.put<ApiResponse<Category>>(`/api/v1/categories/admin/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/api/v1/categories/admin/${id}`),

  createSub: (data: Partial<Subcategory> & { category_id: string }) =>
    api.post<ApiResponse<Subcategory>>("/api/v1/categories/admin/subcategories", data),

  updateSub: (id: string, data: Partial<Subcategory>) =>
    api.put<ApiResponse<Subcategory>>(`/api/v1/categories/admin/subcategories/${id}`, data),

  deleteSub: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/api/v1/categories/admin/subcategories/${id}`),
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

  uploadImage: (file: File, folder = "abo-enterprise/uploads") => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ApiResponse<{ url: string; public_id: string; resource_type?: string }>>(
      "/api/v1/admin/upload",
      form,
      { headers: { "Content-Type": "multipart/form-data" }, params: { folder } }
    );
  },

  uploadMedia: (file: File, folder = "abo-enterprise/uploads") => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ApiResponse<{ url: string; public_id: string; resource_type?: string }>>(
      "/api/v1/admin/upload",
      form,
      { headers: { "Content-Type": "multipart/form-data" }, params: { folder } }
    );
  },

  getSettings: () =>
    api.get<ApiResponse<Record<string, string>>>("/api/v1/settings"),

  updateSetting: (key: string, data: { value: string; is_editable?: boolean }) =>
    api.put<ApiResponse<{ key: string; value: string }>>(`/api/v1/settings/${key}`, data),

  upsertSettings: (items: { key: string; value: string; data_type?: string; description?: string }[]) =>
    api.post<ApiResponse<{ key: string; value: string }[]>>("/api/v1/settings/upsert", items),

  listUsers: (page = 1) =>
    api.get<PaginatedResponse<{ id: string; email: string; name: string; role: string; is_active: boolean; last_login: string | null; created_at?: string }>>("/api/v1/admin/users", { params: { page } }),

  createUser: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post<ApiResponse<{ id: string; email: string; name: string; role: string; is_active: boolean }>>("/api/v1/admin/users", data),

  updateUser: (id: string, data: { name?: string; role?: string; is_active?: boolean; password?: string }) =>
    api.put<ApiResponse<{ id: string; email: string; name: string; role: string; is_active: boolean }>>(`/api/v1/admin/users/${id}`, data),

  deactivateUser: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/admin/users/${id}`),

  listPaymentTransactions: (params?: { gateway?: string; status?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<{
      id: string;
      gateway: string;
      reference_id: string;
      payment_id: string | null;
      order_id: string | null;
      amount: number;
      status: string;
      created_at: string;
    }>>("/api/v1/admin/payment-transactions", { params }),

  listPaymentReconciliation: (page = 1) =>
    api.get<PaginatedResponse<{
      id: string;
      reconciliation_date: string;
      payment_gateway: string;
      total_transactions: number;
      total_amount: number;
      successful_count: number;
      failed_count: number;
      pending_count: number;
      reconciliation_status: string;
      notes: string | null;
      created_at: string;
    }>>("/api/v1/admin/payment-reconciliation", { params: { page } }),

  listAuditLogs: (params: { page?: number; per_page?: number } = {}) =>
    api.get<PaginatedResponse<{ id: string; action: string; entity_type: string; entity_id: string | null; created_at: string; admin_email?: string }>>("/api/v1/admin/audit-logs", { params }),

  listMedia: (folder = "abo-enterprise/uploads") =>
    api.get<ApiResponse<{ id: string; url: string; name: string; size: number; uploaded_at: string; type: "image" | "video" }[]>>("/api/v1/media/assets", { params: { folder } }),

  saveSettings: (items: { key: string; value: string; data_type?: string }[]) =>
    api.post<ApiResponse<{ key: string; value: string }[]>>("/api/v1/settings/upsert", items),
};

export interface EmailTemplateRecord {
  id: string;
  template_name: string;
  subject_en: string;
  subject_bn: string;
  body_en: string;
  body_bn: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const emailTemplatesAdminApi = {
  list: (page = 1) =>
    api.get<PaginatedResponse<EmailTemplateRecord>>("/api/v1/admin/email-templates", { params: { page } }),

  get: (id: string) =>
    api.get<ApiResponse<EmailTemplateRecord>>(`/api/v1/admin/email-templates/${id}`),

  create: (data: Omit<EmailTemplateRecord, "id" | "created_at" | "updated_at">) =>
    api.post<ApiResponse<EmailTemplateRecord>>("/api/v1/admin/email-templates", data),

  update: (id: string, data: Partial<Omit<EmailTemplateRecord, "id" | "template_name" | "created_at" | "updated_at">>) =>
    api.put<ApiResponse<EmailTemplateRecord>>(`/api/v1/admin/email-templates/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/admin/email-templates/${id}`),
};

export const invoicesAdminApi = {
  list: (params?: { payment_status?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<unknown>>("/api/v1/invoices/admin/invoices", { params }),

  create: (data: {
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    items: { name: string; quantity: number; price: number }[];
    subtotal: number;
    tax?: number;
    total: number;
    payment_method?: string;
    notes?: string;
  }) =>
    api.post<ApiResponse<unknown>>("/api/v1/invoices", data),
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

export const paymentMethodsPublicApi = {
  list: () =>
    api.get<ApiResponse<PaymentMethodRecord[]>>("/api/v1/admin/payment-methods-public"),
};

export const customerOtpApi = {
  send: (phone: string) =>
    api.post<ApiResponse<{ sent: boolean; expires_in: number }>>("/api/v1/customer/send-otp", { phone }),

  verify: (phone: string, code: string) =>
    api.post<ApiResponse<{ verified: boolean; access_token?: string }>>("/api/v1/customer/verify-otp", { phone, code }),
};

export const couponsApi = {
  validate: (code: string, subtotal: number) =>
    api.post<ApiResponse<{ code: string; discount_percent: number; discount_amount: number; discount_rate: number }>>(
      "/api/v1/public/coupons/validate",
      { code, subtotal }
    ),
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

  initiateSslcommerz: (order_id: string, urls?: { success_url?: string; fail_url?: string; cancel_url?: string }) =>
    api.post<ApiResponse<{ success: boolean; payment_url?: string; transaction_id?: string; payment_gateway: string }>>("/api/v1/payments/sslcommerz/initiate", {
      order_id,
      payment_gateway: "sslcommerz",
      ...urls,
    }),

  verifyBkash: (payment_id: string) =>
    api.post<ApiResponse<{ success: boolean; status?: string; transaction_id?: string; payment_gateway: string; order_number?: string; customer_phone?: string }>>("/api/v1/payments/bkash/verify", {
      payment_id,
      payment_gateway: "bkash",
    }),

  verifyNagad: (payment_id: string) =>
    api.post<ApiResponse<{ success: boolean; status?: string; transaction_id?: string; payment_gateway: string; order_number?: string; customer_phone?: string }>>("/api/v1/payments/nagad/verify", {
      payment_id,
      payment_gateway: "nagad",
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

  newsletter: (email: string) =>
    api.post<ApiResponse<{ subscribed: boolean; total: number }>>("/api/v1/public/newsletter", { email }),

  featureFlags: () =>
    api.get<ApiResponse<Record<string, boolean | string>>>("/api/v1/public/feature-flags"),
};

export type AssistantFeatures = {
  orders: boolean;
  order_tracking: boolean;
  bookings: boolean;
  booking_tracking: boolean;
  leads: boolean;
  lead_tracking: boolean;
  product_search: boolean;
  service_info: boolean;
  coupons: boolean;
  invoices: boolean;
};

export type AssistantAdminConfig = {
  feature_assistant_chat: boolean;
  feature_assistant_whatsapp: boolean;
  whatsapp_number: string;
  assistant_welcome_en: string;
  assistant_welcome_bn: string;
  assistant_feature_orders: boolean;
  assistant_feature_order_tracking: boolean;
  assistant_feature_bookings: boolean;
  assistant_feature_booking_tracking: boolean;
  assistant_feature_leads: boolean;
  assistant_feature_lead_tracking: boolean;
  assistant_feature_product_search: boolean;
  assistant_feature_service_info: boolean;
  assistant_feature_coupons: boolean;
  assistant_feature_invoices: boolean;
  assistant_feature_delivery_info: boolean;
  assistant_feature_faq: boolean;
  assistant_feature_blog: boolean;
  assistant_feature_web_search: boolean;
  assistant_feature_complaints: boolean;
};

export const ASSISTANT_DEFAULT_CONFIG: AssistantAdminConfig = {
  feature_assistant_chat: true,
  feature_assistant_whatsapp: true,
  whatsapp_number: "",
  assistant_welcome_en: "",
  assistant_welcome_bn: "",
  assistant_feature_orders: true,
  assistant_feature_order_tracking: true,
  assistant_feature_bookings: true,
  assistant_feature_booking_tracking: true,
  assistant_feature_leads: true,
  assistant_feature_lead_tracking: true,
  assistant_feature_product_search: true,
  assistant_feature_service_info: true,
  assistant_feature_coupons: true,
  assistant_feature_invoices: true,
  assistant_feature_delivery_info: true,
  assistant_feature_faq: true,
  assistant_feature_blog: true,
  assistant_feature_web_search: true,
  assistant_feature_complaints: true,
};

export const assistantApi = {
  config: () =>
    api.get<ApiResponse<{
      enabled: boolean;
      whatsapp_enabled: boolean;
      whatsapp_number: string;
      welcome_en: string;
      welcome_bn: string;
      features?: AssistantFeatures;
    }>>("/api/v1/assistant/config"),

  chat: (data: {
    message: string;
    session_id?: string;
    session_token?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    language?: string;
    page_path?: string;
  }) =>
    api.post<ApiResponse<{
      message: string;
      intent: string;
      language: string;
      session_id: string;
      session_token?: string;
      data?: Record<string, unknown>;
      suggestions?: string[];
    }>>("/api/v1/assistant/chat", data),

  history: (sessionId: string, sessionToken: string, limit = 20) =>
    api.get<ApiResponse<{ role: string; content: string; intent?: string }[]>>(
      `/api/v1/assistant/conversations/${sessionId}/history`,
      { params: { limit, session_token: sessionToken } }
    ),

  health: () =>
    api.get<ApiResponse<{ status: string; module: string }>>("/api/v1/assistant/health"),
};

export interface AssistantFaqEntry {
  key: string;
  topic: string;
  answer_en: string;
  answer_bn: string;
  /** Customer questions/keywords (one per line, any language) that trigger this answer */
  questions?: string;
}

export interface AssistantConversation {
  id: string;
  session_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  language: string;
  last_intent: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AssistantActionLog {
  id: string;
  session_id: string | null;
  intent: string | null;
  action: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
}

export const assistantAdminApi = {
  getConfig: () =>
    api.get<ApiResponse<AssistantAdminConfig>>("/api/v1/assistant/admin/config"),

  updateConfig: (data: Partial<AssistantAdminConfig>) =>
    api.put<ApiResponse<null>>("/api/v1/assistant/admin/config", data),

  listConversations: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<AssistantConversation>>("/api/v1/assistant/admin/conversations", { params }),

  getConversation: (id: string) =>
    api.get<ApiResponse<{
      conversation: AssistantConversation;
      messages: { role: string; content: string; intent?: string }[];
    }>>(`/api/v1/assistant/admin/conversations/${id}`),

  deleteConversation: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/assistant/admin/conversations/${id}`),

  listLogs: (params?: { page?: number; per_page?: number; session_id?: string }) =>
    api.get<PaginatedResponse<AssistantActionLog>>("/api/v1/assistant/admin/logs", { params }),

  deleteLog: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/assistant/admin/logs/${id}`),

  listFaq: () =>
    api.get<ApiResponse<AssistantFaqEntry[]>>("/api/v1/assistant/admin/faq"),

  createFaq: (data: { key: string; answer_en: string; answer_bn?: string; questions?: string }) =>
    api.post<ApiResponse<{ key: string }>>("/api/v1/assistant/admin/faq", data),

  updateFaq: (key: string, data: { answer_en?: string; answer_bn?: string; questions?: string }) =>
    api.put<ApiResponse<null>>(`/api/v1/assistant/admin/faq/${key}`, data),

  deleteFaq: (key: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/assistant/admin/faq/${key}`),
};

export const careerApi = {
  submit: (data: { name: string; email?: string; phone: string; position: string; cover_letter?: string }) =>
    api.post<ApiResponse<{ id: string; name: string; phone: string; position: string; status: string; created_at: string }>>("/api/v1/career", data),
};

export const careerAdminApi = {
  list: (params?: { page?: number; per_page?: number; status?: string; search?: string }) =>
    api.get<PaginatedResponse<{ id: string; name: string; email?: string; phone: string; position: string; status: string; notes?: string; created_at: string }>>("/api/v1/career/admin/applications", { params }),

  get: (id: string) =>
    api.get<ApiResponse<{ id: string; name: string; email?: string; phone: string; position: string; cover_letter?: string; status: string; notes?: string; created_at: string; updated_at: string }>>(`/api/v1/career/admin/applications/${id}`),

  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch<ApiResponse<null>>(`/api/v1/career/admin/applications/${id}`, { status, notes }),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/v1/career/admin/applications/${id}`),
};

export default api;
