import { sources } from "@/data/sources";

/**
 * Crawlable copy for the landing page. The prerender block in
 * `scripts/generate-ai-content.mjs` mirrors this text for first paint, but that
 * block is replaced when React mounts, so this is the version that actually
 * persists in the rendered document.
 *
 * Sits below the full-height hero and deliberately stays a normal scrolling
 * section — the hero itself still fits one viewport.
 */
const TRUST_LINKS = [
  { href: "/sources.html", label: "Source catalog" },
  { href: "/pricing.html", label: "Pricing" },
  { href: "/about.html", label: "About" },
  { href: "/privacy.html", label: "Privacy" },
  { href: "/terms.html", label: "Terms" },
  { href: "/contact.html", label: "Contact" },
  { href: "/disclosure.html", label: "Disclosure" },
];

export function LandingContent() {
  const total = sources.length;

  return (
    <div className="mx-auto w-full max-w-3xl px-1 pb-14 text-[#1d1b18]">
      <h2 className="mt-12 font-heading text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
        Search every job board at once
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-[#45403a]">
        Most job searches quietly miss most of the market. A role posted on an
        applicant tracking system is invisible on the big job boards, and a role
        posted on a country board is invisible everywhere else. Searching
        properly means visiting dozens of sites by hand, and almost nobody does
        that consistently.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-[#45403a]">
        Jobenium takes one job title and builds the right search for each of its{" "}
        {total} sources, so a single search reaches the whole market instead of
        the three sites you happened to remember.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-[-0.02em]">
        What it searches
      </h2>
      <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-[#45403a]">
        <li>
          <strong className="font-semibold text-[#1d1b18]">
            Applicant tracking systems
          </strong>{" "}
          — the systems companies hire through, where most large-company roles
          are posted first.
        </li>
        <li>
          <strong className="font-semibold text-[#1d1b18]">General job boards</strong>{" "}
          — the big aggregators and the regional boards most people start with.
        </li>
        <li>
          <strong className="font-semibold text-[#1d1b18]">
            Country job sites
          </strong>{" "}
          — national boards and official labour portals that no global board
          covers well.
        </li>
        <li>
          <strong className="font-semibold text-[#1d1b18]">Specialist boards</strong>{" "}
          — roles by craft, sector or seniority, from design to engineering to
          clinical work.
        </li>
        <li>
          <strong className="font-semibold text-[#1d1b18]">
            Startup and VC boards
          </strong>{" "}
          — the funds and accelerators that publish their portfolio&rsquo;s
          openings in one place.
        </li>
        <li>
          <strong className="font-semibold text-[#1d1b18]">
            Communities and career pages
          </strong>{" "}
          — where jobs get posted directly, including employer career pages.
        </li>
      </ul>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-[-0.02em]">
        How to use it
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[#45403a]">
        <li>Type a job title, or pick a recent search.</li>
        <li>
          Set a date window such as the last 24 hours, and a location if you want
          to narrow it.
        </li>
        <li>
          Open the sources that matter to you. Each opens a real search on that
          site&rsquo;s own results page.
        </li>
      </ol>
      <p className="mt-3 text-[15px] leading-relaxed text-[#45403a]">
        There is no account, no CV upload and no application tracking. Jobenium
        holds no listings of its own — it is a front door to other
        people&rsquo;s search results.{" "}
        <a href="/about.html" className="underline underline-offset-2 hover:text-[#0b3b2e]">
          Read more about how it works
        </a>
        .
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-[-0.02em]">
        Free, with no catch
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-[#45403a]">
        The full catalog of {total} sources is available at no cost and with no
        usage cap. Jobenium is not funded by advertising or affiliate deals, and{" "}
        <a
          href="/disclosure.html"
          className="underline underline-offset-2 hover:text-[#0b3b2e]"
        >
          placement in the source list cannot be bought
        </a>
        .
      </p>

      <nav aria-label="Site" className="mt-12 border-t border-[#cfc9c0] pt-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#5c5750]">
          {TRUST_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="underline underline-offset-2 hover:text-[#0b3b2e]">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
