import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServicesPage from "@/app/services/page";

jest.mock("@/store/language", () => ({
  useLanguageStore: () => ({ lang: "en" }),
}));

describe("Services Page", () => {
  it("should display core service categories", () => {
    render(<ServicesPage />);
    expect(screen.getByText("Printing Services")).toBeInTheDocument();
    expect(screen.getByText("Software Development")).toBeInTheDocument();
    expect(screen.getByText("Legal Assistance")).toBeInTheDocument();
  });

  it("should link to software services page", async () => {
    render(<ServicesPage />);
    const link = screen.getByRole("link", { name: /Discuss Your Project/i });
    expect(link).toHaveAttribute("href", "/services/software");
  });

  it("should show technology section", () => {
    render(<ServicesPage />);
    expect(screen.getByText("Powered by Modern Technology")).toBeInTheDocument();
  });
});
