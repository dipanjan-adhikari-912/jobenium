import { ExternalLink, Check, X } from "lucide-react";
import { type Source } from "@/data/sources";
import { type LinkBehavior } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface SourceRowProps {
  source: Source;
  url: string;
  visited: boolean;
  disabled: boolean;
  linkBehavior: LinkBehavior;
  onVisit: (sourceId: string) => void;
  onToggle: (sourceId: string) => void;
  onDelete?: (sourceId: string) => void;
}

export function SourceRow({
  source,
  url,
  visited,
  disabled,
  linkBehavior,
  onVisit,
  onToggle,
  onDelete,
}: SourceRowProps) {
  const handleClick = () => {
    onVisit(source.id);
  };

  const linkProps =
    linkBehavior === "reuse-tab"
      ? { target: "_jobenium_tab" as const }
      : linkBehavior === "same-tab"
        ? {}
        : { target: "_blank" as const, rel: "noopener noreferrer" as const };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 transition-colors last:border-b-0",
        visited && "opacity-50",
        disabled && "opacity-30 line-through",
      )}
    >
      <Checkbox
        checked={!disabled}
        onCheckedChange={() => onToggle(source.id)}
        aria-label={`Enable ${source.name}`}
      />
      <a
        href={url}
        onClick={handleClick}
        {...linkProps}
        className="flex flex-1 items-center gap-2 text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {source.name}
        <ExternalLink className="h-3 w-3 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
      {visited && <Check className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />}
      {source.custom && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(source.id)}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--accent)] hover:text-[var(--foreground)] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label={`Delete ${source.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
