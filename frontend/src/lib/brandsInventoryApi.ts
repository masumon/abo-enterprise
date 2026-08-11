import api from "@/lib/api";

export type Brand = {
  id: string;
  slug: string;
  name_en: string;
  name_bn?: string | null;
  description_en?: string | null;
  description_bn?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: string;
  name_en: string;
  name_bn: string;
  sku?: string | null;
  brand?: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_url?: string | null;
};

export type InventoryMovement = {
  id: string;
  movement_type: string;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reason?: string | null;
  note?: string | null;
  admin_id?: string | null;
  created_at: string;
};

export const brandsApi = {
  list: (params?: { search?: string; include_inactive?: boolean; page?: number; per_page?: number }) =>
    api.get<{ data: Brand[]; meta: { page: number; per_page: number; total: number; total_pages: number } }>("/api/v1/brands", { params }),
  create: (data: Partial<Brand>) => api.post("/api/v1/brands", data),
  update: (id: string, data: Partial<Brand>) => api.put(`/api/v1/brands/${id}`, data),
  archive: (id: string) => api.delete(`/api/v1/brands/${id}`),
  linkProduct: (brandId: string, productId: string) => api.post(`/api/v1/brands/${brandId}/products`, { product_id: productId }),
};

export const inventoryApi = {
  summary: () => api.get<{ data: { products: number; low_stock: number; out_of_stock: number; units: number } }>("/api/v1/inventory/summary"),
  list: (params?: { search?: string; low_stock?: boolean; out_of_stock?: boolean; page?: number; per_page?: number }) =>
    api.get<{ data: InventoryItem[]; meta: { page: number; per_page: number; total: number; total_pages: number } }>("/api/v1/inventory", { params }),
  movements: (productId: string, limit = 100) => api.get<{ data: InventoryMovement[] }>(`/api/v1/inventory/${productId}/movements`, { params: { limit } }),
  adjust: (productId: string, data: { delta: number; movement_type: string; reason: string; note?: string }) => api.post(`/api/v1/inventory/${productId}/adjust`, data),
};
