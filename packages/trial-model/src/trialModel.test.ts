import { describe, expect, it } from "vitest";
import {
  applyTrialAction,
  createInitialTrialState,
  isTrialBridgeMessage,
  selectCriticalObligationProjections,
  selectExecutionState,
  selectShiftProgressNeedsForUser,
  selectTaskHistory,
  selectTaskProjection,
  selectTasksForUser,
  selectTodayProjection
} from "./index";

describe("deterministic operational trial model", () => {
  it("accepts only the versioned trial bridge envelope", () => {
    expect(isTrialBridgeMessage({ channel: "shutdown-tracker-deterministic-trial-v1", kind: "mobile-ready" })).toBe(true);
    expect(isTrialBridgeMessage({ channel: "another-channel", kind: "mobile-ready" })).toBe(false);
  });

  it("replays the exact initial state after reset", () => {
    const initial = createInitialTrialState();
    const changed = applyTrialAction(
      applyTrialAction(initial, { type: "advance-minutes", minutes: 60 }),
      {
        type: "cant-start",
        taskId: "task-scaffold-access",
        actorId: "tier3-riley",
        reason: "Access not released",
        whatIsNeeded: "Release the scaffold tag",
        createProblem: true,
        createAction: true
      }
    );

    expect(applyTrialAction(changed, { type: "reset" })).toEqual(createInitialTrialState());
  });

  it("does not infer In Progress from planned time passage", () => {
    const state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 405 });

    expect(selectExecutionState(state, "task-scaffold-access")).toBe("Not Started");
    expect(selectTaskProjection(state, "task-scaffold-access").attention).toContain("Late to Start");
  });

  it("keeps Can't Start distinct from execution start", () => {
    const state = applyTrialAction(createInitialTrialState(), {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Scaffold access unavailable",
      whatIsNeeded: "Access team to release the scaffold",
      createProblem: true,
      createAction: true
    });

    expect(selectExecutionState(state, "task-scaffold-access")).toBe("Not Started");
    expect(selectTaskProjection(state, "task-scaffold-access").activeProblems).toHaveLength(1);
    expect(state.executionEvents.at(-1)).toMatchObject({ type: "cant-start", at: 360 });
  });

  it("uses a system-timestamped Start and requires late-start context", () => {
    const late = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 420 });

    expect(() => applyTrialAction(late, { type: "start", taskId: "task-scaffold-access", actorId: "tier3-riley" })).toThrow(/Late-start cause/);

    const started = applyTrialAction(late, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access release completed late",
      actionStillNeeded: "Monitor scaffold clearance"
    });
    expect(selectExecutionState(started, "task-scaffold-access")).toBe("In Progress");
    expect(started.executionEvents.at(-1)).toMatchObject({ type: "start", at: 420, lateCause: "Access release completed late" });
  });

  it("allows a non-adverse Pause without creating a structured problem", () => {
    const initial = createInitialTrialState();
    const problemsBefore = initial.problems.length;
    const paused = applyTrialAction(initial, {
      type: "pause",
      taskId: "task-dust-hood",
      actorId: "tier3-jamie",
      reason: "Planned break",
      adverseDelay: false,
      whatIsNeeded: "Crew returns after break",
      createAction: false
    });

    expect(selectExecutionState(paused, "task-dust-hood")).toBe("Paused");
    expect(paused.problems).toHaveLength(problemsBefore);
    expect(paused.pauseIntervals.at(-1)?.adverseDelay).toBe(false);
  });

  it("resumes execution without silently resolving a linked problem", () => {
    const resumed = applyTrialAction(createInitialTrialState(), {
      type: "resume",
      taskId: "task-expansion-joint",
      actorId: "tier3-drew",
      issueResolution: "remains-open"
    });

    expect(selectExecutionState(resumed, "task-expansion-joint")).toBe("In Progress");
    expect(resumed.problems.find((problem) => problem.id === "problem-material")?.status).toBe("open");
    expect(resumed.pauseIntervals.find((pause) => pause.id === "pause-baseline")?.endedAt).toBe(360);
  });

  it("records Finish with simulated time and establishes completion", () => {
    const resumed = applyTrialAction(createInitialTrialState(), {
      type: "resume",
      taskId: "task-expansion-joint",
      actorId: "tier3-drew",
      issueResolution: "remains-open"
    });
    const finished = applyTrialAction(resumed, { type: "finish", taskId: "task-expansion-joint", actorId: "tier3-drew" });

    expect(selectExecutionState(finished, "task-expansion-joint")).toBe("Completed");
    expect(finished.executionEvents.at(-1)).toMatchObject({ type: "finish", at: 360 });
  });

  it("creates plain-language unfinished-work needs at the shift boundary", () => {
    const atShift = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 1080 });
    const needs = selectShiftProgressNeedsForUser(atShift, "tier3-casey");

    expect(needs.some((need) => need.taskId === "task-night-handover")).toBe(true);
    const need = needs.find((candidate) => candidate.taskId === "task-night-handover");
    const updated = applyTrialAction(atShift, {
      type: "end-shift-progress",
      needId: need!.id,
      actorId: "tier3-casey",
      completionPercent: 45,
      remainingWork: "Complete liner reinstatement and inspection",
      nextShiftIssue: "Await final liner set"
    });
    expect(selectShiftProgressNeedsForUser(updated, "tier3-casey").some((candidate) => candidate.id === need!.id)).toBe(false);
    expect(updated.progressObservations.at(-1)).toMatchObject({ completionPercent: 45, shiftBoundary: 1080 });
  });

  it("updates Tier 2 projections when Tier 1 changes tracking responsibility", () => {
    const changed = applyTrialAction(createInitialTrialState(), {
      type: "assign-tier2",
      taskId: "task-scaffold-access",
      tier2UserId: "tier2-avery",
      actorId: "tier1-dana"
    });

    expect(selectTasksForUser(changed, "tier2-morgan").some((item) => item.task.id === "task-scaffold-access")).toBe(false);
    expect(selectTasksForUser(changed, "tier2-avery").some((item) => item.task.id === "task-scaffold-access")).toBe(true);
  });

  it("updates only eligible Tier 3 projections when Tier 2 delegates work", () => {
    const changed = applyTrialAction(createInitialTrialState(), {
      type: "assign-tier3",
      taskId: "task-scaffold-access",
      tier2UserId: "tier2-morgan",
      tier3UserId: "tier3-sam",
      relationship: "WORKING_ON"
    });

    expect(selectTasksForUser(changed, "tier3-sam").some((item) => item.task.id === "task-scaffold-access")).toBe(true);
    expect(selectTasksForUser(changed, "tier3-drew").some((item) => item.task.id === "task-scaffold-access")).toBe(false);
  });

  it("derives interval, fixed-time, shift and event reporting obligations", () => {
    const initial = createInitialTrialState();
    const scheduled = selectCriticalObligationProjections(initial);
    expect(scheduled.some((item) => item.obligation.mechanism === "interval" && item.obligation.dueAt === 480)).toBe(true);
    expect(scheduled.some((item) => item.obligation.mechanism === "fixed-time" && item.obligation.dueAt === 600)).toBe(true);
    expect(scheduled.some((item) => item.obligation.mechanism === "shift" && item.obligation.dueAt === 1080)).toBe(true);

    const started = applyTrialAction(applyTrialAction(initial, { type: "advance-to", minute: 420 }), {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Late access release",
      actionStillNeeded: "None"
    });
    expect(selectCriticalObligationProjections(started).some((item) => item.obligation.mechanism === "event" && item.obligation.triggerEventId?.startsWith("event-"))).toBe(true);
  });

  it("keeps submitted reports immutable and corrects by supersession", () => {
    const due = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 480 });
    const obligation = selectCriticalObligationProjections(due).find((item) => item.obligation.id === "obligation-scaffold-1")!;
    const submitted = applyTrialAction(due, {
      type: "submit-critical-report",
      obligationId: obligation.obligation.id,
      actorId: "tier2-morgan",
      values: {
        constraint: "Access release under observation",
        recovery: "Access team monitoring",
        "next-target": "Begin scaffold removal",
        "forecast-completion": "14:00"
      }
    });
    const original = submitted.criticalReports.at(-1)!;
    const corrected = applyTrialAction(submitted, {
      type: "correct-critical-report",
      reportId: original.id,
      actorId: "tier2-morgan",
      values: { "forecast-completion": "14:30" }
    });

    expect(corrected.criticalReports.find((report) => report.id === original.id)).toEqual(original);
    expect(corrected.criticalReports.at(-1)).toMatchObject({ supersedesReportId: original.id, values: { "forecast-completion": "14:30" } });
    expect(selectCriticalObligationProjections(corrected).find((item) => item.obligation.id === obligation.obligation.id)?.state).toBe("submitted");
  });

  it("derives Today and Task Dashboard history from the shared history", () => {
    const state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 405 });
    const today = selectTodayProjection(state);
    const history = selectTaskHistory(state, "task-permit-release");

    expect(today.counts["In Progress"]).toBeGreaterThan(0);
    expect(today.counts.Paused).toBeGreaterThan(0);
    expect(today.lateStarts).toBeGreaterThan(0);
    expect(today.activeProblems).toBeGreaterThan(0);
    expect(history.map((item) => item.type)).toEqual(expect.arrayContaining(["cant-start", "problem-created"]));
  });

  it("removes every generated event and report on reset", () => {
    let state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 420 });
    state = applyTrialAction(state, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access release completed late",
      actionStillNeeded: "None"
    });
    const reset = applyTrialAction(state, { type: "reset" });

    expect(reset.executionEvents.every((event) => event.baseline)).toBe(true);
    expect(reset.history.every((event) => event.baseline)).toBe(true);
    expect(reset.criticalReports).toEqual(createInitialTrialState().criticalReports);
    expect(reset.nextSequence).toBe(1000);
  });
});
