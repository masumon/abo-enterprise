import { fireEvent, render, screen } from "@testing-library/react";
import Accordion from "@/components/ui/Accordion";

describe("Accordion", () => {
  const items = [
    { id: "faq-1", question: "Question one", answer: "Answer one" },
    { id: "faq-2", question: "Question two", answer: "Answer two" },
  ];

  it("exposes expanded state and labelled regions", () => {
    render(<Accordion items={items} />);

    const first = screen.getByRole("button", { name: "Question one" });
    const panel = document.getElementById("faq-1-panel");

    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(first).toHaveAttribute("aria-controls", "faq-1-panel");
    expect(panel).toHaveAttribute("role", "region");
    expect(panel).toHaveAttribute("aria-labelledby", "faq-1-trigger");
  });

  it("opens one item and closes it when toggled again", () => {
    render(<Accordion items={items} />);

    const first = screen.getByRole("button", { name: "Question one" });
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Answer one")).toBeInTheDocument();

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps only one item open by default", () => {
    render(<Accordion items={items} />);

    fireEvent.click(screen.getByRole("button", { name: "Question one" }));
    fireEvent.click(screen.getByRole("button", { name: "Question two" }));

    expect(screen.getByRole("button", { name: "Question one" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Question two" })).toHaveAttribute("aria-expanded", "true");
  });
});
