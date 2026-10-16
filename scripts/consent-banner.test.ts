import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generate } from "./generate-ai-content";

const root = process.cwd();
const CBID = "b895cdbe-f2b2-4596-8de1-f681ec18836e";
const CONSENT_TAG = `<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${CBID}" type="text/javascript" async></script>`;

const PAGE_SLUGS = [
  "index.html",
  "sources.html",
  "about.html",
  "privacy.html",
  "terms.html",
  "contact.html",
  "disclosure.html",
];

/** Split a CSP header value into `{ "script-src": ["'self'", ...] }`. */
function parseCsp(value: string): Map<string, string[]> {
  return new Map(
    value.split(";").map((part) => {
      const tokens = part.trim().split(/\s+/).filter(Boolean);
      return [tokens[0], tokens.slice(1)] as [string, string[]];
    }),
  );
}

let dist = "";

describe("consent banner", () => {
  beforeAll(() => {
    dist = mkdtempSync(join(tmpdir(), "jobenium-consent-"));
    // The real shell, not a stand-in: the generator only patches index.html, so
    // the consent script has to already be in the file Vite ships.
    writeFileSync(join(dist, "index.html"), readFileSync(join(root, "index.html"), "utf8"));
    mkdirSync(join(dist, "assets"), { recursive: true });
    writeFileSync(join(dist, "assets", "bg-1-TESThash.webp"), "not-a-real-image");
    generate(dist);
  });

  afterAll(() => {
    if (dist) rmSync(join(dist), { recursive: true, force: true });
  });

  it("puts the banner first in the head of the shipped index.html", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head.split(CONSENT_TAG).length - 1).toBe(1);
    // Cookiebot's automatic blocking only works if nothing else loads first.
    const before = head.slice(0, head.indexOf(CONSENT_TAG));
    expect(before.includes("<script"), "a script loads before the consent banner").toBe(false);
  });

  it("loads the banner on every page, exactly once each", () => {
    for (const slug of PAGE_SLUGS) {
      const html = readFileSync(join(dist, slug), "utf8");
      expect(html.split(CONSENT_TAG).length - 1, `${slug} consent tags`).toBe(1);
      // Inside <head>, not in the body: the blocking has to be armed before
      // anything on the page can set a cookie.
      expect(html.indexOf(CONSENT_TAG), `${slug} banner is not in the head`).toBeLessThan(
        html.indexOf("</head>"),
      );
    }
  });

  it("keeps the CSP in step with the third party that now runs on the site", () => {
    const headers = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")).headers as {
      source: string;
      headers: { key: string; value: string }[];
    }[];
    const csp = headers
      .flatMap((h) => h.headers)
      .find((h) => h.key === "Content-Security-Policy");
    expect(csp, "vercel.json no longer sets a CSP").toBeDefined();

    const directives = parseCsp(csp!.value);
    const allows = (directive: string, ...hosts: string[]) => {
      const sources = directives.get(directive) ?? [];
      for (const host of hosts) expect(sources, `${directive} must allow ${host}`).toContain(host);
    };

    // Cookiebot's documented requirements. Drop any of these and the banner
    // fails silently: no dialog, no consent recorded, nothing in the console to
    // make it obvious on the page.
    allows("script-src", "https://consent.cookiebot.com");
    allows("connect-src", "https://consent.cookiebot.com", "https://consentcdn.cookiebot.com");
    allows("frame-src", "https://consent.cookiebot.com", "https://consentcdn.cookiebot.com");

    // It styles the banner with inline styles and frames itself from a CDN.
    allows("style-src", "'unsafe-inline'");
    expect(directives.get("frame-src"), "frame-src must not fall back to default-src").toBeDefined();
  });
});