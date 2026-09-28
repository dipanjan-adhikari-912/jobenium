import { Button } from "@/components/ui/button";
import { type RecentSearch } from "@/lib/storage";
import { getTimeFilter } from "@/lib/timeFilters";
import { Clock, Search } from "lucide-react";

interface RecentSearchesProps {
  recents: RecentSearch[];
  onSelect: (recent: RecentSearch) => void;
  onClear: () => void;
}

export function RecentSearches({ recents, onSelect, onClear }: RecentSearchesProps) {
  if (recents.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Recent searches
      </p>
      <div className="flex flex-wrap gap-2">
        {recents.map((r, i) => (
          <Button
            key={`${r.title}-${i}`}
            variant="outline"
            size="sm"
            className="recent-pill h-8 px-[10.57px] text-xs font-medium"
            onClick={() => onSelect(r)}
          >
            {r.title}
            <span>&middot; {getTimeFilter(r.timeFilter).label}</span>
            <Search className="size-4 text-white" />
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="recent-pill h-8 px-[10.57px] text-xs font-medium"
          onClick={onClear}
        >
          Clear all
        </Button>
      </div>
    </div>
  );
}
