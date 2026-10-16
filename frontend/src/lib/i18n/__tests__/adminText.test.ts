import { ADMIN_BN, translateAdminText } from "@/lib/i18n/adminText";

describe("admin UI translations", () => {
  it("returns the source string unchanged in English", () => {
    expect(translateAdminText("en", "Combo pack created")).toBe("Combo pack created");
  });

  it("uses a Bengali translation for known admin strings", () => {
    expect(translateAdminText("bn", "Cancel")).toBe("বাতিল");
    expect(translateAdminText("bn", "Delete")).toBe("মুছে ফেলুন");
    expect(translateAdminText("en", "নাম, ফোন, অর্ডার#…")).toBe("Search name, phone, order #…");
  });

  it("does not return empty translations for the existing dictionary", () => {
    for (const [key, value] of Object.entries(ADMIN_BN)) {
      expect(key.trim()).not.toBe("");
      expect(value.trim()).not.toBe("");
    }
  });

  it("covers the shared admin action labels used by forms and dialogs", () => {
    for (const key of ["Cancel", "Close", "Confirm", "Delete", "Edit", "Refresh", "Update", "Pending", "Delivered", "Inactive", "Search…"]) {
      expect(ADMIN_BN[key]).toBeTruthy();
    }
  });
});
