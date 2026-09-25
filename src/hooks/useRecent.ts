import { useState, useCallback } from "react";
import { getRecentSearches, addRecentSearch, type RecentSearch } from "@/lib/storage";

export function useRecent() {
  const [recents, setRecents] = useState<RecentSearch[]>(getRecentSearches);

  const addRecent = useCallback((s: RecentSearch) => {
    addRecentSearch(s);
    setRecents(getRecentSearches());
  }, []);

  return { recents, addRecent };
}
