import { useEffect, useState } from "react";
import {
  formatTimeSpent,
  loadTimeSpent,
  saveTimeSpent,
  todayKey,
} from "@/lib/timeSpent";

/**
 * Seconds spent in the app today while the browser tab was visible.
 * Persisted per local calendar day; resets at local midnight.
 * Must be mounted exactly once (in App) to avoid double counting.
 */
export function useTimeSpentToday(): string {
  const [record, setRecord] = useState(loadTimeSpent);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const today = todayKey();
      setRecord((prev) =>
        prev.d === today
          ? { d: today, s: prev.s + 1 }
          : { d: today, s: 1 },
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    saveTimeSpent(record);
  }, [record]);

  return formatTimeSpent(record.s);
}
