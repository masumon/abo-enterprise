import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/page";

describe("Homepage E2E", () => {
  it("should render homepage with hero and features", () => {
    render(<HomePage />);
    expect(screen.getByText(/Welcome to ABO/i)).toBeInTheDocument();
  });

  it("should navigate to services page", async () => {
    render(<HomePage />);
    const servicesLink = screen.getByText(/Our Services/i);
    await userEvent.click(servicesLink);
    expect(window.location.href).toContain("/services");
  });

  it("should navigate to projects page", async () => {
    render(<HomePage />);
    const projectsLink = screen.getByText(/Custom Projects/i);
    await userEvent.click(projectsLink);
    expect(window.location.href).toContain("/projects");
  });
});
