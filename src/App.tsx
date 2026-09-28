import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { SearchToolbar } from "@/components/SearchToolbar";
import { Hero } from "@/components/Hero";
import { SearchLoader, SEARCH_TRANSITION_MS } from "@/components/SearchLoader";
import { SearchControlPanel } from "@/components/SearchControlPanel";
import { SourcesDirectory } from "@/components/SourcesDirectory";
import { ResultsFooter } from "@/components/ResultsFooter";
import { SettingsPopover } from "@/components/SettingsPopover";
import { RecentSearches } from "@/components/RecentSearches";
import { AddSourceForm } from "@/components/AddSourceForm";
import { useSearchState, stateToQs } from "@/hooks/useSearchState";
import { useSettings } from "@/hooks/useSettings";
import { useVisited } from "@/hooks/useVisited";
import { useRecent } from "@/hooks/useRecent";
import { useCustomSources } from "@/hooks/useCustomSources";
import { useTheme } from "@/hooks/useTheme";
import { useTimeSpentToday } from "@/hooks/useTimeSpentToday";
import { useBackdrop } from "@/hooks/useBackdrop";
import { sources, type Source } from "@/data/sources";
import { SOURCE_TABS, sourcesInTab } from "@/data/sourceTabs";
import { buildEngineUrl } from "@/lib/buildQuery";
import { applyLocation } from "@/lib/sourceMatch";
import { getTileTipDismissed, setTileTipDismissed } from "@/lib/storage";
import { Sun, Moon } from "lucide-react";
import logoAnimated from "../assets/logo-animated (1).svg";

type Page = "landing" | "loading" | "results";

const MY_BOARDS_TAB = SOURCE_TABS.length - 1;

function pageFromHash(): Page {
  return window.location.hash.startsWith("#/results") ? "loading" : "landing";
}

function App() {
  const [search, updateSearch] = useSearchState();
  const settings = useSettings();
  const visited = useVisited();
  const recent = useRecent();
  const { customSources, add: addCustom, remove: removeCustom } = useCustomSources();
  const { theme, toggleTheme } = useTheme();
  const [page, setPage] = useState<Page>(pageFromHash);
  const [tileTipDismissed, setTileTipDismissedState] = useState(getTileTipDismissed);
  const [focusedSourceIdx, setFocusedSourceIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const timeSpent = useTimeSpentToday();
  const { backdrop, nextBackdrop } = useBackdrop();

  // Loader transition: entering "loading" starts the timer; any page change cancels it
  useEffect(() => {
    if (page !== "loading") return;
    const id = window.setTimeout(() => setPage("results"), SEARCH_TRANSITION_MS);
    return () => window.clearTimeout(id);
  }, [page]);

  // Back/forward and manual hash edits are instant (no loader)
  useEffect(() => {
    const syncPage = () => {
      setPage(window.location.hash.startsWith("#/results") ? "results" : "landing");
    };
    window.addEventListener("popstate", syncPage);
    window.addEventListener("hashchange", syncPage);
    return () => {
      window.removeEventListener("popstate", syncPage);
      window.removeEventListener("hashchange", syncPage);
    };
  }, []);

  const allSources = useMemo(() => {
    const custom: Source[] = customSources.map((cs) => ({
      id: cs.id,
      name: cs.name,
      group: "My boards" as const,
      sites: cs.sites,
      suffix: cs.suffix,
      custom: true,
    }));
    return [...sources, ...custom];
  }, [customSources]);

  // Location/mode filter + priority/ranking sort (drives grid and heading count)
  const locatedSources = useMemo(
    () => applyLocation(allSources, search.location),
    [allSources, search.location],
  );

  // Get all visible (non-disabled) sources
  const visibleSources = locatedSources.filter(
    (s: Source) => !settings.disabledSources.includes(s.id),
  );

  // Keyboard navigation operates within the active tab
  const tabSources = sourcesInTab(visibleSources, activeTab);

  const getUrl = useCallback(
    (source: Source) => {
      if (source.customUrl) {
        return source.customUrl({
          title: search.title,
          timeFilterId: search.timeFilter,
        });
      }
      if (source.sourceType === "public_portal" && source.sourceUrl) {
        return source.sourceUrl;
      }
      return buildEngineUrl(settings.searchEngine, {
        title: search.title,
        keywords: search.keywords,
        excludes: search.excludes,
        timeFilterId: search.timeFilter,
        location: search.location,
        sites: source.sites,
        suffix: source.suffix,
      });
    },
    [search, settings.searchEngine],
  );

  const enterResults = (s: typeof search) => {
    const qs = stateToQs(s);
    window.history.pushState(null, "", `${qs ? `?${qs}` : ""}#/results`);
    setPage("loading");
  };

  const enterLanding = () => {
    window.history.pushState(null, "", "#/");
    setPage("landing");
  };

  const handleSubmit = () => {
    recent.addRecent({
      title: search.title,
      keywords: search.keywords,
      excludes: search.excludes,
      timeFilter: search.timeFilter,
    });
    visited.resetVisited();
    setFocusedSourceIdx(null);
    enterResults(search);
  };

  const handleEdit = () => {
    enterLanding();
  };

  const handleSelectRecent = (r: { title: string; keywords: string; excludes: string; timeFilter: string }) => {
    updateSearch(r);
    recent.addRecent(r);
    visited.resetVisited();
    setFocusedSourceIdx(null);
    enterResults({ ...search, ...r });
  };

  // Keyboard navigation
  useEffect(() => {
    if (page !== "results") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "j") {
        e.preventDefault();
        setFocusedSourceIdx((prev) =>
          prev === null ? 0 : Math.min(prev + 1, tabSources.length - 1),
        );
      } else if (e.key === "k") {
        e.preventDefault();
        setFocusedSourceIdx((prev) =>
          prev === null ? 0 : Math.max(prev - 1, 0),
        );
      } else if (e.key === "Enter" && focusedSourceIdx !== null) {
        e.preventDefault();
        const source = tabSources[focusedSourceIdx];
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
  }, [page, focusedSourceIdx, tabSources, getUrl, visited, settings.linkBehavior]);

  if (page === "landing") {
    return (
      <div className="min-h-screen bg-[#e6e1dc] p-2">
        <Hero
          linkBehavior={settings.linkBehavior}
          onLinkBehaviorChange={settings.updateLinkBehavior}
          backdrop={backdrop}
          onNextBackdrop={nextBackdrop}
          searchEngine={settings.searchEngine}
          onSearchEngineChange={settings.updateSearchEngine}
        >
          <SearchToolbar
            title={search.title}
            keywords={search.keywords}
            excludes={search.excludes}
            timeFilter={search.timeFilter}
            location={search.location}
            onChange={updateSearch}
            onSubmit={handleSubmit}
          />
          <div className="mt-5">
            <RecentSearches
              recents={recent.recents}
              onSelect={handleSelectRecent}
              onClear={recent.clearRecent}
            />
          </div>
        </Hero>
      </div>
    );
  }

  if (page === "loading") {
    return (
      <div
        className={cn(
          "flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4",
          theme === "dark" && "dark",
        )}
      >
        <img src={logoAnimated} alt="Jobenium" className="mb-7 size-24" />
        <SearchLoader />
      </div>
    );
  }

  const focusedId =
    focusedSourceIdx !== null ? (tabSources[focusedSourceIdx]?.id ?? null) : null;

  const handleTabChange = (idx: number) => {
    setActiveTab(idx);
    setFocusedSourceIdx(null);
  };

  const handleLocationChange = (location: string) => {
    updateSearch({ location });
    setFocusedSourceIdx(null);
  };

  const handleAddBoard = (s: { name: string; sites: string[]; suffix?: string }) => {
    addCustom(s);
    setActiveTab(MY_BOARDS_TAB);
    setFocusedSourceIdx(null);
  };

  const dismissTileTip = () => {
    setTileTipDismissed();
    setTileTipDismissedState(true);
  };

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-[#f7f5f1] p-2 dark:bg-[#0e1113] lg:flex-row",
        theme === "dark" && "dark",
      )}
    >
      <SearchControlPanel
        collapsed={!panelOpen}
        onToggleCollapsed={() => setPanelOpen((v) => !v)}
        title={search.title}
        keywords={search.keywords}
        excludes={search.excludes}
        timeFilter={search.timeFilter}
        location={search.location}
        onChange={updateSearch}
        onSubmit={handleSubmit}
        onHome={handleEdit}
        backdrop={backdrop}
      />

      <main className="flex min-w-0 flex-1 flex-col px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-[#161B1D] dark:text-[#e8e6e1]">
              Search {locatedSources.length} Sources
            </h1>
            <p className="mt-1 text-sm text-[#8b867e] dark:text-[#9a958c]">
              Everywhere this search can run — pick a source to open it.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {visited.hasVisited && (
              <Button variant="ghost" size="sm" onClick={visited.resetVisited}>
                Reset visited
              </Button>
            )}
            <AddSourceForm onAdd={handleAddBoard} />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <SettingsPopover
              linkBehavior={settings.linkBehavior}
              onLinkBehaviorChange={settings.updateLinkBehavior}
              searchEngine={settings.searchEngine}
              onSearchEngineChange={settings.updateSearchEngine}
            />
          </div>
        </header>

        <div className="mt-6 flex-1">
          <SourcesDirectory
            sources={locatedSources}
            timeSpent={timeSpent}
            location={search.location}
            onLocationChange={handleLocationChange}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            getUrl={getUrl}
            isVisited={visited.isVisited}
            disabledSources={settings.disabledSources}
            focusedId={focusedId}
            linkBehavior={settings.linkBehavior}
            onVisit={visited.markVisited}
            onToggleSource={settings.toggleSource}
            onDeleteSource={removeCustom}
            showTileTip={!tileTipDismissed}
            onDismissTileTip={dismissTileTip}
          />
        </div>

        <ResultsFooter />
      </main>
    </div>
  );
}

export default App;
