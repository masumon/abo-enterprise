import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApiWarmup from "@/components/ui/ApiWarmup";

// ─── Module-level mocks ───────────────────────────────────────────────────────

const mockUsePathname = jest.fn(() => "/");
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

jest.mock("@/store/language", () => ({
  useLanguageStore: () => ({ lang: "en" }),
}));

jest.mock("@/lib/apiBase", () => ({
  getApiBaseUrl: () => "http://test-api",
}));

jest.mock("@/lib/brand", () => ({
  BRAND_NAME: "Test Brand",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/BrandLogo", () => ({
  __esModule: true,
  default: function MockBrandLogo() {
    return <div data-testid="brand-logo" />;
  },
}));

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/** All endpoints fail → warmup never completes, overlay stays visible. */
function useFailFetch() {
  (global.fetch as jest.Mock).mockImplementation(() =>
    Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  );
}

/** Settings returns custom data; all other endpoints fail → overlay stays. */
function usePartialFetch(settingsData: Record<string, string>) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (String(url).includes("/settings")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: settingsData }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

/** All endpoints succeed → warmup completes, component returns null. */
function useOkFetch(settingsData: Record<string, string> = {}) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (String(url).includes("/settings")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: settingsData }),
      });
    }
    return Promise.resolve({ ok: true });
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUsePathname.mockReturnValue("/");
  Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
  global.requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0; };
  global.cancelAnimationFrame = jest.fn() as typeof cancelAnimationFrame;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── State transition tests (warmed=false for all) ────────────────────────────
// These tests use failing fetch so `warmed` stays false throughout.

describe("ApiWarmup — state transitions", () => {
  it("shows full-page overlay on the home page while warming", async () => {
    mockUsePathname.mockReturnValue("/");
    useFailFetch();

    render(<ApiWarmup />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Welcome!")).toBeInTheDocument();
  });

  it("shows compact toast while warming on non-home pages", async () => {
    mockUsePathname.mockReturnValue("/products");
    useFailFetch();

    render(<ApiWarmup />);

    expect(screen.getByText("You can continue browsing")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("shows 'Starting secure server...' status before health is ready", async () => {
    mockUsePathname.mockReturnValue("/");
    useFailFetch();

    render(<ApiWarmup />);

    expect(screen.getAllByText(/Starting secure server\.\.\./i).length).toBeGreaterThan(0);
  });

  it("updates welcome text from admin settings when available", async () => {
    mockUsePathname.mockReturnValue("/");
    usePartialFetch({ warmup_welcome_en: "Hello World!" });

    render(<ApiWarmup />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Hello World!/i })).toBeInTheDocument();
    });
  });

  it("falls back to default welcome text when settings have no warmup keys", async () => {
    mockUsePathname.mockReturnValue("/");
    usePartialFetch({});

    render(<ApiWarmup />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Welcome!/i })).toBeInTheDocument();
    });
  });
});

// ─── Early readiness exit (dismiss) tests ────────────────────────────────────
// warmed is still false here — failing fetch keeps overlay visible.

describe("ApiWarmup — early readiness exit", () => {
  it("clicking 'Continue now' hides the full-page overlay", async () => {
    mockUsePathname.mockReturnValue("/");
    useFailFetch();

    render(<ApiWarmup />);

    expect(screen.getByText("Welcome!")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /continue now/i }));

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText("You can continue browsing")).toBeInTheDocument();
  });

  it("compact toast remains visible after dismiss while still warming", async () => {
    mockUsePathname.mockReturnValue("/");
    useFailFetch();

    render(<ApiWarmup />);
    await userEvent.click(screen.getByRole("button", { name: /continue now/i }));

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("compact toast shows loading status text after dismiss", async () => {
    mockUsePathname.mockReturnValue("/");
    useFailFetch();

    render(<ApiWarmup />);
    await userEvent.click(screen.getByRole("button", { name: /continue now/i }));

    expect(screen.getByText(/Starting secure server\.\.\./i)).toBeInTheDocument();
  });

  it("does not show the full-page overlay again after dismiss", async () => {
    mockUsePathname.mockReturnValue("/");
    useFailFetch();

    render(<ApiWarmup />);
    await userEvent.click(screen.getByRole("button", { name: /continue now/i }));

    expect(screen.queryByText("Welcome!")).not.toBeInTheDocument();
  });
});

// Enough ticks to drain the full async poll chain (fetch → json → setState).
const PROMISE_FLUSH_TICKS = 20;

/** Flush all pending Promises/microtasks across multiple ticks. */
const flushPromises = async () => {
  for (let i = 0; i < PROMISE_FLUSH_TICKS; i++) {
    await Promise.resolve();
  }
};

// ─── Completion & warm-cache tests ───────────────────────────────────────────
// These run last. The "all-ok" test sets warmed=true in the module; the
// "already warmed" test verifies the module-level cache is respected.

describe("ApiWarmup — completion", () => {
  it("disappears (returns null) when all endpoints respond successfully", async () => {
    mockUsePathname.mockReturnValue("/");
    useOkFetch();

    const { container } = render(<ApiWarmup />);

    // Flush pending Promise callbacks from the async poll so state updates apply.
    await act(async () => {
      await flushPromises();
    });

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing immediately when module-level warm cache is set", () => {
    // warmed=true was set by the previous test; even with failing fetch the
    // component should short-circuit and return null at mount.
    useFailFetch();

    const { container } = render(<ApiWarmup />);

    expect(container.firstChild).toBeNull();
  });
});


