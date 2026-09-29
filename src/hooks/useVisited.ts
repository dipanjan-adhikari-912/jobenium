import { useState, useCallback } from "react";
import { getVisitedSources, setVisitedSources, VISITED_LIMIT } from "@/lib/storage";

/** Marks sources the user opened. Persisted per device so marks survive reloads. */
export function useVisited() {
  const [visited, setVisited] = useState<string[]>(getVisitedSources);

  const markVisited = useCallback((sourceId: string) => {
    setVisited((prev) => {
      if (prev.includes(sourceId)) return prev;
      const next = [...prev, sourceId].slice(-VISITED_LIMIT);
      setVisitedSources(next);
      return next;
    });
  }, []);

  const isVisited = useCallback(
    (sourceId: string) => visited.includes(sourceId),
    [visited],
  );

  const resetVisited = useCallback(() => {
    setVisited([]);
    setVisitedSources([]);
  }, []);

  return { markVisited, isVisited, resetVisited, hasVisited: visited.length > 0 };
}
