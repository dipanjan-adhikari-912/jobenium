import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/SearchForm";
import { SearchSummary } from "@/components/SearchSummary";
import { SourceGroup as SourceGroupComponent } from "@/components/SourceGroup";
import { SettingsPopover } from "@/components/SettingsPopover";
import { RecentSearches } from "@/components/RecentSearches";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AddSourceForm } from "@/components/AddSourceForm";
import { useSearchState } from "@/hooks/useSearchState";
import { useSettings } from "@/hooks/useSettings";
import { useVisited } from "@/hooks/useVisited";
import { useRecent } from "@/hooks/useRecent";
import { useCustomSources } from "@/hooks/useCustomSources";
import { sources, SOURCE_GROUPS, type Source, type SourceGroup } from "@/data/sources";
import { buildGoogleUrl } from "@/lib/buildQuery";
import { getTipDismissed, setTipDismissed } from "@/lib/storage";
import { X } from "lucide-react";

function App() {
  const [search, updateSearch] = useSearchState();
  const settings = useSettings();
  const visited = useVisited();
  const recent = useRecent();
  const { customSources, add: addCustom, remove: removeCustom } = useCustomSources();
  const [started, setStarted] = useState(!!search.title);
  const [tipDismissed, setTipDismissedState] = useState(getTipDismissed);
  const [focusedSourceIdx, setFocusedSourceIdx] = useState<number | null>(null);

  const allSources = useMemo(() => {
    const custom: Source[] = customSources.map((cs) => ({
      id: cs.id,
      name: cs.name,
      group: "My boards" as SourceGroup,
      sites: cs.sites,
      suffix: cs.suffix,
      custom: true,
    }));
    return [...sources, ...custom];
  }, [customSources]);

  // Get all visible (non-disabled) sources
  const visibleSources = allSources.filter(
    (s: Source) => !settings.disabledSources.includes(s.id),
  );

  const getUrl = useCallback(
    (source: Source) => {
      if (source.customUrl) {
        return source.customUrl({
          title: search.title,
          timeFilterId: search.timeFilter,
        });
      }
      return buildGoogleUrl({
        title: search.title,
        keywords: search.keywords,
        excludes: search.excludes,
        timeFilterId: search.timeFilter,
        sites: source.sites,
        suffix: source.suffix,
      });
    },
    [search],
  );

  const handleSubmit = () => {
    setStarted(true);
    recent.addRecent({
      title: search.title,
      keywords: search.keywords,
      excludes: search.excludes,
      timeFilter: search.timeFilter,
    });
    visited.resetVisited();
    setFocusedSourceIdx(null);
  };

  const handleEdit = () => {
    setStarted(false);
  };

  const handleSelectRecent = (r: { title: string; keywords: string; excludes: string; timeFilter: string }) => {
    updateSearch(r);
    setStarted(true);
    recent.addRecent(r);
    visited.resetVisited();
    setFocusedSourceIdx(null);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!started) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "j") {
        e.preventDefault();
        setFocusedSourceIdx((prev) =>
          prev === null ? 0 : Math.min(prev + 1, visibleSources.length - 1),
        );
      } else if (e.key === "k") {
        e.preventDefault();
        setFocusedSourceIdx((prev) =>
          prev === null ? 0 : Math.max(prev - 1, 0),
        );
      } else if (e.key === "Enter" && focusedSourceIdx !== null) {
        e.preventDefault();
        const source = visibleSources[focusedSourceIdx];
        if (source) {
          visited.markVisited(source.id);
          const url = getUrl(source);
          const linkBehavior = settings.linkBehavior;
          if (linkBehavior === "same-tab") {
            window.location.href = url;
          } else if (linkBehavior === "reuse-tab") {
            window.open(url, "_jobenium_tab");
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, focusedSourceIdx, visibleSources, getUrl, visited, settings.linkBehavior]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Jobenium
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Open roles across 50+ job boards and ATS platforms
            </p>
          </div>
          <div className="flex items-center gap-1">
            <SettingsPopover
              linkBehavior={settings.linkBehavior}
              onLinkBehaviorChange={settings.updateLinkBehavior}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Form or Summary */}
        {!started ? (
          <>
            <SearchForm
              title={search.title}
              keywords={search.keywords}
              excludes={search.excludes}
              timeFilter={search.timeFilter}
              onChange={updateSearch}
              onSubmit={handleSubmit}
            />
            <div className="mt-6">
              <RecentSearches recents={recent.recents} onSelect={handleSelectRecent} />
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <SearchSummary
              title={search.title}
              timeFilterId={search.timeFilter}
              onEdit={handleEdit}
            />

            {/* Tip */}
            {!tipDismissed && (
              <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
                <span>
                  Tip: Right-click a source &rarr; &ldquo;Open link in split view&rdquo; to browse two sources at once.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTipDismissed();
                    setTipDismissedState(true);
                  }}
                  className="ml-2 shrink-0 hover:text-[var(--foreground)]"
                  aria-label="Dismiss tip"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Reset visited */}
            {visited.hasVisited && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={visited.resetVisited}>
                  Reset visited
                </Button>
              </div>
            )}

            {/* Source groups */}
            <div className="space-y-4">
              <div className="flex justify-end">
                <AddSourceForm onAdd={(s) => addCustom(s)} />
              </div>
              {SOURCE_GROUPS.map((group: SourceGroup) => {
                const groupSources = allSources.filter((s: Source) => s.group === group);
                if (groupSources.length === 0) return null;
                return (
                  <SourceGroupComponent
                    key={group}
                    group={group}
                    sources={groupSources}
                    getUrl={getUrl}
                    isVisited={visited.isVisited}
                    disabledSources={settings.disabledSources}
                    collapsedGroups={settings.collapsedGroups}
                    linkBehavior={settings.linkBehavior}
                    onVisit={visited.markVisited}
                    onToggleSource={settings.toggleSource}
                    onToggleGroup={settings.toggleGroup}
                    onDeleteSource={removeCustom}
                  />
                );
              })}
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono">j</kbd>
              {" / "}
              <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono">k</kbd>
              {" navigate &middot; "}
              <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono">Enter</kbd>
              {" open"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
