import bg1 from "../../assets/bg-1.webp";
import bg2 from "../../assets/bg-2.webp";
import bg3 from "../../assets/bg-3.webp";
import bg4 from "../../assets/bg-4.webp";
import bg5 from "../../assets/bg-5.webp";

/**
 * Backdrop photos, cycled by clicking the wordmark. Order is the cycle order.
 *
 * Stored as WebP at 1280w: the layers render at `scale-110` behind `blur-[3px]`,
 * so the old full-resolution JPEGs cost ~370KB of LCP for detail the blur removed
 * anyway. The first entry is preloaded from index.html because it paints the LCP.
 */
export const BACKDROPS: readonly string[] = [bg1, bg2, bg3, bg4, bg5];

export const BACKDROP_COUNT = BACKDROPS.length;

/** Must match the `duration-700` on the crossfading layers in BackdropImage. */
export const BACKDROP_FADE_MS = 700;
