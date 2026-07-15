import { describe, it, expect } from "vitest";
import { sanitizeInternalRedirect } from "@/lib/navigation";

describe("sanitizeInternalRedirect", () => {
  it("accepts a valid internal path", () => {
    expect(sanitizeInternalRedirect("/dashboard")).toBe("/dashboard");
  });

  it("accepts nested internal paths", () => {
    expect(sanitizeInternalRedirect("/minha-conta/diagnostico/123/resultado")).toBe(
      "/minha-conta/diagnostico/123/resultado",
    );
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeInternalRedirect("//evil.com")).toBe("/dashboard");
  });

  it("rejects absolute http/https URLs", () => {
    expect(sanitizeInternalRedirect("https://evil.com")).toBe("/dashboard");
  });

  it("rejects the javascript: scheme", () => {
    expect(sanitizeInternalRedirect("javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects the backslash protocol-relative trick", () => {
    expect(sanitizeInternalRedirect("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects an empty string", () => {
    expect(sanitizeInternalRedirect("")).toBe("/dashboard");
  });

  it("rejects null", () => {
    expect(sanitizeInternalRedirect(null)).toBe("/dashboard");
  });

  it("honors a custom fallback", () => {
    expect(sanitizeInternalRedirect(null, "/entrar")).toBe("/entrar");
    expect(sanitizeInternalRedirect("//evil.com", "/entrar")).toBe("/entrar");
  });
});
