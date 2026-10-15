import { render, screen, waitFor } from "@testing-library/react";
import BackupPage from "@/app/sumon/backup/page";
import { backupApi } from "@/lib/backup";

jest.mock("@/lib/api", () => ({ __esModule: true, default: {}, downloadCsv: jest.fn() }));
jest.mock("@/components/admin/AdminPageHeader", () => ({ __esModule: true, default: ({ titleBn }: { titleBn?: string }) => <h1>{titleBn}</h1> }));
jest.mock("@/lib/backup", () => {
  const actual = jest.requireActual("@/lib/backup");
  return { ...actual, backupApi: { ...actual.backupApi, get: jest.fn() } };
});

const fresh = {
  keys: { set: false, fingerprint: null, created_at: null },
  destinations: [],
  schedule: { enabled: false, hour: 3, minute: 30 },
  retention: { daily: 14, weekly: 8, monthly: 6 },
  health: { ok: false, message_bn: "কোনো ড্রাইভ যুক্ত নেই — Backup চালু হয়নি।", last_success_at: null, next_run_at: null, running: false, schedule_enabled: false },
  history: [], cron_url: "https://x/cron", redirect_uri: "https://x/cb", custom_db_url: false,
  one_click: { google_drive: false, onedrive: false, dropbox: false },
};

describe("Backup page", () => {
  it("renders a fresh setup without crashing", async () => {
    (backupApi.get as jest.Mock).mockResolvedValue({ data: { data: fresh } });
    render(<BackupPage />);
    await waitFor(() => expect(screen.getByText("Backup পাসওয়ার্ড দিন")).toBeInTheDocument());
  });

  it("renders a configured setup with history without crashing", async () => {
    (backupApi.get as jest.Mock).mockResolvedValue({ data: { data: {
      ...fresh,
      keys: { set: true, fingerprint: "AAAA-BBBB-CCCC-DDDD", created_at: "2026-10-16T10:00:00Z" },
      destinations: [{ id: "d1", kind: "google_drive", label: "Google Drive", enabled: true, connected: true, created_at: "", cfg: { account: "a@b.c" } }],
      schedule: { enabled: true, hour: 3, minute: 30 },
      health: { ...fresh.health, ok: true, message_bn: "Backup ঠিক আছে।", last_success_at: "2026-10-16T10:00:00Z", next_run_at: "2026-10-17T03:30:00+06:00" },
      history: [{ id: "r1", trigger: "manual", status: "ok", started_at: "2026-10-16T10:00:00Z", size: 2048, row_total: 10,
        destinations: [{ dest_id: "d1", kind: "google_drive", label: "Google Drive", ok: true, verified: true, file_id: "f" }] }],
    } } });
    render(<BackupPage />);
    await waitFor(() => expect(screen.getByText("Backup ঠিক আছে।")).toBeInTheDocument());
  });
});

describe("Backup page interactions", () => {
  it("opens the drive picker and Google Drive form, and shows OAuth help", async () => {
    const { fireEvent } = await import("@testing-library/react");
    window.history.replaceState(null, "", "/sumon/backup?oauth=denied&reason=access_denied");
    (backupApi.get as jest.Mock).mockResolvedValue({ data: { data: { ...fresh, keys: { set: true, fingerprint: "AAAA", created_at: null } } } });
    render(<BackupPage />);
    await waitFor(() => expect(screen.getByText(/access_denied/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("ড্রাইভ যোগ করুন"));
    fireEvent.click(screen.getByText("Google Drive"));
    expect(screen.getByText(/JSON ফাইলটি একবার দিন/)).toBeInTheDocument();
  });
});
