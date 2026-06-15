// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isBlockedIp, isHostAllowed, parseHttpUrl, validateUrl } from "./url-guard";

const allowed = new Set(["loja.exemplo.com"]);

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.10",
    "169.254.0.1",
    "169.254.169.254",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"])(
    "allows public %s",
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    },
  );
});

describe("isHostAllowed", () => {
  it("never matches with an empty allowlist", () => {
    expect(isHostAllowed("loja.exemplo.com", new Set())).toBe(false);
  });

  it("matches exact host case-insensitively", () => {
    expect(isHostAllowed("LOJA.exemplo.com", allowed)).toBe(true);
  });

  it("does not match a look-alike host", () => {
    expect(isHostAllowed("loja.exemplo.com.evil.example", allowed)).toBe(false);
  });
});

describe("parseHttpUrl", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "ftp://example.com/x",
    "blob:https://x/y",
    "/relative/path",
    "http://user:pass@loja.exemplo.com/",
  ])("rejects %s", (raw) => {
    expect(parseHttpUrl(raw)).toBeNull();
  });

  it("accepts http and https", () => {
    expect(parseHttpUrl("https://loja.exemplo.com/p")).not.toBeNull();
  });
});

describe("validateUrl", () => {
  it("accepts an allowlisted https url", () => {
    const result = validateUrl("https://loja.exemplo.com/p/1", allowed);
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid scheme as INVALID_URL", () => {
    const result = validateUrl("javascript:alert(1)", allowed);
    expect(result).toEqual({ ok: false, code: "INVALID_URL" });
  });

  it.each([
    "https://outra-loja.com/p",
    "https://loja.exemplo.com.evil.example/p",
    "http://127.0.0.1/p",
    "http://[::1]/p",
    "http://169.254.169.254/latest/meta-data",
  ])("rejects %s as HOST_NOT_ALLOWED", (raw) => {
    const result = validateUrl(raw, allowed);
    expect(result).toEqual({ ok: false, code: "HOST_NOT_ALLOWED" });
  });
});
