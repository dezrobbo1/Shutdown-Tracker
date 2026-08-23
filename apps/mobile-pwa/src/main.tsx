import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App trialMode={import.meta.env.VITE_SHUTDOWN_TRACKER_TRIAL_MODE === "true"} />
  </StrictMode>
);
