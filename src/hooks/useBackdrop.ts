import { useCallback, useEffect, useRef, useState } from "react";
import { BACKDROPS, BACKDROP_FADE_MS } from "@/data/backgrounds";
import { getBackdropIndex, setBackdropIndex } from "@/lib/storage";

export interface BackdropState {
  /** Image to show. */
  image: string;
  /** Previous image, kept mounted underneath while the new one fades in. */
  outgoing: string | null;
}

function preload(src: string): void {
  const img = new Image();
  img.src = src;
}

/** Cycles the backdrop photo; the selection is shared by both pages. */
export function useBackdrop() {
  const [index, setIndex] = useState(getBackdropIndex);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    // Warm the neighbours so switching never shows an empty layer.
    preload(BACKDROPS[(index + 1) % BACKDROPS.length]);
    preload(BACKDROPS[(index - 1 + BACKDROPS.length) % BACKDROPS.length]);
  }, [index]);

  useEffect(
    () => () => {
      if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    },
    [],
  );

  const nextBackdrop = useCallback(() => {
    const nextIndex = (index + 1) % BACKDROPS.length;
    preload(BACKDROPS[nextIndex]);
    setOutgoing(BACKDROPS[index]);
    setIndex(nextIndex);
    setBackdropIndex(nextIndex);
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(
      () => setOutgoing(null),
      BACKDROP_FADE_MS + 80,
    );
  }, [index]);

  return {
    backdrop: { image: BACKDROPS[index], outgoing } as BackdropState,
    nextBackdrop,
  };
}
