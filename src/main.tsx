import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { inject } from "@vercel/analytics";
import App from "./App.tsx";

if (import.meta.env.PROD) inject();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
