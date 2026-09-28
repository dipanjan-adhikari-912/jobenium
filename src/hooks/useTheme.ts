import { useState, useCallback } from "react";
import { getTheme, setTheme, type Theme } from "@/lib/storage";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      setTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
