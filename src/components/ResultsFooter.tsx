import { useActiveVisitors } from "@/hooks/useActiveVisitors";
import { MadeBy } from "@/components/MadeBy";
import { sources } from "@/data/sources";

const TRUST_LINKS = [
  { href: "/sources.html", label: "Browse all sources" },
  { href: "/about.html", label: "About" },
  { href: "/privacy.html", label: "Privacy" },
  { href: "/contact.html", label: "Contact" },
];

export function ResultsFooter() {
  const visitors = useActiveVisitors();

  return (
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#e9e5de] pt-4 text-xs text-[#6d675f] dark:border-[#24282c] dark:text-[#9a958c]">
      {visitors !== null && (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-full bg-emerald-500"
          />
          {visitors.toLocaleString("en-US")} active in the last hour
        </span>
      )}

      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <nav aria-label="Site">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {TRUST_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="underline-offset-2 hover:underline"
                >
                  {l.label === "Browse all sources"
                    ? `Browse all ${sources.length.toLocaleString("en-US")} sources`
                    : l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <MadeBy />
      </span>
    </footer>
  );
}
