import { useCallback, useEffect, useRef, useState } from "react";
import {
  TRIAL_BRIDGE_HEARTBEAT_INTERVAL_MS,
  TRIAL_BRIDGE_REQUEST_TIMEOUT_MS,
  TRIAL_BRIDGE_TARGET_CHECK_INTERVAL_MS,
  isTrialBridgeMessage,
  trialActionMessage,
  trialHeartbeatMessage,
  trialMobileReadyMessage,
  type TrialAction,
  type TrialBridgeActionResultMessage,
  type TrialBridgeHeartbeatResultMessage,
  type TrialBridgeStateMessage,
  type TrialState
} from "@shutdown-tracker/trial-model";

export type TrialBridgeConnectionState = "standalone" | "connecting" | "connected" | "disconnected";
export type TrialBridgeDelivery =
  | { status: "local-only" }
  | { status: "sent"; requestId: string };

export type TrialBridgeTarget = {
  origin: string;
  source: Pick<Window, "postMessage" | "closed">;
};

export type TrialBridgeIncomingEvent = {
  source: unknown;
  origin: string;
  data: unknown;
};

export type TrialBridgeClientOptions = {
  target: TrialBridgeTarget | null;
  sessionId?: string;
  onConnectionState: (state: TrialBridgeConnectionState) => void;
  onState: (state: TrialState) => void;
  onError: (message: string) => void;
};

type PendingRequest = {
  requestId: string;
  timeout: ReturnType<typeof setTimeout>;
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

export function createTrialBridgeSessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `mobile-session-${globalThis.crypto.randomUUID()}`;
  }
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const values = new Uint32Array(4);
    globalThis.crypto.getRandomValues(values);
    return `mobile-session-${Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("")}`;
  }
  throw new Error("Secure browser randomness is required to open the ephemeral Console trial bridge.");
}

/** Owns the ephemeral bridge lifecycle independently of React and trial time. */
export class TrialBridgeClient {
  private readonly target: TrialBridgeTarget | null;
  private readonly sessionId: string;
  private readonly onConnectionState: (state: TrialBridgeConnectionState) => void;
  private readonly onState: (state: TrialState) => void;
  private readonly onError: (message: string) => void;
  private connectionState: TrialBridgeConnectionState;
  private requestSequence = 0;
  private handshakeRequestId: string | null = null;
  private handshakeTimeout: ReturnType<typeof setTimeout> | null = null;
  private targetCheckInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private pendingHeartbeat: PendingRequest | null = null;
  private pendingAction: PendingRequest | null = null;
  private started = false;
  private terminallyDisconnected = false;

  constructor(options: TrialBridgeClientOptions) {
    this.target = options.target;
    this.sessionId = options.sessionId ?? createTrialBridgeSessionId();
    this.onConnectionState = options.onConnectionState;
    this.onState = options.onState;
    this.onError = options.onError;
    this.connectionState = options.target ? "connecting" : "standalone";
  }

  getConnectionState(): TrialBridgeConnectionState {
    return this.connectionState;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.onConnectionState(this.connectionState);
    if (!this.target) return;
    if (this.target.source.closed) {
      this.disconnect("The Console trial host is closed. Continuing with local trial state.");
      return;
    }

    this.handshakeRequestId = this.nextRequestId("ready");
    if (!this.postMessage(trialMobileReadyMessage(this.sessionId, this.handshakeRequestId))) return;
    this.handshakeTimeout = setTimeout(() => {
      this.disconnect("The Console trial host did not complete the bridge handshake. Continuing with local trial state.");
    }, TRIAL_BRIDGE_REQUEST_TIMEOUT_MS);
    this.targetCheckInterval = setInterval(() => {
      if (this.target?.source.closed) {
        this.disconnect("The Console trial host was closed. Continuing with local trial state.");
      }
    }, TRIAL_BRIDGE_TARGET_CHECK_INTERVAL_MS);
  }

  stop(): void {
    this.clearHandshakeTimeout();
    this.clearPendingAction();
    this.clearPendingHeartbeat();
    if (this.targetCheckInterval !== null) clearInterval(this.targetCheckInterval);
    if (this.heartbeatInterval !== null) clearInterval(this.heartbeatInterval);
    this.targetCheckInterval = null;
    this.heartbeatInterval = null;
    this.started = false;
  }

  receive(event: TrialBridgeIncomingEvent): void {
    if (!this.target || this.terminallyDisconnected) return;
    if (event.source !== this.target.source || event.origin !== this.target.origin) return;
    if (!isTrialBridgeMessage(event.data) || event.data.sessionId !== this.sessionId) return;

    if (event.data.kind === "state") {
      this.receiveState(event.data);
      return;
    }
    if (event.data.kind === "action-result") {
      this.receiveActionResult(event.data);
      return;
    }
    if (event.data.kind === "heartbeat-result") this.receiveHeartbeatResult(event.data);
  }

  sendAction(action: TrialAction, locallyValidatedState: TrialState): TrialBridgeDelivery {
    // Validated Mobile state is always applied first. Transport failure cannot
    // erase the field user's latest local trial observation.
    this.onState(locallyValidatedState);

    if (!this.target || this.connectionState === "standalone" || this.terminallyDisconnected) {
      return { status: "local-only" };
    }
    if (this.connectionState === "connecting") {
      this.disconnect("The Console bridge was still connecting. The validated action remains local and this session has switched to local-only mode.");
      return { status: "local-only" };
    }
    if (this.pendingAction) {
      this.disconnect("A Console acknowledgement was still pending. The newer validated action remains local and this session has switched to local-only mode.");
      return { status: "local-only" };
    }
    if (this.target.source.closed) {
      this.disconnect("The Console trial host was closed. The action remains in this local trial session.");
      return { status: "local-only" };
    }

    const requestId = this.nextRequestId("action");
    if (!this.postMessage(trialActionMessage(this.sessionId, requestId, action))) return { status: "local-only" };
    this.pendingAction = {
      requestId,
      timeout: setTimeout(() => {
        this.pendingAction = null;
        this.disconnect("The Console trial host did not acknowledge the action. The validated action remains in this local trial session.");
      }, TRIAL_BRIDGE_REQUEST_TIMEOUT_MS)
    };
    return { status: "sent", requestId };
  }

  private receiveState(message: TrialBridgeStateMessage): void {
    if (
      this.connectionState === "connecting"
      && message.responseToRequestId !== this.handshakeRequestId
    ) return;
    if (this.pendingAction) return;

    this.recordHostActivity();
    this.clearHandshakeTimeout();
    this.handshakeRequestId = null;
    this.transitionTo("connected");
    this.startHeartbeat();
    this.onState(message.state);
  }

  private receiveActionResult(message: TrialBridgeActionResultMessage): void {
    if (!this.pendingAction || message.requestId !== this.pendingAction.requestId) return;
    this.recordHostActivity();
    this.clearPendingAction();
    this.transitionTo("connected");
    this.onState(message.state);
    if (!message.accepted) {
      this.onError(message.error ?? "The Console trial host rejected the action and restored its canonical trial state.");
    }
  }

  private receiveHeartbeatResult(message: TrialBridgeHeartbeatResultMessage): void {
    if (!this.pendingHeartbeat || message.requestId !== this.pendingHeartbeat.requestId) return;
    this.recordHostActivity();
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval !== null) return;
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), TRIAL_BRIDGE_HEARTBEAT_INTERVAL_MS);
  }

  private sendHeartbeat(): void {
    if (
      !this.target
      || this.connectionState !== "connected"
      || this.terminallyDisconnected
      || this.pendingHeartbeat
    ) return;
    if (this.target.source.closed) {
      this.disconnect("The Console trial host was closed. Continuing with local trial state.");
      return;
    }

    const requestId = this.nextRequestId("heartbeat");
    if (!this.postMessage(trialHeartbeatMessage(this.sessionId, requestId))) return;
    this.pendingHeartbeat = {
      requestId,
      timeout: setTimeout(() => {
        this.pendingHeartbeat = null;
        this.disconnect("The Console trial host stopped responding. Continuing with local trial state.");
      }, TRIAL_BRIDGE_REQUEST_TIMEOUT_MS)
    };
  }

  private recordHostActivity(): void {
    this.clearPendingHeartbeat();
  }

  private postMessage(message: unknown): boolean {
    try {
      this.target?.source.postMessage(message, this.target.origin);
      return true;
    } catch {
      this.disconnect("The Console trial host could not be reached. Continuing with local trial state.");
      return false;
    }
  }

  private disconnect(message: string): void {
    if (this.terminallyDisconnected) return;
    this.terminallyDisconnected = true;
    this.clearHandshakeTimeout();
    this.clearPendingAction();
    this.clearPendingHeartbeat();
    if (this.targetCheckInterval !== null) clearInterval(this.targetCheckInterval);
    if (this.heartbeatInterval !== null) clearInterval(this.heartbeatInterval);
    this.targetCheckInterval = null;
    this.heartbeatInterval = null;
    this.transitionTo("disconnected");
    this.onError(message);
  }

  private transitionTo(nextState: TrialBridgeConnectionState): void {
    if (this.connectionState === nextState) return;
    this.connectionState = nextState;
    this.onConnectionState(nextState);
  }

  private clearHandshakeTimeout(): void {
    if (this.handshakeTimeout !== null) clearTimeout(this.handshakeTimeout);
    this.handshakeTimeout = null;
  }

  private clearPendingAction(): void {
    if (this.pendingAction) clearTimeout(this.pendingAction.timeout);
    this.pendingAction = null;
  }

  private clearPendingHeartbeat(): void {
    if (this.pendingHeartbeat) clearTimeout(this.pendingHeartbeat.timeout);
    this.pendingHeartbeat = null;
  }

  private nextRequestId(kind: "ready" | "action" | "heartbeat"): string {
    this.requestSequence += 1;
    return `${this.sessionId}:${kind}:${this.requestSequence}`;
  }
}

export function useTrialBridge(
  onState: (state: TrialState) => void,
  onError: (message: string) => void = () => undefined
) {
  const [target] = useState<TrialBridgeTarget | null>(() => {
    if (typeof window === "undefined" || !window.opener) return null;
    const origin = normalizeTrialHostOrigin(
      new URLSearchParams(window.location.search).get("trialHostOrigin")
    );
    return origin ? { origin, source: window.opener } : null;
  });
  const [connectionState, setConnectionState] = useState<TrialBridgeConnectionState>(
    target ? "connecting" : "standalone"
  );
  const onStateRef = useRef(onState);
  const onErrorRef = useRef(onError);
  const clientRef = useRef<TrialBridgeClient | null>(null);
  onStateRef.current = onState;
  onErrorRef.current = onError;

  useEffect(() => {
    const client = new TrialBridgeClient({
      target,
      onConnectionState: setConnectionState,
      onState: (state) => onStateRef.current(state),
      onError: (message) => onErrorRef.current(message)
    });
    clientRef.current = client;

    function receiveMessage(event: MessageEvent<unknown>) {
      client.receive(event);
    }

    if (typeof window !== "undefined") window.addEventListener("message", receiveMessage);
    client.start();
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("message", receiveMessage);
      client.stop();
      clientRef.current = null;
    };
  }, [target]);

  const sendAction = useCallback((action: TrialAction, locallyValidatedState: TrialState) => {
    const client = clientRef.current;
    if (client) return client.sendAction(action, locallyValidatedState);
    onStateRef.current(locallyValidatedState);
    return { status: "local-only" } as const;
  }, []);

  return {
    connectionState,
    connectedToHost: connectionState === "connected",
    sendAction
  };
}
