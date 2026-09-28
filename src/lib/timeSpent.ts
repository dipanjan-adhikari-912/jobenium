export interface TimeSpentRecord {
  /** Local calendar day, YYYY-MM-DD. */
  d: string;
  /** Seconds spent while the tab was visible that day. */
  s: number;
}

const KEY = "jobenium:timeSpent";

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTimeSpent(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}h:${String(m).padStart(2, "0")}m`;
}

function fresh(): TimeSpentRecord {
  return { d: todayKey(), s: 0 };
}

export function loadTimeSpent(): TimeSpentRecord {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return fresh();
    const parsed = JSON.parse(raw) as Partial<TimeSpentRecord>;
    if (
      typeof parsed.d !== "string" ||
      typeof parsed.s !== "number" ||
      !Number.isFinite(parsed.s) ||
      parsed.s < 0
    ) {
      return fresh();
    }
    if (parsed.d !== todayKey()) return fresh();
    return { d: parsed.d, s: Math.floor(parsed.s) };
  } catch {
    return fresh();
  }
}

export function saveTimeSpent(record: TimeSpentRecord): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // storage full or unavailable
  }
}
