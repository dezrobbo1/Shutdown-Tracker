import { createShutdownTrackerApiClient } from "@shutdown-tracker/api-client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { buildConsoleReviewConfig, loadConsoleReviewData } from "./apiReviewClient";
import { consoleNavItems, taskDashboardSections } from "./consoleData";
import { ProjectSettingsView } from "./ConsoleViews";
import { ImportExportView } from "./ImportExportView";

describe("approved Master Console information architecture", () => {
  it("starts with a clearly synthetic Login view", () => {
    const html = renderToString(<App />);
    expect(html).toContain("Shutdown Tracker");
    expect(html).toContain("Continue to Projects Home");
    expect(html).toContain("OIDC and production session handling are not yet implemented");
    expect(html).not.toContain("type=\"password\"");
  });

  it("represents Projects Home, creation, switching, search, and all lifecycle groups", () => {
    const html = renderToString(<App initialView="projects" />);
    expect(html).toContain("Projects Home");
    expect(html).toContain("Create Project");
    expect(html).toContain("Search name, code, or site");
    for (const status of ["Active", "Draft", "Closed", "Archived"]) expect(html).toContain(status);
    expect(html).toContain("Open project");
    expect(html).toContain("Static visual only");
  });

  it("uses exactly the five approved project-level destinations", () => {
    const html = renderToString(<App initialView="console" />);
    expect(consoleNavItems.map((item) => item.label)).toEqual(["Today", "Tasks", "Critical", "Import / Export", "Project Settings"]);
    const nav = html.match(/<nav class="nav-list">([\s\S]*?)<\/nav>/)?.[1] ?? "";
    for (const label of consoleNavItems.map((item) => item.label)) expect(nav).toContain(label);
    for (const removed of ["Problems", "Evidence", "Exports", "Handover", "Discussion", "Review", "Reports"]) expect(nav).not.toContain(`>${removed}<`);
  });

  it("renders Today as a 24-hour project projection with separate state and attention", () => {
    const html = renderToString(<App initialView="console" initialSection="Today" />);
    expect(html).toContain("24 August 2026 · 06:00 to 25 August 2026 · 06:00");
    for (const state of ["Not Started", "In Progress", "Paused", "Completed"]) expect(html).toContain(state);
    expect(html).toContain("Blocked / delayed");
    expect(html).toContain("Late to Start");
    expect(html).toContain("No Tracker start; imported progress 0%");
    expect(html).toContain("A passed planned start never creates In Progress");
    expect(html).toContain("Critical reports due / overdue");
    expect(html).toContain("Active delays / problems");
  });

  it("renders the Project-like Tasks explorer without schedule editing", () => {
    const html = renderToString(<App initialView="console" initialSection="Tasks" />);
    for (const tool of ["Filter", "Group", "Columns", "Saved views"]) expect(html).toContain(tool);
    expect(html).toContain("WBS / task");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Tier 2 tracking owner");
    expect(html).toContain("Schedule editing and date recalculation are not available");
    expect(html).not.toMatch(/\bGantt\b|\bCPM\b|critical path calculation/i);
  });

  it("keeps all operational records inside the Task Dashboard", () => {
    const html = renderToString(<App initialView="console" initialSection="Tasks" initialTaskId="1.1.2" />);
    const todayHtml = renderToString(<App initialView="console" initialSection="Today" initialTaskId="1.1.2" />);
    expect(html).toContain("Inspect refractory lining");
    expect(html).toMatch(/Back to.*Tasks/);
    expect(todayHtml).toMatch(/Back to.*Today/);
    for (const section of taskDashboardSections) expect(html).toContain(section);
    expect(html).toContain("One operational record for this task");
    const normalizedHtml = html.replaceAll("&#x27;", "'");
    for (const action of ["Can't Start", "Start", "Pause", "Resume", "Finish"]) expect(normalizedHtml).toContain(`>${action}<`);
    expect(html).toContain("action times recorded automatically");
    expect(html).toContain("Not yet implemented");
  });

  it("renders configurable versioned Critical policy without calculation or form-building claims", () => {
    const html = renderToString(<App initialView="console" initialSection="Critical" />);
    expect(html).toContain("Project-critical leaf");
    expect(html).toContain("Critical Work Pack");
    expect(html).toContain("Summary task 1.1 plus all descendants");
    expect(html).toContain("Tier 2 reporting owner");
    expect(html).toContain("Critical Reporting Policy");
    expect(html).toContain("Policy v3");
    expect(html).toContain("Two-hour critical-task reporting");
    expect(html).toContain("Fixed interval");
    expect(html).toContain("Fixed times");
    expect(html).toContain("Shift-based");
    expect(html).toContain("Ad hoc / requested");
    expect(html).toContain("Event / exception triggered");
    for (const field of ["Completion / progress", "Operational condition", "Current position / focus", "Main delay / constraint", "Action / recovery", "Next target", "Forecast completion", "Resources / labour where configured", "Evidence / photo requirement", "Comment / update text"]) expect(html).toContain(field);
    expect(html).toContain("Create new policy version");
    expect(html).toContain("Save item override");
    expect(html).toContain("Policy changes create a new effective version");
    expect(html).toContain("Critical reporting is not mandatory for every task");
    expect(html).toContain("Overdue");
    expect(html).toContain("does not calculate critical path");
    expect(html).not.toMatch(/add custom field|build report form|form builder/i);
  });

  it("renders the complete static Project Settings shell and lifecycle boundary", () => {
    const html = renderToString(<App initialView="console" initialSection="Project Settings" />);
    const users = renderToString(<ProjectSettingsView initialSection="Users" />);
    const mapping = renderToString(<ProjectSettingsView initialSection="Operational Mapping" />);
    const lifecycle = renderToString(<ProjectSettingsView initialSection="Lifecycle" />);
    for (const section of ["General", "Users", "Operational Mapping", "Project History", "Lifecycle"]) expect(html).toContain(section);
    expect(html).toContain("Australia/Perth");
    expect(users).toContain("Exactly three application tiers");
    expect(mapping).toContain("never an authorization scope");
    expect(lifecycle).toContain("Draft");
    expect(lifecycle).toContain("Archived");
    expect(lifecycle).not.toContain(">Clear Project</button>");
  });

  it("keeps Import review useful while leaving Export explicitly unfinalised", () => {
    const shell = renderToString(<App initialView="console" initialSection="Import / Export" />);
    const importView = renderToString(<ImportExportView shellProjectLabel="Synthetic trial" reviewData={null} loadState={{ status: "synthetic", message: "Static import review." }} onRefresh={() => undefined} initialSection="Import" />);
    const exportView = renderToString(<ImportExportView shellProjectLabel="Synthetic trial" reviewData={null} loadState={{ status: "synthetic", message: "Static import review." }} onRefresh={() => undefined} initialSection="Export" />);

    for (const section of ["Current Schedule", "Import", "Export", "History"]) expect(shell).toContain(section);
    expect(shell).toContain("final export and round-trip contract is intentionally deferred");
    expect(importView).toContain("Browser Project XML inspection");
    expect(importView).toContain('type="file"');
    expect(importView).toContain("the selected file stays in this browser and is not uploaded");
    expect(importView).toContain("Persist imported schedule");
    expect(importView).toContain("Activate trial schedule");
    expect(exportView).toContain("Export design not finalised");
    expect(exportView).toContain("Earlier candidate and approval experiments remain technical research");
    expect(exportView).toContain("Export unavailable");
    for (const removedControl of ["Approve exact inputs", "Generate candidate", "Open round-trip review workspace", "Record verification"]) {
      expect(`${shell}\n${importView}\n${exportView}`).not.toContain(`>${removedControl}<`);
    }
  });
});

describe("ordinary Console review data fetching", () => {
  it("stays synthetic until a project ID is configured", async () => {
    const config = buildConsoleReviewConfig({ VITE_SHUTDOWN_TRACKER_API_BASE_URL: " http://localhost:8080 ", VITE_SHUTDOWN_TRACKER_PROJECT_ID: " " });
    const data = await loadConsoleReviewData(config);
    expect(config.liveEnabled).toBe(false);
    expect(data.mode).toBe("synthetic");
    expect(data.snapshots).toEqual([]);
  });

  it("uses GET only for configured import snapshot reads", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const client = createShutdownTrackerApiClient({
      fetchImpl: async (input, init) => {
        calls.push({ url: input, method: init?.method ?? "GET" });
        if (input.endsWith("/import-review/snapshots")) return jsonResponse([snapshotSummary]);
        if (input.endsWith("/import-review/snapshots/snapshot-a")) return jsonResponse({ snapshot: snapshotSummary, tasks: [taskRow], resources: [], assignments: [], extendedAttributes: [] });
        return jsonResponse({ snapshot: snapshotSummary, tasks: [taskRow], resources: [], assignments: [], extendedAttributes: [] });
      }
    });
    const config = buildConsoleReviewConfig({
      VITE_SHUTDOWN_TRACKER_API_BASE_URL: "http://localhost:8080",
      VITE_SHUTDOWN_TRACKER_PROJECT_ID: "project-a",
      VITE_SHUTDOWN_TRACKER_IMPORT_SNAPSHOT_ID: "snapshot-a"
    });
    const data = await loadConsoleReviewData(config, client);
    expect(data.mode).toBe("live");
    expect(data.snapshotDetail?.tasks).toHaveLength(1);
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.method === "GET")).toBe(true);
  });
});

const snapshotSummary = {
  id: "snapshot-a", projectId: "project-a", importBatchId: "batch-a", status: "PARSED", externalProjectUid: null,
  externalProjectName: "Synthetic Basic WBS", projectStatusDate: null, snapshotVersion: 1, parserName: "mpxj", parserVersion: "13",
  warningCount: 0, errorCount: 0, taskCount: 1, summaryTaskCount: 0, leafTaskCount: 1, resourceCount: 0, assignmentCount: 0, extendedAttributeCount: 0
};
const taskRow = {
  id: "task-a", externalUid: "1", externalId: "1", name: "Synthetic Task A1", wbs: "1.1", outlineNumber: "1.1", outlineLevel: 2,
  summary: false, parentExternalUid: null, parentImportedTaskId: null, plannedStart: null, plannedFinish: null, actualStart: null,
  actualFinish: null, percentComplete: 0, physicalPercentComplete: null, notes: null
};
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}
