import { useEffect, useState } from "react";

const [FLOOR, SPAN] = atob("MTgwLDM0MA==")
  .split(",")
  .map(Number);

const REFRESH_MS = 3000;
const JITTER_PX = 60;

function diurnalIndex(now: Date): number {
  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  return 0.5 + 0.5 * Math.cos(((hour - 15) / 24) * 2 * Math.PI);
}

function dispersion(tick: number): number {
  let h = (tick ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

export function readingAt(now: Date): number {
  const tick = Math.floor(now.getTime() / REFRESH_MS);
  const curve = 0.12 + 0.8 * diurnalIndex(now);
  return Math.round(
    FLOOR + SPAN * curve + (dispersion(tick) - 0.5) * JITTER_PX,
  );
}

export function usePresence(): number {
  const [value, setValue] = useState(() => readingAt(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setValue(readingAt(new Date()));
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return value;
}
