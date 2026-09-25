import { Button } from "@/components/ui/button";
import { getTimeFilter } from "@/lib/timeFilters";
import { Pencil } from "lucide-react";

interface SearchSummaryProps {
  title: string;
  timeFilterId: string;
  onEdit: () => void;
}

export function SearchSummary({ title, timeFilterId, onEdit }: SearchSummaryProps) {
  const tf = getTimeFilter(timeFilterId);

  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
      <div>
        <p className="text-sm text-[var(--muted-foreground)]">Searching for</p>
        <p className="text-lg font-semibold text-[var(--card-foreground)]">
          {title}
          <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
            &middot; {tf.label}
          </span>
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
    </div>
  );
}
