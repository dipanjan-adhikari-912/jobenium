export type SearchEngineId =
  | "google"
  | "bing"
  | "duckduckgo"
  | "brave"
  | "ecosia"
  | "yahoo";

export interface SearchEngine {
  id: SearchEngineId;
  label: string;
  domain: string;
}

export const DEFAULT_SEARCH_ENGINE: SearchEngineId = "google";

export const SEARCH_ENGINES: readonly SearchEngine[] = [
  { id: "google", label: "Google", domain: "google.com" },
  { id: "bing", label: "Bing", domain: "bing.com" },
  { id: "duckduckgo", label: "DuckDuckGo", domain: "duckduckgo.com" },
  { id: "brave", label: "Brave Search", domain: "brave.com" },
  { id: "ecosia", label: "Ecosia", domain: "ecosia.org" },
  { id: "yahoo", label: "Yahoo", domain: "yahoo.com" },
] as const;

export function getSearchEngine(id: string): SearchEngine {
  return SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0];
}
