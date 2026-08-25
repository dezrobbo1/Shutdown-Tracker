import { describe, expect, it } from "vitest";
import { selectExecutionState, selectTaskProjection } from "./projections";
import { applyTrialAction } from "./reducer";
import type { TrialState } from "./types";

describe("imported-schedule execution model", () => {
  it("does not infer execution from planned-time passage or a Can't Start record", () => {
    const source = state();
    source.now = 240;

    expect(selectExecutionState(source, "leaf-a")).toBe("Not Started");

    const next = applyTrialAction(source, {
      type: "cant-start",
      taskId: "leaf-a",
      actorId: "tier1-reviewer",
      reason: "Access is unavailable",
      whatIsNeeded: "Release the access point",
      createProblem: true,
      createAction: true
    });

    expect(selectExecutionState(next, "leaf-a")).toBe("Not Started");
    expect(selectTaskProjection(next, "leaf-a").activeProblems).toHaveLength(1);
    expect(selectTaskProjection(next, "leaf-a").openActions).toHaveLength(1);
    expect(source.executionEvents).toEqual([]);
    expect(source.problems).toEqual([]);
    expect(source.actions).toEqual([]);
  });

  it("moves an imported leaf through Start, Pause, Resume, and Finish", () => {
    let next = state();
    next = applyTrialAction(next, {
      type: "start",
      taskId: "leaf-a",
      actorId: "tier1-reviewer",
      lateCause: "Controlled trial clock is after the imported planned start"
    });
    expect(selectExecutionState(next, "leaf-a")).toBe("In Progress");

    next.now += 15;
    next = applyTrialAction(next, {
      type: "pause",
      taskId: "leaf-a",
      actorId: "tier1-reviewer",
      reason: "Routine handover",
      adverseDelay: false,
      whatIsNeeded: "Complete the handover",
      createAction: false
    });
    expect(selectExecutionState(next, "leaf-a")).toBe("Paused");
    expect(next.problems).toEqual([]);

    next.now += 15;
    next = applyTrialAction(next, {
      type: "resume",
      taskId: "leaf-a",
      actorId: "tier1-reviewer",
      issueResolution: "not-applicable"
    });
    expect(selectExecutionState(next, "leaf-a")).toBe("In Progress");

    next.now += 15;
    next = applyTrialAction(next, {
      type: "finish",
      taskId: "leaf-a",
      actorId: "tier1-reviewer"
    });
    expect(selectExecutionState(next, "leaf-a")).toBe("Completed");
  });

  it("gives Tier 1 authority over every leaf but rejects summaries and lower tiers", () => {
    expect(() => applyTrialAction(state(), {
      type: "start",
      taskId: "summary",
      actorId: "tier1-reviewer"
    })).toThrow("executable leaf tasks");

    expect(() => applyTrialAction(state(), {
      type: "start",
      taskId: "leaf-b",
      actorId: "tier2-observer"
    })).toThrow("not a Tier 1 trial operator");

    const next = applyTrialAction(state(), {
      type: "start",
      taskId: "leaf-b",
      actorId: "tier1-reviewer"
    });
    expect(selectExecutionState(next, "leaf-b")).toBe("In Progress");
  });
});

function state(): TrialState {
  return {
    modelVersion: "imported-roundtrip-v1",
    now: 120,
    nextSequence: 1,
    project: {
      id: "temporary-project",
      name: "Imported schedule",
      code: "LOCAL-XML-TRIAL",
      site: "Browser-local",
      timezone: "Project-local",
      operationalDayStartMinute: 0,
      importedSnapshot: "source.xml"
    },
    users: [
      { id: "tier1-reviewer", name: "Tier 1 reviewer", tier: "Tier 1" },
      { id: "tier2-observer", name: "Tier 2 observer", tier: "Tier 2" }
    ],
    tasks: [
      { id: "summary", parentId: null, wbs: "1", name: "Summary", workPackage: "Imported", summary: true, depth: 0, plannedStart: 60, plannedFinish: 360, importedProgress: 0, projectCritical: false },
      { id: "leaf-a", parentId: "summary", wbs: "1.1", name: "Leaf A", workPackage: "Imported", summary: false, depth: 1, plannedStart: 60, plannedFinish: 240, importedProgress: 0, projectCritical: false },
      { id: "leaf-b", parentId: "summary", wbs: "1.2", name: "Leaf B", workPackage: "Imported", summary: false, depth: 1, plannedStart: 180, plannedFinish: 360, importedProgress: 0, projectCritical: true }
    ],
    executionEvents: [],
    pauseIntervals: [],
    progressObservations: [],
    problems: [],
    actions: [],
    history: []
  };
}
