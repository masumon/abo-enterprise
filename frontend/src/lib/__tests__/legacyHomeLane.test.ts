import { getLegacyHomeLaneTarget } from "@/lib/legacyHomeLane";

describe("getLegacyHomeLaneTarget", () => {
  it("maps the legacy shop lane to the products page", () => {
    expect(getLegacyHomeLaneTarget("shop")).toBe("/products");
  });

  it("maps the legacy services lane to the services section", () => {
    expect(getLegacyHomeLaneTarget("services")).toBe("/#services");
  });

  it("maps the legacy software lane to the software section", () => {
    expect(getLegacyHomeLaneTarget("software")).toBe("/#software");
  });

  it("normalizes case and whitespace", () => {
    expect(getLegacyHomeLaneTarget(" Services ")).toBe("/#services");
  });

  it("does not redirect unknown lanes", () => {
    expect(getLegacyHomeLaneTarget("unknown")).toBeNull();
    expect(getLegacyHomeLaneTarget(undefined)).toBeNull();
  });
});
