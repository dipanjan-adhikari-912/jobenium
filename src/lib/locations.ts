export interface LocationOption {
  readonly id: string;
  readonly label: string;
}

export interface RegionGroup extends LocationOption {
  readonly countries: readonly LocationOption[];
}

export const ANY_LOCATION: LocationOption = {
  id: "any",
  label: "Any location",
};

export const WORK_MODES: readonly LocationOption[] = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "in-office", label: "In-office" },
] as const;

const MODE_TERMS: Record<string, string> = {
  remote: "remote",
  hybrid: "hybrid",
  "in-office": "office",
};

export const REGION_GROUPS: readonly RegionGroup[] = [
  {
    id: "americas",
    label: "Americas",
    countries: [
      { id: "united-states", label: "United States" },
      { id: "canada", label: "Canada" },
      { id: "mexico", label: "Mexico" },
      { id: "brazil", label: "Brazil" },
      { id: "argentina", label: "Argentina" },
      { id: "colombia", label: "Colombia" },
      { id: "chile", label: "Chile" },
    ],
  },
  {
    id: "europe",
    label: "Europe",
    countries: [
      { id: "united-kingdom", label: "United Kingdom" },
      { id: "germany", label: "Germany" },
      { id: "france", label: "France" },
      { id: "netherlands", label: "Netherlands" },
      { id: "spain", label: "Spain" },
      { id: "poland", label: "Poland" },
      { id: "sweden", label: "Sweden" },
      { id: "ireland", label: "Ireland" },
      { id: "italy", label: "Italy" },
      { id: "switzerland", label: "Switzerland" },
      { id: "denmark", label: "Denmark" },
      { id: "norway", label: "Norway" },
      { id: "portugal", label: "Portugal" },
      { id: "austria", label: "Austria" },
      { id: "belgium", label: "Belgium" },
      { id: "czechia", label: "Czechia" },
    ],
  },
  {
    id: "apac",
    label: "Asia-Pacific",
    countries: [
      { id: "india", label: "India" },
      { id: "singapore", label: "Singapore" },
      { id: "japan", label: "Japan" },
      { id: "south-korea", label: "South Korea" },
      { id: "china", label: "China" },
      { id: "hong-kong", label: "Hong Kong" },
      { id: "taiwan", label: "Taiwan" },
      { id: "indonesia", label: "Indonesia" },
      { id: "malaysia", label: "Malaysia" },
      { id: "thailand", label: "Thailand" },
      { id: "vietnam", label: "Vietnam" },
      { id: "philippines", label: "Philippines" },
    ],
  },
  {
    id: "mea",
    label: "Middle East & Africa",
    countries: [
      { id: "united-arab-emirates", label: "United Arab Emirates" },
      { id: "saudi-arabia", label: "Saudi Arabia" },
      { id: "israel", label: "Israel" },
      { id: "qatar", label: "Qatar" },
      { id: "turkey", label: "Turkey" },
      { id: "egypt", label: "Egypt" },
      { id: "south-africa", label: "South Africa" },
      { id: "nigeria", label: "Nigeria" },
      { id: "kenya", label: "Kenya" },
      { id: "morocco", label: "Morocco" },
    ],
  },
  {
    id: "oceania",
    label: "Oceania",
    countries: [
      { id: "australia", label: "Australia" },
      { id: "new-zealand", label: "New Zealand" },
    ],
  },
] as const;

function findCountry(id: string): { region: RegionGroup; country: LocationOption } | null {
  for (const region of REGION_GROUPS) {
    const country = region.countries.find((c) => c.id === id);
    if (country) return { region, country };
  }
  return null;
}

export function splitLocation(value: string | undefined): string[] {
  return [...new Set(
    (value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "" && s !== "any"),
  )];
}

function joinTokens(tokens: string[]): string {
  const unique = [...new Set(tokens)];
  return unique.length > 0 ? unique.join(",") : "any";
}

export function hasMode(value: string, id: string): boolean {
  return splitLocation(value).includes(id);
}

export function countriesIn(value: string): string[] {
  const tokens = splitLocation(value);
  return tokens.filter((t) => !WORK_MODES.some((m) => m.id === t));
}

export function isCountryTicked(value: string, regionId: string, countryId: string): boolean {
  const tokens = splitLocation(value);
  return tokens.includes(countryId) || tokens.includes(regionId);
}

export function isRegionTicked(value: string, region: RegionGroup): boolean {
  const tokens = splitLocation(value);
  return (
    tokens.includes(region.id) ||
    region.countries.every((c) => tokens.includes(c.id))
  );
}

export function toggleLocation(current: string, id: string): string {
  const tokens = splitLocation(current);

  if (WORK_MODES.some((m) => m.id === id)) {
    return joinTokens(
      tokens.includes(id) ? tokens.filter((t) => t !== id) : [...tokens, id],
    );
  }

  const region = REGION_GROUPS.find((r) => r.id === id);
  if (region) {
    if (!tokens.includes(id)) {
      const children = new Set(region.countries.map((c) => c.id));
      return joinTokens([...tokens.filter((t) => !children.has(t)), id]);
    }
    return joinTokens(tokens.filter((t) => t !== id));
  }

  const found = findCountry(id);
  if (found) {
    if (tokens.includes(id)) {
      return joinTokens(tokens.filter((t) => t !== id));
    }
    if (tokens.includes(found.region.id)) {
      const siblings = found.region.countries
        .map((c) => c.id)
        .filter((cid) => cid !== id);
      return joinTokens([
        ...tokens.filter((t) => t !== found.region.id),
        ...siblings,
      ]);
    }
    return joinTokens([...tokens, id]);
  }

  return joinTokens(tokens);
}

export function clearCountries(current: string): string {
  return joinTokens(splitLocation(current).filter((t) => WORK_MODES.some((m) => m.id === t)));
}

export function getLocationLabel(value: string): string {
  const parts: string[] = [];
  for (const token of splitLocation(value)) {
    const mode = WORK_MODES.find((m) => m.id === token);
    if (mode) {
      parts.push(mode.label);
      continue;
    }
    const region = REGION_GROUPS.find((r) => r.id === token);
    if (region) {
      parts.push(region.label);
      continue;
    }
    const found = findCountry(token);
    if (found) parts.push(found.country.label);
  }
  if (parts.length === 0) return ANY_LOCATION.label;
  if (parts.length <= 2) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2}`;
}

function quoteTerm(label: string): string {
  return /\s/.test(label) ? `"${label}"` : label;
}

export function buildLocationClause(value: string | undefined): string {
  const tokens = splitLocation(value);

  const modeTerms = WORK_MODES.filter((m) => tokens.includes(m.id)).map(
    (m) => MODE_TERMS[m.id],
  );

  const countryLabels: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const region = REGION_GROUPS.find((r) => r.id === token);
    const countries = region ? region.countries : [findCountry(token)?.country];
    for (const country of countries) {
      if (country && !seen.has(country.id)) {
        seen.add(country.id);
        countryLabels.push(quoteTerm(country.label));
      }
    }
  }

  const modeClause =
    modeTerms.length === 0
      ? ""
      : modeTerms.length === 1
        ? modeTerms[0]
        : `(${modeTerms.join(" OR ")})`;

  const countryClause =
    countryLabels.length === 0
      ? ""
      : countryLabels.length === 1
        ? countryLabels[0]
        : `(${countryLabels.join(" OR ")})`;

  return [modeClause, countryClause].filter(Boolean).join(" ");
}

/** ISO 3166-1 alpha-3 codes for country ids used by source rows (Country tab pills). */
export const COUNTRY_CODES: Record<string, string> = {
  argentina: "ARG",
  australia: "AUS",
  austria: "AUT",
  belgium: "BEL",
  brazil: "BRA",
  canada: "CAN",
  chile: "CHL",
  china: "CHN",
  colombia: "COL",
  czechia: "CZE",
  denmark: "DNK",
  egypt: "EGY",
  france: "FRA",
  germany: "DEU",
  "hong-kong": "HKG",
  india: "IND",
  indonesia: "IDN",
  ireland: "IRL",
  israel: "ISR",
  italy: "ITA",
  japan: "JPN",
  kenya: "KEN",
  malaysia: "MYS",
  mexico: "MEX",
  morocco: "MAR",
  netherlands: "NLD",
  "new-zealand": "NZL",
  nigeria: "NGA",
  norway: "NOR",
  philippines: "PHL",
  poland: "POL",
  portugal: "PRT",
  qatar: "QAT",
  "saudi-arabia": "SAU",
  singapore: "SGP",
  "south-africa": "ZAF",
  "south-korea": "KOR",
  spain: "ESP",
  sweden: "SWE",
  switzerland: "CHE",
  taiwan: "TWN",
  thailand: "THA",
  turkey: "TUR",
  "united-arab-emirates": "ARE",
  "united-kingdom": "GBR",
  "united-states": "USA",
  vietnam: "VNM",
};

/** Badge label for a Country-tab card: first code, then "+n" for extra countries. */
export function countryBadgeLabel(
  ids: readonly string[] | undefined,
): string | null {
  if (!ids || ids.length === 0) return null;
  const first = COUNTRY_CODES[ids[0]] ?? ids[0].toUpperCase();
  return ids.length > 1 ? `${first} +${ids.length - 1}` : first;
}
