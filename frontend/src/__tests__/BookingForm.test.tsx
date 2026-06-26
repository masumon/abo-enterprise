import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingForm from "@/components/booking/BookingForm";

jest.mock("@/lib/api");

describe("Booking Form E2E", () => {
  const mockService = {
    id: "1",
    name_en: "Web Development",
    slug: "web-development",
    description_en: "Custom web development",
    pricing_type: "fixed",
    base_price: 50000,
    category: "development",
    is_active: true,
    is_featured: true,
    sort_order: 1,
    lead_priority: 1,
    lead_qualification_score: 70,
    tags: ["react"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render booking form with service info", () => {
    render(<BookingForm service={mockService} />);
    expect(screen.getByText("Web Development")).toBeInTheDocument();
    expect(screen.getByText(/50000/)).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    render(<BookingForm service={mockService} />);
    const submitBtn = screen.getByText(/Book This Service/i);
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Name must be at least/i)).toBeInTheDocument();
    });
  });

  it("should validate BD phone number format", async () => {
    const user = userEvent.setup();
    render(<BookingForm service={mockService} />);

    const phoneInput = screen.getByPlaceholderText(/01XXXXXXXXX/);
    await user.type(phoneInput, "12345678");

    const submitBtn = screen.getByText(/Book This Service/i);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid Bangladesh phone number/i)).toBeInTheDocument();
    });
  });

  it("should submit booking with valid data", async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    render(<BookingForm service={mockService} onSuccess={mockOnSuccess} />);

    await user.type(screen.getByPlaceholderText(/Your full name/), "John Doe");
    await user.type(screen.getByPlaceholderText(/01XXXXXXXXX/), "01712345678");
    await user.type(screen.getByPlaceholderText(/your@email.com/), "john@example.com");
    await user.type(
      screen.getByPlaceholderText(/Please describe your requirements/),
      "I need a custom web application for my e-commerce business"
    );

    const submitBtn = screen.getByText(/Book This Service/i);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument();
    });
  });
});
