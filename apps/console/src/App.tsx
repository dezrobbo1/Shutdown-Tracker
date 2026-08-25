import { ChevronDown, LogOut, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  Tier1RoundTripClock,
  Tier1RoundTripTaskDashboard,
  Tier1RoundTripTasksView,
  Tier1RoundTripTodayView,
  type Tier1RoundTripWorkspaceState
} from "./Tier1RoundTripTrialViews";
import { tier1RoundTripRuntimeConfig } from "./roundTripTrialMode";
import { formatRoundTripMinute } from "./tier1RoundTripTrial";

export type ConsoleView = "login" | "projects" | "console";

export type AppProps = {
  initialView?: ConsoleView;
  initialSection?: ConsoleSection;
  initialTaskId?: string | null;
  roundTripTrialMode?: boolean;
};

export function App({
  initialView = "login",
  initialSection = "Today",
  initialTaskId = null,
  roundTripTrialMode
}: AppProps) {
  const roundTripEnabled = roundTripTrialMode ?? tier1RoundTripRuntimeConfig.enabled;
  const [roundTripState, setRoundTripState] = useState<Tier1RoundTripWorkspaceState | null>(null);
  const [view, setView] = useState<ConsoleView>(initialView);
  const [activeSection, setActiveSection] = useState<ConsoleSection>(
    roundTripEnabled && initialSection === "Today" ? "Import / Export" : initialSection
  );
  const [taskId, setTaskId] = useState<string | null>(initialTaskId);
  const [taskOrigin, setTaskOrigin] = useState<"Today" | "Tasks">(initialSection === "Today" ? "Today" : "Tasks");
  const [projectId, setProjectId] = useState(roundTripEnabled ? "roundtrip-empty" : "calciner-2026");
  const [reviewData, setReviewData] = useState<ConsoleReviewData | null>(null);
  const [loadState, setLoadState] = useState<ConsoleReviewLoadState>(() => roundTripEnabled
    ? roundTripReviewLoadState()
    : initialConsoleReviewLoadState(reviewApiRuntimeConfig));
  const [reviewAttempted, setReviewAttempted] = useState(false);

  const refreshReviewData = useCallback(async () => {
    setReviewAttempted(true);
    if (roundTripEnabled) {
      setReviewData(null);
      setLoadState(roundTripReviewLoadState());
      return;
    }
    if (reviewApiRuntimeConfig.liveEnabled) {
      setLoadState({ status: "loading", message: "Fetching read-only import snapshot data." });
    }
    try {
      const next = await loadConsoleReviewData();
      setReviewData(next);
      setLoadState({ status: next.mode === "live" ? "loaded" : "synthetic", message: next.message });
    } catch (error) {
      setLoadState({ status: "error", message: formatConsoleReviewError(error) });
    }
  }, [roundTripEnabled]);

  useEffect(() => {
    if (view === "console" && activeSection === "Import / Export" && !reviewAttempted) {
      void refreshReviewData();
    }
  }, [activeSection, refreshReviewData, reviewAttempted, view]);

  function resetProjectScopedState() {
    setTaskId(null);
    setReviewData(null);
    setLoadState(roundTripEnabled
      ? roundTripReviewLoadState()
      : initialConsoleReviewLoadState(reviewApiRuntimeConfig));
    setReviewAttempted(false);
  }

  function openProject(nextProjectId: string) {
    resetProjectScopedState();
    if (roundTripState && nextProjectId !== roundTripState.session.trialState.project.id) {
      setRoundTripState(null);
    }
    setProjectId(nextProjectId);
    setActiveSection(roundTripEnabled && !roundTripState ? "Import / Export" : "Today");
    setTaskOrigin("Today");
    setView("console");
  }

  function leaveProject(nextView: "login" | "projects") {
    resetProjectScopedState();
    if (nextView === "login" && roundTripEnabled) setRoundTripState(null);
    setView(nextView);
  }

  if (view === "login") {
    return <LoginView roundTripMode={roundTripEnabled} onContinue={() => setView("projects")} />;
  }
  if (view === "projects") {
    return (
      <ProjectsHome
        roundTripMode={roundTripEnabled}
        temporaryProject={roundTripState?.session.trialState.project}
        onOpenProject={openProject}
      />
    );
  }

  const selectedProject = roundTripEnabled
    ? roundTripState
      ? {
          id: roundTripState.session.trialState.project.id,
          name: roundTripState.session.trialState.project.name,
          code: roundTripState.session.trialState.project.code,
          site: roundTripState.session.trialState.project.site,
          status: "Temporary trial" as const
        }
      : {
          id: "roundtrip-empty",
          name: "No source selected",
          code: "LOCAL-XML-TRIAL",
          site: "Browser-local",
          status: "Temporary trial" as const
        }
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
        <div className="sidebar-footer">
          <span>{roundTripEnabled ? "Tier 1 Project round-trip trial" : "Static product shell"}</span>
          {roundTripEnabled ? <small>Browser-local experimental workflow<br />No production persistence</small> : null}
          <button type="button" onClick={() => leaveProject("login")}><LogOut size={15} aria-hidden="true" /> Exit review</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-bar">
          <div><span>{selectedProject.site}</span><strong>{selectedProject.code}</strong></div>
          <div>
            <span>{roundTripState
              ? `Trial time · ${formatRoundTripMinute(roundTripState.session.trialState.now).replace("T", " ")}`
              : roundTripEnabled
                ? "Choose a disposable XML source"
                : "Operational day · 06:00"}</span>
            <button type="button" disabled aria-label="Refresh project data"><RefreshCw size={16} aria-hidden="true" /> {roundTripEnabled ? "No backend connection" : "Live refresh not implemented"}</button>
          </div>
        </header>

        <div className="workspace-content">
          {roundTripEnabled && roundTripState
            ? <Tier1RoundTripClock state={roundTripState} onChange={setRoundTripState} />
            : null}
          {taskId ? (
            roundTripEnabled && !roundTripState
              ? <RoundTripNoScheduleView onOpenImport={() => navigate("Import / Export")} />
              : roundTripState
                ? <Tier1RoundTripTaskDashboard state={roundTripState} taskId={taskId} onBack={() => setTaskId(null)} onChange={setRoundTripState} />
                : <TaskDashboard taskId={taskId} backLabel={taskOrigin} onBack={() => setTaskId(null)} />
          ) : (
            <>
              {activeSection === "Today" && (roundTripState
                ? <Tier1RoundTripTodayView state={roundTripState} onOpenTask={openTask} />
                : roundTripEnabled
                  ? <RoundTripNoScheduleView onOpenImport={() => navigate("Import / Export")} />
                  : <TodayView onOpenTask={openTask} />)}
              {activeSection === "Tasks" && (roundTripState
                ? <Tier1RoundTripTasksView state={roundTripState} onOpenTask={openTask} />
                : roundTripEnabled
                  ? <RoundTripNoScheduleView onOpenImport={() => navigate("Import / Export")} />
                  : <TasksView onOpenTask={openTask} />)}
              {activeSection === "Critical" && (roundTripEnabled
                ? <RoundTripCriticalBoundary state={roundTripState} onOpenImport={() => navigate("Import / Export")} />
                : <CriticalView />)}
              {activeSection === "Import / Export" && (
                <ImportExportView
                  initialSection={roundTripEnabled && !roundTripState ? "Import" : "Current Schedule"}
                  roundTripTrialMode={roundTripEnabled}
                  roundTripState={roundTripState}
                  onRoundTripChange={(next) => {
                    setRoundTripState(next);
                    setTaskId(null);
                  }}
                  shellProjectLabel={`${selectedProject.name} (${selectedProject.code})`}
                  reviewData={reviewData}
                  loadState={loadState}
                  onRefresh={() => void refreshReviewData()}
                />
              )}
              {activeSection === "Project Settings" && (roundTripEnabled
                ? <RoundTripSettingsBoundary state={roundTripState} onOpenImport={() => navigate("Import / Export")} />
                : <ProjectSettingsView />)}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function roundTripReviewLoadState(): ConsoleReviewLoadState {
  return { status: "synthetic", message: "Tier 1 round-trip trial keeps source and result XML in browser memory only." };
}

export function RoundTripNoScheduleView({ onOpenImport }: { onOpenImport: () => void }) {
  return (
    <section className="detail-panel roundtrip-empty-project">
      <h1>Tier 1 Project round-trip trial</h1>
      <p>Choose a disposable Microsoft Project XML/MSPDI source before using the temporary schedule views.</p>
      <button className="button-primary" type="button" onClick={onOpenImport}>Open local Project XML import</button>
      <span>Browser-local experimental workflow · No production persistence · No approved export contract</span>
    </section>
  );
}

export function RoundTripCriticalBoundary({ state, onOpenImport }: { state: Tier1RoundTripWorkspaceState | null; onOpenImport: () => void }) {
  if (!state) return <RoundTripNoScheduleView onOpenImport={onOpenImport} />;
  const flagged = state.session.sourceTasks.filter((task) => task.critical).length;
  return (
    <section className="detail-panel roundtrip-context-boundary">
      <h1>Critical · imported Project context</h1>
      <p>{flagged} imported task{flagged === 1 ? " is" : "s are"} marked Critical in the selected source. This schedule fact never limits Tier 1 authority or creates Critical ownership.</p>
      <dl className="detail-list">
        <div><dt>Tier 1 authority</dt><dd>Every executable leaf, regardless of Critical membership</dd></div>
        <div><dt>Trial configuration</dt><dd>No Critical reporting policy is invented from Project data</dd></div>
        <div><dt>Persistence</dt><dd>None; no production Critical record is created</dd></div>
      </dl>
    </section>
  );
}

export function RoundTripSettingsBoundary({ state, onOpenImport }: { state: Tier1RoundTripWorkspaceState | null; onOpenImport: () => void }) {
  if (!state) return <RoundTripNoScheduleView onOpenImport={onOpenImport} />;
  return (
    <section className="detail-panel roundtrip-context-boundary">
      <h1>Project Settings · temporary trial context</h1>
      <dl className="detail-list">
        <div><dt>Project</dt><dd>{state.session.source.preview.projectName}</dd></div>
        <div><dt>Project UID</dt><dd>{state.session.source.preview.projectUid ?? "Not supplied"}</dd></div>
        <div><dt>Source</dt><dd>{state.session.source.fileName}</dd></div>
        <div><dt>Initial time basis</dt><dd>{state.session.initialTimeSource}</dd></div>
        <div><dt>Authority</dt><dd>Browser-local Tier 1 reviewer · whole temporary imported project</dd></div>
        <div><dt>Persistence</dt><dd>Browser memory only · resettable and disposable</dd></div>
      </dl>
      <p>Production settings, users, mapping, lifecycle, and persistence are not changed in this experimental mode.</p>
    </section>
  );
}
