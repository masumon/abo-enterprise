jest.mock("axios", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  global.__mockAxiosInstance = instance;
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
    },
    create: jest.fn(() => instance),
  };
});

import api, { productsApi, bookingsApi, leadsApi, adminApi } from "@/lib/api";

const mockAxiosInstance = global.__mockAxiosInstance as {
  get: jest.Mock;
  post: jest.Mock;
};

describe("API client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("productsApi.list calls the products endpoint", async () => {
    const mockProducts = [{ slug: "phone-case", name_en: "Phone Case", price: 299 }];
    mockAxiosInstance.get.mockResolvedValue({ data: { data: mockProducts } });

    const response = await productsApi.list();
    expect(response.data.data).toEqual(mockProducts);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith("/api/v1/products", { params: undefined });
  });

  it("bookingsApi.create posts booking payload", async () => {
    const bookingData = {
      service_id: "1",
      customer_name: "John Doe",
      customer_phone: "0171234567",
    };
    mockAxiosInstance.post.mockResolvedValue({
      status: 201,
      data: { data: { id: "booking-1", booking_number: "BK-2024-001" } },
    });

    const response = await bookingsApi.create(bookingData as never);
    expect(response.status).toBe(201);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/v1/bookings", bookingData);
  });

  it("leadsApi.create posts lead payload", async () => {
    const leadData = {
      lead_type: "software_development",
      name: "Jane Smith",
      phone: "0191234567",
    };
    mockAxiosInstance.post.mockResolvedValue({
      status: 201,
      data: { data: { id: "lead-1", lead_number: "LF-2024-001" } },
    });

    const response = await leadsApi.create(leadData as never);
    expect(response.status).toBe(201);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/v1/leads", leadData);
  });

  it("adminApi.stats fetches dashboard stats", async () => {
    const mockStats = { total_orders: 45, pending_orders: 8 };
    mockAxiosInstance.get.mockResolvedValue({ data: { data: mockStats } });

    const response = await adminApi.stats();
    expect(response.data.data.total_orders).toBe(45);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith("/api/v1/admin/stats");
  });

  it("propagates API errors", async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error("API Error"));
    await expect(api.get("/api/v1/products")).rejects.toThrow("API Error");
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __mockAxiosInstance: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
    interceptors: {
      request: { use: jest.Mock };
      response: { use: jest.Mock };
    };
  };
}

export {};
