import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The agent-facing surface of the site is only half the generator's job: the
 * other half is routing, in vercel.json. It is invisible in a build and silent
 * when broken, so the intent is asserted here instead.
 *
 * Two Vercel behaviours make this file what it is, both learned the hard way on
 * production:
 *
 * 1. `rewrites` run *after* the filesystem check, so a rewrite for `/` or
 *    `/sources.html` — paths that exist as files — never fires. `routes` are
 *    processed in array order, which is the only way to answer a request for `/`
 *    before the filesystem serves it.
 * 2. Defining `routes` suppressed the whole `headers` block, so the site went out
 *    with no CSP at all. Every header now rides on a `continue` route instead,
 *    and the tests below assert they are still there.
 */
const config = JSON.parse(
  readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
) as {
  headers?: unknown;
  rewrites?: unknown;
  routes: {
    src?: string;
    dest?: string;
    handle?: string;
    continue?: boolean;
    has?: { type: string; key: string; value: string }[];
    headers?: Record<string, string>;
  }[];
};

const index = (src: string) => config.routes.findIndex((r) => r.src === src);
const filesystemIndex = config.routes.findIndex((r) => r.handle === "filesystem");
const mdAccept = [{ type: "header", key: "accept", value: "text/markdown" }];
const allHeaders = config.routes.flatMap((r) => Object.entries(r.headers ?? {}));
const headerValue = (key: string) => allHeaders.find(([k]) => k === key)?.[1];

describe("agent-facing routes", () => {
  it("keeps the security headers on the routes themselves", () => {
    // With `routes` in play, the top-level `headers` block is ignored. The CSP
    // disappeared from production once because it only lived there.
    expect(config.headers, "top-level headers is ignored once routes exist").toBeUndefined();
    for (const key of [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(headerValue(key), `no route carries ${key}`).toBeDefined();
    }
    expect(headerValue("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headerValue("Content-Security-Policy")).toContain("https://consent.cookiebot.com");

    // And they are `continue` rules, so they apply on the way past, not instead
    // of the route that serves the file.
    const carrier = config.routes.filter((r) => r.headers?.["Content-Security-Policy"]);
    expect(carrier.length).toBe(1);
    expect(carrier[0].continue).toBe(true);
    expect(carrier[0].src).toBe("/(.*)");
  });

  it("has one routing mechanism, and it is routes", () => {
    expect(config.rewrites, "rewrites are evaluated after the filesystem").toBeUndefined();
    expect(filesystemIndex).toBeGreaterThan(0);
  });

  it("answers a Markdown request before the filesystem serves the page", () => {
    for (const [src, dest] of [
      ["^/$", "/index.md"],
      ["^/sources\\.html$", "/sources.md"],
    ]) {
      const i = config.routes.findIndex((r) => r.src === src && r.has);
      expect(i, `no Markdown route for ${src}`).toBeGreaterThanOrEqual(0);
      expect(config.routes[i].dest).toBe(dest);
      // Conditional on the header, or every browser and every crawler gets
      // Markdown instead of the page.
      expect(config.routes[i].has).toEqual(mdAccept);
      expect(i, `${src} must come before the filesystem handle`).toBeLessThan(filesystemIndex);
      // The Vary rule for the same path, also before the handle.
      const vary = config.routes.findIndex(
        (r) => r.src === src && r.headers?.Vary === "Accept",
      );
      expect(vary, `${src} has no Vary: Accept`).toBeGreaterThanOrEqual(0);
      expect(vary).toBeLessThan(filesystemIndex);
    }
  });

  it("exposes the trust pages at the paths agents look for, after the filesystem", () => {
    for (const [alias, target] of [
      ["/about", "/about.html"],
      ["/privacy", "/privacy.html"],
      ["/terms", "/terms.html"],
      ["/contact", "/contact.html"],
      ["/disclosure", "/disclosure.html"],
      ["/sources", "/sources.html"],
    ]) {
      const i = index(`^${alias}$`);
      expect(i, `no alias for ${alias}`).toBeGreaterThan(filesystemIndex);
      expect(config.routes[i].dest).toBe(target);
      // An unconditional alias must not shadow the Markdown negotiation.
      expect(config.routes[i].has, `${alias} must not be content-negotiated`).toBeUndefined();
    }
  });

  it("keeps immutable caching for hashed assets only", () => {
    const i = index("/assets/(.*)");
    expect(config.routes[i].headers?.["Cache-Control"]).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(config.routes[i].continue).toBe(true);
    // HTML must stay revalidatable.
    expect(
      allHeaders.filter(([k]) => k === "Cache-Control").length,
      "Cache-Control must not be set on non-asset paths",
    ).toBe(1);
  });
});