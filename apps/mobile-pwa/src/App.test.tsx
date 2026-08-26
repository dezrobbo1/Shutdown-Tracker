import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("mobile PWA assigned-task shell", () => {
  it("keeps Assigned Tasks as the only top-level operational destination", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Assigned Tasks");
    expect(html).not.toContain("<nav");
    expect(html).not.toContain('aria-label="Mobile navigation"');
    for (const unsupportedDestination of [
      "Today",
      "Problems",
      "Evidence",
      "Sync",
      "Critical",
      "Import / Export",
      "Project Settings"
    ]) {
      expect(html).not.toContain(`>${unsupportedDestination}<`);
    }
  });

  it("shows an honest empty state without fictional operational data", () => {
    const html = renderToString(<App />);

    expect(html).toContain("No assigned tasks available");
    expect(html).toContain("Mobile operational data is not connected.");
    expect(html).toContain("Identity, assignment, and task APIs are not connected.");
    expect(html).toContain("This app does not load or store operational task data.");

    for (const removedContent of [
      "Visual review persona",
      "Tier 2 example",
      "Tier 3 example",
      "Open task",
      "Task Detail",
      "Sync status",
      "Recovery states",
      "C2 Cyclone",
      "D2 Stack",
      "HV inlet",
      "Permit isolation",
      "Tier 2 user A",
      "Tier 3 user B"
    ]) {
      expect(html).not.toContain(removedContent);
    }

    expect(html).not.toMatch(/<(?:button|select|option)\b/i);
  });

  it("does not surface execution, planner, export, or schedule-authoring UI", () => {
    const html = renderToString(<App />);
    const forbidden = [
      /can't start/i,
      />start</i,
      />pause</i,
      />resume</i,
      />finish</i,
      /import \/ export/i,
      /export preview/i,
      /critical path/i,
      /\bfloat\b/i,
      /\bCPM\b/i,
      /\bGantt\b/i,
      /resource levell?ing/i,
      /recovery scheduling/i,
      /automatic date movement/i,
      /schedule optimization/i
    ];

    for (const pattern of forbidden) {
      expect(html).not.toMatch(pattern);
    }
  });
});
