import type { ReactNode } from "react";
import wordmark from "../../assets/wordmark_onwhite.svg";
import bgImage from "../../assets/bg-1.jpg";
import { SettingsPopover } from "@/components/SettingsPopover";
import { MadeBy } from "@/components/MadeBy";
import { type LinkBehavior } from "@/lib/storage";
import { type SearchEngineId } from "@/data/searchEngines";

interface HeroProps {
  children: ReactNode;
  linkBehavior: LinkBehavior;
  onLinkBehaviorChange: (v: LinkBehavior) => void;
  searchEngine: SearchEngineId;
  onSearchEngineChange: (v: SearchEngineId) => void;
}

export function Hero({
  children,
  linkBehavior,
  onLinkBehaviorChange,
  searchEngine,
  onSearchEngineChange,
}: HeroProps) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-1rem)] flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-14 sm:px-10 sm:py-16">
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-to-br from-sky-700 via-slate-800 to-emerald-950"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-[3px]"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/30 to-black/55">
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
        <img
          src={wordmark}
          alt="Jobenium"
          className="h-10 w-auto rounded-[14px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:h-11"
        />

        <h1 className="pointer-events-auto mt-8 select-text text-center font-heading text-[clamp(20px,4.34vw,91px)] font-semibold leading-[0.954] tracking-[-0.04em] text-[#d9d9d9] sm:mt-9">
          <span className="block">The internet is full of jobs.</span>
          <span className="block">Find yours.</span>
        </h1>

        <p className="mt-3 text-center text-sm text-[#d9d9d9]/80 sm:text-base">
          No sign-up needed. Free forever.
        </p>

        <div className="pointer-events-auto relative mt-10 w-full max-w-3xl sm:mt-12">
          {children}
        </div>
      </div>

      <footer className="absolute inset-x-0 bottom-4 flex justify-center [&_a]:text-white [&_p]:text-white/70">
        <MadeBy />
      </footer>
    </section>
  );
}
