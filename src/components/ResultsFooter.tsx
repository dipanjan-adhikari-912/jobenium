import { usePresence } from "@/lib/presence";
import { MadeBy } from "@/components/MadeBy";

export function ResultsFooter() {
  const online = usePresence();

  return (
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#e9e5de] pt-4 text-xs text-[#8b867e] dark:border-[#24282c] dark:text-[#9a958c]">
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        {online.toLocaleString("en-US")} people online
      </span>

      <MadeBy />
    </footer>
  );
}
