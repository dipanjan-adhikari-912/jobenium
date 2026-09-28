import { useState, useCallback } from "react";
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  type RecentSearch,
} from "@/lib/storage";

export function useRecent() {
  const [recents, setRecents] = useState<RecentSearch[]>(getRecentSearches);

  const addRecent = useCallback((s: RecentSearch) => {
    addRecentSearch(s);
    setRecents(getRecentSearches());
  }, []);

  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecents([]);
  }, []);

  return { recents, addRecent, clearRecent };
}
