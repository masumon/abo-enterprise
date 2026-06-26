import api from "@/lib/api";

jest.mock("axios");

describe("API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Services API", () => {
    it("should fetch services list", async () => {
      const mockServices = [
        {
          id: "1",
          name_en: "Web Development",
          slug: "web-development",
          pricing_type: "fixed",
          base_price: 50000,
        },
      ];

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockServices },
      });

      const response = await api.get("/services");
      expect(response.data.data).toEqual(mockServices);
      expect(api.get).toHaveBeenCalledWith("/services");
    });

    it("should fetch service by slug", async () => {
      const mockService = {
        id: "1",
        slug: "web-development",
        name_en: "Web Development",
        pricing_type: "fixed",
      };

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockService },
      });

      const response = await api.get("/services/slug/web-development");
      expect(response.data.data).toEqual(mockService);
    });
  });

  describe("Bookings API", () => {
    it("should create booking", async () => {
      const bookingData = {
        service_id: "1",
        customer_name: "John Doe",
        customer_phone: "01712345678",
        customer_email: "john@example.com",
        details: "I need a custom web application",
      };

      const mockResponse = {
        id: "booking-1",
        booking_number: "BK-2024-001",
        status: "pending",
        ...bookingData,
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockResponse },
        status: 201,
      });

      const response = await api.post("/bookings", bookingData);
      expect(response.status).toBe(201);
      expect(response.data.data.booking_number).toMatch(/^BK-/);
    });

    it("should fetch booking by ID", async () => {
      const mockBooking = {
        id: "1",
        booking_number: "BK-2024-001",
        status: "confirmed",
      };

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockBooking },
      });

      const response = await api.get("/bookings/1");
      expect(response.data.data.booking_number).toBe("BK-2024-001");
    });

    it("should update booking status", async () => {
      const updateData = { status: "completed" };

      (api.patch as jest.Mock).mockResolvedValue({
        data: { data: { id: "1", status: "completed" } },
      });

      const response = await api.patch("/bookings/1/status", updateData);
      expect(response.data.data.status).toBe("completed");
    });
  });

  describe("Leads API", () => {
    it("should create lead", async () => {
      const leadData = {
        lead_type: "software_development",
        name: "Jane Smith",
        phone: "01912345678",
        email: "jane@example.com",
        project_description: "We need a custom CRM system",
        requirements: "Multi-user support required",
      };

      const mockResponse = {
        id: "lead-1",
        lead_number: "LF-2024-001",
        qualification_score: 65,
        status: "new",
        ...leadData,
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: { data: mockResponse },
        status: 201,
      });

      const response = await api.post("/leads", leadData);
      expect(response.status).toBe(201);
      expect(response.data.data.qualification_score).toBeGreaterThanOrEqual(0);
      expect(response.data.data.qualification_score).toBeLessThanOrEqual(100);
    });

    it("should fetch leads with pagination", async () => {
      const mockLeads = [
        { id: "1", lead_number: "LF-2024-001", qualification_score: 70 },
        { id: "2", lead_number: "LF-2024-002", qualification_score: 55 },
      ];

      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: mockLeads,
          meta: { page: 1, per_page: 10, total: 2, total_pages: 1 },
        },
      });

      const response = await api.get("/leads?page=1");
      expect(response.data.data).toHaveLength(2);
      expect(response.data.meta.total).toBe(2);
    });

    it("should update lead status", async () => {
      const updateData = { status: "qualified" };

      (api.patch as jest.Mock).mockResolvedValue({
        data: { data: { id: "1", status: "qualified" } },
      });

      const response = await api.patch("/leads/1/status", updateData);
      expect(response.data.data.status).toBe("qualified");
    });
  });

  describe("Admin Stats API", () => {
    it("should fetch dashboard statistics", async () => {
      const mockStats = {
        total_orders: 45,
        pending_orders: 8,
        total_bookings: 23,
        pending_bookings: 5,
        new_leads: 12,
        total_leads: 89,
        total_products: 156,
        recent_orders: [],
        recent_leads: [],
      };

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockStats },
      });

      const response = await api.get("/admin/stats");
      expect(response.data.data.total_orders).toBe(45);
      expect(response.data.data.pending_leads).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const error = new Error("API Error");
      (api.get as jest.Mock).mockRejectedValue(error);

      await expect(api.get("/services")).rejects.toThrow("API Error");
    });

    it("should handle validation errors", async () => {
      const validationError = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ["body", "name"],
                msg: "Name is required",
              },
            ],
          },
        },
      };

      (api.post as jest.Mock).mockRejectedValue(validationError);

      try {
        await api.post("/bookings", {});
        fail("Should have thrown error");
      } catch (error) {
        expect((error as any).response.status).toBe(422);
      }
    });
  });
});
