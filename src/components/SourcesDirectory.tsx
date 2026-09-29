import { useEffect, useRef, useState } from "react";
import { ExternalLink, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type Source } from "@/data/sources";
import { SOURCE_TABS } from "@/data/sourceTabs";
import { type LinkBehavior } from "@/lib/storage";
import { getLocationLabel, splitLocation, toggleLocation, countryBadgeLabel } from "@/lib/locations";

function monogramOf(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function domainOf(source: Source): string {
  if (source.sites.length === 0) return "linkedin.com";
  const [first, ...rest] = source.sites;
  const cleaned = first.replace(/^\*\//, "").replace(/\/$/, "");
  if (rest.length > 0) return `${cleaned} +${rest.length}`;
  return cleaned;
}

function faviconDomainOf(source: Source): string | null {
  const raw = source.sites[0];
  if (!raw) return "linkedin.com";
  if (raw.includes("*")) return null;
  const host = raw.split("/")[0];
  if (!host.includes(".")) return null;
  return host;
}

interface SourceCardProps {
  source: Source;
  url: string;
  visited: boolean;
  disabled: boolean;
  focused: boolean;
  linkBehavior: LinkBehavior;
  onVisit: (sourceId: string) => void;
  onToggle: (sourceId: string) => void;
  onDelete?: (sourceId: string) => void;
  showTileTip: boolean;
  onDismissTileTip?: () => void;
}

function SourceCard({
  source,
  url,
  visited,
  disabled,
  focused,
  linkBehavior,
  onVisit,
  onToggle,
  onDelete,
  showTileTip,
  onDismissTileTip,
}: SourceCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [faviconFailed, setFaviconFailed] = useState(false);

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const faviconDomain = faviconDomainOf(source);
  const showFavicon = faviconDomain !== null && !faviconFailed;

  const badgeLabel =
    source.badge === "Country"
      ? (countryBadgeLabel(source.countryIds) ?? source.badge)
      : source.badge;

  const linkProps =
    linkBehavior === "reuse-tab"
      ? { target: "_jobenium_tab" as const }
      : linkBehavior === "same-tab"
        ? {}
        : { target: "_blank" as const, rel: "noopener noreferrer" as const };

  const iconButton =
    "relative z-10 flex size-5 items-center justify-center rounded-md text-[#a5a099] opacity-0 transition-opacity hover:bg-[#f1efe9] hover:text-[#161B1D] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161B1D] group-hover:opacity-100 dark:text-[#6f6a62] dark:hover:bg-[#22262a] dark:hover:text-[#e8e6e1] dark:focus-visible:ring-[#e8e6e1]";

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex min-h-[72px] items-start gap-3 rounded-[14px] border border-[#eae6df] bg-white p-3.5 transition-all dark:border-[#24282c] dark:bg-[#16191c]",
        "hover:border-[#ded8cd] hover:shadow-[0_10px_30px_-12px_rgba(22,27,29,0.18)] dark:hover:border-[#33383d]",
        visited && "opacity-60",
        disabled && "opacity-40",
        focused && "ring-2 ring-[#161B1D] ring-offset-2 ring-offset-[#f7f5f1] dark:ring-[#e8e6e1] dark:ring-offset-[#0e1113]",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#eee9e1] bg-white dark:border-[#2a2f34] dark:bg-[#1e2226]">
        {showFavicon ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`}
            alt=""
            loading="lazy"
            onError={() => setFaviconFailed(true)}
            className="size-5 object-contain"
          />
        ) : (
          <span className="font-heading text-[13px] font-semibold text-[#3f3b34] dark:text-[#c9c5bd]">
            {monogramOf(source.name)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold leading-5 text-[#161B1D] dark:text-[#e8e6e1]">
            {source.name}
          </h3>
          {badgeLabel && (
            <span className="shrink-0 rounded-full bg-[#f6efdd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#96741f] dark:bg-[#3a3320] dark:text-[#d9b964]">
              {badgeLabel}
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#8b867e] dark:text-[#8f8a82]">
          {domainOf(source)}
          {visited && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[#6f9a6a] dark:text-[#8fbf8a]">
              · opened
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5 self-start pt-0.5">
        <ExternalLink aria-hidden className="size-3.5 text-[#a5a099] transition-colors group-hover:text-[#161B1D] dark:text-[#6f6a62] dark:group-hover:text-[#e8e6e1]" />
        <button
          type="button"
          onClick={() => onToggle(source.id)}
          aria-label={disabled ? `Enable ${source.name}` : `Disable ${source.name}`}
          className={cn(iconButton, disabled && "opacity-100")}
        >
          {disabled ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
        </button>
        {source.custom && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(source.id)}
            aria-label={`Delete ${source.name}`}
            className={iconButton}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <a
        href={url}
        onClick={() => onVisit(source.id)}
        onAuxClick={() => onVisit(source.id)}
        onContextMenu={() => onVisit(source.id)}
        {...linkProps}
        aria-label={`Open search on ${source.name}`}
        className="after:absolute after:inset-0 after:rounded-[14px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#161B1D] focus-visible:after:ring-offset-2 dark:focus-visible:after:ring-[#e8e6e1]"
      >
        <span className="sr-only">{source.name}</span>
      </a>

      {showTileTip && (
        <div className="absolute bottom-full left-0 z-30 hidden pb-1.5 group-hover:block">
          <div className="relative w-60 rounded-xl bg-[#161B1D] px-3.5 py-3 text-[13px] leading-snug text-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.4)] dark:bg-[#22262a]">
            <button
              type="button"
              onClick={onDismissTileTip}
              aria-label="Dismiss tip"
              className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-md text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="size-3" />
            </button>
            <span className="pr-4">
              Tip: Right-click and &apos;Open link in Split-view&apos; for a better experience
            </span>
            <span
              aria-hidden
              className="absolute -bottom-1 left-3 size-2.5 rotate-45 bg-[#161B1D] dark:bg-[#22262a]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SourcesDirectoryProps {
  sources: Source[];
  timeSpent: string;
  location: string;
  activeTab: number;
  focusedId: string | null;
  linkBehavior: LinkBehavior;
  getUrl: (source: Source) => string;
  isVisited: (sourceId: string) => boolean;
  disabledSources: string[];
  onTabChange: (tabIdx: number) => void;
  onLocationChange: (value: string) => void;
  onVisit: (sourceId: string) => void;
  onToggleSource: (sourceId: string) => void;
  onDeleteSource?: (sourceId: string) => void;
  showTileTip?: boolean;
  onDismissTileTip?: () => void;
}

export function SourcesDirectory({
  sources,
  timeSpent,
  location,
  activeTab,
  focusedId,
  linkBehavior,
  getUrl,
  isVisited,
  disabledSources,
  onTabChange,
  onLocationChange,
  onVisit,
  onToggleSource,
  onDeleteSource,
  showTileTip = false,
  onDismissTileTip,
}: SourcesDirectoryProps) {
  const tab = SOURCE_TABS[activeTab] ?? SOURCE_TABS[0];
  const tabSources = sources.filter((s) => tab.groups.includes(s.group));
  const activeTokens = splitLocation(location);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Source categories"
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-[8px] border border-[#e5e1da] bg-white p-1 dark:border-[#24282c] dark:bg-[#16191c]"
        >
          {SOURCE_TABS.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={i === activeTab}
              onClick={() => onTabChange(i)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#161B1D] dark:focus-visible:ring-[#e8e6e1]",
                i === activeTab
                  ? "bg-[#161B1D] text-white shadow-[0_4px_12px_-6px_rgba(22,27,29,0.5)] dark:bg-white dark:text-[#161B1D]"
                  : "text-[#6f6a62] hover:bg-[#f1efe9] hover:text-[#161B1D] dark:text-[#9a958c] dark:hover:bg-[#22262a] dark:hover:text-[#e8e6e1]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="min-w-0 text-xs font-medium text-[#8b867e] sm:whitespace-nowrap dark:text-[#9a958c]">
          Time spent today: {timeSpent} - The more you apply, the higher your
          chances
        </p>
      </div>

      {activeTokens.length > 0 && (
        <div
          role="group"
          aria-label="Active location filters"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {activeTokens.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1 rounded-full border border-[#e5e1da] bg-white py-1 pl-3 pr-1.5 text-xs font-medium text-[#161B1D] dark:border-[#24282c] dark:bg-[#16191c] dark:text-[#e8e6e1]"
            >
              {getLocationLabel(token)}
              <button
                type="button"
                aria-label={`Remove ${getLocationLabel(token)} filter`}
                onClick={() => onLocationChange(toggleLocation(location, token))}
                className="flex size-4 items-center justify-center rounded-full text-[#8b867e] outline-none transition-colors hover:bg-[#f1efe9] hover:text-[#161B1D] focus-visible:ring-2 focus-visible:ring-[#161B1D] dark:text-[#9a958c] dark:hover:bg-[#22262a] dark:hover:text-[#e8e6e1] dark:focus-visible:ring-[#e8e6e1]"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onLocationChange("any")}
            className="rounded-full px-2 py-1 text-xs font-medium text-[#8b867e] underline-offset-2 outline-none transition-colors hover:text-[#161B1D] hover:underline focus-visible:ring-2 focus-visible:ring-[#161B1D] dark:text-[#9a958c] dark:hover:text-[#e8e6e1] dark:focus-visible:ring-[#e8e6e1]"
          >
            Clear all
          </button>
        </div>
      )}

      {tabSources.length === 0 ? (
        <div className="mt-8 flex flex-col items-start gap-3">
          <p className="text-sm text-[#8b867e] dark:text-[#8f8a82]">
            {activeTokens.length > 0
              ? "No sources match your location filters in this category."
              : tab.label === "My boards"
                ? "No custom boards yet — add one with \u201CAdd board\u201D."
                : "No sources in this category yet."}
          </p>
          {activeTokens.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLocationChange("any")}
            >
              Clear location filters
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-3">
          {tabSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              url={getUrl(source)}
              visited={isVisited(source.id)}
              disabled={disabledSources.includes(source.id)}
              focused={focusedId === source.id}
              linkBehavior={linkBehavior}
              onVisit={onVisit}
              onToggle={onToggleSource}
              onDelete={onDeleteSource}
              showTileTip={showTileTip}
              onDismissTileTip={onDismissTileTip}
            />
          ))}
          {/* Promo card intentionally not rendered while growing the audience.
              To bring it back, re-add the import and
              `<AdvertiseCard key="__advertise" />` as the last grid child. */}
        </div>
      )}
    </div>
  );
}
