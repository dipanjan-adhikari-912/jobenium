import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The agent-facing surface of the site is only half the generator's job: the
 * other half is routing, in vercel.json. It is invisible in a build and silent
 * when broken, so the intent is asserted here instead.
 *
 * This uses `routes`, not `rewrites`, and the distinction is load-bearing:
 * `rewrites` run *after* the filesystem check, so a rewrite for `/` or
 * `/sources.html` — paths that exist as files — never fires. Shipped that way,
 * `Accept: text/markdown` kept returning HTML on production and nothing said so.
 * `routes` are processed in array order, which is the only way to answer a
 * request for `/` before the filesystem serves `/`.
 */
const config = JSON.parse(
  readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
) as {
  rewrites?: unknown[];
  routes: {
    src?: string;
    dest?: string;
    handle?: string;
    has?: { type: string; key: string; value: string }[];
  }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

const filesystemIndex = config.routes.findIndex((r) => r.handle === "filesystem");
const mdAccept = [{ type: "header", key: "accept", value: "text/markdown" }];

describe("agent-facing routes", () => {
  it("has one routing mechanism, and it is routes", () => {
    // Mixing the two is how the two orderings get confused: rewrites would be
    // evaluated after the filesystem handle below and silently stop matching.
    expect(config.rewrites).toBeUndefined();
    expect(filesystemIndex).toBeGreaterThan(0);
  });

  it("answers a Markdown request before the filesystem serves the page", () => {
    for (const [src, dest] of [
      ["^/$", "/index.md"],
      ["^/sources\\.html$", "/sources.md"],
    ]) {
      const rule = config.routes[config.routes.findIndex((r) => r.src === src)];
      expect(rule, `no route for ${src}`).toBeDefined();
      expect(rule.dest).toBe(dest);
      // Conditional on the header, or every browser and every crawler gets
      // Markdown instead of the page.
      expect(rule.has).toEqual(mdAccept);
      // And it has to come before { handle: "filesystem" }, which is the whole
      // point of using routes.
      expect(config.routes.indexOf(rule)).toBeLessThan(filesystemIndex);
    }
  });

  it("serves real files at their own paths", () => {
    // { handle: "filesystem" } must be the boundary: everything after it is
    // aliases, everything before it is the negotiation.
    for (const rule of config.routes.slice(0, filesystemIndex)) {
      expect(rule.has, "only the negotiation may run before the filesystem").toBeDefined();
    }
  });

  it("exposes the trust pages at the paths agents look for, after the filesystem", () => {
    // Agents verify legitimacy against /about, /contact and /privacy. The
    // canonical URLs stay the .html files; these are aliases, not duplicates.
    for (const [alias, target] of [
      ["/about", "/about.html"],
      ["/privacy", "/privacy.html"],
      ["/terms", "/terms.html"],
      ["/contact", "/contact.html"],
      ["/disclosure", "/disclosure.html"],
      ["/sources", "/sources.html"],
    ]) {
      const rule = config.routes[config.routes.findIndex((r) => r.src === `^${alias}$`)];
      expect(rule, `no alias for ${alias}`).toBeDefined();
      expect(rule.dest).toBe(target);
      expect(rule.has, `${alias} must not be content-negotiated`).toBeUndefined();
      expect(config.routes.indexOf(rule)).toBeGreaterThan(filesystemIndex);
    }
  });

  it("still sends the security headers, and still blocks framing", () => {
    const catchAll = config.headers.find((h) => h.source === "/(.*)");
    const keys = catchAll.headers.map((h) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("X-Frame-Options");
    expect(catchAll.headers.find((h) => h.key === "Content-Security-Policy").value).toContain(
      "frame-ancestors 'none'",
    );
    // Vary on the negotiated path, or a CDN hands Markdown to a browser.
    for (const source of ["/", "/sources.html"]) {
      expect(
        config.headers
          .find((h) => h.source === source)
          ?.headers.some((h) => h.key === "Vary" && h.value === "Accept"),
        `${source} has no Vary: Accept`,
      ).toBe(true);
    }
  });
});