import { describe, it, expect } from "vitest";
import { buildEngineUrl, buildGoogleUrl, type BuildQueryInput } from "./buildQuery";

const base: BuildQueryInput = {
  title: "UX Designer",
  keywords: "senior",
  excludes: "intern",
  timeFilterId: "week",
  sites: ["greenhouse.io", "lever.co"],
  location: "remote",
};

describe("buildEngineUrl", () => {
  it("google matches buildGoogleUrl exactly", () => {
    expect(buildEngineUrl("google", base)).toBe(buildGoogleUrl(base));
  });

  it("duckduckgo builds query with df=week", () => {
    const url = buildEngineUrl("duckduckgo", base);
    expect(url).toContain("https://duckduckgo.com/?q=");
    expect(url).toContain(encodeURIComponent("(site:greenhouse.io OR site:lever.co)"));
    expect(url).toContain("&df=w");
    expect(url).not.toContain("tbs=");
  });

  it("duckduckgo maps hour-granularity to df=d and omits df for any time", () => {
    expect(buildEngineUrl("duckduckgo", { ...base, timeFilterId: "hour" })).toContain("&df=d");
    expect(buildEngineUrl("duckduckgo", { ...base, timeFilterId: "48h" })).toContain("&df=w");
    expect(buildEngineUrl("duckduckgo", { ...base, timeFilterId: "month" })).toContain("&df=m");
    expect(buildEngineUrl("duckduckgo", { ...base, timeFilterId: "any" })).not.toContain("&df=");
    expect(buildEngineUrl("duckduckgo", { ...base, timeFilterId: "older1m" })).not.toContain("&df=");
  });

  it("bing builds query with the week preset token", () => {
    const url = buildEngineUrl("bing", base);
    expect(url).toContain("https://www.bing.com/search?q=");
    expect(url).toContain(encodeURIComponent('"UX Designer"'));
    expect(url).toContain(encodeURIComponent('ex1:"ez2"'));
    expect(url).toContain("site%3Agreenhouse.io");
    expect(buildEngineUrl("bing", { ...base, timeFilterId: "24h" })).toContain(
      encodeURIComponent('ex1:"ez1"'),
    );
    expect(buildEngineUrl("bing", { ...base, timeFilterId: "month" })).toContain(
      encodeURIComponent('ex1:"ez3"'),
    );
  });

  it("bing omits filter for any time", () => {
    expect(buildEngineUrl("bing", { ...base, timeFilterId: "any" })).not.toContain("filters=");
    expect(buildEngineUrl("bing", { ...base, timeFilterId: "older3m" })).not.toContain("filters=");
  });

  it("brave maps time to tf param", () => {
    expect(buildEngineUrl("brave", base)).toContain("&tf=pw");
    expect(buildEngineUrl("brave", { ...base, timeFilterId: "24h" })).toContain("&tf=pd");
    expect(buildEngineUrl("brave", { ...base, timeFilterId: "any" })).not.toContain("&tf=");
  });

  it("ecosia and yahoo only carry the query", () => {
    const ecosia = buildEngineUrl("ecosia", base);
    expect(ecosia).toContain("https://www.ecosia.org/search?q=");
    expect(ecosia).not.toContain("df=");
    expect(ecosia).not.toContain("filters=");
    const yahoo = buildEngineUrl("yahoo", base);
    expect(yahoo).toContain("https://search.yahoo.com/search?p=");
    expect(yahoo).not.toContain("df=");
  });
});
