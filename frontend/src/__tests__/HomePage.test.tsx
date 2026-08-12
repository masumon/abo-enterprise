import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

jest.mock("next/dynamic", () => () => {
  const DynamicMock = () => null;
  DynamicMock.displayName = "DynamicMock";
  return DynamicMock;
});

jest.mock("@/components/home/Hero", () => function MockHero() {
  return <section><h1>Hero Section</h1></section>;
});

// Several statically-imported home sections (CategoryCards, WhyChooseUsCards,
// ReviewStatsCard) fetch CMS settings / public stats on mount. Unmocked, jsdom's
// XHR fails with ERR_NETWORK (no backend reachable) — each hook already
// catches that internally and falls back to its default content, so the test
// still passes, but the real request leaves Jest waiting on open handles
// before it can exit cleanly. Mocking both keeps this a fast, quiet unit test.
jest.mock("@/hooks/usePublicSettings", () => ({
  usePublicSettings: () => ({ settings: {}, loading: false }),
  getSettingValue: (_settings: Record<string, string>, _key: string, fallback = "") => fallback,
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    publicApi: {
      ...actual.publicApi,
      stats: () => Promise.resolve({ data: { data: null } }),
      featureFlags: () => Promise.resolve({ data: { data: {} } }),
    },
  };
});

describe("Homepage", () => {
  // HomePage is an async Server Component (it awaits fetchPublicSettings()
  // for the JSON-LD structured data) — react-dom's classic renderer can't
  // reconcile a Promise as a child, so the async function is awaited
  // directly to resolve its JSX first, then that resolved element is what
  // gets rendered. `fetchPublicSettings` itself fails soft (catches and
  // returns {}) when there's no backend to reach, so no network mock is
  // needed here.
  it("renders the hero section", async () => {
    render(await HomePage());
    expect(screen.getByText("Hero Section")).toBeInTheDocument();
  });

  it("renders the hero section container", async () => {
    const { container } = render(await HomePage());
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("does not fabricate business contact data when runtime settings are unavailable", async () => {
    const { container } = render(await HomePage());
    const jsonLd = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => script.textContent ?? "")
      .join("\n");

    expect(jsonLd).not.toContain("+8801825007977");
    expect(jsonLd).not.toContain("Hazi Bahar Uddin Market");
    expect(jsonLd).not.toContain("www.facebook.com/abo.enterprise");
  });
});
