import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseCsvRows } from "../src/lib/csv";
import { sources } from "../src/data/sources";
import { generate, escapeHtml } from "./generate-ai-content";

const root = process.cwd();
const csvRaw = readFileSync(join(root, "src", "data", "sources.csv"), "utf8");

// vite emits this shell; the generator only patches it, never replaces it.
const INDEX_SHELL = `<!doctype html>
<html lang="en">
  <head>
    <title>Jobenium</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

// A private outDir per test run: the generator writes real files, so sharing
// the repo's dist/ would race with the build and other suites.
let dist = "";

describe("generate-ai-content", () => {
  beforeAll(() => {
    dist = mkdtempSync(join(tmpdir(), "jobenium-ai-"));
    writeFileSync(join(dist, "index.html"), INDEX_SHELL);
    // Vite emits the hashed backdrop into dist/assets/; the generator reads the
    // directory to preload it, so the fixture has to have one.
    mkdirSync(join(dist, "assets"), { recursive: true });
    writeFileSync(join(dist, "assets", "bg-1-TESThash.webp"), "not-a-real-image");
    generate(dist);
  });

  afterAll(() => {
    if (dist) rmSync(dist, { recursive: true, force: true });
  });

  it("produces every artifact", () => {
    const { files } = generate(dist);
    expect(files).toEqual([
      "sources.html",
      "sources.md",
      "pricing.html",
      "pricing.md",
      "llms.txt",
      "sitemap.xml",
      "sources.csv",
      "sources.json",
      "about.html",
      "privacy.html",
      "terms.html",
      "contact.html",
      "disclosure.html",
      "index.html",
    ]);
  });

  it("parses the CSV identically to the app parser (no drift)", () => {
    const rows = parseCsvRows(csvRaw);
    const { rows: parsed } = generate(dist);

    expect(parsed).toHaveLength(rows.length - 1);
    expect(parsed).toHaveLength(sources.length);

    const idIndex = rows[0].indexOf("id");
    expect(parsed.map((r) => r[idIndex])).toEqual(sources.map((s) => s.id));
  });

  it("emits all 273 sources in the catalog", () => {
    const { rows, total } = generate(dist);
    expect(rows).toHaveLength(273);
    expect(total).toBe(sources.length);
  });

  it("escapes HTML in generated pages", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeHtml("it's")).toBe("it&#39;s");

    const { html } = generate(dist);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("undefined");
  });

  it("is idempotent - repeated runs do not stack head tags", () => {
    const indexPath = join(dist, "index.html");
    generate(dist);
    const first = readFileSync(indexPath, "utf8");
    generate(dist);
    const second = readFileSync(indexPath, "utf8");

    expect(second).toBe(first);
    expect(second.match(/name="description"/g) ?? []).toHaveLength(1);
    expect(second.match(/<!-- seo:head -->/g) ?? []).toHaveLength(1);
    expect(second.match(/<!-- \/seo:head -->/g) ?? []).toHaveLength(1);
    expect(second.match(/<!-- seo:root -->/g) ?? []).toHaveLength(1);
    expect(second.match(/<!-- \/seo:root -->/g) ?? []).toHaveLength(1);
  });

  it("adds meta description, canonical and JSON-LD to index.html", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    expect(html).toContain('name="description"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain("application/ld+json");
    expect(html).toContain("SoftwareApplication");
  });

  it("puts crawlable text inside #root in index.html", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    expect(html).not.toContain('<div id="root"></div>');
    expect(html).toContain("The internet is full of jobs");
    expect(html).toContain("/sources.html");
  });

  it("lists the catalog in sources.html and llms.txt", () => {
    const catalog = readFileSync(join(dist, "sources.html"), "utf8");
    expect(catalog).toContain("ATS platforms (34)");
    expect(catalog).toContain("Country (193)");
    expect(catalog).toContain("Frequently asked questions");
    expect(catalog).toContain("https://schema.org");

    const llms = readFileSync(join(dist, "llms.txt"), "utf8");
    expect(llms).toContain("# Jobenium");
    expect(llms).toContain("/sources.html");
  });

  it("renders every CSV group, so no source is silently dropped", () => {
    const rows = parseCsvRows(csvRaw);
    const groupIndex = rows[0].indexOf("group");
    const counts = new Map<string, number>();
    for (const r of rows.slice(1)) {
      const g = r[groupIndex];
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }

    const catalog = readFileSync(join(dist, "sources.html"), "utf8");
    for (const [group, count] of counts) {
      expect(catalog, `missing group ${group}`).toContain(
        `>${group} (${count})</h2>`,
      );
    }

    // One table row per source: a group label typo once cost us a row.
    const bodyRows = catalog.match(/<th scope="row">/g) ?? [];
    expect(bodyRows).toHaveLength(sources.length);

    // And the markdown catalog must not lose one either.
    const md = readFileSync(join(dist, "sources.md"), "utf8");
    const mdItems = md.match(/^- \[|^-\s\S/gm) ?? [];
    expect(mdItems.length).toBeGreaterThanOrEqual(sources.length);
    for (const s of sources) expect(md).toContain(s.name);
  });

  it("states counts that agree with the CSV across every artifact", () => {
    const rows = parseCsvRows(csvRaw);
    const groupIndex = rows[0].indexOf("group");
    const countrySites = rows
      .slice(1)
      .filter((r) => r[groupIndex] === "Country").length;
    const countryCount = new Set(
      rows
        .slice(1)
        .flatMap((r) => (r[rows[0].indexOf("country_ids")] ?? "").split(";"))
        .filter(Boolean),
    ).size;

    const catalog = readFileSync(join(dist, "sources.html"), "utf8");
    const llms = readFileSync(join(dist, "llms.txt"), "utf8");
    const hero = readFileSync(join(dist, "index.html"), "utf8");
    const md = readFileSync(join(dist, "sources.md"), "utf8");

    // The total, never hard-coded, and matching the app's own data.
    for (const doc of [catalog, llms, hero, md]) {
      expect(doc).toContain(String(sources.length));
    }

    // "Country (N)" is the site count; the country count is a different number
    // and must never be presented as a site count.
    expect(catalog).toContain(`${countrySites} country-specific sites`);
    expect(llms).toContain(
      `${countrySites} country-specific job sites covering ${countryCount} countries`,
    );
    expect(llms).not.toContain(`${countryCount} country-specific job sites`);
  });

  it("emits a sitemap and agent pricing file", () => {
    const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
    expect(sitemap).toContain("<loc>https://jobenium.work/</loc>");
    expect(sitemap).toContain("<loc>https://jobenium.work/sources.html</loc>");

    const pricing = readFileSync(join(dist, "pricing.md"), "utf8");
    expect(pricing).toContain("# Pricing");
    expect(pricing).toContain("Price: 0/month");
  });

  it("emits a real, self-canonical, linked trust page for every static page", () => {
    const slugs = ["pricing.html", "about.html", "privacy.html", "terms.html", "contact.html", "disclosure.html"];
    for (const slug of slugs) {
      const html = readFileSync(join(dist, slug), "utf8");

      // Self-referencing canonical and exactly one H1.
      expect(html, `${slug} canonical`).toContain(
        `<link rel="canonical" href="https://jobenium.work/${slug}" />`,
      );
      expect((html.match(/<h1[\s>]/g) ?? []).length, `${slug} h1 count`).toBe(1);
      expect(html, `${slug} title`).toMatch(/<title>[^<]+<\/title>/);
      expect(html, `${slug} description`).toMatch(/name="description" content="[^"]+"/);

      // No orphan pages: every one links back to the launcher and the catalog.
      expect(html, `${slug} links home`).toContain('href="https://jobenium.work/"');
      expect(html, `${slug} links catalog`).toContain('href="/sources.html"');

      // Trust pages must not be shells.
      const words = html
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<style[\s\S]*?<\/style>/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);
      expect(words.length, `${slug} is too thin`).toBeGreaterThan(150);

      // And they carry the OG card, or social shares render bare.
      expect(html, `${slug} og:image`).toContain('property="og:image"');
    }
  });

  it("lists every generated page in the sitemap", () => {
    const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
    for (const slug of [
      "", "sources.html", "pricing.html",
      "about.html", "privacy.html", "terms.html", "contact.html", "disclosure.html",
    ]) {
      expect(sitemap, `sitemap missing /${slug}`).toContain(
        `<loc>https://jobenium.work/${slug}</loc>`,
      );
    }
    // Sitemap must not list a page that does not exist.
    const locs = [...sitemap.matchAll(/<loc>https:\/\/jobenium\.work\/([^<]*)<\/loc>/g)].map((m) => m[1]);
    for (const loc of locs) {
      expect(existsSync(join(dist, loc || "index.html")), `sitemap lists missing ${loc}`).toBe(true);
    }
  });

  it("keeps SERP titles and descriptions inside the display budget", () => {
    const check = (slug: string) => {
      const html = readFileSync(join(dist, slug), "utf8");
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? "";
      const desc =
        (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? "";
      // Google renders ~600px of title and ~155-160 chars of description.
      expect(title.length, `${slug} title is ${title.length} chars`).toBeGreaterThanOrEqual(30);
      expect(title.length, `${slug} title is ${title.length} chars`).toBeLessThanOrEqual(60);
      expect(desc.length, `${slug} description is ${desc.length} chars`).toBeLessThanOrEqual(160);
    };
    check("index.html");
    check("sources.html");
    check("pricing.html");
    check("about.html");
  });

  it("puts a social card and the LCP backdrop preload on the homepage", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    expect(html).toContain('property="og:image" content="https://jobenium.work/og-image.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image"');
    // The backdrop is a React-injected CSS background, so only an explicit
    // preload makes the browser find it before first paint.
    expect(html).toMatch(/<link rel="preload" as="image" href="\/assets\/bg-1-[\w-]+\.webp" fetchpriority="high" \/>/);
  });

  it("describes the site and its owner in structured data", () => {
    // Homepage uses an @graph wrapper, the catalog emits a bare array; flatten
    // both into a single list of nodes.
    const nodes = (slug: string) => {
      const html = readFileSync(join(dist, slug), "utf8");
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ];
      return blocks.flatMap((b) => {
        const parsed = JSON.parse(b[1]);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        return list.flatMap((n) => n["@graph"] ?? [n]);
      });
    };

    const home = nodes("index.html");
    expect(home.map((n) => n["@type"])).toEqual(
      expect.arrayContaining(["WebSite", "SoftwareApplication", "Organization", "Person"]),
    );
    const org = home.find((n) => n["@type"] === "Organization");
    expect(org.sameAs).toContain("https://linkedin.com/in/dipanjan-adhikari");
    expect(org.logo.url).toBe("https://jobenium.work/icon-512.png");

    // The catalog page advertises a list and the FAQ it renders.
    const catHtml = readFileSync(join(dist, "sources.html"), "utf8");
    const cat = nodes("sources.html");
    const list = cat.find((n) => n["@type"] === "ItemList");
    const faq = cat.find((n) => n["@type"] === "FAQPage");
    expect(list.itemListElement).toHaveLength(sources.length);
    expect(faq.mainEntity.length).toBeGreaterThan(0);
    // Every FAQ answer must also be visible on the page, or it is cloaking.
    for (const q of faq.mainEntity) {
      expect(catHtml).toContain(q.name);
      expect(catHtml).toContain(q.acceptedAnswer.text.slice(0, 40));
    }
  });

  it("copies the dataset verbatim to dist/sources.csv", () => {
    expect(readFileSync(join(dist, "sources.csv"), "utf8")).toBe(csvRaw);
  });

  it("skips the index patch when there is no built index.html", () => {
    const bare = mkdtempSync(join(tmpdir(), "jobenium-bare-"));
    const { files } = generate(bare);
    expect(files).not.toContain("index.html");
    rmSync(bare, { recursive: true, force: true });
  });
});
