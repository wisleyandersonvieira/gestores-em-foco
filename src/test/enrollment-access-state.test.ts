// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { getEnrollmentAccessState } from "@/lib/courses";

const NOW = new Date("2026-07-15T12:00:00.000Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number) {
  return new Date(NOW + days * DAY_MS).toISOString();
}

describe("getEnrollmentAccessState", () => {
  it("returns 'active' when there is no expiration and status is active", () => {
    expect(getEnrollmentAccessState({ status: "active", expires_at: null, canceled_at: null }, NOW)).toBe("active");
  });

  it("returns 'active' when expiring in 30 days", () => {
    expect(getEnrollmentAccessState({ status: "active", expires_at: daysFromNow(30), canceled_at: null }, NOW)).toBe("active");
  });

  it("returns 'expiring_soon' when expiring in 3 days", () => {
    expect(getEnrollmentAccessState({ status: "active", expires_at: daysFromNow(3), canceled_at: null }, NOW)).toBe("expiring_soon");
  });

  it("returns 'expiring_soon' at exactly 7 days (boundary)", () => {
    expect(getEnrollmentAccessState({ status: "active", expires_at: daysFromNow(7), canceled_at: null }, NOW)).toBe("expiring_soon");
  });

  it("returns 'expired' when expired yesterday", () => {
    expect(getEnrollmentAccessState({ status: "active", expires_at: daysFromNow(-1), canceled_at: null }, NOW)).toBe("expired");
  });

  it("returns 'expired' when canceled_at is set even with a future expiration", () => {
    expect(getEnrollmentAccessState({ status: "active", expires_at: daysFromNow(30), canceled_at: daysFromNow(-2) }, NOW)).toBe("expired");
  });

  it("returns 'expired' when status is 'suspended'", () => {
    expect(getEnrollmentAccessState({ status: "suspended", expires_at: daysFromNow(30), canceled_at: null }, NOW)).toBe("expired");
  });
});
