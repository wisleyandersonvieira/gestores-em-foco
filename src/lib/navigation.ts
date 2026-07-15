/**
 * Sanitizes a redirect target that came from an untrusted source (e.g. a query
 * string) so it can only ever point to an internal path of this application.
 *
 * This prevents open-redirect / phishing attacks where an attacker crafts a URL
 * such as `?redirect=//evil.com` or `?redirect=https://evil.com` and the user is
 * bounced to an external site after logging in.
 *
 * Only same-origin absolute paths are accepted:
 * - must start with a single "/";
 * - must NOT be protocol-relative ("//evil.com") or use a backslash trick
 *   ("/\\evil.com", which browsers normalize to "//evil.com");
 * - must NOT contain a scheme separator (":") such as "javascript:" or "http:";
 * - must NOT contain backslashes, whitespace or control characters.
 *
 * Any value that fails these checks (including empty strings and `null`) returns
 * the provided fallback.
 */
export function sanitizeInternalRedirect(value: string | null, fallback = "/dashboard"): string {
  if (!value) return fallback;

  const trimmed = value.trim();

  // Must be a non-empty, single-slash internal path.
  if (trimmed.length === 0 || trimmed[0] !== "/") return fallback;

  // Reject protocol-relative URLs ("//evil.com") and the backslash variant
  // ("/\\evil.com") that browsers reinterpret as "//".
  if (trimmed[1] === "/" || trimmed[1] === "\\") return fallback;

  // Reject backslashes and scheme separators ("javascript:", "http:").
  if (trimmed.includes("\\") || trimmed.includes(":")) return fallback;

  // Reject any whitespace or control characters that could smuggle a scheme.
  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return fallback;
  }

  return trimmed;
}
