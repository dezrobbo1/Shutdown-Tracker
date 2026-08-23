import { ChevronDown, LogOut, RefreshCw } from "lucide-react";
import { Component, lazy, Suspense, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
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

const LazyRoundTripWorkspace = lazy(async () => {
  const module = await import("./RoundTripWorkspace");
  return { default: module.RoundTripWorkspace };
});

class RoundTripErrorBoundary extends Component<{ children: ReactNode; onBack: () => void }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : "The round-trip workspace could not load." };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Round-trip workspace load failed", error, info.componentStack);
  }

  render() {
    if (this.state.message) {
      return (
        <section className="lazy-loading" role="alert">
          <h1>Round-trip review workspace could not load</h1>
          <p>{this.state.message}</p>
          <div className="disabled-action-row">
            <button type="button" onClick={this.props.onBack}>Back to Import / Export</button>
            <button type="button" onClick={() => { if (typeof window !== "undefined") window.location.reload(); }}>Reload workspace</button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

export type ConsoleView = "login" | "projects" | "console";

export type AppProps = {
  initialView?: ConsoleView;
  initialSection?: ConsoleSection;
  initialTaskId?: string | null;
  roundTripMode?: boolean;
};

export function App({
  initialView = "login",
  initialSection = "Today",
  initialTaskId = null,
  roundTripMode = false
}: AppProps) {
  const [view, setView] = useState<ConsoleView>(initialView);
  const [activeSection, setActiveSection] = useState<ConsoleSection>(initialSection);
  const [taskId, setTaskId] = useState<string | null>(initialTaskId);
  const [taskOrigin, setTaskOrigin] = useState<"Today" | "Tasks">(initialSection === "Today" ? "Today" : "Tasks");
  const [projectId, setProjectId] = useState("calciner-2026");
  const [reviewData, setReviewData] = useState<ConsoleReviewData | null>(null);
  const [loadState, setLoadState] = useState<ConsoleReviewLoadState>(() => initialConsoleReviewLoadState(reviewApiRuntimeConfig));
  const [reviewAttempted, setReviewAttempted] = useState(false);
  const [roundTripMounted, setRoundTripMounted] = useState(false);
  const [roundTripVisible, setRoundTripVisible] = useState(false);
  const [roundTripBusy, setRoundTripBusy] = useState(false);

  const refreshReviewData = useCallback(async () => {
    setReviewAttempted(true);
    if (reviewApiRuntimeConfig.liveEnabled) setLoadState({ status: "loading", message: "Fetching import/export review data." });
    try {
      const next = await loadConsoleReviewData();
      setReviewData(next);
      setLoadState({ status: next.mode === "live" ? "loaded" : "synthetic", message: next.message });
    } catch (error) {
      setLoadState({ status: "error", message: formatConsoleReviewError(error) });
    }
  }, []);

  useEffect(() => {
    if (view === "console" && activeSection === "Import / Export" && !reviewAttempted) void refreshReviewData();
  }, [activeSection, refreshReviewData, reviewAttempted, view]);

  function resetProjectScopedState() {
    setTaskId(null);
    setReviewData(null);
    setLoadState(initialConsoleReviewLoadState(reviewApiRuntimeConfig));
    setReviewAttempted(false);
    setRoundTripVisible(false);
    setRoundTripMounted(false);
    setRoundTripBusy(false);
  }

  function openProject(nextProjectId: string) {
    resetProjectScopedState();
    setProjectId(nextProjectId);
    setActiveSection("Today");
    setTaskOrigin("Today");
    setView("console");
  }

  function leaveProject(nextView: "login" | "projects") {
    if (roundTripBusy) return;
    resetProjectScopedState();
    setView(nextView);
  }

  if (view === "login") return <LoginView onContinue={() => setView("projects")} />;
  if (view === "projects") {
    return <ProjectsHome onOpenProject={openProject} />;
  }

  const selectedProject = projects.find((project) => project.id === projectId) ?? projects[0];

  function navigate(section: ConsoleSection) {
    setTaskId(null);
    setActiveSection(section);
    setRoundTripVisible(false);
  }

  function openRoundTrip() {
    setRoundTripMounted(true);
    setRoundTripVisible(true);
  }

  function openTask(nextTaskId: string) {
    setTaskOrigin(activeSection === "Today" ? "Today" : "Tasks");
    setTaskId(nextTaskId);
  }

  return (
    <div className="console-shell">
      <aside className="sidebar" aria-label="Master Console navigation">
        <div className="brand"><span className="brand-mark">ST</span><div><strong>Shutdown Tracker</strong><span>Master Console · Tier 1</span></div></div>
        <button className="project-switcher" type="button" onClick={() => leaveProject("projects")} disabled={roundTripBusy} title={roundTripBusy ? "Wait for the acceptance action to finish before switching projects" : undefined}>
          <span><small>Current project</small><strong>{selectedProject.name}</strong><em>{selectedProject.code} · {selectedProject.status}</em></span><ChevronDown size={17} aria-hidden="true" />
        </button>
        <nav className="nav-list">
          {consoleNavItems.map((item) => {
            const active = activeSection === item.label;
            return <button className={active ? "nav-item active" : "nav-item"} type="button" key={item.label} aria-current={active ? "page" : undefined} onClick={() => navigate(item.label)}><item.icon size={18} aria-hidden="true" /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="sidebar-footer"><span>{roundTripBusy ? "Acceptance action in progress" : "Static product shell"}</span><button type="button" onClick={() => leaveProject("login")} disabled={roundTripBusy}><LogOut size={15} aria-hidden="true" /> Exit review</button></div>
      </aside>

      <main className="workspace">
        <header className="workspace-bar">
          <div><span>{selectedProject.site}</span><strong>{selectedProject.code}</strong></div>
          <div><span>Operational day · 06:00</span><button type="button" disabled aria-label="Refresh project data"><RefreshCw size={16} aria-hidden="true" /> Live refresh not implemented</button></div>
        </header>

        <div className={roundTripVisible ? "workspace-content workspace-content-hidden" : "workspace-content"} aria-hidden={roundTripVisible || undefined}>
          {taskId ? <TaskDashboard taskId={taskId} backLabel={taskOrigin} onBack={() => setTaskId(null)} /> : (
            <>
              {activeSection === "Today" && <TodayView onOpenTask={openTask} />}
              {activeSection === "Tasks" && <TasksView onOpenTask={openTask} />}
              {activeSection === "Critical" && <CriticalView />}
              {activeSection === "Import / Export" && <ImportExportView shellProjectLabel={`${selectedProject.name} (${selectedProject.code})`} reviewData={reviewData} loadState={loadState} onRefresh={() => void refreshReviewData()} roundTripMode={roundTripMode} onOpenRoundTrip={openRoundTrip} />}
              {activeSection === "Project Settings" && <ProjectSettingsView />}
            </>
          )}
        </div>

        {roundTripMounted && (
          <div className={roundTripVisible ? "round-trip-slot" : "round-trip-slot round-trip-slot-hidden"} hidden={!roundTripVisible}>
            <div className="round-trip-return"><button type="button" onClick={() => setRoundTripVisible(false)}>← Back to Import / Export</button><span>The review session stays mounted while you visit another Console section.</span></div>
            <RoundTripErrorBoundary onBack={() => setRoundTripVisible(false)}>
              <Suspense fallback={<section className="lazy-loading"><h1>Loading round-trip review workspace</h1><p>The acceptance tools are being loaded.</p></section>}>
                <LazyRoundTripWorkspace onBusyChange={setRoundTripBusy} />
              </Suspense>
            </RoundTripErrorBoundary>
          </div>
        )}
      </main>
    </div>
  );
}
