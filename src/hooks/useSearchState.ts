import { useState, useCallback, useEffect } from "react";

interface SearchState {
  title: string;
  keywords: string;
  excludes: string;
  timeFilter: string;
}

function readFromURL(): SearchState {
  const p = new URLSearchParams(window.location.search);
  return {
    title: p.get("title") ?? "",
    keywords: p.get("keywords") ?? "",
    excludes: p.get("excludes") ?? "",
    timeFilter: p.get("timeFilter") ?? "any",
  };
}

function writeToURL(s: SearchState): void {
  const p = new URLSearchParams();
  if (s.title) p.set("title", s.title);
  if (s.keywords) p.set("keywords", s.keywords);
  if (s.excludes) p.set("excludes", s.excludes);
  if (s.timeFilter && s.timeFilter !== "any") p.set("timeFilter", s.timeFilter);
  const qs = p.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
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
    setState({ title: "", keywords: "", excludes: "", timeFilter: "any" });
  }, []);

  return [state, update, reset];
}
