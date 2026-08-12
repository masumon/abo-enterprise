import fs from "node:fs";
import path from "node:path";

const HOME = path.resolve(__dirname, "../components/home");
const FOOTER = path.resolve(__dirname, "../components/layout/Footer.tsx");
const RECOVERY = path.resolve(__dirname, "../app/forgot-password/page.tsx");

describe("homepage and customer-facing CMS binding guards", () => {
  it("does not reintroduce hard-coded contact or delivery defaults", () => {
    const files = ["ContactCTABar.tsx", "ContactSection.tsx", "Portfolio.tsx", "Hero.tsx"];
    const source = files.map((file) => fs.readFileSync(path.join(HOME, file), "utf8")).join("\n");
    const footer = fs.readFileSync(FOOTER, "utf8");
    const recovery = fs.readFileSync(RECOVERY, "utf8");

    expect(source).not.toContain("01825007977");
    expect(source).not.toContain("8801825007977");
    expect(source).not.toContain("https://www.facebook.com/abo.enterprise");
    expect(source).not.toContain('|| "2000"');
    expect(source).not.toContain("Since 2017");
    expect(footer).not.toContain('getSettingValue(settings, "contact_phone", "01825007977")');
    expect(footer).not.toContain('getSettingValue(settings, "contact_email", "info@aboenterprise.com")');
    expect(footer).not.toContain("https://www.facebook.com/abo.enterprise");
    expect(recovery).not.toContain("+8801825007977");
    expect(recovery).not.toContain("wa.me/8801825007977");
  });
});
