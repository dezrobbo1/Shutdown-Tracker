import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const roundTripMode = import.meta.env.VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE === "true";
const root = createRoot(document.getElementById("root") as HTMLElement);

if (roundTripMode) {
  void import("./RoundTripWorkspace")
    .then((module) => {
      const RoundTripWorkspace = module.RoundTripWorkspace;
      root.render(
        <StrictMode>
          <RoundTripWorkspace />
        </StrictMode>
      );
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      root.render(
        <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          <h1>Round-trip workspace could not load</h1>
          <p>{message}</p>
        </main>
      );
    });
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
