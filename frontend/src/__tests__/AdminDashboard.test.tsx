import { render, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "@/app/admin/page";

const mockStats = jest.fn();
const mockGet = jest.fn();

jest.mock("@/store/alerts", () => ({
  useAlertStore: jest.fn((selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      lastUpdated: null,
      pendingOrders: 0,
      pendingBookings: 0,
      newLeads: 0,
      set: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  adminApi: {
    stats: (...args: unknown[]) => mockStats(...args),
  },
}));

describe("Admin Dashboard", () => {
  const statsPayload = {
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
        created_at: new Date().toISOString(),
      },
    ],
    recent_leads: [
      {
        id: "1",
        name: "Test Lead",
        lead_type: "project",
        phone: "01712345678",
        status: "contacted",
        created_at: new Date().toISOString(),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStats.mockResolvedValue({ data: { data: statsPayload } });
    mockGet.mockResolvedValue({ data: { data: { revenue: { total: 12000 } } } });
  });

  it("should display dashboard stats", async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/^Orders$/)).toBeInTheDocument();
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
