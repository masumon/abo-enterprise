import { findDuplicateName, nameKey } from "./categoryNames";

const nodes = [
  { id: "1", name_en: "Fast Chargers", name_bn: "ফাস্ট চার্জার" },
  { id: "2", name_en: "CCTV", name_bn: null },
];

describe("category duplicate-name check", () => {
  it("ignores case, spaces, dashes and underscores", () => {
    expect(nameKey("  Fast - Chargers ")).toBe("fastchargers");
    expect(findDuplicateName(nodes, { name_en: "fast_chargers" })?.id).toBe("1");
    expect(findDuplicateName(nodes, { name_en: "cctv " })?.id).toBe("2");
  });
  it("matches the Bangla name too", () => {
    expect(findDuplicateName(nodes, { name_bn: "ফাস্টচার্জার" })?.id).toBe("1");
  });
  it("skips the node being edited and empty names", () => {
    expect(findDuplicateName(nodes, { name_en: "Fast Chargers" }, "1")).toBeNull();
    expect(findDuplicateName(nodes, { name_en: "  " })).toBeNull();
    expect(findDuplicateName(nodes, { name_en: "Solar" })).toBeNull();
  });
});
