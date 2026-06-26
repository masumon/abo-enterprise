import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServicesPage from "@/app/services/page";

jest.mock("@/lib/api");

describe("Services Page E2E", () => {
  const mockServices = [
    {
      id: "1",
      name_en: "Web Development",
      slug: "web-development",
      description_en: "Custom web solutions",
      pricing_type: "fixed",
      base_price: 50000,
      category: "development",
      is_active: true,
      is_featured: true,
      sort_order: 1,
      lead_priority: 1,
      lead_qualification_score: 70,
      tags: ["react", "nextjs"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: mockServices }),
      })
    ) as jest.Mock;
  });

  it("should display services list", async () => {
    render(<ServicesPage />);
    await waitFor(() => {
      expect(screen.getByText("Web Development")).toBeInTheDocument();
    });
  });

  it("should filter services by category", async () => {
    render(<ServicesPage />);
    const filterBtn = screen.getByText("development");
    await userEvent.click(filterBtn);
    await waitFor(() => {
      expect(screen.getByText("Web Development")).toBeInTheDocument();
    });
  });

  it("should navigate to service detail page", async () => {
    render(<ServicesPage />);
    const serviceLink = screen.getByText("Web Development");
    await userEvent.click(serviceLink);
    expect(window.location.href).toContain("/services/web-development");
  });
});
