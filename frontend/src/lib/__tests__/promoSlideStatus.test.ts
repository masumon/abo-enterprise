import { slideLiveState, slideIsoToDhakaInput, dhakaInputToIso } from "@/lib/promoSlideStatus";

const NOW = Date.parse("2026-10-10T06:00:00Z"); // 12:00 Dhaka

describe("slideLiveState", () => {
  it("is off when inactive, whatever the dates", () => {
    expect(slideLiveState({ is_active: false }, NOW)).toBe("off");
  });
  it("is live with no window", () => {
    expect(slideLiveState({ is_active: true }, NOW)).toBe("live");
  });
  it("is scheduled before start and expired after end", () => {
    expect(slideLiveState({ is_active: true, starts_at: "2026-10-11T00:00:00Z" }, NOW)).toBe("scheduled");
    expect(slideLiveState({ is_active: true, ends_at: "2026-10-09T00:00:00Z" }, NOW)).toBe("expired");
    expect(slideLiveState({ is_active: true, starts_at: "2026-10-09T00:00:00Z", ends_at: "2026-10-11T00:00:00Z" }, NOW)).toBe("live");
  });
});

describe("Bangladesh-time slide inputs", () => {
  it("round-trips through datetime-local in Dhaka time", () => {
    expect(slideIsoToDhakaInput("2026-10-10T06:00:00Z")).toBe("2026-10-10T12:00");
    expect(dhakaInputToIso("2026-10-10T12:00")).toBe("2026-10-10T06:00:00.000Z");
  });
  it("treats blank as no limit", () => {
    expect(slideIsoToDhakaInput(null)).toBe("");
    expect(dhakaInputToIso("")).toBeNull();
  });
});
