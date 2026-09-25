import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Source, type SourceGroup as SourceGroupType } from "@/data/sources";
import { type LinkBehavior } from "@/lib/storage";
import { SourceRow } from "./SourceRow";

interface SourceGroupProps {
  group: SourceGroupType;
  sources: Source[];
  getUrl: (source: Source) => string;
  isVisited: (sourceId: string) => boolean;
  disabledSources: string[];
  collapsedGroups: string[];
  linkBehavior: LinkBehavior;
  onVisit: (sourceId: string) => void;
  onToggleSource: (sourceId: string) => void;
  onToggleGroup: (groupId: string) => void;
  onDeleteSource?: (sourceId: string) => void;
}

export function SourceGroup({
  group,
  sources,
  getUrl,
  isVisited,
  disabledSources,
  collapsedGroups,
  linkBehavior,
  onVisit,
  onToggleSource,
  onToggleGroup,
  onDeleteSource,
}: SourceGroupProps) {
  const isCollapsed = collapsedGroups.includes(group);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--card-foreground)] hover:bg-[var(--accent)] transition-colors"
        onClick={() => onToggleGroup(group)}
        aria-expanded={!isCollapsed}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform",
            isCollapsed && "-rotate-90",
          )}
        />
        <span className="flex-1">{group}</span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {sources.filter((s) => !disabledSources.includes(s.id)).length}/{sources.length}
        </span>
      </button>

      {!isCollapsed && (
        <div>
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              url={getUrl(source)}
              visited={isVisited(source.id)}
              disabled={disabledSources.includes(source.id)}
              linkBehavior={linkBehavior}
              onVisit={onVisit}
              onToggle={onToggleSource}
              onDelete={onDeleteSource}
            />
          ))}
        </div>
      )}
    </div>
  );
}
