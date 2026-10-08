import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { AponInfo } from "@/lib/apon";

export interface AponCaptcha {
  token: string;
  a: number;
  op: "+" | "-";
  b: number;
  expires_in: number;
}
export interface AponTicket {
  url: string;
  filename: string;
  size_bytes: number | null;
  sha256: string | null;
}
export interface AponAdminRelease {
  id: string;
  version_name: string;
  version_code: number;
  file_name: string;
  source_url: string;
  size_bytes: number | null;
  sha256: string | null;
  min_android: string | null;
  changelog_bn: string | null;
  changelog_en: string | null;
  status: "draft" | "published";
  is_current: boolean;
  download_count: number;
  updated_at: string | null;
  created_at: string | null;
}
export type AponReleaseInput = Partial<Omit<AponAdminRelease, "id" | "status" | "is_current" | "download_count" | "updated_at" | "created_at">> &
  Pick<AponAdminRelease, "version_name" | "version_code" | "source_url">;

export interface AponStats {
  total: number;
  last_30_days: number;
  per_day: { date: string; count: number }[];
  per_release: { version: string; count: number }[];
}

export const aponApi = {
  info: () => api.get<ApiResponse<AponInfo>>("/api/v1/app/info"),
  captcha: () => api.get<ApiResponse<AponCaptcha>>("/api/v1/app/captcha"),
  ticket: (token: string, answer: string, website = "") =>
    api.post<ApiResponse<AponTicket>>("/api/v1/app/download-ticket", { token, answer, website }),
};

export const aponAdminApi = {
  list: () => api.get<ApiResponse<AponAdminRelease[]>>("/api/v1/app/admin/releases"),
  create: (data: AponReleaseInput) => api.post<ApiResponse<AponAdminRelease>>("/api/v1/app/admin/releases", data),
  update: (id: string, data: Partial<AponReleaseInput>) => api.put<ApiResponse<AponAdminRelease>>(`/api/v1/app/admin/releases/${id}`, data),
  publish: (id: string) => api.post<ApiResponse<AponAdminRelease>>(`/api/v1/app/admin/releases/${id}/publish`),
  unpublish: (id: string) => api.post<ApiResponse<AponAdminRelease>>(`/api/v1/app/admin/releases/${id}/unpublish`),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/api/v1/app/admin/releases/${id}`),
  inspect: (url: string) =>
    api.post<ApiResponse<{ size_bytes: number; sha256: string; file_name: string; looks_like_apk: boolean }>>(
      "/api/v1/app/admin/inspect",
      { url },
      { timeout: 240000 },
    ),
  stats: () => api.get<ApiResponse<AponStats>>("/api/v1/app/admin/stats"),
};
