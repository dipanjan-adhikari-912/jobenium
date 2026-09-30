import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { type LinkBehavior } from "@/lib/storage";
import {
  SEARCH_ENGINES,
  type SearchEngineId,
} from "@/data/searchEngines";

function EngineLogo({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-[#f2efe9] font-heading text-[10px] font-semibold text-[#3f3b34] dark:bg-[#1e2226] dark:text-[#c9c5bd]">
        {domain[0].toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-5 shrink-0 rounded-[4px] bg-white object-contain dark:bg-[#1e2226]"
    />
  );
}

interface SettingsPopoverProps {
  linkBehavior: LinkBehavior;
  onLinkBehaviorChange: (v: LinkBehavior) => void;
  searchEngine: SearchEngineId;
  onSearchEngineChange: (v: SearchEngineId) => void;
}

export function SettingsPopover({
  linkBehavior,
  onLinkBehaviorChange,
  searchEngine,
  onSearchEngineChange,
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Settings</h3>
          <div className="space-y-2">
            <Label>Link behavior</Label>
            <div className="space-y-2">
              {([
                ["new-tab", "Open in new tab (default)"],
                ["reuse-tab", "Reuse one tab"],
                ["same-tab", "Open in same tab"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="linkBehavior"
                    value={value}
                    checked={linkBehavior === value}
                    onChange={() => onLinkBehaviorChange(value)}
                    className="accent-[var(--primary)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="h-px bg-border/60" />
          <div className="space-y-2">
            <Label>Search engine</Label>
            <div className="space-y-2">
              {SEARCH_ENGINES.map((engine) => (
                <label
                  key={engine.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="searchEngine"
                    value={engine.id}
                    checked={searchEngine === engine.id}
                    onChange={() => onSearchEngineChange(engine.id)}
                    className="accent-[var(--primary)]"
                  />
                  <EngineLogo domain={engine.domain} />
                  <span>{engine.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
