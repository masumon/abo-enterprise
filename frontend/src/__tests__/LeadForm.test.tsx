import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeadForm from "@/components/projects/LeadForm";
import { serviceLeadsApi } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  serviceLeadsApi: {
    create: jest.fn(),
  },
}));

const mockCreate = serviceLeadsApi.create as jest.Mock;

describe("Lead Form", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ status: 201, data: { data: {} } });
  });

  it("should render lead form with all fields", () => {
    render(<LeadForm />);
    expect(screen.getByText(/What service do you need/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Your full name/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/01XXXXXXXXX/)).toBeInTheDocument();
  });

  it("should validate project description length", async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    await user.click(screen.getByText(/Submit Project Inquiry/i));

    await waitFor(() => {
      expect(screen.getByText(/minimum 20 characters/i)).toBeInTheDocument();
    });
  });

  it("should accept budget range input", async () => {
    const user = userEvent.setup();
    render(<LeadForm />);

    await user.type(screen.getByPlaceholderText(/Min budget/), "100000");
    await user.type(screen.getByPlaceholderText(/Max budget/), "500000");

    expect(screen.getByPlaceholderText(/Min budget/)).toHaveValue(100000);
    expect(screen.getByPlaceholderText(/Max budget/)).toHaveValue(500000);
  });

  it("should submit lead inquiry with valid data", async () => {
    const user = userEvent.setup();
    render(<LeadForm />);

    const [serviceSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(serviceSelect, "software_development");
    await user.type(screen.getByPlaceholderText(/Your full name/), "Jane Smith");
    await user.type(screen.getByPlaceholderText(/your@email.com/), "jane@example.com");
    await user.type(screen.getByPlaceholderText(/01XXXXXXXXX/), "0191234567");
    await user.type(
      screen.getByPlaceholderText(/Tell us about your project/),
      "We need a custom CRM system with integration capabilities"
    );
    await user.type(
      screen.getByPlaceholderText(/What are your specific requirements/),
      "Multi-user support, real-time notifications, and mobile compatibility required"
    );
    await user.click(screen.getByText(/Submit Project Inquiry/i));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(screen.getByText(/received your inquiry/i)).toBeInTheDocument();
    });
  });
});
