import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeadForm from "@/components/projects/LeadForm";

jest.mock("@/lib/api");

describe("Lead Form E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const submitBtn = screen.getByText(/Submit Project Inquiry/i);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/minimum 20 characters/i)).toBeInTheDocument();
    });
  });

  it("should accept budget range input", async () => {
    const user = userEvent.setup();
    render(<LeadForm />);

    const budgetMinInput = screen.getByPlaceholderText(/Min budget/);
    const budgetMaxInput = screen.getByPlaceholderText(/Max budget/);

    await user.type(budgetMinInput, "100000");
    await user.type(budgetMaxInput, "500000");

    expect(budgetMinInput).toHaveValue(100000);
    expect(budgetMaxInput).toHaveValue(500000);
  });

  it("should submit lead inquiry with valid data", async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LeadForm onSuccess={mockOnSuccess} />);

    // Fill form
    await user.selectOptions(
      screen.getByText(/What service do you need/i).closest("select")!,
      "software_development"
    );
    await user.type(screen.getByPlaceholderText(/Your full name/), "Jane Smith");
    await user.type(screen.getByPlaceholderText(/your@email.com/), "jane@example.com");
    await user.type(screen.getByPlaceholderText(/01XXXXXXXXX/), "01912345678");
    await user.type(
      screen.getByPlaceholderText(/Tell us about your project/),
      "We need a custom CRM system with integration capabilities"
    );
    await user.type(
      screen.getByPlaceholderText(/What are your specific requirements/),
      "Multi-user support, real-time notifications, and mobile compatibility required"
    );

    const submitBtn = screen.getByText(/Submit Project Inquiry/i);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/received your inquiry/i)).toBeInTheDocument();
    });
  });
});
