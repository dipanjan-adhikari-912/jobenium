import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTheme, setTheme } from "@/lib/storage";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const stored = getTheme();
    return stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    setTheme(dark ? "dark" : "light");
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(!dark)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
