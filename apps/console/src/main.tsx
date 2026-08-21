import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RoundTripTestApp } from "./RoundTripTestApp";
import "./styles.css";

const roundTripMode = import.meta.env.VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE === "true";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    {roundTripMode ? <RoundTripTestApp /> : <App />}
  </StrictMode>
);
