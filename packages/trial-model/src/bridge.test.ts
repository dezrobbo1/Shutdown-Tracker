import { describe, expect, it } from "vitest";
import {
  isTrialBridgeMessage,
  trialActionMessage,
  trialActionResultMessage,
  trialHeartbeatMessage,
  trialHeartbeatResultMessage,
  trialMobileReadyMessage,
  trialStateMessage
} from "./bridge";
import { createInitialTrialState } from "./scenario";

const SESSION_ID = "session-test";

describe("deterministic trial bridge protocol", () => {
  it("requires one ephemeral session and correlated request identifiers on every message", () => {
    const state = createInitialTrialState();
    const action = { type: "advance-minutes" as const, minutes: 15 };

    expect(trialMobileReadyMessage(SESSION_ID, "ready-1")).toMatchObject({
      kind: "mobile-ready",
      sessionId: SESSION_ID,
      requestId: "ready-1"
    });
    expect(trialStateMessage(SESSION_ID, "state-1", state, "ready-1")).toMatchObject({
      kind: "state",
      sessionId: SESSION_ID,
      requestId: "state-1",
      responseToRequestId: "ready-1"
    });
    expect(trialActionMessage(SESSION_ID, "action-1", action)).toMatchObject({
      kind: "action",
      sessionId: SESSION_ID,
      requestId: "action-1",
      action
    });
    expect(trialActionResultMessage(SESSION_ID, "action-1", true, state)).toMatchObject({
      kind: "action-result",
      sessionId: SESSION_ID,
      requestId: "action-1",
      accepted: true,
      state
    });
    expect(trialHeartbeatMessage(SESSION_ID, "heartbeat-1")).toMatchObject({ kind: "heartbeat" });
    expect(trialHeartbeatResultMessage(SESSION_ID, "heartbeat-1")).toMatchObject({ kind: "heartbeat-result" });
  });

  it("rejects missing session/request IDs, unknown actions, and unsafe state envelopes", () => {
    const state = createInitialTrialState();

    expect(isTrialBridgeMessage(trialActionMessage(SESSION_ID, "action-1", { type: "reset" }))).toBe(true);
    expect(isTrialBridgeMessage({
      channel: "shutdown-tracker-deterministic-trial-v1",
      kind: "mobile-ready",
      requestId: "ready-1"
    })).toBe(false);
    expect(isTrialBridgeMessage({
      channel: "shutdown-tracker-deterministic-trial-v1",
      kind: "action",
      sessionId: SESSION_ID,
      requestId: "action-2",
      action: { type: "unknown-no-op" }
    })).toBe(false);
    expect(isTrialBridgeMessage({
      channel: "shutdown-tracker-deterministic-trial-v1",
      kind: "state",
      sessionId: SESSION_ID,
      requestId: "state-2",
      state: { scenarioVersion: state.scenarioVersion, now: state.now }
    })).toBe(false);
  });

  it("rejects a known action when its required payload is malformed", () => {
    expect(isTrialBridgeMessage({
      channel: "shutdown-tracker-deterministic-trial-v1",
      kind: "action",
      sessionId: SESSION_ID,
      requestId: "action-finish",
      action: { type: "finish", taskId: "task-scaffold-access" }
    })).toBe(false);
  });

  it("accepts only the exact current scenario version", () => {
    const state = createInitialTrialState();
    const message = trialStateMessage(SESSION_ID, "state-version", state);

    expect(isTrialBridgeMessage(message)).toBe(true);
    expect(isTrialBridgeMessage({
      ...message,
      state: { ...state, scenarioVersion: "shutdown-trial-future" }
    })).toBe(false);
  });

  it("rejects malformed records nested inside state collections", () => {
    const state = createInitialTrialState();
    const message = trialStateMessage(SESSION_ID, "state-nested", state);
    const [firstAssignment, ...remainingAssignments] = state.trackingAssignments;

    expect(firstAssignment).toBeDefined();
    expect(isTrialBridgeMessage({
      ...message,
      state: {
        ...state,
        trackingAssignments: [
          { ...firstAssignment, active: "yes" },
          ...remainingAssignments
        ]
      }
    })).toBe(false);
  });

  it("accepts superseded obligations with their complete mechanism set", () => {
    const state = createInitialTrialState();
    const [firstObligation, ...remainingObligations] = state.criticalObligations;

    expect(firstObligation).toBeDefined();
    expect(isTrialBridgeMessage(trialStateMessage(SESSION_ID, "state-superseded", {
      ...state,
      criticalObligations: [
        {
          ...firstObligation,
          mechanisms: [firstObligation.mechanism, "shift"],
          supersededAt: state.now,
          supersededByPolicyVersionId: "policy-superseding"
        },
        ...remainingObligations
      ]
    }))).toBe(true);
  });

  it("rejects obligations with empty mechanisms or malformed supersession metadata", () => {
    const state = createInitialTrialState();
    const [firstObligation, ...remainingObligations] = state.criticalObligations;
    const message = trialStateMessage(SESSION_ID, "state-obligation", state);

    expect(firstObligation).toBeDefined();
    expect(isTrialBridgeMessage({
      ...message,
      state: {
        ...state,
        criticalObligations: [{ ...firstObligation, mechanisms: [] }, ...remainingObligations]
      }
    })).toBe(false);
    expect(isTrialBridgeMessage({
      ...message,
      state: {
        ...state,
        criticalObligations: [{ ...firstObligation, mechanisms: ["shift"] }, ...remainingObligations]
      }
    })).toBe(false);
    expect(isTrialBridgeMessage({
      ...message,
      state: {
        ...state,
        criticalObligations: [
          { ...firstObligation, supersededAt: "now", supersededByPolicyVersionId: "" },
          ...remainingObligations
        ]
      }
    })).toBe(false);
    expect(isTrialBridgeMessage({
      ...message,
      state: {
        ...state,
        criticalObligations: [{ ...firstObligation, supersededAt: state.now }, ...remainingObligations]
      }
    })).toBe(false);
  });
});
