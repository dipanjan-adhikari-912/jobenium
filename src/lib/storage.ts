export type LinkBehavior = "new-tab" | "reuse-tab" | "same-tab";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

// Link behavior
export function getLinkBehavior(): LinkBehavior {
  return read<LinkBehavior>("jobenium:linkBehavior", "new-tab");
}
export function setLinkBehavior(v: LinkBehavior): void {
  write("jobenium:linkBehavior", v);
}

// Collapsed groups
export function getCollapsedGroups(): string[] {
  return read<string[]>("jobenium:collapsedGroups", []);
}
export function setCollapsedGroups(v: string[]): void {
  write("jobenium:collapsedGroups", v);
}

// Disabled sources
export function getDisabledSources(): string[] {
  return read<string[]>("jobenium:disabledSources", []);
}
export function setDisabledSources(v: string[]): void {
  write("jobenium:disabledSources", v);
}

// Recent searches
export interface RecentSearch {
  title: string;
  keywords: string;
  excludes: string;
  timeFilter: string;
}

export function getRecentSearches(): RecentSearch[] {
  return read<RecentSearch[]>("jobenium:recentSearches", []);
}
export function addRecentSearch(s: RecentSearch): void {
  const all = getRecentSearches().filter(
    (r) =>
      !(r.title === s.title &&
        r.keywords === s.keywords &&
        r.excludes === s.excludes &&
        r.timeFilter === s.timeFilter),
  );
  all.unshift(s);
  write("jobenium:recentSearches", all.slice(0, 8));
}

// Custom sources
export interface CustomSource {
  id: string;
  name: string;
  sites: string[];
  suffix?: string;
}

export function getCustomSources(): CustomSource[] {
  return read<CustomSource[]>("jobenium:customSources", []);
}

export function setCustomSources(v: CustomSource[]): void {
  write("jobenium:customSources", v);
}

export function addCustomSource(s: Omit<CustomSource, "id">): CustomSource {
  const all = getCustomSources();
  const entry: CustomSource = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...s,
  };
  all.push(entry);
  setCustomSources(all);
  return entry;
}

export function removeCustomSource(id: string): void {
  setCustomSources(getCustomSources().filter((s) => s.id !== id));
}

// Theme
export function getTheme(): "light" | "dark" | null {
  try {
    const v = localStorage.getItem("theme");
    if (v === "light" || v === "dark") return v;
  } catch {}
  return null;
}
export function setTheme(v: "light" | "dark"): void {
  try {
    localStorage.setItem("theme", v);
  } catch {}
}

// Tip dismissed
export function getTipDismissed(): boolean {
  return read<boolean>("jobenium:tipDismissed", false);
}
export function setTipDismissed(): void {
  write("jobenium:tipDismissed", true);
}
