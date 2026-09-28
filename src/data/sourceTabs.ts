import { type Source, type SourceGroup } from "./sources";

export interface SourceTab {
  readonly label: string;
  readonly groups: readonly SourceGroup[];
}

export const SOURCE_TABS: readonly SourceTab[] = [
  { label: "ATS platforms", groups: ["ATS platforms"] },
  { label: "Job boards", groups: ["Job boards"] },
  { label: "Country", groups: ["Country"] },
  { label: "Specialist", groups: ["Specialist"] },
  { label: "Startup / VC", groups: ["Startup / VC"] },
  { label: "Communities", groups: ["Communities"] },
  { label: "Other sources", groups: ["Other ATS"] },
  { label: "Career pages", groups: ["Career Pages"] },
  { label: "My boards", groups: ["My boards"] },
];

export function sourcesInTab(sources: readonly Source[], tabIdx: number): Source[] {
  const tab = SOURCE_TABS[tabIdx] ?? SOURCE_TABS[0];
  return sources.filter((s) => tab.groups.includes(s.group));
}
