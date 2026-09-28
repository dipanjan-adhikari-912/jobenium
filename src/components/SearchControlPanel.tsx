import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  IconChevronDown,
  IconClock,
  IconMapPin,
  IconSearch,
} from "@tabler/icons-react";
import wordmark from "../../assets/wordmark_onwhite.svg";
import logo32 from "../../assets/32.svg";
import { BackdropImage } from "@/components/BackdropImage";
import { PanelLeftClose, PanelLeftOpen, Flame } from "lucide-react";
import { getTimeFilter, TIME_FILTERS } from "@/lib/timeFilters";
import { getLocationLabel } from "@/lib/locations";
import { LocationPicker } from "@/components/LocationPicker";
import { type BackdropState } from "@/hooks/useBackdrop";

interface SearchControlPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  title: string;
  keywords: string;
  excludes: string;
  timeFilter: string;
  location: string;
  onChange: (patch: {
    title?: string;
    keywords?: string;
    excludes?: string;
    timeFilter?: string;
    location?: string;
  }) => void;
  onSubmit: () => void;
  onHome: () => void;
  backdrop: BackdropState;
}

const glassField =
  "rounded-[14px] border border-white/15 bg-white/10 px-3 text-sm text-white backdrop-blur-[8px] transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const glassInput =
  "h-auto w-full min-w-0 rounded-[14px] border-0 bg-transparent p-0 text-sm leading-5 text-white placeholder:text-white/40 focus-visible:border-0 focus-visible:ring-0";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/55">
      {children}
    </span>
  );
}

export function SearchControlPanel({
  collapsed,
  onToggleCollapsed,
  title,
  keywords,
  excludes,
  timeFilter,
  location,
  onChange,
  onSubmit,
  onHome,
  backdrop,
}: SearchControlPanelProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title.trim()) onSubmit();
  };

  if (collapsed) {
    return (
      <aside className="relative isolate w-full shrink-0 overflow-hidden rounded-3xl lg:sticky lg:top-2 lg:h-[calc(100svh-1rem)] lg:w-12">
        <BackdropImage image={backdrop.image} outgoing={backdrop.outgoing} />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/40 to-black/60"
        />
        <div className="flex h-full flex-row items-center justify-between gap-2 px-4 py-3 lg:flex-col lg:items-center lg:justify-start lg:px-0 lg:py-4">
          <button
            type="button"
            onClick={onHome}
            aria-label="Back to home"
            title="Back to home"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <img src={logo32} alt="Jobenium" className="size-8 rounded-[6px]" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expand search panel"
            title="Expand search panel"
            className="flex size-8 items-center justify-center rounded-lg text-white/70 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative isolate w-full shrink-0 overflow-hidden rounded-3xl lg:sticky lg:top-2 lg:h-[calc(100svh-1rem)] lg:w-[400px]">
      <BackdropImage image={backdrop.image} outgoing={backdrop.outgoing} />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/40 to-black/60"
      />

      <div className="flex h-full flex-col gap-7 overflow-y-auto p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onHome}
            aria-label="Back to home"
            className="rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <img
              src={wordmark}
              alt="Jobenium"
              className="h-9 w-auto rounded-[12px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            />
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Collapse search panel"
            title="Collapse search panel"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-[22.4px] border-[0.571429px] border-[#EEE5E7]/30 bg-[#FFFFFF2B] p-4 shadow-[0_2px_20px_#0000000F] backdrop-blur-[16px] backdrop-saturate-[1.6]"
        >
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Searching for</FieldLabel>
            <span className={cn(glassField, "flex items-center py-2.5")}>
              <Input
                className={glassInput}
                name="title"
                placeholder="e.g. Product designer"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ title: e.target.value })
                }
                required
              />
            </span>
          </label>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Posted</FieldLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(glassField, "flex w-full items-center gap-2 py-2.5")}>
                  <IconClock className="size-4 shrink-0 text-white/70" />
                  <span className="flex-1 truncate text-left">{getTimeFilter(timeFilter).label}</span>
                  <IconChevronDown className="size-4 shrink-0 text-white/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuRadioGroup
                  value={timeFilter}
                  onValueChange={(v) => onChange({ timeFilter: v })}
                >
                  {TIME_FILTERS.map((tf) => (
                    <DropdownMenuRadioItem key={tf.id} value={tf.id}>
                      <span className="flex items-center gap-2">
                        {tf.hot && (
                          <Flame className="size-3.5 shrink-0 text-orange-500" />
                        )}
                        {tf.label}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Location</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className={cn(glassField, "flex w-full items-center gap-2 py-2.5")}>
                  <IconMapPin className="size-4 shrink-0 text-white/70" />
                  <span className="flex-1 truncate text-left">{getLocationLabel(location)}</span>
                  <IconChevronDown className="size-4 shrink-0 text-white/50" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 flex-col gap-1 p-2">
                <LocationPicker
                  value={location}
                  onSelect={(next) => onChange({ location: next })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>Extra keywords</FieldLabel>
            <span className={cn(glassField, "flex items-center py-2.5")}>
              <Input
                className={glassInput}
                name="keywords"
                placeholder="e.g. remote, senior"
                value={keywords}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ keywords: e.target.value })
                }
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>Exclude keywords</FieldLabel>
            <span className={cn(glassField, "flex items-center py-2.5")}>
              <Input
                className={glassInput}
                name="excludes"
                placeholder="e.g. intern, junior"
                value={excludes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ excludes: e.target.value })
                }
              />
            </span>
          </label>

          <Button
            type="submit"
            className="mt-1 h-11 w-full gap-2 rounded-[14px] border-0 bg-[#161B1D] text-sm text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[#161B1D]/90"
          >
            <IconSearch className="size-4" />
            Search
          </Button>
        </form>

        {keywords.trim() && (
          <p className="mt-auto text-[11px] leading-relaxed text-white/45">
            {`Extra keywords: ${keywords.trim()}`}
          </p>
        )}
      </div>
    </aside>
  );
}
