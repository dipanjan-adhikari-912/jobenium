import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { type LinkBehavior } from "@/lib/storage";

interface SettingsPopoverProps {
  linkBehavior: LinkBehavior;
  onLinkBehaviorChange: (v: LinkBehavior) => void;
}

export function SettingsPopover({
  linkBehavior,
  onLinkBehaviorChange,
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
