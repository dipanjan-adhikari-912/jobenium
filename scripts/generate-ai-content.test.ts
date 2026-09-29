import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
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
      "pricing.md",
      "llms.txt",
      "sitemap.xml",
      "sources.csv",
      "sources.json",
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
