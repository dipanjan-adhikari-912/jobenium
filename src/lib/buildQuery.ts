import { type TimeFilter, getTimeFilter } from "./timeFilters";
import { buildLocationClause } from "./locations";
import { type SearchEngineId } from "@/data/searchEngines";

export interface BuildQueryInput {
  title: string;
  keywords: string;
  excludes: string;
  timeFilterId: string;
  sites: string[];
  suffix?: string;
  location?: string;
}

function encodeQuery(s: string): string {
  return encodeURIComponent(s);
}

function buildSiteClause(sites: string[]): string {
  if (sites.length === 0) return "";
  if (sites.length === 1) return `site:${sites[0]}`;
  const clauses = sites.map((s) => `site:${s}`).join(" OR ");
  return `(${clauses})`;
}

function buildExcludeClause(excludes: string): string {
  return excludes
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => `-${w}`)
    .join(" ");
}

function buildTbs(tf: TimeFilter): string {
  if (tf.cdr) return tf.cdr;
  return tf.qdr;
}

function buildQueryString(input: BuildQueryInput): string {
  const parts: string[] = [];

  // Title (quoted)
  if (input.title.trim()) {
    parts.push(`"${input.title.trim()}"`);
  }

  // Site clause
  const siteClause = buildSiteClause(input.sites);
  if (siteClause) parts.push(siteClause);

  // Location clause (region OR-group, single country, or "remote")
  const locationClause = buildLocationClause(input.location);
  if (locationClause) parts.push(locationClause);

  // Extra keywords
  if (input.keywords.trim()) {
    parts.push(input.keywords.trim());
  }

  // Exclude words
  const excludes = buildExcludeClause(input.excludes);
  if (excludes) parts.push(excludes);

  // Source suffix
  if (input.suffix) parts.push(input.suffix);

  return parts.join(" ");
}

export function buildGoogleUrl(input: BuildQueryInput): string {
  const tf = getTimeFilter(input.timeFilterId);
  const q = buildQueryString(input);
  const tbs = buildTbs(tf);

  let url = `https://www.google.com/search?q=${encodeQuery(q)}`;
  if (tbs) {
    url += `&tbs=${encodeQuery(tbs)}`;
  }
  return url;
}

type TimeBucket = "day" | "week" | "month";

function timeBucket(id: string): TimeBucket | null {
  switch (id) {
    case "hour":
    case "4h":
    case "8h":
    case "12h":
    case "24h":
      return "day";
    case "48h":
    case "72h":
    case "week":
      return "week";
    case "month":
      return "month";
    default:
      return null; // "any" and "older than ..." filters
  }
}

function duckDuckGoDf(id: string): string {
  switch (timeBucket(id)) {
    case "day":
      return "d";
    case "week":
      return "w";
    case "month":
      return "m";
    default:
      return "";
  }
}

/** Bing date-filter tokens: ez1 = past 24 hours, ez2 = past week, ez3 = past month. */
function bingFilters(id: string): string {
  switch (timeBucket(id)) {
    case "day":
      return 'ex1:"ez1"';
    case "week":
      return 'ex1:"ez2"';
    case "month":
      return 'ex1:"ez3"';
    default:
      return "";
  }
}

function braveTf(id: string): string {
  switch (timeBucket(id)) {
    case "day":
      return "pd";
    case "week":
      return "pw";
    case "month":
      return "pm";
    default:
      return "";
  }
}

export function buildEngineUrl(
  engine: SearchEngineId,
  input: BuildQueryInput,
): string {
  const q = encodeQuery(buildQueryString(input));
  switch (engine) {
    case "bing": {
      const range = bingFilters(input.timeFilterId);
      return `https://www.bing.com/search?q=${q}${
        range ? `&filters=${encodeURIComponent(range)}` : ""
      }`;
    }
    case "duckduckgo": {
      const df = duckDuckGoDf(input.timeFilterId);
      return `https://duckduckgo.com/?q=${q}${df ? `&df=${df}` : ""}`;
    }
    case "brave": {
      const tf = braveTf(input.timeFilterId);
      return `https://search.brave.com/search?q=${q}${tf ? `&tf=${tf}` : ""}`;
    }
    case "ecosia":
      return `https://www.ecosia.org/search?q=${q}`;
    case "yahoo":
      return `https://search.yahoo.com/search?p=${q}`;
    case "google":
    default:
      return buildGoogleUrl(input);
  }
}

export function buildLinkedInDirectUrl(
  title: string,
  timeFilterId: string,
): string {
  const tf = getTimeFilter(timeFilterId);
  let url = `https://www.linkedin.com/jobs/search/?keywords=${encodeQuery(title)}`;
  if (tf.linkedinSeconds) {
    url += `&f_TPR=r${tf.linkedinSeconds}`;
  }
  return url;
}
