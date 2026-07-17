import { render, screen } from "@testing-library/react";
import ServicesPageClient from "@/app/services/ServicesPageClient";
import type { Category } from "@/types";

jest.mock("@/store/language", () => ({
  useLanguageStore: () => ({ lang: "en" }),
}));

jest.mock("@/lib/catalogLoader", () => ({
  loadServices: jest.fn().mockResolvedValue({ services: [], total: 0, source: "api" }),
  peekCachedServices: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/apiCache", () => ({
  cacheApiResponse: jest.fn().mockResolvedValue(undefined),
  getCachedApiResponse: jest.fn().mockResolvedValue(null),
  servicesCacheKey: jest.fn(() => "services-cache-key"),
  SETTINGS_CACHE_KEY: "settings",
}));

const mockCategories: Category[] = [
  {
    id: "cat-1",
    slug: "printing-documentation",
    name_en: "Print & Documentation",
    name_bn: "প্রিন্ট ও ডকুমেন্টেশন",
    icon: "Printer",
    is_active: true,
    applies_to: ["service"],
    sort_order: 1,
    subcategories: [
      {
        id: "sub-1",
        slug: "visiting-card",
        name_en: "Visiting Card",
        name_bn: "ভিজিটিং কার্ড",
        is_active: true,
        sort_order: 1,
      },
    ],
  } as unknown as Category,
];

describe("Services Page", () => {
  it("should display the static service groups when the taxonomy is empty", () => {
    render(<ServicesPageClient initialServices={[]} initialTotal={0} />);
    expect(screen.getByText("Digital Services")).toBeInTheDocument();
    expect(screen.getByText("Print & Documentation")).toBeInTheDocument();
    expect(screen.getByText("AI Solutions")).toBeInTheDocument();
  });

  it("should build the All Services filter chips from the live taxonomy", () => {
    render(
      <ServicesPageClient
        initialServices={[]}
        initialTotal={0}
        initialCategories={mockCategories}
      />
    );
    const chip = screen.getByRole("button", { name: "Print & Documentation" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("should link live taxonomy cards into the nested category routes", () => {
    render(
      <ServicesPageClient initialServices={[]} initialTotal={0} initialCategories={mockCategories} />
    );
    const categoryLink = screen.getByRole("link", { name: /Print & Documentation/i });
    expect(categoryLink).toHaveAttribute("href", "/services/printing-documentation");
    const subcategoryLink = screen.getByRole("link", { name: "Visiting Card" });
    expect(subcategoryLink).toHaveAttribute("href", "/services/printing-documentation/visiting-card");
  });

  it("should show technology section", () => {
    render(<ServicesPageClient initialServices={[]} initialTotal={0} />);
    expect(screen.getByText("Powered by Modern Technology")).toBeInTheDocument();
  });
});
