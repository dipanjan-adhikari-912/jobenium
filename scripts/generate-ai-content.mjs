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
 *   dist/llms.txt          (llmstxt.org context file)
 *   dist/sitemap.xml
 *   dist/sources.csv       (raw copy of the dataset)
 *   dist/sources.json      (structured dataset)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const CSV_PATH = join(ROOT, "src", "data", "sources.csv");

const SITE_URL = "https://jobenium.work";
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const EM = "\u2014"; // em dash

/**
 * Trust + reference pages. Small, hand-written, and entirely static: they carry
 * no catalog data, so they do not need to be regenerated from the CSV, but they
 * are emitted here so one place owns the whole set of indexable URLs.
 */
const STATIC_PAGES = [
  { slug: "about.html", title: "About Jobenium: ${total} job sources, one search", desc: "Who builds Jobenium and why it exists. No ads, no accounts, and a source list that cannot be bought." },
  { slug: "privacy.html", title: "Privacy: no cookies, no accounts, no tracking", desc: "Jobenium sets no cookies, stores nothing on a server and collects no personal data." },
  { slug: "terms.html", title: "Terms of use for the Jobenium launcher", desc: "The terms for using Jobenium: a free tool that builds job searches across third-party boards." },
  { slug: "contact.html", title: "Contact Jobenium: source corrections welcome", desc: "How to reach the person behind Jobenium, and what is most useful to send." },
  { slug: "disclosure.html", title: "Disclosure: how Jobenium is funded", desc: "Jobenium is free, carries no ads, and source placement cannot be bought or sold." },
];

/** Sitemap order: the two data-driven pages, then the trust set. */
const NAV = [
  { href: "/sources.html", label: "Source catalog" },
  { href: "/about.html", label: "About" },
  { href: "/privacy.html", label: "Privacy" },
  { href: "/terms.html", label: "Terms" },
  { href: "/contact.html", label: "Contact" },
  { href: "/disclosure.html", label: "Disclosure" },
];

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

/**
 * Shared chrome for every generated page. Kept in one place so the trust pages
 * cannot drift from the catalog, and so there is exactly one definition of what
 * a generated page's head looks like.
 */
const PAGE_CSS = `      :root { color-scheme: light; }
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
    .prose ul, .prose ol { padding-left: 1.35rem; }
    .prose li { margin: 0.3rem 0; }
    footer { max-width: 68rem; margin: 3.5rem auto 0; padding-top: 1.25rem; border-top: 1px solid #e7e3dc; font-size: 0.85rem; color: #6d675f; }
    footer nav { margin-bottom: 0.6rem; }`;

/** Site-wide nav/footer, reused by every generated page so none is orphaned. */
function pageNav(currentHref) {
const items = NAV.map(
  (n) =>
    `        <li><a href="${n.href}"${n.href === currentHref ? ' aria-current="page"' : ""}>${escapeHtml(n.label)}</a></li>`,
);
return `      <nav aria-label="Site">
      <ul>
${items.join("\n")}
      </ul>
    </nav>`;
}

function pageFooter(currentHref) {
  return `    <footer>
      <p><a href="${SITE_URL}/">Back to the Jobenium launcher</a></p>
${pageNav(currentHref)}
      <p>Jobenium ${EM} free, no sign-up. jobenium.work</p>
    </footer>`;
}

/**
 * Head block shared by the static (non-catalog) pages. `title` is the complete
 * SERP headline — the brand is part of each one, so it is not appended here.
 */
function staticHead({ title, desc, path, jsonLd }) {
  const url = `${SITE_URL}/${path}`;
  return `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="alternate icon" href="/favicon.ico" sizes="any" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Jobenium" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <style>
${PAGE_CSS}
  </style>${
    jsonLd
      ? `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`
      : ""
  }`;
}

/** Wraps page body markup in the shared document shell. */
function page({ head, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
${head}
  </head>
  <body>
    <main>
${body}
    </main>
${pageFooter()}
  </body>
</html>
`;
}

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
    <title>273 Job Boards &amp; ATS Platforms ${EM} Jobenium Catalog</title>
    <meta name="description" content="Every one of the ${total} job sources Jobenium searches: ATS platforms, job boards, ${countryCount} country sites and more." />
    <link rel="canonical" href="${SITE_URL}/sources.html" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate icon" href="/favicon.ico" sizes="any" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Jobenium" />
    <meta property="og:title" content="273 job boards &amp; ATS platforms ${EM} Jobenium" />
    <meta property="og:description" content="Every one of the ${total} job sources Jobenium searches, by category." />
    <meta property="og:url" content="${SITE_URL}/sources.html" />
    <meta property="og:image" content="${SITE_URL}/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
    <style>
${PAGE_CSS}
    </style>
    <script type="application/ld+json">
${JSON.stringify([itemList, faqPage(faqItems(total))], null, 2)}
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

## Optional
- [ATS platforms](${SITE_URL}/sources.html#ats-platforms) and [job boards](${SITE_URL}/sources.html#job-boards)
- [Country sites](${SITE_URL}/sources.html#country) and [specialist boards](${SITE_URL}/sources.html#specialist)
- [Startup / VC boards](${SITE_URL}/sources.html#startup-vc), [communities](${SITE_URL}/sources.html#communities) and [career pages](${SITE_URL}/sources.html#career-pages)
`;
}

/**
 * FAQPage structured data for the questions already rendered as <h3>+<p> on
 * the catalog page. Google restricted FAQ *rich results* to gov/health sites in
 * 2023, so the SERP upside is limited, but the markup is what AI answer engines
 * and knowledge panels actually read.
 */
function faqPage(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// ---------------------------------------------------------------------------
// Trust and reference pages
// ---------------------------------------------------------------------------

/**
 * Copy for the hand-written pages. `total` is interpolated so the numbers agree
 * with the CSV; nothing here is invented per-country or per-source.
 */
function staticPageBodies(total) {
  const built = BUILD_DATE;
  return {
    "about.html": `<h1>About Jobenium</h1>
      <p class="lede">Jobenium is a job search launcher, not a job board. It holds no listings at all. It takes one job title and runs that same search against every source in its catalog, then hands you the results.</p>

      <h2>Search every job board at once</h2>
      <p>Most job searches quietly miss most of the market. A role posted on an applicant tracking system is invisible on the big job boards, and a role posted on a country board is invisible everywhere else. Searching properly means visiting dozens of sites by hand, and almost nobody does that consistently.</p>
      <p>Jobenium takes one job title and builds the right search for each of its ${total} sources, so a single search reaches the whole market instead of the three sites you happened to remember.</p>

      <h2>What it searches</h2>
      <ul>
        <li><strong>Applicant tracking systems</strong> ${EM} the systems companies hire through, where most large-company roles are posted first.</li>
        <li><strong>General job boards</strong> ${EM} the big aggregators and the regional boards most people start with.</li>
        <li><strong>Country job sites</strong> ${EM} national boards and official labour portals that no global board covers well.</li>
        <li><strong>Specialist boards</strong> ${EM} roles by craft, sector or seniority, from design to engineering to clinical work.</li>
        <li><strong>Startup and VC boards</strong> ${EM} the funds and accelerators that publish their portfolio's openings in one place.</li>
        <li><strong>Communities and career pages</strong> ${EM} where jobs get posted directly, including employer career pages.</li>
      </ul>

      <h2>How to use it</h2>
      <ol>
        <li>Type a job title, or pick a recent search.</li>
        <li>Set a date window such as the last 24 hours, and a location if you want to narrow it.</li>
        <li>Open the sources that matter to you. Each opens a real search on that site's own results page.</li>
      </ol>
      <p>There is no account, no CV upload and no application tracking. Jobenium holds no listings of its own ${EM} it is a front door to other people's search results.</p>

      <h2>Free, with no catch</h2>
      <p>The full catalog of ${total} sources is available at no cost and with no usage cap. Jobenium is not funded by advertising or affiliate deals, and <a href="/disclosure.html">placement in the source list cannot be bought</a>.</p>

      <h2>How the catalog is built</h2>
      <p>The catalog is a single dataset, and the same dataset drives the tool and the <a href="/sources.html">public source list</a>. Sources are grouped by the kind of site they are, and country-specific sources are ranked by how well each covers that market. There is no paid placement and no source can buy a better rank.</p>

      <h2>What it does not do</h2>
      <ul>
        <li>It does not collect, store or sell your data.</li>
        <li>It does not apply to jobs on your behalf or send your CV anywhere.</li>
        <li>It does not vet the listings it sends you to. Those sites set their own rules.</li>
      </ul>

      <h2>Who is behind it</h2>
      <p>Jobenium is an independent project built and maintained by one person, <a href="https://linkedin.com/in/dipanjan-adhikari" rel="noopener nofollow">Dipanjan Adhikari</a>. Questions and corrections are welcome via the <a href="/contact.html">contact page</a>.</p>`,

    "privacy.html": `<h1>Privacy</h1>
      <p class="lede">Short version: Jobenium does not collect personal data, set cookies, or run accounts. There is nothing to opt out of.</p>

      <h2>No account, no server-side storage</h2>
      <p>Jobenium has no sign-up and no user database. Searches are assembled in your browser and handed straight to the source site. Your search terms are never sent to us, because there is no "us" server in the path.</p>

      <h2>What stays in your browser</h2>
      <p>Three things are kept in local storage on your own device, and clearing site data removes them:</p>
      <ul>
        <li><strong>Recent searches</strong> ${EM} the titles you searched for, so you can re-run one.</li>
        <li><strong>Visited sources</strong> ${EM} which source cards you have opened, shown as a small marker so you can tell them apart.</li>
        <li><strong>Preferences</strong> ${EM} things like link behaviour and dark mode.</li>
      </ul>
      <p>None of this is transmitted anywhere.</p>

      <h2>Analytics</h2>
      <p>Pages are counted with Vercel Web Analytics, which is cookie-free, collects no personal data, sets no advertising identifiers, and is not shared with advertising networks. It records aggregate page views and approximate geography so I can tell which parts of the site are used. The visitor counter in the footer reads that same aggregate count and disappears if the number cannot be retrieved.</p>

      <h2>Third parties</h2>
      <p>Following a source card takes you to a third-party site with its own privacy policy and its own use of your data. Jobenium has no control over those sites and is not responsible for what they do. Where a source card shows a company logo, it is fetched from a public favicon service, which receives the domain name of the source in order to return it.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the updated version will be on this page with a new date. Last updated: ${built}.</p>`,

    "terms.html": `<h1>Terms of use</h1>
      <p class="lede">Jobenium is a free tool with no warranty. These terms are short because the service is small.</p>

      <h2>The service</h2>
      <p>Jobenium builds and launches job searches across third-party job boards and applicant tracking systems. It is provided free of charge, with no account and no payment details required.</p>

      <h2>No warranty</h2>
      <p>Jobenium is provided "as is", without warranty of any kind. Search URLs are generated automatically from a maintained source list; individual sites change their URL structure, block automated requests, or serve results that differ from what a direct search would show. If a source does not work, tell me and I will fix or drop it.</p>

      <h2>No limit on liability</h2>
      <p>To the fullest extent permitted by law, I am not liable for anything arising from your use of Jobenium or of any site it links to, including lost applications, missed opportunities, or reliance on a listing that turns out to be stale or fraudulent. Check what you apply to.</p>

      <h2>Acceptable use</h2>
      <p>Please do not use Jobenium to send automated or bulk traffic to third-party job sites. Individual searches are fine; scraping the sources behind the tool is not. Rate limiting and access controls on those sites are their decision, and heavy use risks them blocking everyone.</p>

      <h2>Availability</h2>
      <p>No uptime guarantee is offered. The service is free and best-effort.</p>

      <h2>Contact</h2>
      <p>Questions about these terms go to the <a href="/contact.html">contact page</a>. Last updated: ${built}.</p>`,

    "contact.html": `<h1>Contact</h1>
      <p class="lede">One person reads everything that comes in. Corrections to the source list are the most useful thing you can send.</p>

      <h2>Email</h2>
      <p><a href="mailto:hello@jobenium.work">hello@jobenium.work</a></p>

      <h2>What is most useful to send</h2>
      <ul>
        <li><strong>A source that is missing</strong> ${EM} the site and roughly where it operates.</li>
        <li><strong>A source that is broken</strong> ${EM} which card, and what you saw when you opened it.</li>
        <li><strong>A correction to coverage</strong> ${EM} if a board is listed against the wrong country or work mode.</li>
        <li><strong>A bug</strong> ${EM} what you did, what you expected, and what happened instead. A screenshot helps.</li>
      </ul>

      <h2>What I cannot help with</h2>
      <p>I cannot track an application, find out why a specific employer rejected you, or get a listing taken down. Those go to the job site in question. I also cannot take a job board off the list just because you would rather it were not there ${EM} the catalog is not pay-to-play, and the <a href="/disclosure.html">disclosure</a> explains how it is funded.</p>

      <h2>Elsewhere</h2>
      <p><a href="https://linkedin.com/in/dipanjan-adhikari" rel="noopener nofollow">LinkedIn</a></p>`,

    "disclosure.html": `<h1>Disclosure</h1>
      <p class="lede">Jobenium is free and carries no advertising. Here is what that means for the source list.</p>

      <h2>How Jobenium is funded</h2>
      <p>Jobenium charges nothing and shows no ads. It is funded by nothing at all, which is the simplest possible answer to conflicts of interest.</p>

      <h2>How sources are selected</h2>
      <p>A source earns a place in the catalog by being a real, working job site or applicant tracking system that a job seeker could reasonably search. Ranking reflects how useful and how well-targeted the source is for its category, and country sources are ordered by how well they cover that market. <strong>Placement cannot be bought, sold, or negotiated.</strong></p>

      <h2>Affiliate links</h2>
      <p>There are none. Jobenium sends you to a source's own search results page. If a future version ever introduces a paid or affiliate arrangement, it will be disclosed here before it ships, and the affected links will be marked.</p>

      <h2>Logo and favicon display</h2>
      <p>Source cards show the publisher's own favicon, fetched from a public favicon service at request time. That request discloses the source domain to the favicon provider, and is governed by their privacy policy rather than this one.</p>

      <h2>Accuracy</h2>
      <p>The catalog reflects what I could verify at the time of writing. Job sites change ownership, coverage and URL structure. If something here is wrong, the <a href="/contact.html">contact page</a> is the fastest route to a fix.</p>`,
  };
}

function renderStaticPages(total) {
  const bodies = staticPageBodies(total);
  const breadcrumb = (name) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Jobenium", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}/` },
    ],
  });

  return STATIC_PAGES.map((p) => {
    const title = p.title.replace("${total}", String(total));
    const desc = p.desc;
    return page({
      head: staticHead({ title, desc, path: p.slug, jsonLd: breadcrumb(p.title) }),
      body: bodies[p.slug].replace("${total}", String(total)),
    });
  });
}

function renderSitemap() {
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    { loc: `${SITE_URL}/sources.html`, priority: "0.9" },
    ...STATIC_PAGES.map((p) => ({ loc: `${SITE_URL}/${p.slug}`, priority: "0.3" })),
  ];
  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

// ---------------------------------------------------------------------------
// index.html post-processing
// ---------------------------------------------------------------------------

/**
 * The crawlable mirror of the landing page: the visible hero plus the SEO copy
 * that now sits below the search box in the app. React replaces this on mount,
 * so it is a first-paint/JSS-fallback surface, not hidden text.
 */
function heroBlock(total) {
  return `    <div>
        <h1>The internet is full of jobs.<br />Find yours.</h1>
        <p>No sign-up needed. Free forever.</p>
        <p>Jobenium runs one job search across ${total} sources: applicant tracking systems, job boards, country job sites, specialist boards, startup boards, communities and career pages. <a href="/sources.html">Browse the full catalog of ${total} sources</a>.</p>

        <h2>Search every job board at once</h2>
        <p>Most job searches quietly miss most of the market. A role posted on an applicant tracking system is invisible on the big job boards, and a role posted on a country board is invisible everywhere else. Searching properly means visiting dozens of sites by hand, and almost nobody does that consistently.</p>
        <p>Jobenium takes one job title and builds the right search for each of its ${total} sources, so a single search reaches the whole market instead of the three sites you happened to remember.</p>

        <h2>What it searches</h2>
        <ul>
          <li><strong>Applicant tracking systems</strong> ${EM} the systems companies hire through, where most large-company roles are posted first.</li>
          <li><strong>General job boards</strong> ${EM} the big aggregators and the regional boards most people start with.</li>
          <li><strong>Country job sites</strong> ${EM} national boards and official labour portals that no global board covers well.</li>
          <li><strong>Specialist boards</strong> ${EM} roles by craft, sector or seniority, from design to engineering to clinical work.</li>
          <li><strong>Startup and VC boards</strong> ${EM} the funds and accelerators that publish their portfolio's openings in one place.</li>
          <li><strong>Communities and career pages</strong> ${EM} where jobs get posted directly, including employer career pages.</li>
        </ul>

        <h2>How to use it</h2>
        <ol>
          <li>Type a job title, or pick a recent search.</li>
          <li>Set a date window such as the last 24 hours, and a location if you want to narrow it.</li>
          <li>Open the sources that matter to you. Each opens a real search on that site's own results page.</li>
        </ol>
        <p>There is no account, no CV upload and no application tracking. Jobenium holds no listings of its own ${EM} it is a front door to other people's search results. <a href="/about.html">Read more about how it works</a>.</p>

        <h2>Free, with no catch</h2>
        <p>The full catalog of ${total} sources is available at no cost and with no usage cap. Jobenium is not funded by advertising or affiliate deals, and <a href="/disclosure.html">placement in the source list cannot be bought</a>.</p>
        <p>See the <a href="/sources.html">full source catalog</a> or the <a href="/privacy.html">privacy policy</a>.</p>
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

  // ~52 chars: leads with the differentiator, brand last, fits the SERP.
  const title = `One Job Search Across ${total} Job Boards ${EM} Jobenium`;
  const description = `Run one job search across ${total} job boards, ATS platforms and country job sites at once. Free, no sign-up.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Jobenium",
        url: `${SITE_URL}/`,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Jobenium",
        url: `${SITE_URL}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any (web)",
        browserRequirements: "Requires JavaScript",
        description,
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Jobenium",
        url: `${SITE_URL}/`,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
        sameAs: ["https://linkedin.com/in/dipanjan-adhikari"],
        founder: { "@id": `${SITE_URL}/#founder` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#founder`,
        name: "Dipanjan Adhikari",
        url: `${SITE_URL}/about.html`,
        sameAs: ["https://linkedin.com/in/dipanjan-adhikari"],
        worksFor: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  // The backdrop is a CSS background injected by React, so nothing in the HTML
  // references it and the browser only found it ~2.3s in. Preload the first
  // frame: it is the element Chrome records as LCP.
  const backdrop = firstBackdropAsset(outDir);
  const preload = backdrop
    ? `    <link rel="preload" as="image" href="/assets/${backdrop}" fetchpriority="high" />`
    : "";

  const titleTag = `<title>${escapeHtml(title)}</title>`;

  const headTags = [
    preload,
    `    <meta name="description" content="${escapeHtml(description)}" />`,
    `    <link rel="canonical" href="${SITE_URL}/" />`,
    `    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />`,
    `    <link rel="alternate icon" href="/favicon.ico" sizes="any" />`,
    `    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `    <meta name="theme-color" content="#0b3b2e" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:site_name" content="Jobenium" />`,
    `    <meta property="og:title" content="${escapeHtml(title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(description)}" />`,
    `    <meta property="og:url" content="${SITE_URL}/" />`,
    `    <meta property="og:image" content="${SITE_URL}/og-image.png" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:image:alt" content="Jobenium: one job search across ${total} job boards" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `    <meta name="twitter:image" content="${SITE_URL}/og-image.png" />`,
    `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`,
  ]
    .filter(Boolean)
    .join("\n");

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

  // The generator owns the <title> as well, so the SERP headline cannot drift
  // out of sync with the CSV-derived count in the meta description.
  if (/<title>[\s\S]*?<\/title>/.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, titleTag);
  } else {
    html = html.replace("</head>", `    ${titleTag}\n  </head>`);
  }

  writeFileSync(path, html);
  return true;
}

/**
 * The first backdrop's hashed filename, e.g. "bg-1-BzBBmf9d.webp".
 *
 * Vite emits it as a standalone asset in dist/assets/ and references it by URL
 * from inside the JS bundle, so it cannot be regexed out of index.html. The
 * emitted file is the only build-time record, so read the directory instead.
 * Returns null when it is absent, so the generator still works in a bare test run.
 */
function firstBackdropAsset(outDir) {
  const assetsDir = join(outDir, "assets");
  if (!existsSync(assetsDir)) return null;
  const match = readdirSync(assetsDir).find((f) => /^bg-1-[\w-]+\.webp$/.test(f));
  return match ?? null;
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
  write("llms.txt", renderLlmsTxt(sources, total));
  write("sitemap.xml", renderSitemap());
  write("sources.csv", csvRaw);
  write("sources.json", `${JSON.stringify(sources, null, 2)}\n`);
  for (const p of renderStaticPages(total)) {
    const slug = p.match(/<link rel="canonical" href="[^"]*\/([^"/]+)"/)[1];
    write(slug, p);
  }
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
