import { useEffect, useState } from "react";
import { IconSearch } from "@tabler/icons-react";

export const SEARCH_TRANSITION_MS = 5000;

const STATUS_LINES = [
  "Querying Greenhouse…",
  "Scanning LinkedIn…",
  "Filtering by time window…",
  "Ranking fresh postings…",
];

export function SearchLoader() {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_LINES.length);
    }, 350);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4"
    >
      <div className="flex size-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]">
        <IconSearch className="size-6 animate-pulse text-[var(--foreground)] motion-reduce:animate-none" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-[var(--foreground)]">
          Searching 50+ job boards…
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {STATUS_LINES[statusIdx]}
        </p>
      </div>
    </div>
  );
}
