import { useCallback, useEffect, useState } from "react";
import {
  isTrialBridgeMessage,
  trialActionMessage,
  trialMobileReadyMessage,
  type TrialAction,
  type TrialState
} from "@shutdown-tracker/trial-model";

type TrialBridgeTarget = {
  origin: string;
  source: Window;
};

export function normalizeTrialHostOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const candidate = new URL(value);
    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") return null;
    return candidate.origin;
  } catch {
    return null;
  }
}

export function useTrialBridge(onState: (state: TrialState) => void) {
  const [target] = useState<TrialBridgeTarget | null>(() => {
    if (typeof window === "undefined" || !window.opener) return null;
    const origin = normalizeTrialHostOrigin(
      new URLSearchParams(window.location.search).get("trialHostOrigin")
    );
    return origin ? { origin, source: window.opener } : null;
  });

  useEffect(() => {
    if (!target) return undefined;

    function receiveState(event: MessageEvent<unknown>) {
      if (event.source !== target?.source || event.origin !== target.origin) return;
      if (!isTrialBridgeMessage(event.data) || event.data.kind !== "state") return;
      onState(event.data.state);
    }

    window.addEventListener("message", receiveState);
    target.source.postMessage(trialMobileReadyMessage(), target.origin);
    return () => window.removeEventListener("message", receiveState);
  }, [onState, target]);

  const sendAction = useCallback((action: TrialAction) => {
    if (!target) return false;
    target.source.postMessage(trialActionMessage(action), target.origin);
    return true;
  }, [target]);

  return { connectedToHost: target !== null, sendAction };
}
