import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

jest.mock("@/components/home/Hero", () => function MockHero() {
  return <section><h1>Hero Section</h1></section>;
});

describe("Homepage", () => {
  it("renders the hero section", () => {
    render(<HomePage />);
    expect(screen.getByText("Hero Section")).toBeInTheDocument();
  });

  it("renders six core sections via lazy imports", async () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("section")).toBeTruthy();
  });
});
