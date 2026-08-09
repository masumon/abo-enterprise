import { responsiveMediaDimensions, responsiveMediaUrl } from "./responsiveMediaUrl";

describe("responsiveMediaUrl", () => {
  const cloudinary = "https://res.cloudinary.com/demo/image/upload/v1234/abo-enterprise/banner.jpg";

  it("creates device-specific Cloudinary transformations without changing the asset", () => {
    expect(responsiveMediaUrl(cloudinary, "page-banner", "desktop")).toContain("f_auto,q_auto,dpr_auto,c_fill,g_auto,w_1920,h_600");
    expect(responsiveMediaUrl(cloudinary, "page-banner", "tablet")).toContain("f_auto,q_auto,dpr_auto,c_fill,g_auto,w_1280,h_500");
    expect(responsiveMediaUrl(cloudinary, "page-banner", "mobile")).toContain("f_auto,q_auto,dpr_auto,c_fill,g_auto,w_768,h_420");
    expect(responsiveMediaUrl(cloudinary, "page-banner", "mobile")).toContain("/v1234/abo-enterprise/banner.jpg");
  });

  it("leaves non-Cloudinary URLs untouched", () => {
    const external = "https://example.com/banner.jpg";
    expect(responsiveMediaUrl(external, "page-banner", "mobile")).toBe(external);
  });

  it("exposes the agreed slot dimensions", () => {
    expect(responsiveMediaDimensions("page-banner")).toEqual({
      desktop: { width: 1920, height: 600 },
      tablet: { width: 1280, height: 500 },
      mobile: { width: 768, height: 420 },
    });
  });
});
