import {
  describeFlashSaleBn,
  formatDurationBn,
  getFlashSaleStatus,
  parseBoolSetting,
  parseDhakaDateTime,
  storedToDhakaInput,
  toDhakaInputValue,
  weeklyEndDhaka,
} from "@/lib/flashSale";

const utc = (s: string) => Date.parse(s);

describe("parseDhakaDateTime", () => {
  it("reads datetime-local values as Bangladesh time (UTC+6), regardless of device zone", () => {
    expect(parseDhakaDateTime("2026-10-10T20:00")?.toISOString()).toBe("2026-10-10T14:00:00.000Z");
    expect(parseDhakaDateTime("2026-10-10 20:00:30")?.toISOString()).toBe("2026-10-10T14:00:30.000Z");
    expect(parseDhakaDateTime("2026-10-10")?.toISOString()).toBe("2026-10-09T18:00:00.000Z");
  });
  it("honours explicit zones (old/other formats)", () => {
    expect(parseDhakaDateTime("2026-10-10T14:00:00Z")?.toISOString()).toBe("2026-10-10T14:00:00.000Z");
    expect(parseDhakaDateTime("2026-10-10T20:00:00+06:00")?.toISOString()).toBe("2026-10-10T14:00:00.000Z");
    expect(parseDhakaDateTime("2026-10-10 20:00+06:00")?.toISOString()).toBe("2026-10-10T14:00:00.000Z");
  });
  it("returns null for blank or garbage", () => {
    expect(parseDhakaDateTime("")).toBeNull();
    expect(parseDhakaDateTime("   ")).toBeNull();
    expect(parseDhakaDateTime(undefined)).toBeNull();
    expect(parseDhakaDateTime("tomorrow")).toBeNull();
  });
  it("round-trips with the datetime-local formatter", () => {
    expect(toDhakaInputValue(parseDhakaDateTime("2026-12-31T23:59")!)).toBe("2026-12-31T23:59");
    expect(storedToDhakaInput("2026-10-10T14:00:00Z")).toBe("2026-10-10T20:00");
    expect(storedToDhakaInput("")).toBe("");
  });
});

describe("parseBoolSetting", () => {
  it.each([["true", true], ["1", true], ["on", true], ["YES", true], ["false", false], ["0", false], ["off", false]])(
    "%s → %s",
    (raw, want) => expect(parseBoolSetting(raw, !want)).toBe(want),
  );
  it("falls back when missing/blank", () => {
    expect(parseBoolSetting(undefined, true)).toBe(true);
    expect(parseBoolSetting("", false)).toBe(false);
  });
});

describe("weeklyEndDhaka", () => {
  it("is Sunday 23:59:59.999 Bangladesh time", () => {
    // Sat 10 Oct 2026, 12:00 Dhaka → Sun 11 Oct 23:59:59.999 Dhaka = 17:59:59.999Z
    expect(weeklyEndDhaka(utc("2026-10-10T06:00:00Z")).toISOString()).toBe("2026-10-11T17:59:59.999Z");
    // Sunday 01:00 Dhaka (still Saturday in UTC) → same Sunday
    expect(weeklyEndDhaka(utc("2026-10-10T19:00:00Z")).toISOString()).toBe("2026-10-11T17:59:59.999Z");
  });
});

describe("getFlashSaleStatus", () => {
  const base = { feature_flash_sale: "true", flash_sale_start: "2026-10-10T18:00", flash_sale_end: "2026-10-10T20:00" };
  // 18:00 Dhaka = 12:00Z, 20:00 Dhaka = 14:00Z

  it("is live inside the window and reports ms until end", () => {
    const s = getFlashSaleStatus(base, utc("2026-10-10T13:00:00Z"));
    expect(s.state).toBe("live");
    expect(s.msUntilChange).toBe(60 * 60 * 1000);
  });
  it("is scheduled before start, live exactly at start", () => {
    expect(getFlashSaleStatus(base, utc("2026-10-10T11:59:59Z")).state).toBe("scheduled");
    expect(getFlashSaleStatus(base, utc("2026-10-10T12:00:00Z")).state).toBe("live");
  });
  it("expires exactly at end", () => {
    expect(getFlashSaleStatus(base, utc("2026-10-10T13:59:59.999Z")).state).toBe("live");
    expect(getFlashSaleStatus(base, utc("2026-10-10T14:00:00Z")).state).toBe("expired");
  });
  it("is off when the switch is off, in any boolean spelling", () => {
    for (const v of ["false", "0", "off", "False"]) {
      expect(getFlashSaleStatus({ ...base, feature_flash_sale: v }, utc("2026-10-10T13:00:00Z")).state).toBe("off");
    }
  });
  it("treats a missing switch as ON (backend default)", () => {
    expect(getFlashSaleStatus({ flash_sale_end: "2026-10-10T20:00" }, utc("2026-10-10T13:00:00Z")).state).toBe("live");
  });
  it("uses the weekly default when End is blank", () => {
    const s = getFlashSaleStatus({ feature_flash_sale: "true" }, utc("2026-10-10T06:00:00Z"));
    expect(s.state).toBe("live");
    expect(s.endIsDefault).toBe(true);
    expect(s.end?.toISOString()).toBe("2026-10-11T17:59:59.999Z");
  });
  it("is invalid (never shown) for end ≤ start or unreadable dates", () => {
    const now = utc("2026-10-10T13:00:00Z");
    expect(getFlashSaleStatus({ ...base, flash_sale_end: "2026-10-10T18:00" }, now).state).toBe("invalid");
    expect(getFlashSaleStatus({ ...base, flash_sale_end: "garbage" }, now).state).toBe("invalid");
    expect(getFlashSaleStatus({ ...base, flash_sale_start: "garbage" }, now).state).toBe("invalid");
  });
  it("reads old explicit-zone values too", () => {
    const s = getFlashSaleStatus({ ...base, flash_sale_end: "2026-10-10T14:00:00Z" }, utc("2026-10-10T13:00:00Z"));
    expect(s.state).toBe("live");
  });
});

describe("Bangla status text", () => {
  it("formats durations", () => {
    expect(formatDurationBn(2 * 3600_000 + 10 * 60_000)).toBe("২ ঘণ্টা ১০ মিনিট");
    expect(formatDurationBn(5 * 60_000)).toBe("৫ মিনিট");
    expect(formatDurationBn(26 * 3600_000)).toBe("১ দিন ২ ঘণ্টা");
    expect(formatDurationBn(10_000)).toBe("১ মিনিটের কম");
  });
  it("describes each state", () => {
    const base = { feature_flash_sale: "true", flash_sale_start: "2026-10-10T18:00", flash_sale_end: "2026-10-10T20:00" };
    const at = (iso: string) => {
      const now = utc(iso);
      return describeFlashSaleBn(getFlashSaleStatus(base, now), now);
    };
    expect(at("2026-10-10T11:50:00Z")).toContain("শুরু হবে ১০ মিনিট");
    expect(at("2026-10-10T12:00:00Z")).toContain("এখন চলছে — শেষ হবে ২ ঘণ্টা");
    expect(at("2026-10-10T15:00:00Z")).toContain("মেয়াদ শেষ");
    const now = utc("2026-10-10T13:00:00Z");
    expect(describeFlashSaleBn(getFlashSaleStatus({ ...base, feature_flash_sale: "false" }, now), now)).toContain("বন্ধ");
  });
});
