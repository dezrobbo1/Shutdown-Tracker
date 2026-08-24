import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyTrialAction, createInitialTrialState } from "@shutdown-tracker/trial-model";
import { App } from "./App";
import { TrialMobileApp } from "./TrialMobileApp";
import { normalizeTrialHostOrigin } from "./trialBridgeClient";

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

describe("mobile deterministic operational trial", () => {
  it("activates an explicitly bounded deterministic trial without changing ordinary mode", () => {
    const ordinary = renderToString(<App />);
    const trial = renderToString(<App trialMode />);

    expect(ordinary).toContain("Visual review shell. Static/synthetic data. No production write workflow.");
    expect(ordinary).not.toContain("Synthetic operational trial");
    expect(trial).toContain("Synthetic operational trial");
    expect(trial).toContain("Deterministic local state · No production persistence");
    expect(trial).toContain("Standalone in-memory trial session.");
    expect(trial).toContain("Simulated shutdown time");
    expect(trial).toContain("24 Aug 2026 · 06:00");
  });

  it("uses named Tier 2 and Tier 3 personas while retaining Assigned Tasks only", () => {
    const html = normalizeMarkup(renderToString(<App trialMode />));

    for (const persona of [
      "Morgan Lee · Tier 2",
      "Avery Singh · Tier 2",
      "Riley Jones · Tier 3",
      "Sam Patel · Tier 3",
      "Jamie Chen · Tier 3",
      "Casey Brown · Tier 3",
      "Drew Wilson · Tier 3"
    ]) expect(html).toContain(persona);

    expect(html).toContain("Assigned Tasks");
    expect(html).not.toContain("<nav");
    for (const destination of ["Today", "Import / Export", "Project Settings"]) {
      expect(html).not.toContain(`>${destination}<`);
    }
  });

  it("renders Tier 3 Can't Start and Start without manual execution time fields", () => {
    const html = normalizeMarkup(renderToString(
      <App
        trialMode
        initialTrialUserId="tier3-riley"
        initialTaskId="task-scaffold-access"
      />
    ));

    expect(html).toContain(">Can't Start<");
    expect(html).toContain(">Start<");
    expect(html).toContain("Record Can't Start at 06:00");
    expect(html).toContain("Start at 06:00");
    expect(html).toContain("There is no manual date/time entry or backdating.");
    expect(html).not.toMatch(/type="datetime-local"|type="date"|type="time"/i);
  });

  it("shows late-start context and keeps Can't Start as Not Started", () => {
    let state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 420 });
    state = applyTrialAction(state, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Access or scaffold unavailable",
      whatIsNeeded: "Release the scaffold tag",
      createProblem: true,
      createAction: true
    });
    const html = renderToString(
      <TrialMobileApp initialState={state} initialUserId="tier3-riley" initialTaskId="task-scaffold-access" />
    ).replaceAll("&#x27;", "'");

    expect(html).toContain("Not Started");
    expect(html).toContain("Late to Start");
    expect(html).toContain("Delayed / blocked before start");
    expect(html).toContain("This start is late against the accepted planned start.");
    expect(html).toContain("What caused the late start?");
    expect(html).toContain("Access or scaffold unavailable");
  });

  it("renders Pause, Resume, and Finish according to the derived execution state", () => {
    const inProgress = renderToString(
      <App trialMode initialTrialUserId="tier3-jamie" initialTaskId="task-dust-hood" />
    );
    const paused = renderToString(
      <App trialMode initialTrialUserId="tier3-drew" initialTaskId="task-expansion-joint" />
    );

    expect(inProgress).toContain(">Pause<");
    expect(inProgress).toContain(">Finish<");
    expect(inProgress).toContain("Normal pause — not an adverse delay");
    expect(inProgress).toContain("Adverse delay — create linked problem");
    expect(paused).toContain(">Resume<");
    expect(paused).toContain("Work resumed; problem remains open");
    expect(paused).toContain("Replacement material not at workfront");
    expect(paused).toContain("Resolve problem");
    expect(paused).toContain("Complete action");
  });

  it("derives problem resolution and action completion from the shared history", () => {
    let state = applyTrialAction(createInitialTrialState(), {
      type: "resume",
      taskId: "task-expansion-joint",
      actorId: "tier3-drew",
      issueResolution: "remains-open"
    });
    state = applyTrialAction(state, { type: "resolve-problem", problemId: "problem-material", actorId: "tier3-drew" });
    state = applyTrialAction(state, { type: "complete-action", actionId: "action-material", actorId: "tier3-drew" });
    const html = renderToString(
      <TrialMobileApp initialState={state} initialUserId="tier3-drew" initialTaskId="task-expansion-joint" />
    );

    expect(html).toContain("Problem resolved explicitly: Replacement material not at workfront.");
    expect(html).toContain("Action completed: Deliver verified expansion-joint material.");
    expect(html).not.toContain(">Resolve problem<");
    expect(html).not.toContain(">Complete action<");
  });

  it("allows Tier 2 to delegate only to named direct-report Tier 3 users", () => {
    const morgan = renderToString(
      <App trialMode initialTrialUserId="tier2-morgan" initialTaskId="task-scaffold-access" />
    );
    const avery = renderToString(
      <App trialMode initialTrialUserId="tier2-avery" initialTaskId="task-permit-release" />
    );

    expect(morgan).toContain("Assign direct-report Tier 3");
    expect(morgan).toContain("Riley Jones");
    expect(morgan).toContain("Sam Patel");
    expect(morgan).toContain("Jamie Chen");
    expect(morgan).not.toContain(">Drew Wilson</option>");
    expect(morgan).toContain("WORKING_ON");
    expect(morgan).toContain("FIELD_CONTROL");
    expect(morgan).toContain("retains Tier 2 tracking responsibility");
    expect(avery).toContain("Casey Brown");
    expect(avery).toContain("Drew Wilson");
  });

  it("renders contextual Critical obligations with known facts and controlled inputs", () => {
    const html = normalizeMarkup(renderToString(
      <App trialMode initialTrialUserId="tier2-morgan" initialTaskId="task-scaffold-access" />
    ));

    expect(html).toContain(">Critical reporting<");
    expect(html).toContain("Known execution facts");
    expect(html).toContain("Policy v1");
    expect(html).toContain("Fixed interval");
    expect(html).toContain("Submit immutable Critical report");
    expect(html).toContain("Next target");
    expect(html).toContain("Forecast completion");
    expect(html).not.toMatch(/custom field|form builder/i);
  });

  it("shows immutable submitted Critical reports and superseding correction controls", () => {
    const html = renderToString(
      <App trialMode initialTrialUserId="tier2-morgan" initialTaskId="wp-cyclone" />
    );

    expect(html).toContain("Submitted report · immutable");
    expect(html).toContain("Correction creates a new report that supersedes this one.");
    expect(html).toContain("Submit superseding correction");
    expect(html).not.toContain('name="progress"');
    expect(html).not.toContain('name="condition"');
    expect(html).toContain('name="focus"');
  });

  it("shows plain-language end-of-shift progress only after the deterministic boundary", () => {
    const initial = renderToString(
      <App trialMode initialTrialUserId="tier3-casey" initialTaskId="task-night-handover" />
    );
    const atShift = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 1080 });
    const shifted = renderToString(
      <TrialMobileApp initialState={atShift} initialUserId="tier3-casey" initialTaskId="task-night-handover" />
    );

    expect(initial).toContain("No unfinished-work update is due");
    expect(shifted).toContain("How much of the task is complete?");
    expect(shifted).toContain("What remains?");
    expect(shifted).toContain("Issue affecting the next shift");
    expect(shifted).not.toMatch(/% Work Complete|Physical % Complete/i);
  });

  it("normalizes only HTTP(S) Console host origins for the optional bridge", () => {
    expect(normalizeTrialHostOrigin("https://console.example.test/review?x=1")).toBe("https://console.example.test");
    expect(normalizeTrialHostOrigin("http://127.0.0.1:5173/path")).toBe("http://127.0.0.1:5173");
    expect(normalizeTrialHostOrigin("javascript:alert(1)")).toBeNull();
    expect(normalizeTrialHostOrigin("not a URL")).toBeNull();
    expect(normalizeTrialHostOrigin(null)).toBeNull();
  });
});

function normalizeMarkup(html: string) {
  return html.replaceAll("<!-- -->", "").replaceAll("&#x27;", "'");
}
