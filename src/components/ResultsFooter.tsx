import { useActiveVisitors } from "@/hooks/useActiveVisitors";
import { MadeBy } from "@/components/MadeBy";
import { sources } from "@/data/sources";

export function ResultsFooter() {
  const visitors = useActiveVisitors();

  return (
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#e9e5de] pt-4 text-xs text-[#8b867e] dark:border-[#24282c] dark:text-[#9a958c]">
      {visitors !== null && (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-full bg-emerald-500"
          />
          {visitors.toLocaleString("en-US")} active in the last hour
        </span>
      )}

      <span className="flex items-center gap-3">
        <a
          href="/sources.html"
          className="underline-offset-2 hover:underline"
        >
          Browse all {sources.length.toLocaleString("en-US")} sources
        </a>
        <MadeBy />
      </span>
    </footer>
  );
}
