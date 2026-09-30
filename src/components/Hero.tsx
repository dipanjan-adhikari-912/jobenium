import type { ReactNode } from "react";
import wordmark from "../../assets/wordmark_onwhite.svg";
import { SettingsPopover } from "@/components/SettingsPopover";
import { BackdropImage } from "@/components/BackdropImage";
import { MadeBy } from "@/components/MadeBy";
import { type LinkBehavior } from "@/lib/storage";
import { type SearchEngineId } from "@/data/searchEngines";
import { type BackdropState } from "@/hooks/useBackdrop";

interface HeroProps {
  children: ReactNode;
  linkBehavior: LinkBehavior;
  onLinkBehaviorChange: (v: LinkBehavior) => void;
  searchEngine: SearchEngineId;
  onSearchEngineChange: (v: SearchEngineId) => void;
  backdrop: BackdropState;
  onNextBackdrop: () => void;
}

export function Hero({
  children,
  linkBehavior,
  onLinkBehaviorChange,
  searchEngine,
  onSearchEngineChange,
  backdrop,
  onNextBackdrop,
}: HeroProps) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-1rem)] flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#0b2b23] px-6 py-8 sm:px-10 sm:py-16">
      <BackdropImage image={backdrop.image} outgoing={backdrop.outgoing} />
      {/* Sits under the photo layers as a guaranteed-dark base. Axe cannot read
          background-image when resolving text contrast and falls through to the
          page colour, so the hero needs a real background-color to be auditable
          as well as legible. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/50 to-black/65"
      >
        <div className="absolute right-4 top-4 flex items-center gap-1 text-white sm:right-6 sm:top-6 [&_button:hover]:bg-white/15 [&_button:hover]:text-white [&_button]:text-white">
          <SettingsPopover
            linkBehavior={linkBehavior}
            onLinkBehaviorChange={onLinkBehaviorChange}
            searchEngine={searchEngine}
            onSearchEngineChange={onSearchEngineChange}
          />
        </div>
      </div>

      <div className="pointer-events-none relative flex w-full flex-col items-center">
        <button
          type="button"
          onClick={onNextBackdrop}
          aria-label="Change background"
          title="Change background"
          className="pointer-events-auto cursor-pointer rounded-[14px] outline-none transition-transform duration-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/80 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <img
            src={wordmark}
            alt="Jobenium"
            className="h-10 w-auto rounded-[14px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:h-11"
          />
        </button>

        <h1 className="pointer-events-auto mt-6 select-text text-center font-heading text-[clamp(20px,4.34vw,91px)] font-semibold leading-[0.954] tracking-[-0.04em] text-white sm:mt-9">
          <span className="block">The internet is full of jobs.</span>
          <span className="block">Find yours.</span>
        </h1>

        <p className="mt-3 text-center text-sm text-white/90 sm:text-base">
          No sign-up needed. Free forever.
        </p>

        <div className="pointer-events-auto relative mt-6 w-full max-w-3xl sm:mt-12">
          {children}
        </div>
      </div>

      <footer className="absolute inset-x-0 bottom-4 flex justify-center [&_a]:text-white [&_p]:text-white/70">
        <MadeBy />
      </footer>
    </section>
  );
}
