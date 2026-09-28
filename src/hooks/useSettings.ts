import { useState, useCallback } from "react";
import {
  getLinkBehavior,
  setLinkBehavior,
  getSearchEngine,
  setSearchEngine,
  getCollapsedGroups,
  setCollapsedGroups,
  getDisabledSources,
  setDisabledSources,
  type LinkBehavior,
} from "@/lib/storage";
import { type SearchEngineId } from "@/data/searchEngines";

export function useSettings() {
  const [linkBehavior, setLinkBehaviorState] = useState<LinkBehavior>(getLinkBehavior);
  const [searchEngine, setSearchEngineState] = useState<SearchEngineId>(getSearchEngine);
  const [collapsedGroups, setCollapsedGroupsState] = useState<string[]>(getCollapsedGroups);
  const [disabledSources, setDisabledSourcesState] = useState<string[]>(getDisabledSources);

  const updateLinkBehavior = useCallback((v: LinkBehavior) => {
    setLinkBehaviorState(v);
    setLinkBehavior(v);
  }, []);

  const updateSearchEngine = useCallback((v: SearchEngineId) => {
    setSearchEngineState(v);
    setSearchEngine(v);
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroupsState((prev) => {
      const next = prev.includes(groupId)
        ? prev.filter((g) => g !== groupId)
        : [...prev, groupId];
      setCollapsedGroups(next);
      return next;
    });
  }, []);

  const toggleSource = useCallback((sourceId: string) => {
    setDisabledSourcesState((prev) => {
      const next = prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId];
      setDisabledSources(next);
      return next;
    });
  }, []);

  return {
    linkBehavior,
    updateLinkBehavior,
    searchEngine,
    updateSearchEngine,
    collapsedGroups,
    toggleGroup,
    disabledSources,
    toggleSource,
  };
}
