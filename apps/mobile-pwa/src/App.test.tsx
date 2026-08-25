import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("mobile PWA assigned-task shell", () => {
  it("uses Assigned Tasks as the only top-level operational destination", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Assigned Tasks");
    expect(html).toContain("Assigned work");
    expect(html).not.toContain("My Work");
    expect(html).not.toContain("<nav");
    expect(html).not.toContain('aria-label="Mobile navigation"');
    for (const obsoleteDestination of [
      "Today",
      "Problems",
      "Evidence",
      "Sync",
      "Critical",
      "Import / Export",
      "Project Settings"
    ]) {
      expect(html).not.toContain(`>${obsoleteDestination}<`);
    }
  });

  it("keeps Tier 2 and Tier 3 assignment examples distinct", () => {
    const tier2Html = renderToString(<App initialPersona="tier2" />);
    const tier3Html = renderToString(<App initialPersona="tier3" />);

    expect(tier2Html).toContain("Tier 2 example");
    expect(tier2Html).toContain("Tracking responsibility");
    expect(tier2Html).toContain("Tier 2 retains responsibility after field assignment.");
    expect(tier2Html).not.toContain("FIELD_CONTROL");

    expect(tier3Html).toContain("Tier 3 example");
    expect(tier3Html).toContain("WORKING_ON");
    expect(tier3Html).toContain("FIELD_CONTROL");
    expect(tier3Html).toContain("This view does not expose the whole project.");
    expect(tier3Html).not.toContain("Assign Tier 3 direct report");
  });

  it("shows sync and recovery state without creating a Sync destination", () => {
    const html = renderToString(<App />);

    expect(html).toContain('aria-label="Sync status"');
    expect(html).toContain("Recovery states");
    expect(html).toContain("Saved locally.");
    expect(html).toContain("Queued on this device. Not yet sent.");
    expect(html).toContain("Server received.");
    expect(html).toContain("Could not send. Still saved on this device.");
    expect(html).toContain("Conflict needs review.");
    expect(html).not.toContain("Sync Queue");
  });

  it("keeps execution state separate from schedule attention", () => {
    const html = renderToString(<App initialPersona="tier2" />);
    const lateTaskHtml = renderToString(
      <App initialPersona="tier2" initialTaskId="d2-scaffold-inspection" />
    );

    expect(html).toContain("Not Started");
    expect(html).toContain("Late to Start");
    expect(lateTaskHtml).toContain(
      "No Tracker Start/Resume event. Imported Actual Start is empty and imported progress is 0%."
    );
    expect(lateTaskHtml).not.toContain("Tracker Start event established In Progress");
  });

  it("renders task-owned operational sections in Task Detail", () => {
    const html = renderToString(
      <App initialPersona="tier2" initialTaskId="c2-access-cover" />
    );

    expect(html).toContain("Back to assigned tasks");
    expect(html).toContain("Task Detail");
    for (const section of [
      "Overview",
      "Execution",
      "End-of-shift progress",
      "People",
      "Critical reporting",
      "Discussion",
      "Delays / Problems",
      "Actions",
      "Evidence",
      "History"
    ]) {
      expect(html).toContain(`>${section}<`);
    }

    expect(html).toContain("Tier 3 user B · WORKING_ON");
    expect(html).toContain("Tier 2 reporting owner");
    expect(html).toContain("Tier 2 user A");
    expect(html).toContain("Four-hour work-pack reporting");
    expect(html).toContain("Policy v2");
    expect(html).toContain("Fixed times + shift-based");
    expect(html).toContain("Requested update + significant condition change");
    expect(html).toContain("Required supported content");
    expect(html).toContain("Pre-populated known execution facts");
    expect(html).toContain("Tier 2 judgement / input still needed");
    expect(html).toContain("Due in 45 min");
  });

  it("represents the five system-timestamped execution actions without manual time entry", () => {
    const html = renderToString(<App initialPersona="tier2" initialTaskId="c2-access-cover" />);
    const normalizedHtml = html.replaceAll("&#x27;", "'");

    for (const label of ["Can't Start", "Start", "Pause", "Resume", "Finish"]) {
      expect(normalizedHtml).toMatch(new RegExp(`<button type="button" disabled="">${label}</button>`));
    }
    expect(html).toContain("Action times are recorded automatically when confirmed.");
    expect(html).toContain("Ordinary Mobile execution has no manual date/time entry or backdating.");
    expect(html).toContain("System-recorded event facts");
    expect(html).not.toMatch(/>Actual start<|>Actual finish<|type="datetime-local"|type="date"|type="time"/i);
  });

  it("keeps Can't Start, late Start, Pause, Resume, and Finish semantics distinct", () => {
    const notStarted = renderToString(<App initialPersona="tier2" initialTaskId="d2-scaffold-inspection" />);
    const paused = renderToString(<App initialPersona="tier3" initialTaskId="permit-isolation-release" />);

    expect(notStarted).toContain("execution remains Not Started");
    expect(notStarted).toContain("structured reason, what must happen, and an action/problem link");
    expect(notStarted).toContain("Ask for cause, whether anything still requires action, and optional note/evidence only when the start is late.");
    expect(paused).toContain("Ask separately whether this is an adverse delay");
    expect(paused).toContain("The linked operations-release problem remains open.");
    expect(paused).toContain("Record whether a linked issue is resolved or remains open.");
    expect(paused).toContain("concise confirmation and record the current completion time");
    expect(paused).toContain("Require evidence only when configured policy says so.");
  });

  it("represents unfinished end-of-shift progress as a Tracker field observation", () => {
    const html = renderToString(<App initialPersona="tier3" initialTaskId="hv-inlet-cleanout" />);

    expect(html).toContain("How much of the task is complete?");
    expect(html).toContain("What remains");
    expect(html).toContain("Issue affecting next shift");
    expect(html).toContain("Optional note / evidence");
    expect(html).toContain("Record end-of-shift update");
    expect(html).not.toMatch(/% Work Complete|Physical % Complete/i);
  });

  it("keeps ordinary progress separate from contextual Tier 2 Critical reporting", () => {
    const tier2 = renderToString(<App initialPersona="tier2" initialTaskId="c2-access-cover" />);
    const tier3 = renderToString(<App initialPersona="tier3" initialTaskId="permit-isolation-release" />);

    expect(tier2).toContain("Routine reports are not required for every task.");
    expect(tier2).toContain("Critical reporting");
    expect(tier2).toContain("Progress 75% from the latest field observation");
    expect(tier2).toContain("Policy v2 created this obligation");
    expect(tier3).toContain("Critical context");
    expect(tier3).toContain("Reporting remains assigned to Tier 2.");
    expect(tier3).not.toContain("Submit Critical report");
    expect(tier2).not.toMatch(/add custom field|build report form|form builder/i);
  });

  it("keeps all production write controls disabled", () => {
    const tier2Detail = renderToString(
      <App initialPersona="tier2" initialTaskId="c2-access-cover" />
    );
    const normalizedDetail = tier2Detail.replaceAll("&#x27;", "'");

    for (const label of [
      "Start",
      "Can't Start",
      "Pause",
      "Resume",
      "Finish",
      "Record end-of-shift update",
      "Assign Tier 3 direct report",
      "Submit Critical report",
      "Add comment",
      "Log delay or problem",
      "Add action",
      "Add evidence"
    ]) {
      expect(normalizedDetail).toMatch(new RegExp(`<button type="button" disabled="">${label}</button>`));
    }

    expect(tier2Detail).toContain(
      "Visual review shell. Static/synthetic data. No production write workflow."
    );
    expect(tier2Detail).toContain("Execution updates are not yet implemented.");
  });

  it("does not surface planner, export, or schedule-authoring UI", () => {
    const html = [
      renderToString(<App initialPersona="tier2" />),
      renderToString(<App initialPersona="tier2" initialTaskId="c2-access-cover" />),
      renderToString(<App initialPersona="tier3" />),
      renderToString(<App initialPersona="tier3" initialTaskId="permit-isolation-release" />)
    ].join("\n");
    const forbidden = [
      /\bplanner\b/i,
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
