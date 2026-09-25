import { useState, useCallback } from "react";
import {
  getLinkBehavior,
  setLinkBehavior,
  getCollapsedGroups,
  setCollapsedGroups,
  getDisabledSources,
  setDisabledSources,
  type LinkBehavior,
} from "@/lib/storage";

export function useSettings() {
  const [linkBehavior, setLinkBehaviorState] = useState<LinkBehavior>(getLinkBehavior);
  const [collapsedGroups, setCollapsedGroupsState] = useState<string[]>(getCollapsedGroups);
  const [disabledSources, setDisabledSourcesState] = useState<string[]>(getDisabledSources);

  const updateLinkBehavior = useCallback((v: LinkBehavior) => {
    setLinkBehaviorState(v);
    setLinkBehavior(v);
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
    collapsedGroups,
    toggleGroup,
    disabledSources,
    toggleSource,
  };
}
