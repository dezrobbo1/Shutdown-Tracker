import { describe, expect, it } from "vitest";
import {
  applyTrialAction,
  createInitialTrialState,
  selectCriticalObligationProjections,
  selectShiftProgressNeedsForUser,
  selectTaskProgress,
  selectTaskProjection
} from "./index";

describe("field-progress ordering", () => {
  it("uses the newest deterministic sequence when observations share a simulated minute", () => {
    let state = applyTrialAction(createInitialTrialState(), {
      type: "assign-tier3",
      taskId: "task-scaffold-access",
      tier2UserId: "tier2-morgan",
      tier3UserId: "tier3-sam",
      relationship: "WORKING_ON"
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 1080 });

    const rileyNeed = selectShiftProgressNeedsForUser(state, "tier3-riley")
      .find((need) => need.taskId === "task-scaffold-access")!;
    const samNeed = selectShiftProgressNeedsForUser(state, "tier3-sam")
      .find((need) => need.taskId === "task-scaffold-access")!;

    state = applyTrialAction(state, {
      type: "end-shift-progress",
      needId: rileyNeed.id,
      actorId: "tier3-riley",
      completionPercent: 35,
      remainingWork: "Release the upper scaffold platform",
      nextShiftIssue: "Confirm access permit"
    });
    state = applyTrialAction(state, {
      type: "end-shift-progress",
      needId: samNeed.id,
      actorId: "tier3-sam",
      completionPercent: 55,
      remainingWork: "Remove the final scaffold bay",
      nextShiftIssue: "None"
    });

    const taskProjection = selectTaskProjection(state, "task-scaffold-access");
    const criticalProjection = selectCriticalObligationProjections(state)
      .find((projection) => projection.item.id === "critical-scaffold")!;

    expect(state.progressObservations.at(-2)?.at).toBe(1080);
    expect(state.progressObservations.at(-1)?.at).toBe(1080);
    expect(selectTaskProgress(state, "task-scaffold-access")).toBe(55);
    expect(taskProjection.progressPercent).toBe(55);
    expect(taskProjection.latestFieldProgressObservation).toMatchObject({
      actorId: "tier3-sam",
      completionPercent: 55
    });
    expect(criticalProjection.prepopulatedFacts.progress).toContain("55% field observation");
  });
});
