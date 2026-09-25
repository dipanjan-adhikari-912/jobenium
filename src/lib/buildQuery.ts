import { type TimeFilter, getTimeFilter } from "./timeFilters";

export interface BuildQueryInput {
  title: string;
  keywords: string;
  excludes: string;
  timeFilterId: string;
  sites: string[];
  suffix?: string;
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

export function buildGoogleUrl(input: BuildQueryInput): string {
  const tf = getTimeFilter(input.timeFilterId);
  const parts: string[] = [];

  // Title (quoted)
  if (input.title.trim()) {
    parts.push(`"${input.title.trim()}"`);
  }

  // Site clause
  const siteClause = buildSiteClause(input.sites);
  if (siteClause) parts.push(siteClause);

  // Extra keywords
  if (input.keywords.trim()) {
    parts.push(input.keywords.trim());
  }

  // Exclude words
  const excludes = buildExcludeClause(input.excludes);
  if (excludes) parts.push(excludes);

  // Source suffix
  if (input.suffix) parts.push(input.suffix);

  const q = parts.join(" ");
  const tbs = buildTbs(tf);

  let url = `https://www.google.com/search?q=${encodeQuery(q)}`;
  if (tbs) {
    url += `&tbs=${encodeQuery(tbs)}`;
  }
  return url;
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
