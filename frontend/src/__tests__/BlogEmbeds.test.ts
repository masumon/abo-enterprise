import { splitEmbeds } from "@/components/blog/BlogEmbedCard";

describe("blog in-content product/service cards", () => {
  it("turns a link alone on a line into a card and keeps the text around it", () => {
    const parts = splitEmbeds("Intro text\nhttps://www.aboenterprise.com/products/33w-charger\nMore\n/services/it-support/pc-optimization/");
    expect(parts).toEqual([
      { text: "Intro text" },
      { kind: "product", slug: "33w-charger" },
      { text: "More" },
      { kind: "service", slug: "pc-optimization" },
    ]);
  });

  it("leaves links inside a sentence and other sites as normal text", () => {
    const t = "See /products/x for details\nhttps://example.com/products/y";
    expect(splitEmbeds(t)).toEqual([{ text: t }]);
  });
});
