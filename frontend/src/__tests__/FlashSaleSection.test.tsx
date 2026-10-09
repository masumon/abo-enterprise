import { act, render } from "@testing-library/react";
import FlashSaleSection from "@/components/home/FlashSaleSection";

let mockSettings: Record<string, string> = {};
jest.mock("@/hooks/usePublicSettings", () => ({
  usePublicSettings: () => ({ settings: mockSettings, loading: false }),
  refreshPublicSettings: () => Promise.resolve(mockSettings),
  getSettingValue: (s: Record<string, string>, k: string, f = "") => s[k] || f,
}));

const mockList = jest.fn();
jest.mock("@/lib/api", () => ({ productsApi: { list: (...a: unknown[]) => mockList(...a) } }));
jest.mock("@/components/ui/PromoSlider", () => function PromoSliderMock() {
  return null;
});
jest.mock("@/components/features/ProductCard", () => function ProductCardMock({ product }: { product: { id: string } }) {
  return <div data-testid="card">{product.id}</div>;
});
jest.mock("@/store/language", () => ({ useLanguageStore: () => ({ lang: "bn" }) }));

const NOW = Date.parse("2026-10-10T13:00:00Z"); // 19:00 Dhaka

async function flush() {
  await act(async () => {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("FlashSaleSection", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockList.mockReset();
    mockList.mockResolvedValue({ data: { data: [{ id: "p1" }] } });
  });
  afterEach(() => jest.useRealTimers());

  it("shows while live and hides itself exactly when the countdown ends (no reload)", async () => {
    mockSettings = { feature_flash_sale: "true", flash_sale_end: "2026-10-10T19:00:05" }; // 13:00:05Z
    const { container } = render(<FlashSaleSection />);
    await flush();
    expect(container.querySelector("#flash-sale")).not.toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(container.querySelector("#flash-sale")).toBeNull();
  });

  it("never renders when switched off (string 'false')", async () => {
    mockSettings = { feature_flash_sale: "false", flash_sale_end: "2026-10-10T23:00" };
    const { container } = render(<FlashSaleSection />);
    await flush();
    expect(container.querySelector("#flash-sale")).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("never renders after expiry", async () => {
    mockSettings = { feature_flash_sale: "true", flash_sale_end: "2026-08-10T14:00" };
    const { container } = render(<FlashSaleSection />);
    await flush();
    expect(container.querySelector("#flash-sale")).toBeNull();
  });

  it("appears by itself when a scheduled start arrives", async () => {
    mockSettings = { feature_flash_sale: "true", flash_sale_start: "2026-10-10T19:00:03", flash_sale_end: "2026-10-10T23:00" };
    const { container } = render(<FlashSaleSection />);
    await flush();
    expect(container.querySelector("#flash-sale")).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    await flush();
    expect(container.querySelector("#flash-sale")).not.toBeNull();
  });

  it("renders nothing until settings are known (no flash of a default window)", async () => {
    mockSettings = {};
    const { container } = render(<FlashSaleSection />);
    await flush();
    expect(container.querySelector("#flash-sale")).toBeNull();
  });
});
