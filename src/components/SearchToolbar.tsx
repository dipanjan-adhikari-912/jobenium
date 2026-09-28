import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  IconAdjustmentsHorizontal,
  IconClock,
  IconMapPin,
  IconSearch,
} from "@tabler/icons-react";
import { Flame } from "lucide-react";
import { getTimeFilter, TIME_FILTERS } from "@/lib/timeFilters";
import TextType from "@/components/TextType";
import { getLocationLabel } from "@/lib/locations";
import { LocationPicker } from "@/components/LocationPicker";

const JOB_ROLES = [
  "Software Engineer",
  "Data Analyst",
  "Data Scientist",
  "DevOps Engineer",
  "QA Engineer",
  "Product Manager",
  "Project Manager",
  "IT Support Specialist",
  "UX Designer",
  "HR Manager",
  "Technical Recruiter",
  "Sales Executive",
  "Account Manager",
  "Manufacturing Technician",
  "Mechanical Engineer",
  "Electrical Engineer",
];

interface SearchToolbarProps {
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
}

export function SearchToolbar({
  title,
  keywords,
  excludes,
  timeFilter,
  location,
  onChange,
  onSubmit,
}: SearchToolbarProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title.trim()) onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-[22.4px] border-[0.571429px] border-[#EEE5E7]/30 bg-[#FFFFFF2B] p-3 shadow-[0_2px_20px_#0000000F] backdrop-blur-[16px] backdrop-saturate-[1.6]"
    >
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            className={cn(
              "min-w-0 w-full rounded-[30.8px] border-0 bg-transparent text-sm leading-[18px] text-[color:var(--input)]",
              title === "" && "caret-transparent",
            )}
            name="title"
            aria-label="Job title or keywords"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ title: e.target.value })}
            required
            autoFocus
          />
          {title === "" && (
            <div className="pointer-events-none absolute inset-y-0 left-3 right-3 flex items-center overflow-hidden">
              <TextType
                as="span"
                text={JOB_ROLES}
                typingSpeed={65}
                deletingSpeed={35}
                pauseDuration={1800}
                initialDelay={500}
                cursorCharacter="|"
                className="text-sm leading-[18px] text-[#BDBDBD]"
                style={{ whiteSpace: "nowrap" }}
              />
            </div>
          )}
        </div>
        <Button
          type="submit"
          className="h-9 w-9 shrink-0 rounded-[14px] border-0 bg-[#161B1D] p-0 text-white hover:bg-[#161B1D]/90"
          aria-label="Start search"
        >
          <IconSearch className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" type="button" className="rounded-[14px] border-[0.571429px] border-gray-400/30 bg-transparent px-[10px] gap-[6px] text-gray-100 hover:bg-white/10 aria-expanded:bg-white/10 aria-expanded:text-gray-100">
              <IconClock className="size-4" />
              {getTimeFilter(timeFilter).label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" type="button" className="rounded-[14px] border-[0.571429px] border-gray-400/30 bg-transparent px-[10px] gap-[6px] text-gray-100 hover:bg-white/10 aria-expanded:bg-white/10 aria-expanded:text-gray-100">
              <IconMapPin className="size-4" />
              {getLocationLabel(location)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 flex-col gap-1 p-2">
            <LocationPicker
              value={location}
              onSelect={(next) => onChange({ location: next })}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" type="button" className="rounded-[14px] border-[0.571429px] border-gray-400/30 bg-transparent px-[10px] gap-[6px] text-gray-100 hover:bg-white/10 aria-expanded:bg-white/10 aria-expanded:text-gray-100">
              <IconAdjustmentsHorizontal className="size-4" />
              More filters
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="space-y-2">
              <Label htmlFor="toolbar-keywords">Extra keywords</Label>
              <Input
                id="toolbar-keywords"
                placeholder="e.g. remote, senior"
                value={keywords}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ keywords: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toolbar-excludes">Exclude words</Label>
              <Input
                id="toolbar-excludes"
                placeholder="e.g. intern, junior"
                value={excludes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ excludes: e.target.value })
                }
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </form>
  );
}
