import { describe, it, expect } from "vitest";
import { buildGoogleUrl, buildLinkedInDirectUrl } from "./buildQuery";

describe("buildGoogleUrl", () => {
  const base = {
    keywords: "",
    excludes: "",
    timeFilterId: "any",
  };

  it("builds a simple single-site query", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Product Designer",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain(encodeURIComponent('"Product Designer" site:greenhouse.io'));
    expect(url).not.toContain("tbs=");
  });

  it("builds a multi-site query with OR clause", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Engineer",
      sites: ["lever.co", "ashbyhq.com"],
    });
    expect(url).toContain(encodeURIComponent("(site:lever.co OR site:ashbyhq.com)"));
  });

  it("includes extra keywords", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      keywords: "remote senior",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain(encodeURIComponent("remote senior"));
  });

  it("appends exclude words with minus prefix", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Developer",
      excludes: "intern junior",
      sites: ["lever.co"],
    });
    expect(url).toContain(encodeURIComponent("-intern"));
    expect(url).toContain(encodeURIComponent("-junior"));
  });

  it("appends a suffix", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Developer",
      sites: ["lever.co"],
      suffix: "-jobgether",
    });
    expect(url).toContain(encodeURIComponent("-jobgether"));
  });

  it("encodes special characters in the title", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "C++ & Java Developer",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain(encodeURIComponent('"C++ & Java Developer"'));
  });

  it("applies tbs qdr:d for past 24 hours", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      timeFilterId: "24h",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain("tbs=" + encodeURIComponent("qdr:d"));
  });

  it("applies tbs qdr:w for past week", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      timeFilterId: "week",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain("tbs=" + encodeURIComponent("qdr:w"));
  });

  it("applies tbs qdr:m for past month", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      timeFilterId: "month",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain("tbs=" + encodeURIComponent("qdr:m"));
  });

  it("applies cdr for older than 1 month", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      timeFilterId: "older1m",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain("tbs=" + encodeURIComponent("cdr:1,cd_max:"));
  });

  it("applies qdr:h for past hour", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      timeFilterId: "hour",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain("tbs=" + encodeURIComponent("qdr:h"));
  });

  it("applies qdr:h4 for past 4 hours", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      timeFilterId: "4h",
      sites: ["greenhouse.io"],
    });
    expect(url).toContain("tbs=" + encodeURIComponent("qdr:h4"));
  });

  it("omits tbs for 'any' time filter", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Designer",
      timeFilterId: "any",
      sites: ["greenhouse.io"],
    });
    expect(url).not.toContain("tbs=");
  });

  it("handles sites with path patterns", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Developer",
      sites: ["builtin.com/job/"],
    });
    expect(url).toContain(encodeURIComponent("site:builtin.com/job/"));
  });

  it("handles excludes separated by commas", () => {
    const url = buildGoogleUrl({
      ...base,
      title: "Engineer",
      excludes: "intern,junior,entry",
      sites: ["lever.co"],
    });
    expect(url).toContain(encodeURIComponent("-intern"));
    expect(url).toContain(encodeURIComponent("-junior"));
    expect(url).toContain(encodeURIComponent("-entry"));
  });

  it("combines all parts: title, sites, keywords, excludes, suffix, time", () => {
    const url = buildGoogleUrl({
      title: "Staff Engineer",
      keywords: "remote",
      excludes: "contract",
      timeFilterId: "week",
      sites: ["greenhouse.io", "lever.co"],
      suffix: "-jobgether",
    });
    expect(url).toContain(encodeURIComponent('"Staff Engineer"'));
    expect(url).toContain(encodeURIComponent("(site:greenhouse.io OR site:lever.co)"));
    expect(url).toContain(encodeURIComponent("remote"));
    expect(url).toContain(encodeURIComponent("-contract"));
    expect(url).toContain(encodeURIComponent("-jobgether"));
    expect(url).toContain("tbs=" + encodeURIComponent("qdr:w"));
  });
});

describe("buildLinkedInDirectUrl", () => {
  it("builds a basic LinkedIn URL", () => {
    const url = buildLinkedInDirectUrl("Designer", "any");
    expect(url).toContain("linkedin.com/jobs/search/?keywords=Designer");
    expect(url).not.toContain("f_TPR=");
  });

  it("includes f_TPR for past 24 hours", () => {
    const url = buildLinkedInDirectUrl("Designer", "24h");
    expect(url).toContain("f_TPR=r86400");
  });

  it("includes f_TPR for past week", () => {
    const url = buildLinkedInDirectUrl("Designer", "week");
    expect(url).toContain("f_TPR=r604800");
  });

  it("includes f_TPR for past month", () => {
    const url = buildLinkedInDirectUrl("Designer", "month");
    expect(url).toContain("f_TPR=r2592000");
  });

  it("includes f_TPR for past hour", () => {
    const url = buildLinkedInDirectUrl("Designer", "hour");
    expect(url).toContain("f_TPR=r3600");
  });

  it("omits f_TPR for filters without LinkedIn seconds", () => {
    const url = buildLinkedInDirectUrl("Designer", "48h");
    expect(url).not.toContain("f_TPR=");
  });
});
