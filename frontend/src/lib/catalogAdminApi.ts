/**
 * Admin catalog helpers used by the products / services / showcase pages:
 * filtered lists, the "এটা আগে থেকেই আছে?" duplicate lookup and the simple
 * Bangla import sheet. Kept apart from lib/api.ts so the shared client file
 * stays untouched; every call goes through the same axios instance.
 */
import api, { downloadCsv, type ImportCommitResult, type ImportValidateResult } from "@/lib/api";
import type { ApiResponse, PaginatedResponse, Product, Service } from "@/types";

export interface DupMatch {
  id: string;
  slug?: string;
  name_en?: string | null;
  name_bn?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  sku?: string | null;
  exact?: boolean;
  deleted?: boolean;
}
export interface DupResult {
  name_matches: DupMatch[];
  slug_taken: DupMatch | null;
  sku_taken: DupMatch | null;
}
export interface DupQuery { name?: string; slug?: string; sku?: string; exclude_id?: string }

export type ProductStockFilter = "" | "low" | "out";
export type MissingFilter = "" | "image" | "price" | "description";

export const productAdminApi = {
  list: (params: {
    page?: number; per_page?: number; search?: string; category?: string;
    is_active?: boolean; stock?: Exclude<ProductStockFilter, "">; missing?: Exclude<MissingFilter, "">;
  }) => api.get<PaginatedResponse<Product>>("/api/v1/products/admin", { params }),
  checkDuplicate: (q: DupQuery) =>
    api.get<ApiResponse<DupResult>>("/api/v1/products/admin/check-duplicate", { params: clean(q) }),
  /** Stock changes go through Inventory so each change keeps a reason + history. */
  adjustStock: (productId: string, delta: number, reason: string) =>
    api.post(`/api/v1/inventory/${productId}/adjust`, { delta, movement_type: "correction", reason }),
};

export const serviceAdminApi = {
  list: (params: {
    page?: number; per_page?: number; search?: string; is_active?: boolean;
    category_id?: string; missing?: Exclude<MissingFilter, "">;
  }) => api.get<PaginatedResponse<Service>>("/api/v1/services/admin/services", { params }),
  checkDuplicate: (q: DupQuery) =>
    api.get<ApiResponse<DupResult>>("/api/v1/services/admin/services/check-duplicate", { params: clean(q) }),
};

type Mapping = Record<string, string | null> | null;
export type ImportOverrides = Record<string, Record<string, string>>;

function importForm(file: File, mapping: Mapping, onExisting: string, onNew: string, overrides?: ImportOverrides) {
  const fd = new FormData();
  fd.append("file", file);
  if (mapping) fd.append("mapping", JSON.stringify(mapping));
  fd.append("on_existing", onExisting);
  fd.append("on_new", onNew);
  if (overrides && Object.keys(overrides).length) fd.append("overrides", JSON.stringify(overrides));
  return fd;
}

/** Same endpoints as productImportApi, plus in-page row fixes ("overrides"). */
export const importAdminApi = {
  downloadSimpleTemplate: (fmt: "csv" | "xlsx") =>
    downloadCsv(`/api/v1/admin/bulk/import/products/template?fmt=${fmt}&variant=simple`, `product-import-simple.${fmt}`),
  validate: (file: File, mapping: Mapping, onExisting: string, onNew: string, imageNames: string[], overrides?: ImportOverrides) => {
    const fd = importForm(file, mapping, onExisting, onNew, overrides);
    fd.append("image_names", JSON.stringify(imageNames));
    return api.post<ApiResponse<ImportValidateResult>>("/api/v1/admin/bulk/import/products/validate", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  commit: (file: File, mapping: Mapping, onExisting: string, onNew: string, imageMap: Record<string, string>, overrides?: ImportOverrides) => {
    const fd = importForm(file, mapping, onExisting, onNew, overrides);
    fd.append("image_map", JSON.stringify(imageMap));
    return api.post<ApiResponse<ImportCommitResult>>("/api/v1/admin/bulk/import/products/commit", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180000,
    });
  },
};

function clean<T extends object>(q: T): Partial<T> {
  return Object.fromEntries(Object.entries(q).filter(([, v]) => typeof v === "string" && v.trim() !== "")) as Partial<T>;
}

/** Bangla digits for counts shown to the owner. */
export const bnNum = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

/** a-z0-9 slug from English text ("" when nothing usable). */
export const toSlug = (t: string) =>
  (t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Short random suffix for copies / auto codes. */
export const shortId = () => Math.random().toString(36).slice(2, 6);
