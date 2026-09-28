import "./backdrop.css";
import { type BackdropState } from "@/hooks/useBackdrop";

const LAYER = "absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-[3px]";

/**
 * Shared photo backdrop: base gradient plus the photo layers. While a change is
 * in flight (`outgoing` set) the incoming image fades in over the outgoing one —
 * a CSS animation keyed on the image, so it runs even if the page is throttled.
 */
export function BackdropImage({ image, outgoing = null }: BackdropState) {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-to-br from-sky-700 via-slate-800 to-emerald-950"
      />
      {outgoing && (
        <div
          aria-hidden
          className={LAYER}
          style={{ backgroundImage: `url(${outgoing})` }}
        />
      )}
      <div
        key={image}
        aria-hidden
        className={
          outgoing
            ? `${LAYER} animate-[backdrop-fade-in_700ms_ease-out_both] motion-reduce:animate-none`
            : LAYER
        }
        style={{ backgroundImage: `url(${image})` }}
      />
    </>
  );
}
