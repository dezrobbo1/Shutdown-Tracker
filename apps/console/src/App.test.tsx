import { createShutdownTrackerApiClient } from "@shutdown-tracker/api-client";
import { applyTrialAction, createInitialTrialState } from "@shutdown-tracker/trial-model";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { buildConsoleReviewConfig, loadConsoleReviewData } from "./apiReviewClient";
import { consoleNavItems, taskDashboardSections } from "./consoleData";
import { ProjectSettingsView } from "./ConsoleViews";
import { ImportExportView } from "./ImportExportView";
import { TrialTaskDashboard } from "./TrialConsoleViews";
import { buildTrialConsoleConfig } from "./trialMode";

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
    const statusStrip = html.match(/<section class="status-strip"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(statusStrip).not.toContain("status-label");
    expect(html).toContain('status-label status-neutral">Not Started');
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
    expect(html).toContain('aria-current="page"');
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

describe("deterministic Console operational trial", () => {
  it("enables only from an explicit true flag", () => {
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TRIAL_MODE: "true" }).enabled).toBe(true);
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TRIAL_MODE: " true " }).enabled).toBe(false);
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TRIAL_MODE: " TRUE " }).enabled).toBe(false);
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TRIAL_MODE: "false" }).enabled).toBe(false);
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TRIAL_MODE: "1" }).enabled).toBe(false);
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL: "true" }).tier1RoundTripEnabled).toBe(true);
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL: " true " }).tier1RoundTripEnabled).toBe(false);
    expect(buildTrialConsoleConfig({ VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL: "false" }).tier1RoundTripEnabled).toBe(false);
  });

  it("labels deterministic local state and exposes all simulation clock controls", () => {
    const html = renderToString(<App initialView="console" trialMode />);
    expect(html).toContain("Synthetic operational trial");
    expect(html).toContain("Deterministic local state");
    expect(html).toContain("No production persistence");
    expect(html).toContain("Simulated shutdown time");
    for (const control of ["+15 minutes", "+1 hour", "Next event", "Next report due", "Next shift boundary", "Reset trial", "Open Mobile trial"]) expect(html).toContain(control);
    expect(html).toContain("24 Aug 2026 · 06:00");
  });

  it("derives Today from the shared trial scenario and includes the guided free-interaction checklist", () => {
    const html = renderToString(<App initialView="console" initialSection="Today" trialMode />).replaceAll("&#x27;", "'");
    expect(html).toContain("deterministic 24-hour projection");
    expect(html).toContain("D2 Stack — scaffold access release");
    expect(html).toContain("Permit isolation — await operations release");
    expect(html).toContain("Delayed / blocked before start");
    expect(html).toContain("Guided operational scenario");
    expect(html).toContain("Optional review path. Controls remain available for free interaction.");
    expect(html).toContain("Can't Start");
    expect(html).toContain("end-of-shift progress");
    expect(html).toContain("Planned-time passage can create Late to Start, but never In Progress");
  });

  it("renders the hierarchy and task-centred dashboard with local Tier 2 assignment", () => {
    const tasks = renderToString(<App initialView="console" initialSection="Tasks" trialMode />);
    const dashboard = renderToString(<App initialView="console" initialSection="Tasks" initialTaskId="task-expansion-joint" trialMode />);
    expect(tasks).toContain("Synthetic task structure");
    expect(tasks).toContain("Calciner trial shutdown");
    expect(tasks).toContain('aria-expanded="true"');
    expect(dashboard).toContain("Outlet duct — replace expansion joint");
    expect(dashboard).toContain("Paused");
    expect(dashboard).toContain("Reassign Tier 2 tracking responsibility");
    expect(dashboard).toContain("Updates the shared Tier 2 Mobile projection immediately");
    const dashboardTabs = dashboard.match(/<nav class="section-tabs"[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect(dashboardTabs.match(/aria-current="page"/g)).toHaveLength(1);
    for (const section of taskDashboardSections) expect(dashboard).toContain(section);
  });

  it("labels a field observation without changing Not Started execution", () => {
    let state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 1080 });
    const need = state.shiftProgressNeeds.find((candidate) => candidate.taskId === "task-night-handover" && candidate.userId === "tier3-casey")!;
    state = applyTrialAction(state, {
      type: "end-shift-progress",
      needId: need.id,
      actorId: "tier3-casey",
      completionPercent: 45,
      remainingWork: "Complete liner reinstatement and inspection",
      nextShiftIssue: "Await final liner set"
    });
    const html = renderToString(<TrialTaskDashboard state={state} taskId="task-night-handover" backLabel="Tasks" onBack={() => undefined} onAction={() => undefined} />).replaceAll("<!-- -->", "");

    expect(html).toContain("Not Started");
    expect(html).toContain("Tracker field observation");
    expect(html).toContain("45% · 18:00");
    expect(html).toContain("Field progress does not establish Start");
  });

  it("makes problem resolution, action completion, and shared task history exercisable", () => {
    const state = createInitialTrialState();
    const common = { state, taskId: "task-expansion-joint", backLabel: "Tasks" as const, onBack: () => undefined, onAction: () => undefined };
    const problems = renderToString(<TrialTaskDashboard {...common} initialSection="Delays / Problems" />);
    const actions = renderToString(<TrialTaskDashboard {...common} initialSection="Actions" />);
    const history = renderToString(<TrialTaskDashboard {...common} initialSection="History" />);
    expect(problems).toContain("Resolve problem in trial");
    expect(problems).toContain("Replacement material not at workfront");
    expect(actions).toContain("Complete action in trial");
    expect(actions).toContain("Deliver verified expansion-joint material");
    expect(history).toContain("Expansion-joint work paused");
  });

  it("shows same-minute execution events newest first", () => {
    let state = applyTrialAction(createInitialTrialState(), {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Scaffold access unavailable",
      whatIsNeeded: "Release the scaffold access point",
      createProblem: false,
      createAction: false
    });
    state = applyTrialAction(state, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley"
    });

    const html = renderToString(<TrialTaskDashboard
      state={state}
      taskId="task-scaffold-access"
      backLabel="Tasks"
      onBack={() => undefined}
      onAction={() => undefined}
      initialSection="Execution"
    />).replaceAll("<!-- -->", "").replaceAll("&#x27;", "'");

    expect(state.executionEvents.at(-2)?.at).toBe(state.executionEvents.at(-1)?.at);
    const startIndex = html.indexOf("· Start");
    const cantStartIndex = html.indexOf("· Can't Start");
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(cantStartIndex).toBeGreaterThanOrEqual(0);
    expect(startIndex).toBeLessThan(cantStartIndex);
  });

  it("renders configurable, controlled, versioned Critical policy trial controls", () => {
    const html = renderToString(<App initialView="console" initialSection="Critical" trialMode />).replaceAll("<!-- -->", "");
    expect(html).toContain("Tier 1 deterministic configuration");
    expect(html).toContain("Project-critical leaf");
    expect(html).toContain("Critical Work Pack");
    expect(html).toContain("Current Policy v1");
    expect(html).toContain("Create new policy version");
    expect(html).toContain("Add Critical item");
    expect(html).toContain("Report history");
    for (const mechanism of ["No routine reporting", "Ad hoc / requested", "Fixed interval", "Fixed times", "Shift-based", "Event / exception triggered"]) expect(html).toContain(mechanism);
    for (const field of ["Completion / progress", "Operational condition", "Main delay / constraint", "Action / recovery", "Forecast completion", "Resources / labour where configured", "Evidence / photo requirement", "Comment / update text"]) expect(html).toContain(field);
    expect(html).toContain("no generic form builder");
    expect(html).toContain("corrections supersede rather than overwrite");
    expect(html).toContain("does not create another execution-state model");
  });

  it("keeps Import / Export deferred and deterministic in trial mode", () => {
    const html = renderToString(<App initialView="console" initialSection="Import / Export" trialMode />);
    expect(html).toContain("Project schedule exchange");
    expect(html).toContain("final export and round-trip contract is intentionally deferred");
    expect(html).toContain("Deterministic trial mode does not load backend snapshot data");
    expect(html).not.toContain("Generate candidate");
  });
});

describe("Tier 1 Project round-trip trial boundary", () => {
  it("is explicit, browser-local, and keeps ordinary Export deferred", () => {
    const trial = renderToString(<App initialView="console" initialSection="Import / Export" roundTripTrialMode />);
    const trialExport = renderToString(<ImportExportView shellProjectLabel="Temporary review" reviewData={null} loadState={{ status: "synthetic", message: "Browser memory only." }} onRefresh={() => undefined} initialSection="Export" roundTripTrialMode />);
    const ordinaryExport = renderToString(<ImportExportView shellProjectLabel="Ordinary shell" reviewData={null} loadState={{ status: "synthetic", message: "Static." }} onRefresh={() => undefined} initialSection="Export" />);

    expect(trial).toContain("Tier 1 Project round-trip trial");
    expect(trial).toContain("Browser-local experimental workflow");
    expect(trial).toContain("no production persistence");
    expect(trial).toContain("no approved export contract");
    expect(trialExport).toContain("Start with Import");
    expect(trialExport).not.toContain("sealed preview");
    expect(trialExport).not.toContain("batch approval");
    expect(ordinaryExport).toContain("Export design not finalised");
    expect(ordinaryExport).toContain("Export unavailable");
    expect(ordinaryExport).not.toContain("Generate experimental candidate");
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
