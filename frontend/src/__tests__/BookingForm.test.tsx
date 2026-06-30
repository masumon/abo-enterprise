import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingForm from "@/components/booking/BookingForm";
import { serviceBookingsApi } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  serviceBookingsApi: {
    create: jest.fn(),
  },
}));

const mockCreate = serviceBookingsApi.create as jest.Mock;

describe("Booking Form", () => {
  const mockService = {
    id: "1",
    name_en: "Web Development",
    slug: "web-development",
    description_en: "Custom web development",
    pricing_type: "fixed" as const,
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
    mockCreate.mockResolvedValue({ status: 201, data: { data: {} } });
  });

  it("should render booking form with service info", () => {
    render(<BookingForm service={mockService} />);
    expect(screen.getByText("Web Development")).toBeInTheDocument();
    expect(screen.getByText(/50000/)).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    render(<BookingForm service={mockService} />);
    await userEvent.click(screen.getByText(/Book This Service/i));

    await waitFor(() => {
      expect(screen.getByText(/Name must be at least/i)).toBeInTheDocument();
    });
  });

  it("should validate BD phone number format", async () => {
    const user = userEvent.setup();
    render(<BookingForm service={mockService} />);

    await user.type(screen.getByPlaceholderText(/01XXXXXXXXX/), "12345678");
    await user.click(screen.getByText(/Book This Service/i));

    await waitFor(() => {
      expect(screen.getByText(/Invalid Bangladesh phone number/i)).toBeInTheDocument();
    });
  });

  it("should submit booking with valid data", async () => {
    const user = userEvent.setup();
    render(<BookingForm service={mockService} />);

    await user.type(screen.getByPlaceholderText(/Your full name/), "John Doe");
    await user.type(screen.getByPlaceholderText(/01XXXXXXXXX/), "01712345678");
    await user.type(screen.getByPlaceholderText(/your@email.com/), "john@example.com");
    await user.type(
      screen.getByPlaceholderText(/Please describe your requirements in detail/),
      "I need a custom web application for my e-commerce business"
    );
    await user.click(screen.getByText(/Book This Service/i));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument();
    });
  });
});
