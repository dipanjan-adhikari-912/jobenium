import { describe, it, expect } from "vitest";
import {
  REGION_GROUPS,
  buildLocationClause,
  clearCountries,
  countryBadgeLabel,
  countriesIn,
  getLocationLabel,
  hasMode,
  isCountryTicked,
  isRegionTicked,
  toggleLocation,
} from "./locations";

const europe = REGION_GROUPS.find((r) => r.id === "europe")!;

describe("toggleLocation", () => {
  it("adds and removes a work mode", () => {
    expect(toggleLocation("any", "remote")).toBe("remote");
    expect(toggleLocation("remote", "remote")).toBe("any");
    expect(toggleLocation("remote", "hybrid")).toBe("remote,hybrid");
  });

  it("keeps countries when toggling a mode", () => {
    expect(toggleLocation("germany", "hybrid")).toBe("germany,hybrid");
    expect(toggleLocation("germany,hybrid", "hybrid")).toBe("germany");
  });

  it("adds a region", () => {
    expect(toggleLocation("any", "europe")).toBe("europe");
    expect(toggleLocation("india", "europe")).toBe("india,europe");
  });

  it("drops individually picked countries when their region is selected", () => {
    expect(toggleLocation("germany,india", "europe")).toBe("india,europe");
  });

  it("removes a region", () => {
    expect(toggleLocation("europe", "europe")).toBe("any");
    expect(toggleLocation("europe,india", "europe")).toBe("india");
  });

  it("adds and removes a country", () => {
    expect(toggleLocation("any", "germany")).toBe("germany");
    expect(toggleLocation("france", "germany")).toBe("france,germany");
    expect(toggleLocation("france,germany", "germany")).toBe("france");
  });

  it("rewrites a ticked region to explicit siblings when a child is unticked", () => {
    const siblings = europe.countries
      .filter((c) => c.id !== "germany")
      .map((c) => c.id);
    expect(toggleLocation("europe", "germany")).toBe(siblings.join(","));
  });

  it("ignores unknown ids", () => {
    expect(toggleLocation("germany", "atlantis")).toBe("germany");
    expect(toggleLocation("any", "atlantis")).toBe("any");
  });
});

describe("clearCountries", () => {
  it("keeps work modes and drops countries", () => {
    expect(clearCountries("hybrid,germany")).toBe("hybrid");
    expect(clearCountries("remote,hybrid,germany")).toBe("remote,hybrid");
    expect(clearCountries("hybrid")).toBe("hybrid");
    expect(clearCountries("germany")).toBe("any");
    expect(clearCountries("any")).toBe("any");
  });
});

describe("selection helpers", () => {
  it("hasMode reads modes only", () => {
    expect(hasMode("remote,germany", "remote")).toBe(true);
    expect(hasMode("germany", "remote")).toBe(false);
  });

  it("countriesIn excludes modes", () => {
    expect(countriesIn("hybrid,germany")).toEqual(["germany"]);
    expect(countriesIn("hybrid")).toEqual([]);
    expect(countriesIn("any")).toEqual([]);
  });

  it("isCountryTicked via own id or parent region", () => {
    expect(isCountryTicked("germany", "europe", "germany")).toBe(true);
    expect(isCountryTicked("europe", "europe", "germany")).toBe(true);
    expect(isCountryTicked("india", "europe", "germany")).toBe(false);
    expect(isCountryTicked("any", "europe", "germany")).toBe(false);
  });

  it("isRegionTicked when the region is selected or all children are", () => {
    const all = europe.countries.map((c) => c.id).join(",");
    expect(isRegionTicked("europe", europe)).toBe(true);
    expect(isRegionTicked(all, europe)).toBe(true);
    expect(isRegionTicked("germany", europe)).toBe(false);
    expect(isRegionTicked("any", europe)).toBe(false);
  });
});

describe("getLocationLabel", () => {
  it("falls back to Any location", () => {
    expect(getLocationLabel("any")).toBe("Any location");
    expect(getLocationLabel("")).toBe("Any location");
  });

  it("labels a single selection", () => {
    expect(getLocationLabel("hybrid")).toBe("Hybrid");
    expect(getLocationLabel("in-office")).toBe("In-office");
    expect(getLocationLabel("germany")).toBe("Germany");
    expect(getLocationLabel("europe")).toBe("Europe");
  });

  it("joins two selections", () => {
    expect(getLocationLabel("remote,germany")).toBe("Remote, Germany");
    expect(getLocationLabel("hybrid,germany")).toBe("Hybrid, Germany");
  });

  it("caps at two then shows +N", () => {
    expect(getLocationLabel("remote,hybrid,germany")).toBe(
      "Remote, Hybrid +1",
    );
    expect(getLocationLabel("remote,germany,france,india")).toBe(
      "Remote, Germany +2",
    );
  });
});

describe("buildLocationClause", () => {
  it("returns empty for any/missing", () => {
    expect(buildLocationClause("any")).toBe("");
    expect(buildLocationClause("")).toBe("");
    expect(buildLocationClause(undefined)).toBe("");
  });

  it("emits a bare term for a single mode", () => {
    expect(buildLocationClause("remote")).toBe("remote");
    expect(buildLocationClause("hybrid")).toBe("hybrid");
    expect(buildLocationClause("in-office")).toBe("office");
  });

  it("ORs multiple modes", () => {
    expect(buildLocationClause("remote,hybrid")).toBe("(remote OR hybrid)");
    expect(buildLocationClause("remote,in-office")).toBe("(remote OR office)");
  });

  it("emits single countries bare and quotes multi-word ones", () => {
    expect(buildLocationClause("germany")).toBe("Germany");
    expect(buildLocationClause("united-states")).toBe('"United States"');
  });

  it("ORs multiple countries", () => {
    expect(buildLocationClause("germany,france")).toBe("(Germany OR France)");
  });

  it("combines modes and countries with a space", () => {
    expect(buildLocationClause("hybrid,germany")).toBe("hybrid Germany");
    expect(buildLocationClause("remote,hybrid,germany,france")).toBe(
      "(remote OR hybrid) (Germany OR France)",
    );
  });

  it("expands a legacy region and dedupes overlapping countries", () => {
    const europeClause = `(${europe.countries
      .map((c) => (/\s/.test(c.label) ? `"${c.label}"` : c.label))
      .join(" OR ")})`;
    expect(buildLocationClause("europe")).toBe(europeClause);
    expect(buildLocationClause("europe,germany")).toBe(europeClause);
  });
});

describe("countryBadgeLabel", () => {
  it("maps a single country id to its ISO alpha-3 code", () => {
    expect(countryBadgeLabel(["poland"])).toBe("POL");
    expect(countryBadgeLabel(["united-kingdom"])).toBe("GBR");
    expect(countryBadgeLabel(["united-states"])).toBe("USA");
  });

  it("shows the first code plus a count for multi-country rows", () => {
    expect(
      countryBadgeLabel(["united-arab-emirates", "saudi-arabia", "qatar"]),
    ).toBe("ARE +2");
    expect(countryBadgeLabel(["indonesia", "vietnam"])).toBe("IDN +1");
  });

  it("returns null without ids and falls back to the id for unknown ones", () => {
    expect(countryBadgeLabel(undefined)).toBeNull();
    expect(countryBadgeLabel([])).toBeNull();
    expect(countryBadgeLabel(["atlantis"])).toBe("ATLANTIS");
  });
});
