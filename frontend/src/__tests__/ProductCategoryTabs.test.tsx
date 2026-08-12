import { fireEvent, render, screen } from "@testing-library/react";
import ProductCategoryTabs from "@/components/home/ProductCategoryTabs";

jest.mock("@/store/language", () => ({
  useLanguageStore: () => ({ lang: "en" }),
}));

describe("ProductCategoryTabs", () => {
  it("exposes the category controls as an accessible tablist", () => {
    render(<ProductCategoryTabs activeCategory="all" />);

    expect(screen.getByRole("tablist", { name: "Product categories" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Premium Gadgets" })).toHaveAttribute("aria-selected", "false");
  });

  it("supports arrow-key tab navigation and updates the selected category", () => {
    const onCategoryChange = jest.fn();
    render(<ProductCategoryTabs activeCategory="all" onCategoryChange={onCategoryChange} />);

    const allTab = screen.getByRole("tab", { name: "All" });
    fireEvent.keyDown(allTab, { key: "ArrowRight" });

    expect(onCategoryChange).toHaveBeenCalledWith("gadgets");
    expect(screen.getByRole("tab", { name: "Premium Gadgets" })).toHaveAttribute("aria-selected", "true");
  });

  it("supports Home and End keyboard navigation", () => {
    const onCategoryChange = jest.fn();
    render(<ProductCategoryTabs activeCategory="all" onCategoryChange={onCategoryChange} />);

    const allTab = screen.getByRole("tab", { name: "All" });
    fireEvent.keyDown(allTab, { key: "End" });
    expect(onCategoryChange).toHaveBeenCalledWith("computer");

    const computerTab = screen.getByRole("tab", { name: "Computer" });
    fireEvent.keyDown(computerTab, { key: "Home" });
    expect(onCategoryChange).toHaveBeenCalledWith("all");
  });
});
