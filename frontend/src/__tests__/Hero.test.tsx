import { getFreeDeliveryLabel } from "@/components/home/Hero";

describe("Hero runtime settings", () => {
  it("omits the free-delivery badge when the admin setting is unavailable", () => {
    expect(getFreeDeliveryLabel("en", "")).toBeNull();
    expect(getFreeDeliveryLabel("bn", "   ")).toBeNull();
  });

  it("uses the configured free-delivery threshold without inventing a default", () => {
    expect(getFreeDeliveryLabel("en", "2500")).toBe("Free Sylhet delivery ৳2500+");
    expect(getFreeDeliveryLabel("bn", "2500")).toBe("সিলেটে ফ্রি ডেলিভারি ৳2500+");
  });
});
