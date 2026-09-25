import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { TIME_FILTERS } from "@/lib/timeFilters";
import { Search } from "lucide-react";

interface SearchFormProps {
  title: string;
  keywords: string;
  excludes: string;
  timeFilter: string;
  onChange: (patch: { title?: string; keywords?: string; excludes?: string; timeFilter?: string }) => void;
  onSubmit: () => void;
}

export function SearchForm({
  title,
  keywords,
  excludes,
  timeFilter,
  onChange,
  onSubmit,
}: SearchFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title.trim()) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Job title</Label>
        <Input
          id="title"
          placeholder="e.g. Product Designer"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ title: e.target.value })}
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="keywords">Extra keywords</Label>
          <Input
            id="keywords"
            placeholder="e.g. remote, senior"
            value={keywords}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ keywords: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excludes">Exclude words</Label>
          <Input
            id="excludes"
            placeholder="e.g. intern, junior"
            value={excludes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ excludes: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Time filter</Label>
        <Select value={timeFilter} onValueChange={(v) => onChange({ timeFilter: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            {TIME_FILTERS.map((f: { id: string; label: string }) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" variant="default" className="w-full">
        <Search className="h-4 w-4" />
        Start search
      </Button>
    </form>
  );
}
