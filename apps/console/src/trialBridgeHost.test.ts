import {
  createInitialTrialState,
  trialActionMessage,
  trialHeartbeatMessage,
  trialMobileReadyMessage
} from "@shutdown-tracker/trial-model";
import { describe, expect, it } from "vitest";
import {
  ConsoleTrialBridgeHost,
  applyConsoleTrialAction,
  applyMobileTrialBridgeAction,
  createConsoleTrialActionResult,
  isTrustedConsoleTrialBridgeEvent
} from "./App";

const SESSION_ID = "session-test";

describe("Console deterministic trial bridge host", () => {
  it("accepts and rejects actions with session-scoped canonical results", () => {
    const initial = createInitialTrialState();
    const accepted = applyConsoleTrialAction(initial, { type: "advance-minutes", minutes: 15 });
    const rejected = applyConsoleTrialAction(initial, { type: "advance-to", minute: initial.now - 15 });

    expect(createConsoleTrialActionResult(SESSION_ID, "action-1", accepted)).toMatchObject({
      kind: "action-result",
      sessionId: SESSION_ID,
      requestId: "action-1",
      accepted: true,
      state: accepted.state
    });
    expect(createConsoleTrialActionResult(SESSION_ID, "action-2", rejected)).toMatchObject({
      kind: "action-result",
      sessionId: SESSION_ID,
      requestId: "action-2",
      accepted: false,
      state: initial,
      error: rejected.error
    });
  });

  it("enforces the Mobile authority boundary before applying bridge actions", () => {
    const initial = createInitialTrialState();
    const host = new ConsoleTrialBridgeHost();
    host.receiveReady(trialMobileReadyMessage(SESSION_ID, "ready-authority"), initial);

    expect(applyMobileTrialBridgeAction(initial, {
      type: "assign-tier2",
      taskId: "task-scaffold-access",
      tier2UserId: "tier2-avery",
      actorId: "tier1-dana"
    })).toMatchObject({ accepted: false, state: initial, error: expect.stringMatching(/Tier 1 Console action/i) });
    expect(applyMobileTrialBridgeAction(initial, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier1-dana",
      reason: "Forged Tier 1 Mobile action",
      whatIsNeeded: "Reject it",
      createProblem: false,
      createAction: false
    })).toMatchObject({ accepted: false, state: initial, error: expect.stringMatching(/cannot act as a Tier 1/i) });
    expect(applyMobileTrialBridgeAction(initial, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier2-avery",
      reason: "Reporting-only mutation",
      whatIsNeeded: "Reject it",
      createProblem: false,
      createAction: false
    })).toMatchObject({ accepted: false, state: initial, error: expect.stringMatching(/task-update authority/i) });
    expect(host.receiveAction(trialActionMessage(SESSION_ID, "action-authority", {
      type: "assign-tier2",
      taskId: "task-scaffold-access",
      tier2UserId: "tier2-avery",
      actorId: "tier1-dana"
    }), initial)?.outcome).toMatchObject({ accepted: false, state: initial });
  });

  it("binds actions to the ready session and replays duplicate results without reapplying", () => {
    const initial = createInitialTrialState();
    const host = new ConsoleTrialBridgeHost();
    const ready = trialMobileReadyMessage(SESSION_ID, "ready-1");
    const stateReply = host.receiveReady(ready, initial);
    expect(stateReply).toMatchObject({ sessionId: SESSION_ID, responseToRequestId: "ready-1" });

    const action = trialActionMessage(SESSION_ID, "action-1", { type: "advance-minutes", minutes: 15 });
    const first = host.receiveAction(action, initial)!;
    const duplicate = host.receiveAction(action, first.outcome.state)!;

    expect(first.duplicate).toBe(false);
    expect(first.outcome.state.now).toBe(initial.now + 15);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.result).toEqual(first.result);
    expect(duplicate.outcome.state.now).toBe(initial.now + 15);
    expect(host.receiveAction(
      trialActionMessage("wrong-session", "action-2", { type: "advance-minutes", minutes: 15 }),
      initial
    )).toBeNull();
  });

  it("answers heartbeats only for the bound session and resets old-session authority", () => {
    const initial = createInitialTrialState();
    const host = new ConsoleTrialBridgeHost();
    host.receiveReady(trialMobileReadyMessage(SESSION_ID, "ready-1"), initial);

    expect(host.receiveHeartbeat(trialHeartbeatMessage(SESSION_ID, "heartbeat-1"))).toMatchObject({
      kind: "heartbeat-result",
      sessionId: SESSION_ID,
      requestId: "heartbeat-1"
    });
    expect(host.receiveHeartbeat(trialHeartbeatMessage("wrong-session", "heartbeat-2"))).toBeNull();

    host.receiveReady(trialMobileReadyMessage("new-session", "ready-2"), initial);
    expect(host.receiveHeartbeat(trialHeartbeatMessage(SESSION_ID, "heartbeat-3"))).toBeNull();
  });

  it("requires both the exact popup source and configured origin", () => {
    const source = {} as Window;
    const message = trialMobileReadyMessage(SESSION_ID, "ready-1");

    expect(isTrustedConsoleTrialBridgeEvent(
      { source, origin: "https://mobile.example.test", data: message },
      source,
      "https://mobile.example.test"
    )).toBe(true);
    expect(isTrustedConsoleTrialBridgeEvent(
      { source: {} as Window, origin: "https://mobile.example.test", data: message },
      source,
      "https://mobile.example.test"
    )).toBe(false);
    expect(isTrustedConsoleTrialBridgeEvent(
      { source, origin: "https://wrong.example.test", data: message },
      source,
      "https://mobile.example.test"
    )).toBe(false);
  });
});
