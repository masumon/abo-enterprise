/**
 * Admin → ডাটাবেস Backup: API calls + Bangla setup guide for every drive type.
 */
import api, { downloadCsv } from "@/lib/api";
import type { ApiResponse } from "@/types";

export type DestKind = "google_drive" | "onedrive" | "dropbox" | "s3" | "webdav";
export type BackupDest = {
  id: string; kind: DestKind; label: string; enabled: boolean; connected: boolean; created_at: string;
  cfg: Record<string, string>; last?: { ok: boolean; at: string; error_bn?: string };
};
export type DestResult = {
  dest_id: string; kind: string; label: string; ok: boolean; verified: boolean; file_id?: string;
  size?: number; error_bn?: string; deleted_old?: number;
};
export type BackupRun = {
  id: string; trigger: "auto" | "manual" | "local" | "restore_test"; status: "running" | "ok" | "partial" | "failed";
  stage?: string; started_at: string; finished_at?: string; name?: string; size?: number; sha256?: string;
  row_total?: number; destinations: DestResult[]; local?: { ok: boolean }; error_bn?: string;
  target?: string; tables?: number; missing?: string[];
};
export type BackupSummary = {
  keys: { set: boolean; fingerprint: string | null; created_at: string | null };
  destinations: BackupDest[];
  schedule: { enabled: boolean; hour: number; minute: number };
  retention: { daily: number; weekly: number; monthly: number };
  health: { ok: boolean; message_bn: string; last_success_at: string | null; running: boolean; schedule_enabled: boolean };
  history: BackupRun[]; cron_url: string; redirect_uri: string; custom_db_url: boolean;
};
export type JobState = { id: string; status: "running" | "ok" | "failed"; error_bn?: string; result?: Record<string, unknown> };

const B = "/api/v1/admin/backup";
const LONG = { timeout: 120000 };

export const backupApi = {
  get: () => api.get<ApiResponse<BackupSummary>>(B),
  setKeys: (d: { passphrase: string; old_passphrase?: string; password: string }) =>
    api.post<ApiResponse<{ fingerprint: string }>>(`${B}/keys`, d, LONG),
  addDest: (d: Record<string, string>) =>
    api.post<ApiResponse<BackupDest & { authorize_url?: string }>>(`${B}/destinations`, d, LONG),
  patchDest: (id: string, d: { enabled?: boolean; label?: string }) => api.patch<ApiResponse<BackupDest>>(`${B}/destinations/${id}`, d),
  testDest: (id: string) => api.post<ApiResponse<{ account: string }>>(`${B}/destinations/${id}/test`, {}, LONG),
  reconnect: (id: string, password: string) =>
    api.post<ApiResponse<{ authorize_url: string }>>(`${B}/destinations/${id}/reconnect`, { password }),
  removeDest: (id: string, password: string) => api.post<ApiResponse<null>>(`${B}/destinations/${id}/remove`, { password }),
  schedule: (d: { enabled: boolean; hour: number; minute: number; daily: number; weekly: number; monthly: number }) =>
    api.put<ApiResponse<unknown>>(`${B}/schedule`, d),
  runNow: () => api.post<ApiResponse<{ run_id: string }>>(`${B}/run`, {}),
  runLocal: () => api.post<ApiResponse<{ run_id: string }>>(`${B}/local`, {}),
  downloadLocal: (runId: string, name: string) => downloadCsv(`${B}/local/${runId}`, name),
  verify: (form: FormData) => api.post<ApiResponse<{ job_id: string }>>(`${B}/verify`, form, LONG),
  restoreTest: (form: FormData) => api.post<ApiResponse<{ job_id: string }>>(`${B}/restore-test`, form, LONG),
  job: (id: string) => api.get<ApiResponse<JobState>>(`${B}/jobs/${id}`),
};

export type DriveGuide = {
  kind: DestKind; name: string; free: string; oauth: boolean; link: string; linkLabel: string; steps: string[]; note?: string;
};

/** Every drive: what it costs, where to go, and short Bangla steps. */
export const DRIVE_GUIDES: DriveGuide[] = [
  {
    kind: "google_drive", name: "Google Drive", free: "১৫ GB ফ্রি (Gmail-এর সাথে ভাগ)", oauth: true,
    link: "https://console.cloud.google.com/apis/credentials", linkLabel: "Google Cloud Console",
    steps: [
      "Google Cloud Console-এ আপনার Gmail দিয়ে ঢুকে একটি নতুন Project বানান।",
      "“APIs & Services → Library” থেকে “Google Drive API” খুঁজে Enable করুন।",
      "“OAuth consent screen” → External → App-এর নাম ও আপনার ইমেইল দিন → Save। তারপর “Publish app” চাপুন (না চাপলে ৭ দিন পর সংযোগ কেটে যায়)।",
      "“Credentials → Create credentials → OAuth client ID” → Web application → “Authorized redirect URIs”-এ নিচের Redirect URI পেস্ট করুন।",
      "Client ID ও Client Secret কপি করে নিচে বসান → “সংযুক্ত করুন” → Google-এ অনুমতি দিন।",
    ],
    note: "শুধু এই app-এর বানানো “ABO Backups” ফোল্ডার দেখতে পারে — আপনার অন্য কোনো ফাইল নয়।",
  },
  {
    kind: "onedrive", name: "Microsoft OneDrive", free: "৫ GB ফ্রি", oauth: true,
    link: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade", linkLabel: "Microsoft App registrations",
    steps: [
      "Microsoft অ্যাকাউন্ট দিয়ে App registrations-এ ঢুকুন → “New registration”। (না খুললে ফ্রি Azure অ্যাকাউন্ট খুলতে হতে পারে।)",
      "Supported account types: “Personal Microsoft accounts” (বা Any org + personal) বাছুন।",
      "Redirect URI: Web → নিচের Redirect URI পেস্ট করে Register।",
      "“Certificates & secrets → New client secret” → Value কপি করুন (মেয়াদ শেষ হওয়ার আগে নতুন বানাতে হবে)।",
      "Overview থেকে “Application (client) ID” কপি করে দুটোই নিচে বসান → “সংযুক্ত করুন”।",
    ],
    note: "শুধু OneDrive-এর Apps ফোল্ডারের ভেতরে লিখতে পারে।",
  },
  {
    kind: "dropbox", name: "Dropbox", free: "২ GB ফ্রি", oauth: true,
    link: "https://www.dropbox.com/developers/apps/create", linkLabel: "Dropbox App Console",
    steps: [
      "Dropbox App Console → “Scoped access” → “App folder” → একটি নাম দিয়ে Create app।",
      "Permissions ট্যাবে files.content.write, files.content.read, files.metadata.read টিক দিয়ে Submit।",
      "Settings ট্যাবে “Redirect URIs”-এ নিচের Redirect URI যোগ করুন।",
      "App key (= Client ID) ও App secret (= Client Secret) কপি করে নিচে বসান → “সংযুক্ত করুন”।",
    ],
    note: "শুধু Dropbox/Apps/<আপনার app> ফোল্ডার দেখতে পারে।",
  },
  {
    kind: "s3", name: "S3 Storage (Cloudflare R2 / Backblaze B2 / Wasabi / AWS)", free: "B2: ১০ GB ফ্রি (কার্ড লাগে না) · R2: ১০ GB ফ্রি", oauth: false,
    link: "https://www.backblaze.com/sign-up/cloud-storage", linkLabel: "Backblaze B2 খুলুন",
    steps: [
      "একটি Private bucket বানান (Public নয়)।",
      "শুধু ওই bucket-এর জন্য একটি Application Key / API token বানান (Read & Write)।",
      "Endpoint (যেমন https://s3.us-west-004.backblazeb2.com বা R2-এর https://<account>.r2.cloudflarestorage.com), Region (R2 হলে auto), Bucket, Access Key ও Secret Key নিচে বসান।",
    ],
  },
  {
    kind: "webdav", name: "WebDAV (Nextcloud / pCloud / Koofr / NAS)", free: "Koofr: ১০ GB ফ্রি · pCloud: ১০ GB পর্যন্ত", oauth: false,
    link: "https://koofr.eu/help/koofr_with_webdav/", linkLabel: "Koofr WebDAV গাইড",
    steps: [
      "আপনার স্টোরেজের WebDAV ঠিকানা নিন (যেমন https://app.koofr.net/dav/Koofr বা Nextcloud-এর …/remote.php/dav/files/<user>)।",
      "মূল পাসওয়ার্ড নয় — শুধু এই কাজের জন্য একটি “App password” বানান।",
      "ঠিকানা, ইউজারনেম ও App password নিচে বসান।",
    ],
  },
];

export const guideOf = (k: string) => DRIVE_GUIDES.find((g) => g.kind === k);
