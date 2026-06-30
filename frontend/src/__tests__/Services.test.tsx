import { render, screen } from "@testing-library/react";
import ServicesPageClient from "@/app/services/ServicesPageClient";

jest.mock("@/store/language", () => ({
  useLanguageStore: () => ({ lang: "en" }),
}));

jest.mock("@/lib/api", () => ({
  servicesApi: {
    list: jest.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } }),
  },
}));

describe("Services Page", () => {
  it("should display featured service categories", () => {
    render(<ServicesPageClient initialServices={[]} initialTotal={0} />);
    expect(screen.getByText("Printing Services")).toBeInTheDocument();
    expect(screen.getByText("Software Development")).toBeInTheDocument();
    expect(screen.getByText("Legal Assistance")).toBeInTheDocument();
  });

  it("should link to software services page", () => {
    render(<ServicesPageClient initialServices={[]} initialTotal={0} />);
    const links = screen.getAllByRole("link", { name: /Explore/i });
    expect(links.some((l) => l.getAttribute("href") === "/services/software")).toBe(true);
  });

  it("should show technology section", () => {
    render(<ServicesPageClient initialServices={[]} initialTotal={0} />);
    expect(screen.getByText("Powered by Modern Technology")).toBeInTheDocument();
  });
});
