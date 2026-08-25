import { describe, expect, it } from "vitest";
import {
  applyTrialAction,
  createInitialTrialState,
  isTrialBridgeMessage,
  trialStateMessage
} from "./index";

describe("Critical event obligation provenance", () => {
  it("retains every same-minute work-pack trigger and every satisfying event", () => {
    let state = applyTrialAction(createInitialTrialState(), {
      type: "configure-critical",
      criticalItemId: "critical-cyclone-pack",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-exception",
        mechanisms: ["event"],
        fixedTimes: [],
        triggers: ["cant-start"],
        requiredFields: ["condition"]
      }
    });
    const policy = state.criticalPolicies.find((candidate) => candidate.criticalItemId === "critical-cyclone-pack"
      && candidate.version === 2)!;

    state = applyTrialAction(state, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Scaffold access unavailable",
      whatIsNeeded: "Release the scaffold access point",
      createProblem: false,
      createAction: false
    });
    const firstEventId = state.executionEvents.at(-1)!.id;

    state = applyTrialAction(state, {
      type: "cant-start",
      taskId: "task-refractory-inspection",
      actorId: "tier3-sam",
      reason: "Inspection access unavailable",
      whatIsNeeded: "Release the inspection access point",
      createProblem: false,
      createAction: false
    });
    const secondEventId = state.executionEvents.at(-1)!.id;

    const obligations = state.criticalObligations.filter((obligation) => obligation.policyVersionId === policy.id);
    expect(obligations).toHaveLength(1);
    expect(obligations[0].triggerEventIds).toEqual([firstEventId, secondEventId]);
    expect(obligations[0].satisfiedByEventIds).toEqual([firstEventId, secondEventId]);
    expect(new Set(obligations[0].triggerEventIds)).toEqual(new Set(obligations[0].satisfiedByEventIds));
  });

  it("requires unique trigger IDs and satisfaction provenance to reference a trigger", () => {
    const state = createInitialTrialState();
    const obligation = state.criticalObligations[0];

    const duplicated = structuredClone(state);
    duplicated.criticalObligations[0].triggerEventIds = ["event-one", "event-one"];
    expect(isTrialBridgeMessage(trialStateMessage("session-one", "state-one", duplicated))).toBe(false);

    const orphaned = structuredClone(state);
    orphaned.criticalObligations[0].triggerEventIds = ["event-one"];
    orphaned.criticalObligations[0].satisfiedByEventIds = ["event-two"];
    expect(isTrialBridgeMessage(trialStateMessage("session-one", "state-two", orphaned))).toBe(false);

    obligation.triggerEventIds = ["event-one"];
    obligation.satisfiedByEventIds = ["event-one"];
    expect(isTrialBridgeMessage(trialStateMessage("session-one", "state-three", state))).toBe(true);
  });
});
