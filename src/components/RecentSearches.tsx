import { Button } from "@/components/ui/button";
import { type RecentSearch } from "@/lib/storage";
import { getTimeFilter } from "@/lib/timeFilters";
import { Clock, ArrowRight } from "lucide-react";

interface RecentSearchesProps {
  recents: RecentSearch[];
  onSelect: (recent: RecentSearch) => void;
}

export function RecentSearches({ recents, onSelect }: RecentSearchesProps) {
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
            className="h-8 text-xs"
            onClick={() => onSelect(r)}
          >
            {r.title}
            <span className="text-[var(--muted-foreground)]">
              &middot; {getTimeFilter(r.timeFilter).label}
            </span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
}
