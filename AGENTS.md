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
