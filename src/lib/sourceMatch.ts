import { type Source } from "@/data/sources";
import { REGION_GROUPS, WORK_MODES, splitLocation } from "@/lib/locations";

interface LocationParts {
  modes: Set<string>;
  countries: Set<string>;
}

function expandIds(tokens: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const token of tokens) {
    const region = REGION_GROUPS.find((r) => r.id === token);
    if (region) {
      for (const country of region.countries) out.add(country.id);
    } else {
      out.add(token);
    }
  }
  return out;
}

function locationParts(location: string): LocationParts {
  const tokens = splitLocation(location);
  const isMode = (t: string) => WORK_MODES.some((m) => m.id === t);
  return {
    modes: new Set(tokens.filter(isMode)),
    countries: expandIds(tokens.filter((t) => !isMode(t))),
  };
}

function sourceMatchesCountry(source: Source, countries: Set<string>): boolean {
  if (countries.size === 0) return true;
  // Sources without country data are global — they never get filtered out.
  if (!source.countryIds || source.countryIds.length === 0) return true;
  const sourceCountries = expandIds(source.countryIds);
  for (const country of countries) {
    if (sourceCountries.has(country)) return true;
  }
  return false;
}

function sourceMatchesMode(source: Source, modes: Set<string>): boolean {
  if (modes.size === 0) return true;
  // No workMode (CSV "mixed"/"unknown") = matches any mode selection.
  if (!source.workMode || source.workMode.length === 0) return true;
  for (const mode of source.workMode) {
    if (modes.has(mode)) return true;
  }
  return false;
}

export function filterSources(
  sources: readonly Source[],
  location: string,
): Source[] {
  const { modes, countries } = locationParts(location);
  if (modes.size === 0 && countries.size === 0) return [...sources];
  return sources.filter(
    (s) => sourceMatchesCountry(s, countries) && sourceMatchesMode(s, modes),
  );
}

function bestRank(source: Source, countries: Set<string>): number {
  if (!source.countryRankings) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const country of countries) {
    const rank = source.countryRankings[country];
    if (rank !== undefined && rank < best) best = rank;
  }
  return best;
}

export function sortSources(
  sources: readonly Source[],
  location: string,
): Source[] {
  const { countries } = locationParts(location);
  const indexed = sources.map((s, i) => ({ s, i }));
  indexed.sort((a, b) => {
    if (countries.size > 0) {
      const ra = bestRank(a.s, countries);
      const rb = bestRank(b.s, countries);
      if (ra !== rb) return ra - rb;
    }
    const pa = a.s.priority ?? -1;
    const pb = b.s.priority ?? -1;
    if (pa !== pb) return pb - pa;
    return a.i - b.i;
  });
  return indexed.map((x) => x.s);
}

export function applyLocation(
  sources: readonly Source[],
  location: string,
): Source[] {
  return sortSources(filterSources(sources, location), location);
}
