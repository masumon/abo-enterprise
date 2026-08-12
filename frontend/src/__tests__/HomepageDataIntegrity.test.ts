import fs from "node:fs";
import path from "node:path";

const HOME = path.resolve(__dirname, "../components/home");

describe("homepage data integrity guards", () => {
  it("does not use fabricated review defaults or demo review images", () => {
    const source = fs.readFileSync(path.join(HOME, "CustomerReviews.tsx"), "utf8");

    expect(source).not.toContain("resolveReviewPhoto");
    expect(source).not.toContain("demoImages");
    expect(source).not.toContain('"5.0"');
    expect(source).not.toContain("DEMO_REVIEW");
  });

  it("does not use demo service imagery when CMS data is unavailable", () => {
    const source = fs.readFileSync(path.join(HOME, "ServicesOverview.tsx"), "utf8");

    expect(source).not.toContain("resolveServiceImage");
    expect(source).not.toContain("demoImages");
    expect(source).toContain("service.featured_image_url?.trim()");
    expect(source).toContain("ImageOff");
  });
});
