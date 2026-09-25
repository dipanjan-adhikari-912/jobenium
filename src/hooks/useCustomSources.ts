import { useState, useCallback } from "react";
import {
  getCustomSources,
  addCustomSource,
  removeCustomSource,
  type CustomSource,
} from "@/lib/storage";

export function useCustomSources() {
  const [customSources, setCustomSourcesState] = useState<CustomSource[]>(getCustomSources);

  const add = useCallback((s: Omit<CustomSource, "id">) => {
    const entry = addCustomSource(s);
    setCustomSourcesState((prev) => [...prev, entry]);
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    removeCustomSource(id);
    setCustomSourcesState((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { customSources, add, remove };
}
