export type CourierProvider = "pathao" | "steadfast" | "redx" | "other";

export function buildCourierTrackingUrl(
  provider: string | null | undefined,
  trackingId: string | null | undefined,
  settings: Record<string, string>
): string | null {
  if (!provider || !trackingId) return null;
  const key = `courier_${provider.toLowerCase()}_url`;
  const template = settings[key];
  if (template?.includes("{tracking_id}")) {
    return template.replace("{tracking_id}", encodeURIComponent(trackingId));
  }
  if (provider.toLowerCase() === "pathao") {
    return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(trackingId)}`;
  }
  if (provider.toLowerCase() === "steadfast") {
    return `https://steadfast.com.bd/t/${encodeURIComponent(trackingId)}`;
  }
  return null;
}

export const COURIER_OPTIONS = [
  { value: "pathao", label: "Pathao" },
  { value: "steadfast", label: "Steadfast" },
  { value: "redx", label: "RedX" },
  { value: "other", label: "Other" },
];
