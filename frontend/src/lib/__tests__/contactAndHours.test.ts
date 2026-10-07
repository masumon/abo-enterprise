import { sanitizeBusinessHours, getBusinessHours } from "@/lib/businessHours";
import { buildContactInfo } from "@/hooks/useContactInfo";
import { getCreditMembers, normalizeExternalUrl, type CmsTeamMember } from "@/lib/cmsContent";

describe("business hours safety net", () => {
  it("drops the business name when it was typed into the hours field", () => {
    expect(sanitizeBusinessHours("ABO ENTERPRISE", "ABO Enterprise")).toBe("");
    expect(sanitizeBusinessHours("abo-enterprise")).toBe("");
    expect(sanitizeBusinessHours("  ", "x")).toBe("");
  });

  it("keeps real opening hours untouched", () => {
    expect(sanitizeBusinessHours("Sat–Thu, 9:00 AM – 9:00 PM", "ABO Enterprise")).toBe("Sat–Thu, 9:00 AM – 9:00 PM");
    expect(sanitizeBusinessHours("শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা")).toBe("শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা");
  });

  it("reads the language-specific setting", () => {
    const settings = { site_name: "ABO Enterprise", contact_hours_en: "ABO ENTERPRISE", contact_hours_bn: "শনি–বৃহঃ ৯টা–৯টা" };
    expect(getBusinessHours(settings, "en")).toBe("");
    expect(getBusinessHours(settings, "bn")).toBe("শনি–বৃহঃ ৯টা–৯টা");
  });
});

describe("contact info comes only from admin settings", () => {
  it("builds separate call and WhatsApp links", () => {
    const c = buildContactInfo({ contact_phone: "01825007977", whatsapp_number: "8801885411007", contact_email: "info@aboenterprise.com" });
    expect(c.telHref).toBe("tel:+8801825007977");
    expect(c.waBase).toBe("https://wa.me/8801885411007");
    expect(c.whatsappHref("Hi there")).toBe("https://wa.me/8801885411007?text=Hi%20there");
    expect(c.hasPhone && c.hasWhatsapp).toBe(true);
    expect(c.email).toBe("info@aboenterprise.com");
  });

  it("reuses the call number for WhatsApp when none is set", () => {
    const c = buildContactInfo({ contact_phone: "01825007977" });
    expect(c.waBase).toBe("https://wa.me/8801825007977");
  });

  it("never falls back to a hard-coded number", () => {
    const c = buildContactInfo({});
    expect(c.hasPhone).toBe(false);
    expect(c.hasWhatsapp).toBe(false);
    expect(c.telHref).toBe("");
    expect(c.waBase).toBe("/contact");
    expect(c.whatsappHref("x")).toBe("/contact");
  });
});

describe("developer credit helpers", () => {
  const member = (id: string, name: string, en: string, bn = ""): CmsTeamMember => ({ id, name, role: { en, bn }, desc: { en: "", bn: "" } });

  it("credits developers first, then designers, and skips other roles", () => {
    const team = [
      member("a", "Support Person", "Support & Customer Service"),
      member("b", "Designer", "Graphic Designer & Creative Contributor"),
      member("c", "Dev", "Founder, Creator & Lead Developer"),
    ];
    expect(getCreditMembers(team).map((c) => [c.member.id, c.kind])).toEqual([
      ["c", "developer"],
      ["b", "design"],
    ]);
  });

  it("normalises profile links and rejects unsafe schemes", () => {
    expect(normalizeExternalUrl("www.facebook.com/fahimbd99")).toBe("https://www.facebook.com/fahimbd99");
    expect(normalizeExternalUrl("https://www.facebook.com/fahimbd99")).toBe("https://www.facebook.com/fahimbd99");
    expect(normalizeExternalUrl("javascript:alert(1)")).toBe("");
    expect(normalizeExternalUrl("")).toBe("");
  });
});
