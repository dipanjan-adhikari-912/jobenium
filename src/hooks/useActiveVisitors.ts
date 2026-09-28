import { useEffect, useState } from "react";

const POLL_MS = 60_000;

/**
 * Real visitor count from Vercel Web Analytics, served by /api/active-visitors.
 * Resolves to `null` when the endpoint is unconfigured or unavailable, so the
 * caller can hide the counter instead of inventing a number.
 */
export function useActiveVisitors(): number | null {
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/active-visitors", {
          headers: { accept: "application/json" },
        });
        if (!res.ok) {
          if (!cancelled) setVisitors(null);
          return;
        }
        const body = (await res.json()) as { visitors?: unknown };
        if (cancelled) return;
        setVisitors(typeof body.visitors === "number" ? body.visitors : null);
      } catch {
        if (!cancelled) setVisitors(null);
      }
    };

    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return visitors;
}
