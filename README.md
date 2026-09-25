# Jobenium

A static job search launcher. Enter a job title, pick a time filter, and get pre-built Google search links across 50+ job boards and ATS platforms. No backend, no API keys, no network requests — just links.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`. It's fully static — deploy anywhere.

## Deploy

### GitHub Pages

1. Push to GitHub.
2. In repo Settings → Pages → Source, select **GitHub Actions**.
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

Or connect the repo in the Cloudflare dashboard — it will auto-detect the Vite project.

### Vercel

```bash
npx vercel
```

Or connect the repo in the Vercel dashboard. No configuration needed.

## Tests

```bash
npm test            # run once
npm run test:watch  # watch mode
```

## Project structure

```
src/
├── components/
│   ├── ui/          # shadcn-compatible primitives (Button, Input, Select, etc.)
│   ├── SearchForm.tsx
│   ├── SearchSummary.tsx
│   ├── SourceGroup.tsx
│   ├── SourceRow.tsx
│   ├── SettingsPopover.tsx
│   ├── RecentSearches.tsx
│   └── ThemeToggle.tsx
├── data/
│   └── sources.ts   # all job sources, typed
├── hooks/
│   ├── useSearchState.ts   # URL sync
│   ├── useSettings.ts      # persisted settings
│   ├── useVisited.ts       # visited source tracking
│   └── useRecent.ts        # recent searches
├── lib/
│   ├── buildQuery.ts       # Google URL builder
│   ├── timeFilters.ts      # time filter options + tbs mapping
│   ├── storage.ts          # typed localStorage helpers
│   └── utils.ts            # cn() helper
├── App.tsx
├── main.tsx
└── index.css               # Tailwind + shadcn CSS variables
```

## UI kit (shadcn/ui)

Installed via `npx shadcn@latest init` + `add`:

- Config in `components.json` — style `radix-luma`, base color `mist`, tabler icons
- Primitives in `src/components/ui/` (button, input, label, select, checkbox, popover, badge, switch, collapsible) built on `radix-ui` + `class-variance-authority`
- Theme tokens in `src/index.css` (`@theme` + `@theme inline`), dark mode via `.dark` class
- Fonts: Raleway (body) + Montserrat (headings) via `@fontsource-variable`
- Add more components: `npx shadcn@latest add <component>`

Feature components only use the public exports (`Button`, `Input`, `Select`, …) — restyling never touches feature logic.

## License

MIT
