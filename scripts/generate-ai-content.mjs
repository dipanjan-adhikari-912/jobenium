/**
 * Build-time AI/SEO content generator.
 *
 * Runs after `vite build` and writes into dist/ only — src/ is never touched and
 * no generated file is committed, so there is nothing to drift. Everything is
 * derived from src/data/sources.csv, the single source of truth for the catalog.
 *
 * Produces:
 *   dist/index.html        (post-processed: meta, canonical, OG, JSON-LD, hero block)
 *   dist/sources.html      (crawlable catalog)
 *   dist/sources.md        (markdown for LLMs)
 *   dist/pricing.md        (free-tier summary for agents)
 *   dist/llms.txt          (llmstxt.org context file)
 *   dist/sitemap.xml
 *   dist/sources.csv       (raw copy of the dataset)
 *   dist/sources.json      (structured dataset)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const CSV_PATH = join(ROOT, "src", "data", "sources.csv");

const SITE_URL = "https://jobenium.work";
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const EM = "\u2014"; // em dash

/** Display order of catalog groups, with the copy used to describe each. */
const GROUPS = [
  { label: "ATS platforms", blurb: "Applicant tracking systems and career infrastructure." },
  { label: "Job boards", blurb: "General job boards and aggregators." },
  { label: "Country", blurb: "Country-specific job sites, ordered by relevance for that market." },
  { label: "Specialist", blurb: "Job boards for a particular role, craft or seniority band." },
  { label: "Startup / VC", blurb: "Job boards run by venture capital firms and accelerators." },
  { label: "Communities", blurb: "Forums and communities where jobs are posted directly." },
  { label: "Other ATS", blurb: "Applicant tracking systems that do not fit the categories above." },
  { label: "Career Pages", blurb: "Company career pages and job search portals." },
];

// ---------------------------------------------------------------------------
// CSV parsing — mirrors src/lib/csv.ts so ids and counts stay identical.
// generate-ai-content.test.ts asserts parity against the real parser.
// ---------------------------------------------------------------------------

function parseCsvRows(raw) {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((f) => f.trim() !== "")) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Text for one source, used by both HTML and markdown renderers. */
function describeSource(source) {
  const parts = [];
  if (source.description) parts.push(source.description);
  if (source.countries.length) parts.push(source.countries.join(", "));
  if (source.workMode.length) {
    const readable = source.workMode.map((m) =>
      m === "onsite" ? "in-office" : m,
    );
    parts.push(`work mode: ${readable.join("/")}`);
  }
  return parts.join(` ${EM} `);
}

function slug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function countGroup(sources, label) {
  return sources.filter((s) => s.group === label).length;
}

const faqItems = (total) => [
  {
    q: "What is Jobenium?",
    a: "Jobenium is a job search launcher. You type a job title once and it runs that same search across every source in its catalog, so you can reach country job boards, applicant tracking systems and specialist boards without searching each one by hand.",
  },
  {
    q: "How does Jobenium differ from a single job board?",
    a: "A job board holds its own listings. Jobenium holds no listings at all " + EM + " it builds a search for each source in its catalog and hands you the results, so it works as a single front door to many independent boards at once.",
  },
  {
    q: "Do I need an account to use Jobenium?",
    a: "No. Jobenium requires no sign-up, no account and no payment details, and it is free to use.",
  },
  {
    q: "How many job sources does Jobenium cover?",
    a: `The catalog lists ${total} sources across applicant tracking systems, general job boards, country-specific sites, specialist boards, startup and venture-backed boards, communities and career pages.`,
  },
];

// ---------------------------------------------------------------------------
// dist/sources.html
// ---------------------------------------------------------------------------

function renderSourcesHtml(sources, total) {
  const countryCount = countGroup(sources, "Country");

  const nav = GROUPS.map((g) => {
    const count = countGroup(sources, g.label);
    return `        <li><a href="#${slug(g.label)}">${escapeHtml(g.label)} (${count})</a></li>`;
  }).join("\n");

  const sections = GROUPS.map((g) => {
    const rows = sources.filter((s) => s.group === g.label);
    if (rows.length === 0) return "";
    const body = rows
      .map((s) => {
        const site = s.sites[0] || "";
        const name = site
          ? `<a href="https://${escapeHtml(site)}" rel="nofollow noopener">${escapeHtml(s.name)}</a>`
          : escapeHtml(s.name);
        return [
          "        <tr>",
          `          <th scope="row">${name}</th>`,
          `          <td>${escapeHtml(site || EM)}</td>`,
          `          <td>${escapeHtml(describeSource(s)) || EM}</td>`,
          "        </tr>",
        ].join("\n");
      })
      .join("\n");

    return [
      `      <section id="${slug(g.label)}">`,
      `        <h2>${escapeHtml(g.label)} (${rows.length})</h2>`,
      `        <p>${escapeHtml(g.blurb)}</p>`,
      "        <table>",
      "          <thead>",
      '            <tr><th scope="col">Source</th><th scope="col">Site</th><th scope="col">Details</th></tr>',
      "          </thead>",
      "          <tbody>",
      body,
      "          </tbody>",
      "        </table>",
      "      </section>",
    ].join("\n");
  })
    .filter(Boolean)
    .join("\n\n");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Jobenium job source catalog",
    numberOfItems: sources.length,
    itemListElement: sources.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: s.sites[0] ? `https://${s.sites[0]}` : SITE_URL,
    })),
  };

  const faqHtml = faqItems(total)
    .map(
      (item) =>
        `        <h3>${escapeHtml(item.q)}</h3>\n        <p>${escapeHtml(item.a)}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Job source catalog ${EM} ${total} job boards and ATS platforms | Jobenium</title>
    <meta name="description" content="A searchable catalog of ${total} job sources: applicant tracking systems, general job boards, country job boards, specialist boards, startup boards and career pages, each with its site and coverage details." />
    <link rel="canonical" href="${SITE_URL}/sources.html" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <style>
      :root { color-scheme: light; }
      body { margin: 0; padding: 2.5rem 1.25rem 5rem; background: #faf9f7; color: #1d1b18;
             font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      main { max-width: 68rem; margin: 0 auto; }
      h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 1rem; letter-spacing: -0.02em; }
      h2 { font-size: 1.3rem; margin: 2.75rem 0 0.5rem; letter-spacing: -0.01em; }
      h3 { font-size: 1.02rem; margin: 1.5rem 0 0.35rem; }
      p, li { color: #45403a; }
      a { color: #1f5fd6; }
      .lede { font-size: 1.06rem; }
      .meta { font-size: 0.85rem; color: #6d675f; }
      nav ul { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; padding: 0; margin: 0; list-style: none; }
      table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 0; font-size: 0.9rem; }
      caption { caption-side: top; text-align: left; color: #6d675f; font-size: 0.85rem; padding-bottom: 0.4rem; }
      th, td { text-align: left; vertical-align: top; padding: 0.4rem 0.75rem 0.4rem 0; border-bottom: 1px solid #e7e3dc; }
      thead th { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6d675f; border-bottom: 1px solid #d8d3cb; }
      tbody th { font-weight: 500; }
      tbody td:nth-child(2) { color: #6d675f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.84rem; word-break: break-word; }
      tbody td:nth-child(3) { color: #45403a; }
      footer { max-width: 68rem; margin: 3.5rem auto 0; padding-top: 1.25rem; border-top: 1px solid #e7e3dc; font-size: 0.85rem; color: #6d675f; }
    </style>
    <script type="application/ld+json">
${JSON.stringify(itemList, null, 2)}
    </script>
  </head>
  <body>
    <main>
      <h1>Job source catalog ${EM} ${total} job boards, ATS platforms and country sites</h1>

      <p class="lede">Jobenium indexes ${total} places to look for jobs so one search can be run against all of them at once. The catalog below lists every source by category, with the site it searches and where it covers: applicant tracking systems, general job boards, ${countryCount} country-specific sites, specialist boards, startup and venture-backed boards, communities and career pages. Last updated: ${BUILD_DATE}.</p>

      <p><a href="${SITE_URL}/">Open the Jobenium launcher</a> to run one search across all ${total} sources at once.</p>

      <h2>Jump to a category</h2>
      <nav>
      <ul>
${nav}
      </ul>
      </nav>

${sections}

      <section id="faq">
        <h2>Frequently asked questions</h2>
${faqHtml}
      </section>

      <h2>How this catalog is built</h2>
      <p>Sources are grouped by the kind of site they are, and country-specific sources are ordered by how well each covers that market. The same list drives the launcher itself, so it is regenerated on every build from a single dataset. The raw data is available as <a href="/sources.csv">CSV</a> and <a href="/sources.json">JSON</a>.</p>
    </main>
    <footer>Jobenium ${EM} free, no sign-up. ${SITE_URL.replace("https://", "")}</footer>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Markdown + agent files
// ---------------------------------------------------------------------------

function renderSourcesMd(sources, total) {
  const parts = [
    "# Jobenium job source catalog",
    "",
    `${total} job sources across ${GROUPS.length} categories. Last updated: ${BUILD_DATE}.`,
    `Launcher: ${SITE_URL}/`,
    "",
  ];
  for (const g of GROUPS) {
    const rows = sources.filter((s) => s.group === g.label);
    if (rows.length === 0) continue;
    parts.push(`## ${g.label} (${rows.length})`, "", g.blurb, "");
    for (const s of rows) {
      const site = s.sites[0] || "";
      const link = site ? `[${s.name}](https://${site})` : s.name;
      const details = describeSource(s);
      parts.push(`- ${link}${details ? ` ${EM} ${details}` : ""}`);
    }
    parts.push("");
  }
  return parts.join("\n");
}

function renderPricingMd(total) {
  return `# Pricing ${EM} Jobenium

## Free
- Price: 0/month
- Limits: none. No account, no card, no usage cap.
- Features: the full catalog of ${total} job sources, country and work-mode filters, search-engine choice

Jobenium requires no sign-up and collects no payment details.
`;
}

function renderLlmsTxt(sources, total) {
  const countrySites = countGroup(sources, "Country");
  const countryCount = new Set(
    sources.flatMap((s) => s.countryIds).filter(Boolean),
  ).size;
  return `# Jobenium

> Jobenium is a job search launcher: type a job title once and run that search across ${total} job sources at once ${EM} applicant tracking systems, general job boards, ${countrySites} country-specific job sites covering ${countryCount} countries, specialist boards, startup and venture-backed boards, communities and career pages. Free, no sign-up.

## Pages
- [Jobenium launcher](${SITE_URL}/): the search tool itself
- [Job source catalog](${SITE_URL}/sources.html): all ${total} sources grouped by category, with sites and coverage
- [Frequently asked questions](${SITE_URL}/sources.html#faq)
- [Sitemap](${SITE_URL}/sitemap.xml)

## Reference
- [Catalog (markdown)](${SITE_URL}/sources.md): the same catalog as markdown
- [Catalog data (CSV)](${SITE_URL}/sources.csv) and [JSON](${SITE_URL}/sources.json)
- [Pricing](${SITE_URL}/pricing.md): free, no account required

## Optional
- [ATS platforms](${SITE_URL}/sources.html#ats-platforms) and [job boards](${SITE_URL}/sources.html#job-boards)
- [Country sites](${SITE_URL}/sources.html#country) and [specialist boards](${SITE_URL}/sources.html#specialist)
- [Startup / VC boards](${SITE_URL}/sources.html#startup-vc), [communities](${SITE_URL}/sources.html#communities) and [career pages](${SITE_URL}/sources.html#career-pages)
`;
}

function renderSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/sources.html</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;
}

// ---------------------------------------------------------------------------
// index.html post-processing
// ---------------------------------------------------------------------------

/**
 * A compact block that mirrors the visible hero, so the swap to the live app is
 * near-seamless. Not AI-only text " the same words a visitor sees.
 */
function heroBlock(total) {
  return `    <div>
        <h1>The internet is full of jobs.<br />Find yours.</h1>
        <p>No sign-up needed. Free forever.</p>
        <p>Jobenium runs one job search across ${total} sources: applicant tracking systems, job boards, country job sites, specialist boards, startup boards, communities and career pages. <a href="/sources.html">Browse the full catalog of ${total} sources</a>.</p>
      </div>`;
}

const HEAD_START = "<!-- seo:head -->";
const HEAD_END = "<!-- /seo:head -->";
const ROOT_START = "<!-- seo:root -->";
const ROOT_END = "<!-- /seo:root -->";

/**
 * Injects SEO head tags and the hero copy into the built index.html.
 * Idempotent: previously injected blocks are replaced, not stacked, so running
 * the generator repeatedly (e.g. from tests) never duplicates markup.
 * Returns false only when there is no built index.html to patch.
 */
function patchIndexHtml(total, outDir = DIST) {
  const path = join(outDir, "index.html");
  if (!existsSync(path)) {
    // dist/index.html is produced by vite build; nothing to patch yet (e.g. a
    // standalone test run before the first build). Skip rather than throw.
    return false;
  }
  let html = readFileSync(path, "utf8");
  const title = `Jobenium ${EM} Job Search Launcher`;
  const description = `Run one job search across ${total} job boards, applicant tracking systems and country job sites at once. Free, no sign-up.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Jobenium",
        url: `${SITE_URL}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any (web)",
        description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "Organization",
        name: "Jobenium",
        url: `${SITE_URL}/`,
      },
    ],
  };

  const headTags = [
    `    <meta name="description" content="${escapeHtml(description)}" />`,
    `    <link rel="canonical" href="${SITE_URL}/" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:site_name" content="Jobenium" />`,
    `    <meta property="og:title" content="${escapeHtml(title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(description)}" />`,
    `    <meta property="og:url" content="${SITE_URL}/" />`,
    `    <meta name="twitter:card" content="summary" />`,
    `    <meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`,
  ].join("\n");

  // NB: headTags is a string, so it is joined as a single element — spreading
  // it would iterate its characters.
  const headBlock = [HEAD_START, headTags, HEAD_END].join("\n");

  // Replace a previously injected block if present, otherwise insert before </head>.
  if (html.includes(HEAD_START) && html.includes(HEAD_END)) {
    html = html.replace(
      new RegExp(`${escapeRegExp(HEAD_START)}[\\s\\S]*?${escapeRegExp(HEAD_END)}`),
      headBlock,
    );
  } else {
    html = html.replace("</head>", `${headBlock}\n  </head>`);
  }

  // Put the hero copy inside the React root so crawlers read real content.
  // createRoot().render() replaces the children on mount. We target only the
  // empty <div id="root"></div> that vite emits, so nested markup never confuses
  // the match.
  const rootBlock = `${ROOT_START}\n${heroBlock(total)}\n    ${ROOT_END}`;
  if (html.includes(ROOT_START) && html.includes(ROOT_END)) {
    html = html.replace(
      new RegExp(`${escapeRegExp(ROOT_START)}[\\s\\S]*?${escapeRegExp(ROOT_END)}`),
      rootBlock,
    );
  } else if (html.includes('<div id="root"></div>')) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">\n${rootBlock}\n    </div>`,
    );
  }

  writeFileSync(path, html);
  return true;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------

/**
 * Writes every artifact and returns a summary used by the test suite.
 * `rows` is the raw parsed CSV grid (header excluded) for parity checks.
 * `outDir` defaults to dist/; tests pass their own temp dir to avoid racing
 * other test files that also invoke generate().
 */
export function generate(outDir = DIST) {
  const csvRaw = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsvRows(csvRaw);
  const header = rows[0];
  const sources = rows.slice(1).map((cells) => {
    const row = {};
    header.forEach((key, idx) => {
      row[key] = (cells[idx] ?? "").trim();
    });
    return {
      id: row.id,
      name: row.name,
      group: row.group,
      sites: row.sites ? row.sites.split(";").filter(Boolean) : [],
      countries: row.countries ? row.countries.split(";").filter(Boolean) : [],
      countryIds: row.country_ids ? row.country_ids.split(";").filter(Boolean) : [],
      workMode: row.work_mode ? row.work_mode.split("|").filter(Boolean) : [],
      sourceType: row.source_type || "",
      description: row.description || "",
    };
  });

  const total = sources.length;
  const files = [];
  const write = (name, contents) => {
    writeFileSync(join(outDir, name), contents);
    files.push(name);
  };

  write("sources.html", renderSourcesHtml(sources, total));
  write("sources.md", renderSourcesMd(sources, total));
  write("pricing.md", renderPricingMd(total));
  write("llms.txt", renderLlmsTxt(sources, total));
  write("sitemap.xml", renderSitemap());
  write("sources.csv", csvRaw);
  write("sources.json", `${JSON.stringify(sources, null, 2)}\n`);
  if (patchIndexHtml(total, outDir)) files.push("index.html");

  return {
    files,
    rows: rows.slice(1),
    header,
    total,
    html: renderSourcesHtml(sources, total),
  };
}

/** Only write when run directly (npm run build), not when imported by tests. */
const isDirectRun =
  process.argv[1] && process.argv[1].endsWith("generate-ai-content.mjs");
if (isDirectRun) {
  const { files, total } = generate();
  console.log(`generated AI content: ${total} sources -> ${files.join(", ")}`);
}
