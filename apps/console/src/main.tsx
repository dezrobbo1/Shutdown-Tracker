import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const roundTripMode = import.meta.env.VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE === "true";
const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <StrictMode>
    <App roundTripMode={roundTripMode} />
  </StrictMode>
);
