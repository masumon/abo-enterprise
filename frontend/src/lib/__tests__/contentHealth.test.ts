import { buildContentHealth } from "@/lib/contentHealth";
import type { Product, Service, BlogPost, Category } from "@/types";

const NOW = Date.parse("2026-10-10T06:00:00Z");
const fullSettings = {
  hero_image_url: "https://x/h.jpg",
  hero_mobile_image_url: "https://x/m.jpg",
  contact_phone: "01700000000",
  contact_hours_bn: "সকাল ৯টা",
  contact_address: "সিলেট",
  feature_flash_sale: "false",
};
const good = { id: "p1", slug: "a", name_en: "A", name_bn: "এ", price: 100, category: "gadgets", category_id: "c1", image_url: "https://x/a.jpg", description_bn: "ভালো", stock_quantity: 5, is_active: true } as unknown as Product;

const ids = (g: ReturnType<typeof buildContentHealth>) => g.map((x) => x.id);

describe("buildContentHealth", () => {
  it("reports nothing for complete content", () => {
    const cats = [{ id: "c1", slug: "gadgets", name_en: "G", is_active: true, subcategories: [] }] as unknown as Category[];
    expect(buildContentHealth({ products: [good], services: [], posts: [], categories: cats, settings: fullSettings, slides: [], now: NOW })).toEqual([]);
  });

  it("flags product gaps and skips hidden products", () => {
    const bad = { ...good, id: "p2", image_url: "", images: [], price: 0, description_bn: "", category: "", category_id: null, stock_quantity: 0 } as unknown as Product;
    const hidden = { ...bad, id: "p3", is_active: false } as Product;
    const g = buildContentHealth({ products: [bad, hidden], services: [], posts: [], categories: [], settings: fullSettings, slides: [], now: NOW });
    expect(ids(g)).toEqual(["product-photo", "product-price", "product-desc", "product-category", "product-stock"]);
    expect(g[0].items).toHaveLength(1);
    expect(g[0].items[0].href).toBe("/sumon/products?edit=p2");
  });

  it("flags services, blog covers, empty categories and settings", () => {
    const svc = { id: "s1", name_en: "S", is_active: true } as unknown as Service;
    const post = { id: "b1", slug: "b", title_en: "B", status: "draft" } as unknown as BlogPost;
    const cats = [{ id: "c9", slug: "empty", name_en: "Empty", is_active: true, subcategories: [] }] as unknown as Category[];
    const g = buildContentHealth({
      products: [], services: [svc], posts: [post], categories: cats,
      settings: { feature_flash_sale: "true", flash_sale_end: "2026-10-01T10:00" }, slides: [], now: NOW,
    });
    expect(ids(g)).toEqual(["site", "service-desc", "service-image", "blog-cover", "category-empty"]);
    const site = g[0].items.map((i) => i.key);
    expect(site).toEqual(expect.arrayContaining(["hero-desktop", "hero-mobile", "flash-expired", "phone", "whatsapp", "hours", "address"]));
    expect(g[3].items[0]).toMatchObject({ href: "/sumon/blog?edit=b1", note: "খসড়া" });
  });

  it("a live hero slide covers a missing mobile banner; a used child keeps its parent", () => {
    const cats = [{ id: "c1", slug: "root", name_en: "R", is_active: true, subcategories: [{ id: "c2", slug: "kid", name_en: "K", is_active: true, category_id: "c1", sort_order: 0 }] }] as unknown as Category[];
    const p = { ...good, category_id: null, subcategory_id: "c2", category: "x" } as unknown as Product;
    const g = buildContentHealth({
      products: [p], services: [], posts: [], categories: cats,
      settings: { ...fullSettings, hero_mobile_image_url: "" },
      slides: [{ id: "s", placement: "hero", is_active: true, sort_order: 0 }], now: NOW,
    });
    expect(g).toEqual([]);
  });
});
