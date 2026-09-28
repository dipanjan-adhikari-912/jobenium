import { useState, useCallback, useEffect } from "react";

interface SearchState {
  title: string;
  keywords: string;
  excludes: string;
  timeFilter: string;
  location: string;
}

function readFromURL(): SearchState {
  const p = new URLSearchParams(window.location.search);
  return {
    title: p.get("title") ?? "",
    keywords: p.get("keywords") ?? "",
    excludes: p.get("excludes") ?? "",
    timeFilter: p.get("timeFilter") ?? "24h",
    location: p.get("location") ?? "any",
  };
}

export function stateToQs(s: SearchState): string {
  const p = new URLSearchParams();
  if (s.title) p.set("title", s.title);
  if (s.keywords) p.set("keywords", s.keywords);
  if (s.excludes) p.set("excludes", s.excludes);
  if (s.timeFilter && s.timeFilter !== "24h") p.set("timeFilter", s.timeFilter);
  if (s.location && s.location !== "any") p.set("location", s.location);
  return p.toString();
}

function writeToURL(s: SearchState): void {
  const qs = stateToQs(s);
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", url);
}

export function useSearchState(): [
  SearchState,
  (patch: Partial<SearchState>) => void,
  () => void,
] {
  const [state, setState] = useState<SearchState>(readFromURL);

  useEffect(() => {
    writeToURL(state);
  }, [state]);

  const update = useCallback((patch: Partial<SearchState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setState({ title: "", keywords: "", excludes: "", timeFilter: "24h", location: "any" });
  }, []);

  return [state, update, reset];
}
