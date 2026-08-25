import {
  applyTrialAction,
  createInitialTrialState,
  formatTrialTime,
  isTrialBridgeMessage,
  trialActionResultMessage,
  trialHeartbeatResultMessage,
  trialStateMessage,
  type TrialAction,
  type TrialBridgeActionMessage,
  type TrialBridgeActionResultMessage,
  type TrialBridgeHeartbeatMessage,
  type TrialBridgeHeartbeatResultMessage,
  type TrialBridgeMobileReadyMessage,
  type TrialBridgeStateMessage,
  type TrialState
} from "@shutdown-tracker/trial-model";
import { ChevronDown, LogOut, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatConsoleReviewError,
  initialConsoleReviewLoadState,
  loadConsoleReviewData,
  reviewApiRuntimeConfig,
  type ConsoleReviewData,
  type ConsoleReviewLoadState
} from "./apiReviewClient";
import { consoleNavItems, projects, type ConsoleSection } from "./consoleData";
import {
  CriticalView,
  LoginView,
  ProjectSettingsView,
  ProjectsHome,
  TaskDashboard,
  TasksView,
  TodayView
} from "./ConsoleViews";
import { ImportExportView } from "./ImportExportView";
import {
  TrialClock,
  TrialCriticalView,
  TrialTaskDashboard,
  TrialTasksView,
  TrialTodayView
} from "./TrialConsoleViews";
import { trialConsoleRuntimeConfig } from "./trialMode";

export type ConsoleView = "login" | "projects" | "console";

export type AppProps = {
  initialView?: ConsoleView;
  initialSection?: ConsoleSection;
  initialTaskId?: string | null;
  trialMode?: boolean;
};

export type ConsoleTrialActionOutcome = {
  accepted: boolean;
  state: TrialState;
  error?: string;
};

export function applyConsoleTrialAction(state: TrialState, action: TrialAction): ConsoleTrialActionOutcome {
  try {
    return { accepted: true, state: applyTrialAction(state, action) };
  } catch (error) {
    return {
      accepted: false,
      state,
      error: error instanceof Error ? error.message : "The deterministic trial action could not be applied."
    };
  }
}

export function applyMobileTrialBridgeAction(state: TrialState, action: TrialAction): ConsoleTrialActionOutcome {
  if (action.type === "assign-tier2" || action.type === "configure-critical" || action.type === "add-critical") {
    return {
      accepted: false,
      state,
      error: "That Tier 1 Console action is not available through the Mobile trial bridge."
    };
  }
  if ("actorId" in action && state.users.find((user) => user.id === action.actorId)?.tier === "Tier 1") {
    return {
      accepted: false,
      state,
      error: "The Mobile trial bridge cannot act as a Tier 1 Console user."
    };
  }
  return applyConsoleTrialAction(state, action);
}

export function createConsoleTrialActionResult(
  sessionId: string,
  requestId: string,
  outcome: ConsoleTrialActionOutcome
): TrialBridgeActionResultMessage {
  return trialActionResultMessage(
    sessionId,
    requestId,
    outcome.accepted,
    outcome.state,
    outcome.error
  );
}

export type ConsoleTrialBridgeActionResolution = {
  duplicate: boolean;
  outcome: ConsoleTrialActionOutcome;
  result: TrialBridgeActionResultMessage;
};

export class ConsoleTrialBridgeHost {
  private sessionId: string | null = null;
  private responseSequence = 0;
  private readonly actionResults = new Map<string, ConsoleTrialBridgeActionResolution>();

  reset(): void {
    this.sessionId = null;
    this.responseSequence = 0;
    this.actionResults.clear();
  }

  receiveReady(message: TrialBridgeMobileReadyMessage, state: TrialState): TrialBridgeStateMessage {
    if (message.sessionId !== this.sessionId) {
      this.sessionId = message.sessionId;
      this.responseSequence = 0;
      this.actionResults.clear();
    }
    return trialStateMessage(
      message.sessionId,
      this.nextResponseId("state"),
      state,
      message.requestId
    );
  }

  createStateMessage(state: TrialState): TrialBridgeStateMessage | null {
    if (!this.sessionId) return null;
    return trialStateMessage(this.sessionId, this.nextResponseId("state"), state);
  }

  receiveAction(
    message: TrialBridgeActionMessage,
    state: TrialState
  ): ConsoleTrialBridgeActionResolution | null {
    if (message.sessionId !== this.sessionId) return null;
    const cached = this.actionResults.get(message.requestId);
    if (cached) return { ...cached, duplicate: true };

    const outcome = applyMobileTrialBridgeAction(state, message.action);
    const resolution = {
      duplicate: false,
      outcome,
      result: createConsoleTrialActionResult(message.sessionId, message.requestId, outcome)
    };
    this.actionResults.set(message.requestId, resolution);
    return resolution;
  }

  receiveHeartbeat(message: TrialBridgeHeartbeatMessage): TrialBridgeHeartbeatResultMessage | null {
    if (message.sessionId !== this.sessionId) return null;
    return trialHeartbeatResultMessage(message.sessionId, message.requestId);
  }

  private nextResponseId(kind: "state"): string {
    this.responseSequence += 1;
    return `console-${kind}-${this.responseSequence}`;
  }
}

export function isTrustedConsoleTrialBridgeEvent(
  event: { source: unknown; origin: string; data: unknown },
  expectedSource: Window | null,
  expectedOrigin: string
) {
  return event.source === expectedSource
    && expectedOrigin.length > 0
    && event.origin === expectedOrigin
    && isTrialBridgeMessage(event.data);
}

export function App({
  initialView = "login",
  initialSection = "Today",
  initialTaskId = null,
  trialMode
}: AppProps) {
  const trialEnabled = trialMode ?? trialConsoleRuntimeConfig.enabled;
  const initialTrialState = useRef<TrialState | null>(null);
  if (initialTrialState.current === null) initialTrialState.current = createInitialTrialState();
  const [trialState, setTrialState] = useState<TrialState>(initialTrialState.current);
  const trialStateRef = useRef(trialState);
  const mobileWindowRef = useRef<Window | null>(null);
  const mobileOriginRef = useRef("");
  const bridgeHostRef = useRef(new ConsoleTrialBridgeHost());
  const [trialError, setTrialError] = useState("");
  const [view, setView] = useState<ConsoleView>(initialView);
  const [activeSection, setActiveSection] = useState<ConsoleSection>(initialSection);
  const [taskId, setTaskId] = useState<string | null>(initialTaskId);
  const [taskOrigin, setTaskOrigin] = useState<"Today" | "Tasks">(initialSection === "Today" ? "Today" : "Tasks");
  const [projectId, setProjectId] = useState(trialEnabled ? initialTrialState.current.project.id : "calciner-2026");
  const [reviewData, setReviewData] = useState<ConsoleReviewData | null>(null);
  const [loadState, setLoadState] = useState<ConsoleReviewLoadState>(() => trialEnabled ? trialReviewLoadState() : initialConsoleReviewLoadState(reviewApiRuntimeConfig));
  const [reviewAttempted, setReviewAttempted] = useState(false);

  const commitTrialActionOutcome = useCallback((action: TrialAction, outcome: ConsoleTrialActionOutcome) => {
    if (outcome.accepted) {
      trialStateRef.current = outcome.state;
      setTrialState(outcome.state);
      if (action.type === "reset") {
        setActiveSection("Today");
        setTaskId(null);
        setTaskOrigin("Today");
      }
      setTrialError("");
    } else {
      setTrialError(outcome.error ?? "The deterministic trial action could not be applied.");
    }
  }, []);

  const dispatchTrialAction = useCallback((action: TrialAction) => {
    const outcome = applyConsoleTrialAction(trialStateRef.current, action);
    commitTrialActionOutcome(action, outcome);
    return outcome;
  }, [commitTrialActionOutcome]);

  const postTrialMessage = useCallback((message: unknown) => {
    const mobileWindow = mobileWindowRef.current;
    const targetOrigin = mobileOriginRef.current;
    if (!mobileWindow || mobileWindow.closed || !targetOrigin) return;
    mobileWindow.postMessage(message, targetOrigin);
  }, []);

  useEffect(() => {
    trialStateRef.current = trialState;
    if (trialEnabled) {
      const message = bridgeHostRef.current.createStateMessage(trialState);
      if (message) postTrialMessage(message);
    }
  }, [postTrialMessage, trialEnabled, trialState]);

  useEffect(() => {
    if (!trialEnabled) return undefined;
    function receiveMobileTrialMessage(event: MessageEvent) {
      if (!isTrustedConsoleTrialBridgeEvent(event, mobileWindowRef.current, mobileOriginRef.current)) return;
      if (event.data.kind === "mobile-ready") {
        postTrialMessage(bridgeHostRef.current.receiveReady(event.data, trialStateRef.current));
      }
      if (event.data.kind === "action") {
        const resolution = bridgeHostRef.current.receiveAction(event.data, trialStateRef.current);
        if (!resolution) return;
        if (!resolution.duplicate) commitTrialActionOutcome(event.data.action, resolution.outcome);
        postTrialMessage(resolution.result);
      }
      if (event.data.kind === "heartbeat") {
        const result = bridgeHostRef.current.receiveHeartbeat(event.data);
        if (result) postTrialMessage(result);
      }
    }
    window.addEventListener("message", receiveMobileTrialMessage);
    return () => window.removeEventListener("message", receiveMobileTrialMessage);
  }, [commitTrialActionOutcome, postTrialMessage, trialEnabled]);

  const openMobileTrial = useCallback(() => {
    try {
      const url = new URL(trialConsoleRuntimeConfig.mobileTrialUrl, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("The Mobile trial URL must use HTTP or HTTPS.");
      url.searchParams.set("trialHostOrigin", window.location.origin);
      mobileOriginRef.current = url.origin;
      const mobileWindow = window.open(url.toString(), "shutdown-tracker-mobile-trial");
      if (!mobileWindow) throw new Error("The Mobile trial window was blocked by the browser.");
      bridgeHostRef.current.reset();
      mobileWindowRef.current = mobileWindow;
      setTrialError("");
    } catch (error) {
      setTrialError(error instanceof Error ? error.message : "The configured Mobile trial URL is invalid.");
    }
  }, []);

  const refreshReviewData = useCallback(async () => {
    setReviewAttempted(true);
    if (trialEnabled) {
      setReviewData(null);
      setLoadState(trialReviewLoadState());
      return;
    }
    if (reviewApiRuntimeConfig.liveEnabled) setLoadState({ status: "loading", message: "Fetching read-only import snapshot data." });
    try {
      const next = await loadConsoleReviewData();
      setReviewData(next);
      setLoadState({ status: next.mode === "live" ? "loaded" : "synthetic", message: next.message });
    } catch (error) {
      setLoadState({ status: "error", message: formatConsoleReviewError(error) });
    }
  }, [trialEnabled]);

  useEffect(() => {
    if (view === "console" && activeSection === "Import / Export" && !reviewAttempted) void refreshReviewData();
  }, [activeSection, refreshReviewData, reviewAttempted, view]);

  function resetProjectScopedState() {
    setTaskId(null);
    setReviewData(null);
    setLoadState(trialEnabled ? trialReviewLoadState() : initialConsoleReviewLoadState(reviewApiRuntimeConfig));
    setReviewAttempted(false);
  }

  function openProject(nextProjectId: string) {
    resetProjectScopedState();
    setProjectId(nextProjectId);
    setActiveSection("Today");
    setTaskOrigin("Today");
    setView("console");
  }

  function leaveProject(nextView: "login" | "projects") {
    resetProjectScopedState();
    setView(nextView);
  }

  if (view === "login") return <LoginView trialMode={trialEnabled} onContinue={() => setView("projects")} />;
  if (view === "projects") {
    return <ProjectsHome trialProject={trialEnabled ? trialState.project : undefined} onOpenProject={openProject} />;
  }

  const selectedProject = trialEnabled
    ? { id: trialState.project.id, name: trialState.project.name, code: trialState.project.code, site: trialState.project.site, status: "Active" as const }
    : projects.find((project) => project.id === projectId) ?? projects[0];

  function navigate(section: ConsoleSection) {
    setTaskId(null);
    setActiveSection(section);
  }

  function openTask(nextTaskId: string) {
    setTaskOrigin(activeSection === "Today" ? "Today" : "Tasks");
    setTaskId(nextTaskId);
  }

  return (
    <div className="console-shell">
      <aside className="sidebar" aria-label="Master Console navigation">
        <div className="brand"><span className="brand-mark">ST</span><div><strong>Shutdown Tracker</strong><span>Master Console · Tier 1</span></div></div>
        <button className="project-switcher" type="button" onClick={() => leaveProject("projects")}>
          <span><small>Current project</small><strong>{selectedProject.name}</strong><em>{selectedProject.code} · {selectedProject.status}</em></span><ChevronDown size={17} aria-hidden="true" />
        </button>
        <nav className="nav-list">
          {consoleNavItems.map((item) => {
            const active = activeSection === item.label;
            return <button className={active ? "nav-item active" : "nav-item"} type="button" key={item.label} aria-current={active ? "page" : undefined} onClick={() => navigate(item.label)}><item.icon size={18} aria-hidden="true" /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="sidebar-footer"><span>{trialEnabled ? "Synthetic operational trial" : "Static product shell"}</span>{trialEnabled && <small>Deterministic local state<br />No production persistence</small>}<button type="button" onClick={() => leaveProject("login")}><LogOut size={15} aria-hidden="true" /> Exit review</button></div>
      </aside>

      <main className="workspace">
        <header className="workspace-bar">
          <div><span>{selectedProject.site}</span><strong>{selectedProject.code}</strong></div>
          <div><span>{trialEnabled ? `Simulated time · ${formatTrialTime(trialState.now)}` : "Operational day · 06:00"}</span><button type="button" disabled aria-label="Refresh project data"><RefreshCw size={16} aria-hidden="true" /> {trialEnabled ? "No backend connection" : "Live refresh not implemented"}</button></div>
        </header>

        <div className="workspace-content">
          {trialEnabled && <TrialClock state={trialState} onAction={dispatchTrialAction} onOpenMobile={openMobileTrial} mobileConfigured={trialConsoleRuntimeConfig.mobileTrialUrl.length > 0} />}
          {trialError && <p className="trial-form-error trial-global-error" role="alert">{trialError}</p>}
          {taskId ? trialEnabled
            ? <TrialTaskDashboard state={trialState} taskId={taskId} backLabel={taskOrigin} onBack={() => setTaskId(null)} onAction={dispatchTrialAction} />
            : <TaskDashboard taskId={taskId} backLabel={taskOrigin} onBack={() => setTaskId(null)} /> : (
            <>
              {activeSection === "Today" && (trialEnabled ? <TrialTodayView state={trialState} onOpenTask={openTask} onAction={dispatchTrialAction} /> : <TodayView onOpenTask={openTask} />)}
              {activeSection === "Tasks" && (trialEnabled ? <TrialTasksView state={trialState} onOpenTask={openTask} /> : <TasksView onOpenTask={openTask} />)}
              {activeSection === "Critical" && (trialEnabled ? <TrialCriticalView state={trialState} onAction={dispatchTrialAction} /> : <CriticalView />)}
              {activeSection === "Import / Export" && <ImportExportView trialMode={trialEnabled} shellProjectLabel={`${selectedProject.name} (${selectedProject.code})`} reviewData={reviewData} loadState={loadState} onRefresh={() => void refreshReviewData()} />}
              {activeSection === "Project Settings" && <ProjectSettingsView />}
            </>
          )}
        </div>

      </main>
    </div>
  );
}

function trialReviewLoadState(): ConsoleReviewLoadState {
  return { status: "synthetic", message: "Deterministic trial mode does not load backend snapshot data." };
}
