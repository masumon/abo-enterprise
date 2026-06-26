import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "@/app/admin/page";
import { adminApi } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  adminApi: {
    stats: jest.fn(),
  },
}));

describe("Admin Dashboard E2E", () => {
  const mockStats = {
    total_orders: 45,
    pending_orders: 8,
    total_bookings: 23,
    pending_bookings: 5,
    new_leads: 12,
    total_leads: 89,
    total_products: 156,
    recent_orders: [
      {
        id: "1",
        order_number: "ORD-2024-001",
        customer_name: "Test Customer",
        total: 5000,
        order_status: "completed",
        items: [],
        customer_phone: "01712345678",
        payment_method: "bkash",
        payment_status: "completed",
        order_status: "completed",
        subtotal: 5000,
        delivery_charge: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    recent_leads: [
      {
        id: "1",
        lead_number: "LF-2024-001",
        name: "Test Lead",
        qualification_score: 75,
        status: "contacted",
        phone: "01712345678",
        lead_type: "project",
        source: "website",
        attachments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.stats as jest.Mock).mockResolvedValue({ data: { data: mockStats } });
  });

  it("should display dashboard stats", async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Total Orders/)).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
    });
  });

  it("should show pending items count", async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/8 pending/)).toBeInTheDocument();
      expect(screen.getByText(/5 pending/)).toBeInTheDocument();
    });
  });

  it("should display recent orders", async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Test Customer/)).toBeInTheDocument();
      expect(screen.getByText(/ORD-2024-001/)).toBeInTheDocument();
    });
  });

  it("should display recent leads", async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Test Lead/)).toBeInTheDocument();
    });
  });
});
