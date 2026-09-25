import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@radix-ui/themes/styles.css";
import "./index.css";
import App from "./App.tsx";

function initTheme() {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const dark = stored ? stored === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", dark);
}

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
