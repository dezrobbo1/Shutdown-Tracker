import { createShutdownTrackerApiClient } from "@shutdown-tracker/api-client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { buildConsoleReviewConfig, loadConsoleReviewData } from "./apiReviewClient";
import { consoleNavItems } from "./consoleData";
import { ImportExportView } from "./ImportExportView";
import { buildTier1RoundTripConfig } from "./roundTripTrialMode";
import {
  activateTier1RoundTripSource,
  Tier1RoundTripCurrentTime,
  type Tier1RoundTripWorkspaceState
} from "./Tier1RoundTripTrialViews";

describe("approved Master Console information architecture", () => {
  it("starts with a clearly non-production Login view and no preloaded project", () => {
    const html = renderToString(<App />);
    expect(html).toContain("Shutdown Tracker");
    expect(html).toContain("Continue to Projects Home");
    expect(html).toContain("OIDC and production session handling are not yet implemented");
    expect(html).toContain("No project data is preloaded");
    expect(html).not.toContain('type="password"');
  });

  it("renders an honest empty Projects Home with an import-first action", () => {
    const html = renderToString(<App initialView="projects" />);
    expect(html).toContain("Projects Home");
    expect(html).toContain("No projects available");
    expect(html).toContain("No active project");
    expect(html).toContain("Open Import / Export");
    expect(html).toContain("does not create, activate, or persist a Tracker project");
    expect(html).toContain("Create Project");
    expect(html).not.toContain("Open project");
  });

  it("uses exactly the five approved project-level destinations", () => {
    const html = renderToString(<App initialView="console" />);
    expect(consoleNavItems.map((item) => item.label)).toEqual(["Today", "Tasks", "Critical", "Import / Export", "Project Settings"]);
    const nav = html.match(/<nav class="nav-list">([\s\S]*?)<\/nav>/)?.[1] ?? "";
    for (const label of consoleNavItems.map((item) => item.label)) expect(nav).toContain(label);
    for (const removed of ["Problems", "Evidence", "Exports", "Handover", "Discussion", "Review", "Reports"]) expect(nav).not.toContain(`>${removed}<`);
  });

  it("keeps ordinary operational destinations empty until a real project path exists", () => {
    const views = [
      renderToString(<App initialView="console" initialSection="Today" />),
      renderToString(<App initialView="console" initialSection="Tasks" />),
      renderToString(<App initialView="console" initialSection="Tasks" initialTaskId="not-a-real-task" />),
      renderToString(<App initialView="console" initialSection="Critical" />),
      renderToString(<App initialView="console" initialSection="Project Settings" />)
    ];
    for (const html of views) {
      expect(html).toContain("No active project");
      expect(html).toContain("Select a source before project data can be shown");
      expect(html).toContain("Open Import / Export");
      expect(html).toContain("Local XML inspection is read-only");
    }
  });

  it("opens the ordinary Console at Import and keeps Export explicitly unfinalised", () => {
    const shell = renderToString(<App initialView="console" />);
    const importView = renderToString(<ImportExportView reviewData={null} loadState={{ status: "unconfigured", message: "No project configured." }} onRefresh={() => undefined} initialSection="Import" />);
    const exportView = renderToString(<ImportExportView reviewData={null} loadState={{ status: "unconfigured", message: "No project configured." }} onRefresh={() => undefined} initialSection="Export" />);

    for (const section of ["Current Schedule", "Import", "Export", "History"]) expect(shell).toContain(section);
    expect(shell).toContain("Choose a disposable Project XML source");
    expect(shell).toContain("No active project");
    expect(shell).toContain("final export contract remains deferred");
    expect(importView).toContain('type="file"');
    expect(importView).toContain("The complete original text stays in browser memory and is never uploaded or overwritten");
    expect(importView).toContain("Start round-trip trial");
    expect(importView).toMatch(/<button[^>]*disabled=""[^>]*>Start round-trip trial<\/button>/u);
    expect(importView).toContain("Explicit browser-local trial only");
    expect(importView).not.toContain("Round-trip trial time");
    expect(importView).toContain("Persist imported schedule");
    expect(importView).not.toContain("Activate trial schedule");
    expect(exportView).toContain("Export design not finalised");
    expect(exportView).toContain("Earlier candidate and approval experiments remain technical research");
    expect(exportView).toContain("Export unavailable");
    for (const removedControl of ["Approve exact inputs", "Generate candidate", "Open round-trip review workspace", "Record verification"]) {
      expect(`${shell}\n${importView}\n${exportView}`).not.toContain(`>${removedControl}<`);
    }
  });

  it("does not render the removed fictional Console records in any ordinary destination", () => {
    const html = [
      renderToString(<App initialView="projects" />),
      ...consoleNavItems.map((item) => renderToString(<App initialView="console" initialSection={item.label} />))
    ].join("\n");
    for (const removed of [
      "Calciner major shutdown",
      "Kiln maintenance outage",
      "Boiler annual shutdown",
      "Morgan Lee",
      "Avery Singh",
      "Jordan Kim",
      "Taylor Chen",
      "Inspect refractory lining",
      "Accepted snapshot v4",
      "Mapped leaf tasks",
      "Active Critical items"
    ]) expect(html).not.toContain(removed);
  });
});

describe("Tier 1 Project round-trip trial boundary", () => {
  it("allows direct entry only from the explicit round-trip flag and ignores the removed trial flag", () => {
    expect(buildTier1RoundTripConfig({ VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL: "true" }).enabled).toBe(true);
    expect(buildTier1RoundTripConfig({ VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL: " true " }).enabled).toBe(false);
    expect(buildTier1RoundTripConfig({ VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL: "false" }).enabled).toBe(false);
    expect(buildTier1RoundTripConfig({ VITE_SHUTDOWN_TRACKER_TRIAL_MODE: "true" }).enabled).toBe(false);
  });

  it("uses an explicitly started browser-memory workspace even when the build flag is off", () => {
    const workspace = importedRoundTripWorkspace();
    const html = renderToString(
      <App
        initialView="console"
        initialSection="Tasks"
        initialRoundTripState={workspace}
        roundTripTrialMode={false}
      />
    );

    expect(html).toContain("Imported fixture schedule");
    expect(html).toContain("Imported fixture leaf");
    expect(html).toContain("Browser-local experimental trial");
    expect(html).toContain("Tier 1 may execute");
    expect(html).toContain("Current location time");
    expect(html).toContain("Device clock");
    expect(html).toContain(workspace.session.locationTimeZone);
    expect(html).not.toContain("+15 minutes");
    expect(html).not.toContain("+1 hour");
    expect(html).not.toContain("Round-trip trial time");
    expect(html).not.toContain("No active project");
  });

  it("shows imported duration while keeping summary rows outside tracked-task navigation and counts", () => {
    const workspace = importedRoundTripWorkspace();
    const tasks = renderToString(<App initialView="console" initialSection="Tasks" initialRoundTripState={workspace} />);
    const summaryRoute = renderToString(<App initialView="console" initialSection="Tasks" initialTaskId="project-task-uid:1" initialRoundTripState={workspace} />);
    const critical = renderToString(<App initialView="console" initialSection="Critical" initialRoundTripState={workspace} />);

    expect(tasks).toMatch(/1(?:<!-- -->)? matching tracked leaf tasks · (?:<!-- -->)?1(?:<!-- -->)? hierarchy rows/u);
    expect(tasks).toContain("Hierarchy only");
    expect(tasks).toContain("Not a tracked task");
    expect(tasks).toContain("1h");
    expect(tasks).toMatch(/<button[^>]*>Imported fixture leaf<\/button>/u);
    expect(tasks).not.toMatch(/<button[^>]*>Imported fixture summary<\/button>/u);
    expect(summaryRoute).toContain("This imported summary row is Project hierarchy context only");
    expect(summaryRoute).toContain("no tracked-task dashboard or execution record");
    expect(summaryRoute).not.toContain("Imported Task Dashboard sections");
    expect(critical).toMatch(/1(?:<!-- -->)? imported leaf task(?:<!-- -->)? is(?:<!-- -->)? marked Critical/u);
  });

  it("promotes the exact inspected source and signals navigation only through explicit Start", () => {
    const draft = importedSourceDraft();
    let changed: Tier1RoundTripWorkspaceState | null = null;
    let started = 0;

    const workspace = activateTier1RoundTripSource(
      draft,
      (next) => {
        if (typeof next === "function") throw new Error("Activation must publish a complete workspace.");
        changed = next;
      },
      () => { started += 1; }
    );

    expect(changed).toBe(workspace);
    expect(started).toBe(1);
    expect(workspace.session.source.fileName).toBe(draft.fileName);
    expect(workspace.session.source.xml).toBe(draft.xml);
    expect([...workspace.session.source.bytes]).toEqual([...draft.bytes]);
    expect(workspace.session.source.hash).toBe(draft.sha256);
    expect(workspace.session.source.preview).toEqual(draft.preview);
    expect(workspace.session.initialTimeSource).toBe("Current device time");
    expect(workspace.session.locationTimeZone).toBeTruthy();
    expect(workspace.session.trialState.tasks[1]?.name).toBe("Imported fixture leaf");
  });

  it("warns and blocks updates when local wall time is behind retained evidence", () => {
    const workspace = importedRoundTripWorkspace();
    const html = renderToString(
      <Tier1RoundTripCurrentTime
        state={workspace}
        clock={{ minute: workspace.session.trialState.now - 30, timeZone: workspace.session.locationTimeZone }}
        onChange={() => undefined}
      />
    );
    expect(html).toContain("Current local wall time is earlier than existing trial evidence");
    expect(html).toContain("daylight-saving rollback");
  });

  it("is explicit, browser-local, and keeps ordinary Export deferred", () => {
    const trial = renderToString(<App initialView="console" initialSection="Import / Export" roundTripTrialMode />);
    const trialExport = renderToString(<ImportExportView reviewData={null} loadState={{ status: "unconfigured", message: "Browser memory only." }} onRefresh={() => undefined} initialSection="Export" roundTripTrialMode />);
    const ordinaryExport = renderToString(<ImportExportView reviewData={null} loadState={{ status: "unconfigured", message: "Not configured." }} onRefresh={() => undefined} initialSection="Export" />);

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

  it("shows only the local source entry before a round-trip schedule starts", () => {
    const login = renderToString(<App initialView="login" roundTripTrialMode />);
    const projects = renderToString(<App initialView="projects" roundTripTrialMode />);
    const entry = renderToString(<App initialView="console" roundTripTrialMode />);
    const tasks = renderToString(<App initialView="console" initialSection="Tasks" roundTripTrialMode />);
    const critical = renderToString(<App initialView="console" initialSection="Critical" roundTripTrialMode />);
    const settings = renderToString(<App initialView="console" initialSection="Project Settings" roundTripTrialMode />);

    expect(login).toContain("Tier 1 Project round-trip trial");
    expect(login).not.toContain("Synthetic operational trial");
    expect(projects).toContain("No source selected");
    expect(projects).toContain("Choose XML source");
    expect(entry).toContain("Choose a disposable Project XML source");
    expect(entry).toContain("Choose Project XML/MSPDI");
    for (const html of [projects, entry, tasks, critical, settings]) {
      expect(html).not.toContain("Calciner major shutdown");
      expect(html).not.toContain("Morgan Lee");
      expect(html).not.toContain("Tier 2 reporting owner");
    }
    for (const html of [tasks, critical, settings]) {
      expect(html).toContain("Choose a disposable Microsoft Project XML/MSPDI source before using the temporary schedule views");
      expect(html).toContain("Open local Project XML import");
    }
  });
});

describe("ordinary Console review data fetching", () => {
  it("stays unconfigured until a project ID is supplied", async () => {
    const config = buildConsoleReviewConfig({ VITE_SHUTDOWN_TRACKER_API_BASE_URL: " http://localhost:8080 ", VITE_SHUTDOWN_TRACKER_PROJECT_ID: " " });
    const data = await loadConsoleReviewData(config);
    expect(config.liveEnabled).toBe(false);
    expect(data.mode).toBe("unconfigured");
    expect(data.snapshots).toEqual([]);
    expect(data.message).toContain("No project is configured");
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

function importedRoundTripWorkspace() {
  return activateTier1RoundTripSource(importedSourceDraft(), () => undefined, () => undefined);
}

function importedSourceDraft() {
  const sourceXml = '<?xml version="1.0" encoding="UTF-8"?><Project xmlns="http://schemas.microsoft.com/project"><Name>Imported fixture schedule</Name></Project>';
  return {
    fileName: "imported-fixture.xml",
    xml: sourceXml,
    bytes: new TextEncoder().encode(sourceXml),
    sha256: "fixture-source-hash",
    preview: {
      projectName: "Imported fixture schedule",
      projectUid: "11111111-1111-1111-1111-111111111111",
      statusDate: "2026-08-24T06:00:00",
      defaultDurationFormat: 5,
      minutesPerDay: 480,
      minutesPerWeek: 2400,
      daysPerMonth: 20,
      taskCount: 2,
      summaryTaskCount: 1,
      leafTaskCount: 1,
      tasks: [{
        uid: "1",
        id: "1",
        name: "Imported fixture summary",
        wbs: "1",
        outlineNumber: "1",
        outlineLevel: 1,
        summary: true,
        start: "2026-08-24T07:00:00",
        finish: "2026-08-24T10:00:00",
        duration: "PT3H0M0S",
        durationFormat: 21,
        actualStart: null,
        actualFinish: null,
        percentComplete: 0,
        physicalPercentComplete: null,
        critical: true
      }, {
        uid: "2",
        id: "2",
        name: "Imported fixture leaf",
        wbs: "1.1",
        outlineNumber: "1.1",
        outlineLevel: 2,
        summary: false,
        start: "2026-08-24T07:00:00",
        finish: "2026-08-24T08:00:00",
        duration: "PT1H0M0S",
        durationFormat: 5,
        actualStart: null,
        actualFinish: null,
        percentComplete: 0,
        physicalPercentComplete: null,
        critical: true
      }]
    }
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}
