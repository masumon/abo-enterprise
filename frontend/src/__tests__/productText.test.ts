import { parseDescription, specRows } from "@/lib/productText";
import { UPLOAD_GUIDES, getUploadGuide, ratioMismatch } from "@/lib/uploadGuides";

describe("parseDescription", () => {
  it("splits paragraphs and bullet lists", () => {
    const blocks = parseDescription("দ্রুত চার্জার।\nভালো মান।\n\n• ২০W আউটপুট\n- টাইপ-সি\n\nশেষ কথা");
    expect(blocks).toEqual([
      { type: "p", text: "দ্রুত চার্জার। ভালো মান।" },
      { type: "ul", items: ["২০W আউটপুট", "টাইপ-সি"] },
      { type: "p", text: "শেষ কথা" },
    ]);
  });

  it("handles empty input", () => {
    expect(parseDescription(undefined)).toEqual([]);
    expect(parseDescription("  \n ")).toEqual([]);
  });
});

describe("specRows", () => {
  it("drops empty values and stringifies", () => {
    expect(specRows({ Brand: "Anker", Watt: 20 as unknown as string, Empty: "" })).toEqual([
      ["Brand", "Anker"],
      ["Watt", "20"],
    ]);
  });
});

describe("upload guides", () => {
  it("has Bangla guidance for every purpose", () => {
    for (const g of Object.values(UPLOAD_GUIDES)) {
      expect(g.titleBn && g.size && g.background && g.subject && g.format && g.maxSize).toBeTruthy();
      expect(g.ratio).toBeGreaterThan(0);
    }
    expect(getUploadGuide(undefined)).toBeNull();
    expect(getUploadGuide("product-main")?.fit).toBe("contain");
  });

  it("flags far-off ratios only", () => {
    const sq = UPLOAD_GUIDES["product-main"];
    expect(ratioMismatch(sq, 1000, 1000)).toBe(false);
    expect(ratioMismatch(sq, 1920, 1080)).toBe(true);
  });
});
