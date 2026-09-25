import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Plus } from "lucide-react";

interface AddSourceFormProps {
  onAdd: (source: { name: string; sites: string[]; suffix?: string }) => void;
}

export function AddSourceForm({ onAdd }: AddSourceFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sites, setSites] = useState("");
  const [suffix, setSuffix] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const siteList = sites
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!name.trim() || siteList.length === 0) return;
    onAdd({
      name: name.trim(),
      sites: siteList,
      suffix: suffix.trim() || undefined,
    });
    setName("");
    setSites("");
    setSuffix("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Add board
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Add a custom board</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Creates a Google site: search for each domain you list.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cs-name">Board name</Label>
            <Input
              id="cs-name"
              placeholder="e.g. Startup Jobs"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cs-sites">Domains</Label>
            <Input
              id="cs-sites"
              placeholder="jobs.example.com, careers.acme.io/job/"
              value={sites}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSites(e.target.value)}
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Comma-separated. Path patterns allowed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cs-suffix">Extra search term (optional)</Label>
            <Input
              id="cs-suffix"
              placeholder='e.g. -intern "full time"'
              value={suffix}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSuffix(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={!name.trim() || !sites.trim()}>
              Add
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
