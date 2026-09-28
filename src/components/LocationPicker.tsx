import { useState } from "react";
import { cn } from "cn";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import {
  ANY_LOCATION,
  REGION_GROUPS,
  WORK_MODES,
  clearCountries,
  countriesIn,
  hasMode,
  isCountryTicked,
  isRegionTicked,
  toggleLocation,
  type LocationOption,
  type RegionGroup,
} from "@/lib/locations";

interface LocationPickerProps {
  value: string;
  onSelect: (next: string) => void;
}

function optionRow(
  opt: LocationOption,
  ticked: boolean,
  onClick: () => void,
  depth = 0,
) {
  return (
    <button
      key={opt.id}
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-accent",
        depth > 0 && "pl-7",
      )}
    >
      <span className="truncate">{opt.label}</span>
      {ticked && <IconCheck className="ml-auto size-4 shrink-0" />}
    </button>
  );
}

function regionBlock(
  region: RegionGroup,
  value: string,
  expanded: boolean,
  onToggleSelect: (id: string) => void,
  onToggleExpand: (id: string) => void,
) {
  return (
    <div key={region.id}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleSelect(region.id)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
        >
          <span className="truncate">{region.label}</span>
          {isRegionTicked(value, region) && (
            <IconCheck className="ml-auto size-4 shrink-0" />
          )}
        </button>
        <button
          type="button"
          aria-label={expanded ? `Collapse ${region.label}` : `Expand ${region.label}`}
          onClick={() => onToggleExpand(region.id)}
          className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <IconChevronDown
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
      {expanded &&
        region.countries.map((country) =>
          optionRow(
            country,
            isCountryTicked(value, region.id, country.id),
            () => onToggleSelect(country.id),
            1,
          ),
        )}
    </div>
  );
}

export function LocationPicker({ value, onSelect }: LocationPickerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const select = (id: string) => onSelect(toggleLocation(value, id));
  const noCountrySelected = countriesIn(value).length === 0;

  return (
    <>
      <div className="flex flex-col">
        {WORK_MODES.map((mode) =>
          optionRow(mode, hasMode(value, mode.id), () => select(mode.id)),
        )}
      </div>
      <div className="h-px bg-border/50" />
      <div className="flex flex-col">
        {optionRow(ANY_LOCATION, noCountrySelected, () =>
          onSelect(clearCountries(value)),
        )}
        <div className="px-2 pt-0.5 text-xs text-muted-foreground">Regions</div>
        {REGION_GROUPS.map((region) =>
          regionBlock(region, value, expanded.has(region.id), select, toggleExpand),
        )}
      </div>
    </>
  );
}
