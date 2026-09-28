import bg1 from "../../assets/bg-1.jpg";
import bg2 from "../../assets/bg-2.jpg";
import bg3 from "../../assets/bg-3.jpg";
import bg4 from "../../assets/bg-4.jpg";
import bg5 from "../../assets/bg-5.jpg";

/** Backdrop photos, cycled by clicking the wordmark. Order is the cycle order. */
export const BACKDROPS: readonly string[] = [bg1, bg2, bg3, bg4, bg5];

export const BACKDROP_COUNT = BACKDROPS.length;

/** Must match the `duration-700` on the crossfading layers in BackdropImage. */
export const BACKDROP_FADE_MS = 700;
