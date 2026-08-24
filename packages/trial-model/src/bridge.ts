import type { TrialAction, TrialState } from "./types";

export const TRIAL_BRIDGE_CHANNEL = "shutdown-tracker-deterministic-trial-v1";

export type TrialBridgeMessage =
  | { channel: typeof TRIAL_BRIDGE_CHANNEL; kind: "mobile-ready" }
  | { channel: typeof TRIAL_BRIDGE_CHANNEL; kind: "action"; action: TrialAction }
  | { channel: typeof TRIAL_BRIDGE_CHANNEL; kind: "state"; state: TrialState };

export function trialMobileReadyMessage(): TrialBridgeMessage {
  return { channel: TRIAL_BRIDGE_CHANNEL, kind: "mobile-ready" };
}

export function trialActionMessage(action: TrialAction): TrialBridgeMessage {
  return { channel: TRIAL_BRIDGE_CHANNEL, kind: "action", action };
}

export function trialStateMessage(state: TrialState): TrialBridgeMessage {
  return { channel: TRIAL_BRIDGE_CHANNEL, kind: "state", state };
}

export function isTrialBridgeMessage(value: unknown): value is TrialBridgeMessage {
  if (!isRecord(value) || value.channel !== TRIAL_BRIDGE_CHANNEL || typeof value.kind !== "string") return false;
  if (value.kind === "mobile-ready") return true;
  if (value.kind === "action") return isRecord(value.action) && typeof value.action.type === "string";
  if (value.kind === "state") return isRecord(value.state) && typeof value.state.scenarioVersion === "string" && Number.isInteger(value.state.now);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
