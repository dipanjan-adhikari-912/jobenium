# Agent conventions — Jobenium

## Job boards are data, and the CSV is the only source of truth

- **`src/data/sources.csv`** holds every built-in job board / ATS / career-page source.
  Never add, edit, or delete sources by hand in TypeScript — the app parses the CSV at
  build time (`src/data/sources.ts` → `parseSources()`), so the CSV and the app can
  never drift.
- **Ingesting a CSV shared by the project owner:**
  1. Normalize it to the schema below (rename/derive columns if needed; UTF-8, comma-delimited, `"`-quoted, CRLF or LF).
  2. Replace `src/data/sources.csv` wholesale with the normalized file.
  3. Update the expected row count in `src/data/sources.test.ts` if rows were added/removed.
  4. Run gates: `npm run lint && npx tsc -b && npm test -- --run && npm run build`.
  5. Spot-check `Search {n} Sources` heading and a few generated source URLs in the browser.
- Validation failures (unknown group/column/mode/type/token, duplicate id, missing sites,
  malformed rankings/priority/url) throw with a line number — tests and build fail loudly
  by design.

### CSV schema (`src/data/sources.csv`)

| column  | required | meaning |
|---------|----------|---------|
| `id`    | yes | unique slug (e.g. `greenhouse`) |
| `name`  | yes | display name |
| `group` | yes | one of `ATS platforms`, `Other ATS`, `Job boards`, `Country`, `Specialist`, `Startup / VC`, `Communities`, `Career Pages` (`My boards` is reserved for user-added sources in localStorage) |
| `sites` | yes | `;`-separated domains or URL patterns (`greenhouse.io`, `jobs.*`, `*/careers/*`); empty only when `mode=linkedin-direct` |
| `suffix` | no | appended to the search query (e.g. `-jobgether`) |
| `badge` | no | badge label (e.g. `Popular`) |
| `mode`  | no | `query` (default) or `linkedin-direct` (special LinkedIn URL builder) |
| `countries` | no | raw display names of countries covered (informational) |
| `country_ids` | no | `;`-separated app location ids (`united-kingdom`, `europe`); must exist in `src/lib/locations.ts` |
| `country_rankings` | no | `id:rank;…` map of location id → 1-5 rank for per-country ordering |
| `regions` | no | raw region labels (`Global`, `Europe;North America`); informational |
| `work_mode` | no | `\|`-separated tokens from `remote`, `hybrid`, `onsite`, `mixed`, `unknown`; `onsite` maps to the app's `in-office`, `mixed`/`unknown` mean match-all (source gets no `workMode`) |
| `roles` | no | raw role/focus text (informational; some rows are misaligned with `focus`) |
| `company_stage` | no | raw stage text (informational) |
| `priority` | no | integer ordering weight (45-100; higher sorts first when no country filter) |
| `description` | no | short raw description (informational) |
| `source_type` | no | one of `job_board`, `specialist`, `public_portal`, `professional`, `community` |
| `focus` | no | raw focus text (informational) |
| `source_url` | no | direct http(s) link — used as the card URL for `source_type=public_portal` only |

## AI/SEO content is generated at build time, never committed

`scripts/generate-ai-content.mjs` runs from the `build` script **after** `vite build`
and writes only into `dist/` (which is gitignored). It re-parses
`src/data/sources.csv` with its own parser that must stay byte-compatible with
`src/lib/csv.ts`; `scripts/generate-ai-content.test.ts` asserts parity against the
real parser and against `sources`, so the two can never drift silently.

Artifacts it produces, all derived from the CSV:

| file | purpose |
|------|---------|
| `dist/sources.html` | crawlable, human-readable catalog grouped by source group |
| `dist/sources.md` | the same catalog as markdown |
| `dist/pricing.html` | free-tier page (`price 0`, no limits) |
| `dist/pricing.md` | the same summary as markdown, for agents |
| `dist/llms.txt` | `llmstxt.org` context file |
| `dist/sitemap.xml` | every indexable URL: `/`, `/sources.html`, `/pricing.html` and the trust set |
| `dist/sources.csv` / `dist/sources.json` | verbatim + structured dataset |
| `dist/about.html`, `privacy.html`, `terms.html`, `contact.html`, `disclosure.html` | hand-written trust pages, emitted here so one place owns the whole indexable URL set |
| `dist/index.html` | **post-processed**: `<title>`, meta description, canonical, OG/Twitter tags, `WebSite`/`SoftwareApplication`/`Organization`/`Person` JSON-LD, a `rel=preload` for the first backdrop, and a crawlable copy block inside `#root` |

- The injected `#root` block is real copy that mirrors the visible hero, not
  AI-only text. React replaces it on mount, so it is a crawler/JSS-fallback
  surface only — do not put anything there that users must read. The copy that
  *persists* in the rendered document is `src/components/LandingContent.tsx`; if
  you change one, change the other, or the prerender and the page will disagree.
- Injection is wrapped in `<!-- seo:head -->` / `<!-- seo:root -->` sentinels and
  is **idempotent**: re-running replaces the block instead of stacking it. The
  idempotency test is the guard against this regressing.
- The generator owns `<title>` as well as the meta tags, so the SERP headline
  cannot drift away from the CSV-derived count.
- The backdrop preload resolves the hashed filename by reading `dist/assets/`,
  because Vite only emits that name inside the JS bundle. A bare test run has no
  `assets/` dir, so the preload is skipped rather than fatal.
- `generate(outDir = dist)` takes an output directory so the test suite can run
  against a temp dir. Never point the test suite at the repo's real `dist/` —
  vitest runs files in parallel and the writes race.
- Tests assert the invariants that actually broke in review: every CSV group is
  rendered (a label typo once silently dropped a source), every generated page is
  self-canonical, linked and over 150 words, every sitemap URL exists, titles
  and descriptions stay inside the SERP display budget, and no FAQ answer appears
  in JSON-LD without also being visible on the page.
- Never hand-edit anything in `dist/`, and never commit generated files. Change
  the CSV or the generator and rebuild.
- Generated pages are static HTML with **no** inline executable script, so the
  `vercel.json` CSP needs no changes. The JSON-LD `<script>` blocks are
  `type="application/ld+json"`, which CSP does not execute.
- `public/robots.txt` explicitly allows search and AI crawlers (GPTBot,
  OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, etc.) and points at
  `/sitemap.xml`.
- The results footer and the landing-page content block both link the trust set,
  with counts read from `sources`, so the number cannot drift from the CSV.

## Performance: the backdrops and `@radix-ui/themes`

Two regressions shipped once and are guarded by size, not by test:

- Backdrops live in `assets/*.webp` at **1280w, q42**. They render at
  `scale-110` behind `blur-[3px]`, so the old full-res JPEGs shipped ~370KB of
  LCP for detail the blur discarded. Do not re-add the `.jpg` originals or
  upscale these; `bg-1` was the LCP element and the largest paint.
- **`@radix-ui/themes` must stay unimported.** Its stylesheet alone was ~680KB of
  dead CSS (`*.rt-*`, ~3900 rules) and no component from it is used — the app is
  built on the headless `radix-ui` primitives plus the `ui/` components. Removing
  the one import in `main.tsx` took the CSS bundle from 781KB to 99KB and LCP
  from 2.1s to 1.2s. If you ever want its components, expect that cost back.
- `vercel.json` sets `Cache-Control: immutable` for `/assets/(.*)`. Those
  filenames are content-hashed, so without that rule Vercel's default
  `max-age=0, must-revalidate` re-downloads the whole bundle on every visit. HTML
  must stay revalidatable.
- The hero `<section>` carries a solid `bg-[#0b2b23]` under the photo layers on
  purpose: axe cannot resolve `background-image` when computing text contrast and
  falls through to the page colour, which made white-on-photo text score 1.29:1.
  The dark base makes it both legible and auditable.

## Gates

Run in order before declaring any change done:

```powershell
npm run lint; if ($?) { npx tsc -b; if ($?) { npm test -- --run; if ($?) { npm run build } } }
```

Baseline: **0 lint errors, exactly 3 pre-existing warnings** (`ui/button.tsx`,
`ui/badge.tsx`, `liquid-glass.tsx`).

## Testing

- Dev server: `http://localhost:5173/` (`127.0.0.1` is refused).
- Use chrome-devtools MCP for live verification; prefer an isolated browser context so
  the project owner's own tabs are not disturbed.
- Synthetic clicks need the full pointer/mouse event sequence dispatched on the element.

## Misc

- The "Your Job Board Here" promo card (`src/components/AdvertiseCard.tsx`) is
  deliberately **not rendered** in the grid while the audience is being grown —
  do not re-add it without being asked. The component and its CSS
  (`meshGradient.css`) stay in the tree so it is a one-line re-enable.
- Visited ("· opened") marks are per device, persisted in `jobenium:visited`,
  newest-last and capped at `VISITED_LIMIT` (500); **Reset visited** clears them.
  A card is marked on click, `auxclick` (middle click) and `contextmenu`
  (right-click → split view / new window), because browsers fire no `click`
  event for context-menu opens. Right-clicking to copy a link therefore marks
  the card too — that is deliberate.
- Dark mode is scoped to the results/loading views (`.dark` class on those roots only);
  the landing page is always light.
- `Search {n} Sources` count reflects the active location/mode filter
  (`locatedSources.length`); unfiltered it equals 273 + user custom sources.
- The loader stays for `SEARCH_TRANSITION_MS` (5000 ms) = one full loop of
  `assets/logo-animated (1).svg`.
- Clicking the wordmark on the landing page cycles the backdrop photo
  (`src/data/backgrounds.ts`, 5 images, wraps around) with a 700 ms crossfade
  (`BackdropImage`); the index persists in `jobenium:backdrop` and the same image
  is shown in the results-page panel. Keep `BACKDROP_FADE_MS` in sync with the
  layer `duration-700`.
- Analytics are Vercel Web Analytics only (no cookies, no PII, no third-party
  script): `inject()` in `src/main.tsx`, production only. The footer counter is
  real — it reads `/api/active-visitors` (`api/active-visitors.ts`), which queries
  the WA query API with the `VERCEL_TOKEN` secret (set in Vercel project env;
  `VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` are injected by the platform). The counter
  hides itself when unconfigured or when the query fails, so never restore a
  synthetic/fake number. `tsconfig.api.json` typechecks `api/` for `tsc -b`.
- `api/` is type-checked by Vercel with **its own** config (node16 resolution, no
  ambient node types), so files there must compile with **no imports** and must
  not reference `process`/`node:` — read env through the `globalThis` cast in
  `api/active-visitors.ts`. Tests for the function live in
  `src/lib/activeVisitors.test.ts`, never in `api/`, because Vercel compiles
  every file in `api/` as a route.
- Security headers live in `vercel.json` (CSP, nosniff, frame-deny, referrer,
  permissions). The CSP's `img-src` must allow `https://*.gstatic.com` too —
  `google.com/s2/favicons` redirects there. Validate CSP changes against a local
  static server before shipping; previews sit behind Deployment Protection, so
  they cannot be curled.
