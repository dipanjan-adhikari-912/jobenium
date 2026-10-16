import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The agent-facing surface of the site is only half the generator's job: the
 * other half is routing, in vercel.json. These rewrites are invisible in a
 * build and silent when broken — `/` would just keep serving HTML to agents
 * asking for Markdown — so the intent is asserted here instead.
 */
const config = JSON.parse(
  readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
) as {
  rewrites: Record<string, unknown>[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

const rewriteFor = (source: string) =>
  config.rewrites.filter((r) => r.source === source);

describe("agent-facing routes", () => {
  it("uses only the keys Vercel's schema accepts in a rewrite", () => {
    // vercel.json rewrites are additionalProperties: false. Adding `headers`
    // there failed deployment schema validation, and Vary does not belong there
    // anyway — the headers rules below already match the incoming path.
    const allowed = new Set(["source", "destination", "has"]);
    for (const rule of config.rewrites) {
      for (const key of Object.keys(rule)) {
        expect(allowed.has(key), `rewrite ${String(rule.source)}: "${key}" is not a valid rewrite key`).toBe(
          true,
        );
      }
    }
  });

  it("serves Markdown at the canonical URL when an agent asks for it", () => {
    for (const [source, destination] of [
      ["/", "/index.md"],
      ["/sources.html", "/sources.md"],
    ]) {
      const [rule] = rewriteFor(source);
      expect(rule, `no rewrite for ${source}`).toBeDefined();
      expect(rule.destination).toBe(destination);
      // Conditional on the header, or every browser and every crawler gets
      // Markdown instead of the page.
      expect(rule.has).toEqual([
        { type: "header", key: "accept", value: "text/markdown" },
      ]);
      // Vary has to be on the response — on both variants, which are both served
      // from this path, so one headers rule covers them.
      const vary = config.headers.find((h) => h.source === source);
      expect(
        vary?.headers.some((h) => h.key === "Vary" && h.value === "Accept"),
        `${source} response has no Vary: Accept`,
      ).toBe(true);
    }
  });

  it("exposes the trust pages at the paths agents look for", () => {
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
      const rule = rewriteFor(alias)[0];
      expect(rule, `no alias for ${alias}`).toBeDefined();
      expect(rule.destination).toBe(target);
      // An unconditional alias must not shadow the Markdown negotiation.
      expect(rule.has, `${alias} must not be content-negotiated`).toBeUndefined();
    }
  });

  it("still sends the security headers, and still blocks framing", () => {
    const catchAll = config.headers.find((h) => h.source === "/(.*)");
    const keys = catchAll.headers.map((h) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("X-Frame-Options");
    const csp = catchAll.headers.find((h) => h.key === "Content-Security-Policy").value;
    expect(csp).toContain("frame-ancestors 'none'");
  });
});