import fs from "node:fs";
import path from "node:path";

const HOME = path.resolve(__dirname, "../components/home");

describe("homepage CMS binding guards", () => {
  it("does not reintroduce hard-coded contact or delivery defaults", () => {
    const files = ["ContactCTABar.tsx", "ContactSection.tsx", "Portfolio.tsx", "Hero.tsx"];
    const source = files.map((file) => fs.readFileSync(path.join(HOME, file), "utf8")).join("\n");

    expect(source).not.toContain("01825007977");
    expect(source).not.toContain("8801825007977");
    expect(source).not.toContain("https://www.facebook.com/abo.enterprise");
    expect(source).not.toContain('|| "2000"');
    expect(source).not.toContain("Since 2017");
  });
});
