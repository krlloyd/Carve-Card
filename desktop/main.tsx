import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CarveApp } from "@/components/carve-app";
import "../src/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CarveApp />
  </StrictMode>,
);
