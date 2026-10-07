import "@testing-library/jest-dom";

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ isIntersecting: true }], this);
  }
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = MockIntersectionObserver;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Default: a failed (non-ok) response. Tests override per-case with mockResolvedValue.
global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 503, json: async () => ({}) }));

// jsdom has no AbortSignal.timeout; keep tests independent of it (test-only shim).
if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout !== "function") {
  AbortSignal.timeout = (ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms).unref?.();
    return controller.signal;
  };
}
