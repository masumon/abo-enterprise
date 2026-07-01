/** Extract a user-facing message from axios/FastAPI errors. */
export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { detail?: string | { msg?: string }[] } } };
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
}
