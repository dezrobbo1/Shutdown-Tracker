import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RoundTripTestAppV2 } from "./RoundTripTestAppV2";
import "./styles.css";
import "./roundTripTestV2.css";

const roundTripMode = import.meta.env.VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE === "true";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    {roundTripMode ? <RoundTripTestAppV2 /> : <App />}
  </StrictMode>
);
