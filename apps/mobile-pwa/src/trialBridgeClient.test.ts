import {
  TRIAL_BRIDGE_HEARTBEAT_INTERVAL_MS,
  TRIAL_BRIDGE_REQUEST_TIMEOUT_MS,
  TRIAL_BRIDGE_TARGET_CHECK_INTERVAL_MS,
  applyTrialAction,
  createInitialTrialState,
  trialActionResultMessage,
  trialHeartbeatResultMessage,
  trialStateMessage,
  type TrialBridgeActionMessage,
  type TrialBridgeHeartbeatMessage,
  type TrialBridgeMessage,
  type TrialBridgeMobileReadyMessage,
  type TrialState
} from "@shutdown-tracker/trial-model";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TrialBridgeClient,
  type TrialBridgeConnectionState,
  type TrialBridgeStateDeliveryContext,
  type TrialBridgeTarget
} from "./trialBridgeClient";

const SESSION_ID = "session-test";

afterEach(() => vi.useRealTimers());

describe("Mobile deterministic trial bridge client", () => {
  it("keeps a validated action local in standalone mode", () => {
    const harness = createHarness(null);
    const localState = applyTrialAction(harness.initialState, { type: "advance-minutes", minutes: 15 });

    harness.client.start();
    expect(harness.client.sendAction({ type: "advance-minutes", minutes: 15 }, localState)).toEqual({ status: "local-only" });
    expect(harness.connectionStates).toEqual(["standalone"]);
    expect(harness.states.at(-1)).toEqual(localState);
    expect(harness.stateDeliveries.at(-1)?.context).toEqual({
      cause: "local-action",
      action: { type: "advance-minutes", minutes: 15 }
    });
  });

  it("connects only from the exact source, origin, session, and ready request", () => {
    vi.useFakeTimers();
    const harness = createHarness();
    harness.client.start();
    const ready = harness.posted[0]?.message as TrialBridgeMobileReadyMessage;

    const wrongMessages = [
      { source: {}, origin: harness.target!.origin, data: readyState(harness, ready) },
      { source: harness.source, origin: "https://wrong.example.test", data: readyState(harness, ready) },
      {
        source: harness.source,
        origin: harness.target!.origin,
        data: trialStateMessage("wrong-session", "state-1", harness.initialState, ready.requestId)
      },
      {
        source: harness.source,
        origin: harness.target!.origin,
        data: trialStateMessage(SESSION_ID, "state-2", harness.initialState, "wrong-ready-request")
      }
    ];
    for (const message of wrongMessages) harness.client.receive(message);
    expect(harness.client.getConnectionState()).toBe("connecting");

    harness.client.receive({ source: harness.source, origin: harness.target!.origin, data: readyState(harness, ready) });
    expect(harness.client.getConnectionState()).toBe("connected");
    expect(harness.states.at(-1)).toEqual(harness.initialState);
    expect(harness.stateDeliveries.at(-1)?.context).toEqual({ cause: "handshake" });
  });

  it("labels a normal canonical-state sync separately from a reset action result", () => {
    vi.useFakeTimers();
    const harness = createConnectedHarness();

    harness.client.receive({
      source: harness.source,
      origin: harness.target!.origin,
      data: trialStateMessage(SESSION_ID, "console-state-sync", harness.initialState)
    });
    expect(harness.stateDeliveries.at(-1)).toEqual({
      state: harness.initialState,
      context: { cause: "sync" }
    });

    const delivery = harness.client.sendAction({ type: "reset" }, harness.initialState);
    if (delivery.status !== "sent") throw new Error("Expected sent reset action");
    expect(harness.stateDeliveries.at(-1)?.context).toEqual({
      cause: "local-action",
      action: { type: "reset" }
    });

    harness.client.receive({
      source: harness.source,
      origin: harness.target!.origin,
      data: trialActionResultMessage(SESSION_ID, delivery.requestId, true, harness.initialState)
    });
    expect(harness.stateDeliveries.at(-1)).toEqual({
      state: harness.initialState,
      context: { cause: "action-result", action: { type: "reset" }, accepted: true }
    });
  });

  it("does not label a rejected reset acknowledgement as accepted", () => {
    vi.useFakeTimers();
    const harness = createConnectedHarness();
    const delivery = harness.client.sendAction({ type: "reset" }, harness.initialState);
    if (delivery.status !== "sent") throw new Error("Expected sent reset action");

    harness.client.receive({
      source: harness.source,
      origin: harness.target!.origin,
      data: trialActionResultMessage(SESSION_ID, delivery.requestId, false, harness.initialState, "Reset rejected")
    });
    expect(harness.stateDeliveries.at(-1)?.context).toEqual({
      cause: "action-result",
      action: { type: "reset" },
      accepted: false
    });
    expect(harness.errors.at(-1)).toBe("Reset rejected");
  });

  it("keeps a connecting action local and terminally ignores the late handshake", () => {
    vi.useFakeTimers();
    const harness = createHarness();
    harness.client.start();
    const ready = harness.posted[0]?.message as TrialBridgeMobileReadyMessage;
    const localState = applyTrialAction(harness.initialState, { type: "advance-minutes", minutes: 15 });

    expect(harness.client.sendAction({ type: "advance-minutes", minutes: 15 }, localState)).toEqual({ status: "local-only" });
    expect(harness.client.getConnectionState()).toBe("disconnected");
    expect(harness.states.at(-1)).toEqual(localState);
    expect(harness.errors.at(-1)).toMatch(/still connecting.*remains local.*local-only/i);

    harness.client.receive({ source: harness.source, origin: harness.target!.origin, data: readyState(harness, ready) });
    expect(harness.client.getConnectionState()).toBe("disconnected");
    expect(harness.states.at(-1)).toEqual(localState);
  });

  it("reconciles one in-flight action from its session-scoped acknowledgement", () => {
    vi.useFakeTimers();
    const harness = createConnectedHarness();
    const localState = applyTrialAction(harness.initialState, { type: "advance-minutes", minutes: 15 });
    const delivery = harness.client.sendAction({ type: "advance-minutes", minutes: 15 }, localState);
    if (delivery.status !== "sent") throw new Error("Expected sent action");
    const action = harness.posted.at(-1)?.message as TrialBridgeActionMessage;

    expect(action).toMatchObject({ sessionId: SESSION_ID, requestId: delivery.requestId });
    harness.client.receive({
      source: harness.source,
      origin: harness.target!.origin,
      data: trialActionResultMessage(SESSION_ID, delivery.requestId, true, localState)
    });
    expect(harness.client.getConnectionState()).toBe("connected");
    expect(harness.states.at(-1)).toEqual(localState);
  });

  it("preserves the newer local state and disconnects when a second action arrives before acknowledgement", () => {
    vi.useFakeTimers();
    const harness = createConnectedHarness();
    const firstState = applyTrialAction(harness.initialState, { type: "advance-minutes", minutes: 15 });
    const secondState = applyTrialAction(firstState, { type: "advance-minutes", minutes: 15 });
    const first = harness.client.sendAction({ type: "advance-minutes", minutes: 15 }, firstState);
    if (first.status !== "sent") throw new Error("Expected sent action");

    expect(harness.client.sendAction({ type: "advance-minutes", minutes: 15 }, secondState)).toEqual({ status: "local-only" });
    expect(harness.client.getConnectionState()).toBe("disconnected");
    expect(harness.states.at(-1)).toEqual(secondState);
    expect(harness.errors.at(-1)).toMatch(/acknowledgement was still pending.*newer.*remains local/i);

    harness.client.receive({
      source: harness.source,
      origin: harness.target!.origin,
      data: trialActionResultMessage(SESSION_ID, first.requestId, true, firstState)
    });
    expect(harness.states.at(-1)).toEqual(secondState);
  });

  it("preserves the validated state when an action acknowledgement times out", () => {
    vi.useFakeTimers();
    const harness = createConnectedHarness();
    const localState = applyTrialAction(harness.initialState, { type: "advance-minutes", minutes: 15 });
    const delivery = harness.client.sendAction({ type: "advance-minutes", minutes: 15 }, localState);
    if (delivery.status !== "sent") throw new Error("Expected sent action");

    vi.advanceTimersByTime(TRIAL_BRIDGE_REQUEST_TIMEOUT_MS);
    expect(harness.client.getConnectionState()).toBe("disconnected");
    expect(harness.states.at(-1)).toEqual(localState);
    expect(harness.errors.at(-1)).toMatch(/did not acknowledge.*remains.*local/i);
  });

  it("uses heartbeat acknowledgement as an idle lease and detects a reloaded host", () => {
    vi.useFakeTimers();
    const harness = createConnectedHarness();

    vi.advanceTimersByTime(TRIAL_BRIDGE_HEARTBEAT_INTERVAL_MS);
    const heartbeat = harness.posted.at(-1)?.message as TrialBridgeHeartbeatMessage;
    expect(heartbeat).toMatchObject({ kind: "heartbeat", sessionId: SESSION_ID });
    harness.client.receive({
      source: harness.source,
      origin: harness.target!.origin,
      data: trialHeartbeatResultMessage(SESSION_ID, heartbeat.requestId)
    });
    expect(harness.client.getConnectionState()).toBe("connected");

    vi.advanceTimersByTime(TRIAL_BRIDGE_HEARTBEAT_INTERVAL_MS);
    vi.advanceTimersByTime(TRIAL_BRIDGE_REQUEST_TIMEOUT_MS);
    expect(harness.source.closed).toBe(false);
    expect(harness.client.getConnectionState()).toBe("disconnected");
    expect(harness.errors.at(-1)).toMatch(/stopped responding/i);
  });

  it("detects a closed target and a synchronous postMessage failure", () => {
    vi.useFakeTimers();
    const closedHarness = createConnectedHarness();
    closedHarness.source.closed = true;
    vi.advanceTimersByTime(TRIAL_BRIDGE_TARGET_CHECK_INTERVAL_MS);
    expect(closedHarness.client.getConnectionState()).toBe("disconnected");

    const throwingHarness = createConnectedHarness();
    throwingHarness.source.throwOnPost = true;
    const localState = applyTrialAction(throwingHarness.initialState, { type: "advance-minutes", minutes: 15 });
    expect(throwingHarness.client.sendAction({ type: "advance-minutes", minutes: 15 }, localState)).toEqual({ status: "local-only" });
    expect(throwingHarness.client.getConnectionState()).toBe("disconnected");
    expect(throwingHarness.states.at(-1)).toEqual(localState);
    expect(throwingHarness.errors.at(-1)).toMatch(/could not be reached/i);
  });

  it("cleans every liveness and request timer when stopped", () => {
    vi.useFakeTimers();
    const harness = createConnectedHarness();
    harness.client.sendAction(
      { type: "advance-minutes", minutes: 15 },
      applyTrialAction(harness.initialState, { type: "advance-minutes", minutes: 15 })
    );
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    harness.client.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});

type HarnessSource = {
  closed: boolean;
  throwOnPost: boolean;
  postMessage: (message: unknown, origin: string) => void;
};

type Harness = {
  client: TrialBridgeClient;
  initialState: TrialState;
  source: HarnessSource;
  target: TrialBridgeTarget | null;
  posted: Array<{ message: TrialBridgeMessage; origin: string }>;
  states: TrialState[];
  stateDeliveries: Array<{ state: TrialState; context: TrialBridgeStateDeliveryContext }>;
  connectionStates: TrialBridgeConnectionState[];
  errors: string[];
};

function createHarness(withTarget: object | null = {}): Harness {
  const initialState = createInitialTrialState();
  const posted: Harness["posted"] = [];
  const states: TrialState[] = [];
  const stateDeliveries: Harness["stateDeliveries"] = [];
  const connectionStates: TrialBridgeConnectionState[] = [];
  const errors: string[] = [];
  const source: HarnessSource = {
    closed: false,
    throwOnPost: false,
    postMessage(message: unknown, origin: string) {
      if (source.throwOnPost) throw new Error("postMessage failed");
      posted.push({ message: message as TrialBridgeMessage, origin });
    }
  };
  const target = withTarget === null
    ? null
    : { origin: "https://console.example.test", source: source as TrialBridgeTarget["source"] };
  const client = new TrialBridgeClient({
    target,
    sessionId: SESSION_ID,
    onConnectionState: (state) => connectionStates.push(state),
    onState: (state, context) => {
      states.push(state);
      stateDeliveries.push({ state, context });
    },
    onError: (message) => errors.push(message)
  });
  return { client, initialState, source, target, posted, states, stateDeliveries, connectionStates, errors };
}

function createConnectedHarness(): Harness {
  const harness = createHarness();
  harness.client.start();
  const ready = harness.posted[0]?.message as TrialBridgeMobileReadyMessage;
  harness.client.receive({ source: harness.source, origin: harness.target!.origin, data: readyState(harness, ready) });
  return harness;
}

function readyState(harness: Harness, ready: TrialBridgeMobileReadyMessage) {
  return trialStateMessage(SESSION_ID, "console-state-1", harness.initialState, ready.requestId);
}
