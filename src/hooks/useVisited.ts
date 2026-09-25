import { useState, useCallback } from "react";

export function useVisited() {
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const markVisited = useCallback((sourceId: string) => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(sourceId);
      return next;
    });
  }, []);

  const isVisited = useCallback(
    (sourceId: string) => visited.has(sourceId),
    [visited],
  );

  const resetVisited = useCallback(() => {
    setVisited(new Set());
  }, []);

  return { markVisited, isVisited, resetVisited, hasVisited: visited.size > 0 };
}
