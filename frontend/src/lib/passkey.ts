/**
 * Passkeys (WebAuthn) — sign in with fingerprint / face / phone screen lock.
 * Converts the server's JSON options to browser objects and the browser's
 * credential back to JSON (base64url), no extra library needed.
 */
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

const b64uToBuf = (s: string): ArrayBuffer => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};
const bufToB64u = (b: ArrayBuffer | null | undefined): string => {
  if (!b) return "";
  const bytes = new Uint8Array(b);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** True when this browser/device can use passkeys. */
export function passkeySupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
}

type Desc = { id: string; type: string; transports?: string[] };

function toCreateOptions(o: Record<string, unknown>): CredentialCreationOptions {
  const user = o.user as { id: string; name: string; displayName: string };
  return {
    publicKey: {
      ...(o as unknown as PublicKeyCredentialCreationOptions),
      challenge: b64uToBuf(o.challenge as string),
      user: { ...user, id: b64uToBuf(user.id) },
      excludeCredentials: ((o.excludeCredentials as Desc[]) ?? []).map((c) => ({ ...c, id: b64uToBuf(c.id) })) as PublicKeyCredentialDescriptor[],
    },
  };
}

function toGetOptions(o: Record<string, unknown>): CredentialRequestOptions {
  return {
    publicKey: {
      ...(o as unknown as PublicKeyCredentialRequestOptions),
      challenge: b64uToBuf(o.challenge as string),
      allowCredentials: ((o.allowCredentials as Desc[]) ?? []).map((c) => ({ ...c, id: b64uToBuf(c.id) })) as PublicKeyCredentialDescriptor[],
    },
  };
}

function credentialToJson(c: PublicKeyCredential): Record<string, unknown> {
  const r = c.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  const response: Record<string, unknown> = { clientDataJSON: bufToB64u(r.clientDataJSON) };
  if ("attestationObject" in r && r.attestationObject) {
    response.attestationObject = bufToB64u(r.attestationObject);
    response.transports = typeof r.getTransports === "function" ? r.getTransports() : [];
  }
  if ("authenticatorData" in r && r.authenticatorData) {
    response.authenticatorData = bufToB64u(r.authenticatorData);
    response.signature = bufToB64u(r.signature);
    response.userHandle = r.userHandle ? bufToB64u(r.userHandle) : null;
  }
  return {
    id: c.id, rawId: bufToB64u(c.rawId), type: c.type, response,
    clientExtensionResults: c.getClientExtensionResults?.() ?? {},
    authenticatorAttachment: (c as PublicKeyCredential & { authenticatorAttachment?: string }).authenticatorAttachment ?? null,
  };
}

type Opts = { options: Record<string, unknown>; token: string };

/** Turns a cancelled / unsupported prompt into a friendly Bangla message. */
export function passkeyError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") return "বাতিল হয়েছে বা সময় শেষ — আবার চেষ্টা করুন।";
  if (name === "InvalidStateError") return "এই ডিভাইস আগেই যোগ করা আছে।";
  if (name === "NotSupportedError" || name === "SecurityError") return "এই ব্রাউজার/ডিভাইসে পাসকি চলছে না।";
  const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || "আঙুলের ছাপ দিয়ে কাজটি করা যায়নি।";
}

/** Add this device as a passkey for the signed-in admin / customer. */
export async function registerPasskey(who: "admin" | "customer", name: string, customerToken?: string) {
  const headers = customerToken ? { Authorization: `Bearer ${customerToken}` } : undefined;
  const r = await api.post<ApiResponse<Opts>>(`/api/v1/passkeys/${who}/register/options`, {}, { headers });
  const { options, token } = r.data.data!;
  const cred = (await navigator.credentials.create(toCreateOptions(options))) as PublicKeyCredential | null;
  if (!cred) throw new Error("cancelled");
  return api.post<ApiResponse<{ id: string; name: string }>>(`/api/v1/passkeys/${who}/register/verify`,
    { token, credential: credentialToJson(cred), name }, { headers });
}

/** Sign in with a passkey; returns the server's login payload (access_token …). */
export async function signInWithPasskey(kind: "admin" | "customer") {
  const r = await api.post<ApiResponse<Opts>>(`/api/v1/passkeys/login/options?kind=${kind}`, {});
  const { options, token } = r.data.data!;
  const cred = (await navigator.credentials.get(toGetOptions(options))) as PublicKeyCredential | null;
  if (!cred) throw new Error("cancelled");
  return api.post<ApiResponse<{ access_token: string; mfa_setup_required?: boolean }>>(`/api/v1/passkeys/login/verify?kind=${kind}`,
    { token, credential: credentialToJson(cred) });
}

export const passkeyAdminApi = {
  list: () => api.get<ApiResponse<{ id: string; name: string; created_at: string | null; last_used_at: string | null }[]>>("/api/v1/passkeys/admin"),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/api/v1/passkeys/admin/${id}`),
};

/** A friendly default name for this device ("Android phone", "Windows PC"…). */
export function deviceName(): string {
  if (typeof navigator === "undefined") return "ডিভাইস";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iPhone/iPad";
  if (/Android/.test(ua)) return "Android ফোন";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows পিসি";
  return "ডিভাইস";
}
