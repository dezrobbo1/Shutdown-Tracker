import {
  selectExecutionState,
  selectTaskProjection,
  type ExecutionState
} from "@shutdown-tracker/trial-model";
import { Download, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { PageHeading, PanelHeading, StatusLabel } from "./ConsoleViews";
import {
  assertCandidatePreviewPreserved,
  buildConservativeProjectDifferences,
  compareProjectRoundTrip,
  recordRoundTripDisposition,
  ROUND_TRIP_DISPOSITIONS,
  type DifferenceAnnotation,
  type ProjectRoundTripComparison,
  type RoundTripDisposition,
  type StructuralDifference
} from "./projectRoundTripComparison";
import {
  createProjectXmlMapping,
  generateProjectXmlCandidate,
  sha256Hex,
  type ProjectXmlCandidateResult,
  type ProjectXmlMappingField
} from "./projectXmlCandidate";
import {
  formatImportedProjectDuration,
  parseProjectXmlPreview,
  readUtf8ProjectXml,
  type ProjectXmlPreview
} from "./projectXmlPreview";
import {
  applyTier1RoundTripRecordAction,
  applyTier1RoundTripExecutionAction,
  createTier1RoundTripSession,
  deriveTier1RoundTripMappingProposals,
  formatRoundTripMinute,
  mergeTier1RoundTripMappingSelections,
  projectTier1RoundTripStateAtMinute,
  readTier1RoundTripLocationClock,
  recordTier1RoundTripProgress,
  resetTier1RoundTripSession,
  selectTier1RoundTripTaskRows,
  tier1RoundTripLocalDayWindow,
  TIER1_ROUNDTRIP_ACTOR_ID,
  updateTier1RoundTripMappingSelection,
  type Tier1RoundTripLocationClock,
  type RoundTripMappingSelection,
  type Tier1RoundTripSession
} from "./tier1RoundTripTrial";

export type Tier1RoundTripProjectResult = {
  fileName: string;
  xml: string;
  preview: ProjectXmlPreview;
  sha256: string;
  comparison: ProjectRoundTripComparison;
  differences: StructuralDifference[];
  annotations: DifferenceAnnotation[];
};

export type Tier1RoundTripWorkspaceState = {
  session: Tier1RoundTripSession;
  candidate: ProjectXmlCandidateResult | null;
  projectResult: Tier1RoundTripProjectResult | null;
  disposition: { value: RoundTripDisposition; notes?: string } | null;
};

export type Tier1RoundTripChangeHandler = Dispatch<SetStateAction<Tier1RoundTripWorkspaceState | null>>;

export type Tier1RoundTripSourceDraft = {
  fileName: string;
  xml: string;
  bytes: Uint8Array;
  preview: ProjectXmlPreview;
  sha256: string;
};

export function activateTier1RoundTripSource(
  draft: Tier1RoundTripSourceDraft,
  onChange: Tier1RoundTripChangeHandler,
  onStarted: () => void
) {
  const session = createTier1RoundTripSession({
    fileName: draft.fileName,
    sourceXml: draft.xml,
    sourceBytes: draft.bytes,
    preview: draft.preview,
    sourceHash: draft.sha256
  });
  const workspace: Tier1RoundTripWorkspaceState = {
    session,
    candidate: null,
    projectResult: null,
    disposition: null
  };
  onChange(workspace);
  onStarted();
  return workspace;
}

const TASK_TABLE_PAGE_SIZE = 250;

export function useTier1RoundTripLiveClock(timeZone: string | null): Tier1RoundTripLocationClock | null {
  const readClock = useCallback(
    () => timeZone ? readTier1RoundTripLocationClock(new Date(), timeZone) : null,
    [timeZone]
  );
  const [clock, setClock] = useState<Tier1RoundTripLocationClock | null>(() => readClock());

  useEffect(() => {
    if (!timeZone) {
      setClock(null);
      return;
    }
    const refresh = () => {
      const next = readClock();
      setClock((current) => current?.minute === next?.minute && current?.timeZone === next?.timeZone
        ? current
        : next);
    };
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
    const scheduleNextMinute = () => {
      refresh();
      timeout = globalThis.setTimeout(scheduleNextMinute, 60_000 - (Date.now() % 60_000) + 25);
    };
    scheduleNextMinute();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (timeout !== undefined) globalThis.clearTimeout(timeout);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [readClock, timeZone]);

  return clock?.timeZone === timeZone ? clock : null;
}

export function Tier1RoundTripBoundary() {
  return (
    <div className="roundtrip-boundary" role="note">
      <strong>Tier 1 Project round-trip trial</strong>
      <span>Browser-local experimental workflow · no production persistence · no approved export contract</span>
    </div>
  );
}

export function Tier1RoundTripImportPanel({
  state,
  onChange,
  onStarted = () => undefined
}: {
  state: Tier1RoundTripWorkspaceState | null;
  onChange: Tier1RoundTripChangeHandler;
  onStarted?: () => void;
}) {
  const [draft, setDraft] = useState<Tier1RoundTripSourceDraft | null>(null);
  const [error, setError] = useState("");
  const [inspectionStatus, setInspectionStatus] = useState<"idle" | "inspecting" | "ready">("idle");
  const [inspectingFileName, setInspectingFileName] = useState("");
  const [query, setQuery] = useState("");
  const [rowLimit, setRowLimit] = useState(TASK_TABLE_PAGE_SIZE);
  const inspectionSequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => {
    inspectionSequence.current += 1;
  }, []);
  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (draft?.preview.tasks ?? state?.session.source.preview.tasks ?? []).filter((task) => !normalized || [task.uid, task.id, task.wbs, task.name].some((value) => value?.toLowerCase().includes(normalized)));
  }, [draft, query, state]);

  async function inspect(file: File | null) {
    const requestId = inspectionSequence.current + 1;
    inspectionSequence.current = requestId;
    setDraft(null);
    setError("");
    setInspectionStatus(file ? "inspecting" : "idle");
    setInspectingFileName(file?.name ?? "");
    setRowLimit(TASK_TABLE_PAGE_SIZE);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setError("Choose Microsoft Project XML/MSPDI. Native .mpp is not supported in this browser trial.");
      setInspectionStatus("idle");
      setInspectingFileName("");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    try {
      const { xml, bytes } = await readUtf8ProjectXml(file);
      const preview = parseProjectXmlPreview(xml);
      const sha256 = await sha256Hex(bytes);
      if (inspectionSequence.current !== requestId) return;
      setDraft({ fileName: file.name, xml, bytes, preview, sha256 });
      setInspectionStatus("ready");
      setInspectingFileName("");
    } catch (caught) {
      if (inspectionSequence.current !== requestId) return;
      setError(caught instanceof Error ? caught.message : "The source could not be inspected.");
      setInspectionStatus("idle");
      setInspectingFileName("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function startTrial() {
    if (!draft) return;
    try {
      activateTier1RoundTripSource(draft, onChange, onStarted);
      setDraft(null);
      setInspectionStatus("idle");
      setInspectingFileName("");
      if (fileInput.current) fileInput.current.value = "";
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The temporary round-trip trial could not start.");
    }
  }

  const source = draft ?? (state ? { fileName: state.session.source.fileName, xml: state.session.source.xml, bytes: state.session.source.bytes, preview: state.session.source.preview, sha256: state.session.source.hash ?? "Unavailable" } : null);
  return (
    <div className="import-review-stack">
      <section className="table-panel" aria-busy={inspectionStatus === "inspecting"}>
        <PanelHeading title="Choose a disposable Project XML source" detail="The complete original text stays in browser memory and is never uploaded or overwritten." />
        <label className="import-file-zone">
          <input ref={fileInput} type="file" accept=".xml,.mspdi.xml" onChange={(event) => void inspect(event.target.files?.[0] ?? null)} />
          <span><strong>{inspectionStatus === "inspecting" ? inspectingFileName : source?.fileName ?? "Choose Project XML/MSPDI"}</strong><small>Browser-local inspection only. Native .mpp is unsupported.</small></span>
        </label>
        <p className="surface-caption" role="status" aria-live="polite">
          {inspectionStatus === "inspecting"
            ? "Inspecting and hashing the selected source locally…"
            : inspectionStatus === "ready"
              ? "Source inspection complete. Review the identity and task rows, then start the explicit trial when ready."
              : state
                ? "The active source is retained unchanged in this browser-memory trial."
                : "Select a Microsoft Project XML/MSPDI source to inspect it locally."}
        </p>
        {error ? <p className="import-error" role="alert">{error}</p> : null}
        {source && inspectionStatus !== "inspecting" ? (
          <>
            <dl className="import-summary-grid">
              <div><dt>Project</dt><dd>{source.preview.projectName}</dd></div>
              <div><dt>Project UID</dt><dd>{source.preview.projectUid ?? "Not supplied"}</dd></div>
              <div><dt>Status date</dt><dd>{source.preview.statusDate ?? "Not supplied"}</dd></div>
              <div><dt>Source task rows</dt><dd>{source.preview.taskCount}</dd></div>
              <div><dt>Tracked leaf tasks</dt><dd>{source.preview.leafTaskCount}</dd></div>
              <div><dt>Summary hierarchy rows</dt><dd>{source.preview.summaryTaskCount}</dd></div>
              <div><dt>Original source-file SHA-256</dt><dd><code>{source.sha256}</code></dd></div>
            </dl>
            <div className="import-task-tools">
              <label className="search-control"><Search size={17} aria-hidden="true" /><span className="sr-only">Search imported source rows</span><input value={query} onChange={(event) => { setQuery(event.target.value); setRowLimit(TASK_TABLE_PAGE_SIZE); }} placeholder="Search task, WBS, UID, or ID" /></label>
              <span>{visibleTasks.filter((task) => !task.summary).length} tracked leaf tasks · {visibleTasks.filter((task) => task.summary).length} hierarchy rows</span>
            </div>
            <RoundTripSourceTaskTable tasks={visibleTasks.slice(0, rowLimit)} settings={source.preview} />
            {visibleTasks.length > rowLimit ? <div className="disabled-action-row"><button type="button" onClick={() => setRowLimit((current) => current + TASK_TABLE_PAGE_SIZE)}>Show {Math.min(TASK_TABLE_PAGE_SIZE, visibleTasks.length - rowLimit)} more rows</button><span>Showing {rowLimit} of {visibleTasks.length} matching rows.</span></div> : null}
          </>
        ) : null}
        <div className="disabled-action-row">
          <button className="button-primary" type="button" disabled={!draft || inspectionStatus === "inspecting"} onClick={startTrial}>{state ? "Replace temporary round-trip trial" : "Start round-trip trial"}</button>
          {state ? <button type="button" onClick={() => { inspectionSequence.current += 1; onChange(null); setDraft(null); setInspectionStatus("idle"); setInspectingFileName(""); setQuery(""); setRowLimit(TASK_TABLE_PAGE_SIZE); if (fileInput.current) fileInput.current.value = ""; }}>Discard temporary trial</button> : null}
          <span>{state ? "Starting again replaces only this temporary browser-memory session." : "Explicit browser-local trial only · no production persistence · no approved export contract."}</span>
        </div>
      </section>
      {state ? <TemporaryProjectSummary state={state} /> : null}
    </div>
  );
}

export function Tier1RoundTripCurrentTime({
  state,
  clock,
  onChange
}: {
  state: Tier1RoundTripWorkspaceState;
  clock: Tier1RoundTripLocationClock;
  onChange: Tier1RoundTripChangeHandler;
}) {
  const [error, setError] = useState("");
  const clockBehindEvidence = clock.minute < state.session.trialState.now;
  function reset() {
    try {
      const current = readTier1RoundTripLocationClock(new Date(), state.session.locationTimeZone);
      onChange({
        session: resetTier1RoundTripSession(state.session, current.minute),
        candidate: null,
        projectResult: null,
        disposition: null
      });
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The current location time could not be read.");
    }
  }
  return (
    <section className="roundtrip-clock" aria-label="Tier 1 current location time">
      <div className="roundtrip-clock-readout"><span>Current location time</span><strong>{formatRoundTripMinute(clock.minute).replace("T", " ")}</strong><small>Device clock · {clock.timeZone}</small></div>
      <div className="roundtrip-clock-actions">
        <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Reset trial</button>
      </div>
      <p>Live device time in the IANA timezone captured when this trial started · not inferred from Project XML or verified by a server · reset preserves the immutable source and removes generated facts/artifacts.</p>
      {clockBehindEvidence ? <p className="trial-form-error" role="alert">Current local wall time is earlier than existing trial evidence. New updates are blocked until the clock catches up; during a daylight-saving rollback, wait through the repeated interval or reset/discard the temporary trial.</p> : null}
      {error ? <p className="trial-form-error" role="alert">{error}</p> : null}
    </section>
  );
}

export function Tier1RoundTripTasksView({
  state,
  currentMinute,
  onOpenTask
}: {
  state: Tier1RoundTripWorkspaceState;
  currentMinute: number;
  onOpenTask: (taskId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [rowLimit, setRowLimit] = useState(TASK_TABLE_PAGE_SIZE);
  const rows = useMemo(
    () => selectTier1RoundTripTaskRows(state.session.trialState.tasks, query),
    [query, state.session.trialState.tasks]
  );
  const trackedLeafCount = rows.filter((task) => !task.summary).length;
  const hierarchyRowCount = rows.length - trackedLeafCount;
  const identityByTaskId = useMemo(
    () => new Map(state.session.sourceTasks.map((task) => [task.trialTaskId, task])),
    [state.session.sourceTasks]
  );
  const currentTrialState = useMemo(
    () => projectTier1RoundTripStateAtMinute(state.session.trialState, currentMinute),
    [currentMinute, state.session.trialState]
  );
  return (
    <>
      <PageHeading eyebrow="Tasks · imported round-trip schedule" title={state.session.trialState.project.name} description="Only imported leaf tasks are tracked. Summary rows remain non-operational Project hierarchy context." status="Browser-local experimental trial" />
      <section className="explorer-tools"><label className="search-control"><Search size={17} aria-hidden="true" /><span className="sr-only">Search imported trial tasks</span><input value={query} onChange={(event) => { setQuery(event.target.value); setRowLimit(TASK_TABLE_PAGE_SIZE); }} placeholder="Search WBS or task" /></label><span>{trackedLeafCount} matching tracked leaf tasks · {hierarchyRowCount} hierarchy rows</span></section>
      <section className="table-panel">
        <div className="table-scroll">
          <table className="data-table task-table">
            <thead><tr><th>WBS / task</th><th>Project UID / ID</th><th>Tracking state</th><th>Planned window</th><th>Duration</th><th>Imported / Tracker progress</th><th>Authority</th></tr></thead>
            <tbody>{rows.slice(0, rowLimit).map((task) => {
              const identity = identityByTaskId.get(task.id);
              if (task.summary) {
                return (
                  <tr key={task.id} className="summary-row">
                    <td><div className="task-name-cell" style={{ paddingInlineStart: `${task.depth * 20}px` }}><span className="wbs">{task.wbs}</span><strong>{task.name}</strong></div></td>
                    <td>UID {identity?.projectTaskUid ?? "—"}<small>ID {identity?.projectTaskId ?? "—"}</small></td>
                    <td><strong>Hierarchy only</strong><small>Not a tracked task</small></td>
                    <td>{formatImportedTrialMinute(task.plannedStart)}<small>to {formatImportedTrialMinute(task.plannedFinish)}</small></td>
                    <td>{formatImportedProjectDuration(identity?.sourceValues.duration ?? null, identity?.sourceValues.durationFormat ?? null, state.session.source.preview)}</td>
                    <td>Not tracked</td>
                    <td>No execution record</td>
                  </tr>
                );
              }
              const projection = selectTaskProjection(currentTrialState, task.id);
              return (
                <tr key={task.id}>
                  <td><div className="task-name-cell" style={{ paddingInlineStart: `${task.depth * 20}px` }}><span className="wbs">{task.wbs}</span><button className="button-link" type="button" onClick={() => onOpenTask(task.id)}>{task.name}</button></div></td>
                  <td>UID {identity?.projectTaskUid ?? "—"}<small>ID {identity?.projectTaskId ?? "—"}</small></td>
                  <td><StatusLabel tone={executionTone(projection.executionState)}>{projection.executionState}</StatusLabel><small>{projection.attention.join(" · ") || "No attention"}</small></td>
                  <td>{formatImportedTrialMinute(task.plannedStart)}<small>to {formatImportedTrialMinute(task.plannedFinish)}</small></td>
                  <td>{formatImportedProjectDuration(identity?.sourceValues.duration ?? null, identity?.sourceValues.durationFormat ?? null, state.session.source.preview)}</td>
                  <td><strong>{projection.progressPercent}%</strong><small>{projection.progressBasis}</small></td>
                  <td>Tier 1 may execute</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {rows.length > rowLimit ? <div className="disabled-action-row"><button type="button" onClick={() => setRowLimit((current) => current + TASK_TABLE_PAGE_SIZE)}>Show {Math.min(TASK_TABLE_PAGE_SIZE, rows.length - rowLimit)} more rows</button><span>Large imported schedules stay responsive by rendering source rows progressively.</span></div> : null}
      </section>
    </>
  );
}

export function Tier1RoundTripTodayView({
  state,
  currentMinute,
  onOpenTask
}: {
  state: Tier1RoundTripWorkspaceState;
  currentMinute: number;
  onOpenTask: (taskId: string) => void;
}) {
  const [rowLimit, setRowLimit] = useState(TASK_TABLE_PAGE_SIZE);
  const currentTrialState = useMemo(
    () => projectTier1RoundTripStateAtMinute(state.session.trialState, currentMinute),
    [currentMinute, state.session.trialState]
  );
  const { start: windowStart, end: windowEnd } = tier1RoundTripLocalDayWindow(
    currentMinute,
    currentTrialState.project.operationalDayStartMinute
  );
  const rows = useMemo(() => {
    const eventTaskIds = new Set(currentTrialState.executionEvents.map((event) => event.taskId));
    const eventInWindowTaskIds = new Set(currentTrialState.executionEvents
      .filter((event) => event.at >= windowStart && event.at < windowEnd)
      .map((event) => event.taskId));
    const openProblemTaskIds = new Set(currentTrialState.problems
      .filter((problem) => problem.status === "open")
      .map((problem) => problem.taskId));
    return currentTrialState.tasks.flatMap((task) => {
      if (task.summary) return [];
      const inPlannedWindow = task.plannedStart !== null && task.plannedFinish !== null
        && task.plannedStart < windowEnd && task.plannedFinish >= windowStart;
      const importedActive = task.importedActualFinish === undefined && task.importedProgress < 100
        && (task.importedActualStart !== undefined || task.importedProgress > 0);
      if (!inPlannedWindow && !eventTaskIds.has(task.id) && !openProblemTaskIds.has(task.id) && !importedActive) return [];
      const executionState = selectExecutionState(currentTrialState, task.id);
      return inPlannedWindow || eventInWindowTaskIds.has(task.id) || executionState === "In Progress"
        || executionState === "Paused" || openProblemTaskIds.has(task.id)
        ? [{ task, executionState }]
        : [];
    });
  }, [currentTrialState, windowEnd, windowStart]);
  const identityByTaskId = useMemo(
    () => new Map(state.session.sourceTasks.map((task) => [task.trialTaskId, task])),
    [state.session.sourceTasks]
  );
  const counts = new Map<ExecutionState, number>([["Not Started", 0], ["In Progress", 0], ["Paused", 0], ["Completed", 0]]);
  for (const { executionState } of rows) {
    const value = executionState;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return (
    <>
      <PageHeading eyebrow="Today · imported round-trip schedule" title="Local calendar-day projection" description={`${formatRoundTripMinute(windowStart).replace("T", " ")} to ${formatRoundTripMinute(windowEnd).replace("T", " ")} · ${state.session.locationTimeZone}`} status="Browser-local experimental trial" />
      <section className="status-strip roundtrip-status-strip">{["Not Started", "In Progress", "Paused", "Completed"].map((label) => <div key={label}><span>{label}</span><strong>{counts.get(label as ExecutionState) ?? 0}</strong></div>)}</section>
      <section className="table-panel"><PanelHeading title="Tracked leaf work in period" detail="Summary hierarchy rows are excluded. Planned passage creates attention only; it never creates In Progress." /><div className="table-scroll"><table className="data-table"><thead><tr><th>Task</th><th>Duration</th><th>State</th><th>Attention</th></tr></thead><tbody>{rows.slice(0, rowLimit).map(({ task, executionState }) => { const projection = selectTaskProjection(currentTrialState, task.id); const identity = identityByTaskId.get(task.id); return <tr key={task.id}><td><button className="button-link" type="button" onClick={() => onOpenTask(task.id)}>{task.wbs} · {task.name}</button></td><td>{formatImportedProjectDuration(identity?.sourceValues.duration ?? null, identity?.sourceValues.durationFormat ?? null, state.session.source.preview)}</td><td>{executionState}</td><td>{projection.attention.join(" · ") || "None"}</td></tr>; })}</tbody></table></div>{rows.length > rowLimit ? <div className="disabled-action-row"><button type="button" onClick={() => setRowLimit((current) => current + TASK_TABLE_PAGE_SIZE)}>Show {Math.min(TASK_TABLE_PAGE_SIZE, rows.length - rowLimit)} more tasks</button><span>Showing {rowLimit} of {rows.length} tracked leaf tasks in this trial day.</span></div> : null}</section>
    </>
  );
}

export function Tier1RoundTripTaskDashboard({
  state,
  currentMinute,
  taskId,
  onBack,
  onChange
}: {
  state: Tier1RoundTripWorkspaceState;
  currentMinute: number;
  taskId: string;
  onBack: () => void;
  onChange: Tier1RoundTripChangeHandler;
}) {
  const currentTrialState = useMemo(
    () => projectTier1RoundTripStateAtMinute(state.session.trialState, currentMinute),
    [currentMinute, state.session.trialState]
  );
  const task = currentTrialState.tasks.find((item) => item.id === taskId);
  const identity = state.session.sourceTasks.find((item) => item.trialTaskId === taskId);
  const [active, setActive] = useState("Overview");
  const tabs = ["Overview", "Execution", "People", "Discussion", "Delays / Problems", "Actions", "Evidence", "History", "Project context"];
  if (!task || task.summary) {
    return (
      <>
        <button className="back-link" type="button" onClick={onBack}>← Back to Tasks</button>
        <section className="detail-panel roundtrip-empty-project">
          <h1>{task?.name ?? "Task unavailable"}</h1>
          <p>{task ? "This imported summary row is Project hierarchy context only. It has no tracked-task dashboard or execution record." : "The requested imported leaf task is unavailable in this temporary session."}</p>
          <button className="button-primary" type="button" onClick={onBack}>Return to tracked leaf tasks</button>
        </section>
      </>
    );
  }
  const projection = selectTaskProjection(currentTrialState, taskId);
  return (
    <>
      <button className="back-link" type="button" onClick={onBack}>← Back to Tasks</button>
      <PageHeading eyebrow={`${projection.task.wbs} · Project UID ${identity?.projectTaskUid ?? "—"}`} title={projection.task.name} description="Tracked executable leaf · Tier 1 has unrestricted project authority" status="Browser-local experimental trial" />
      <section className="task-state-header"><div><span>Execution state</span><StatusLabel tone={executionTone(projection.executionState)}>{projection.executionState}</StatusLabel><small>{roundTripExecutionBasis(state, taskId)}</small></div><div><span>Schedule attention</span><strong>{projection.attention.join(" · ") || "None"}</strong><small>Attention remains separate from execution.</small></div><div><span>Tier 1 authority</span><strong>May execute this task</strong><small>No assignment/category restriction.</small></div></section>
      <nav className="section-tabs roundtrip-dashboard-tabs" aria-label="Imported Task Dashboard sections">{tabs.map((tab) => <button type="button" className={active === tab ? "selected" : ""} aria-current={active === tab ? "page" : undefined} onClick={() => setActive(tab)} key={tab}>{tab}</button>)}</nav>
      <section className="detail-panel trial-dashboard-panel">
        {active === "Overview" ? <RoundTripOverview state={state} currentMinute={currentMinute} taskId={taskId} /> : null}
        {active === "Execution" ? <Tier1ExecutionPanel state={state} currentMinute={currentMinute} taskId={taskId} onChange={onChange} /> : null}
        {active === "People" ? <RoundTripPeople state={state} taskId={taskId} /> : null}
        {active === "Discussion" ? <RoundTripPlaceholder title="Discussion" detail="No discussion records have been created in this temporary session." /> : null}
        {active === "Delays / Problems" ? <RoundTripProblems state={state} currentMinute={currentMinute} taskId={taskId} onChange={onChange} /> : null}
        {active === "Actions" ? <RoundTripActions state={state} currentMinute={currentMinute} taskId={taskId} onChange={onChange} /> : null}
        {active === "Evidence" ? <RoundTripPlaceholder title="Evidence" detail="Evidence attachment storage is outside this browser-local trial." /> : null}
        {active === "History" ? <RoundTripTaskHistory state={state} taskId={taskId} /> : null}
        {active === "Project context" ? <RoundTripProjectContext state={state} taskId={taskId} /> : null}
      </section>
    </>
  );
}

export function Tier1RoundTripExportPanel({ state, onChange }: { state: Tier1RoundTripWorkspaceState | null; onChange: Tier1RoundTripChangeHandler }) {
  if (!state) return <section className="detail-panel"><PanelHeading title="Start with Import" detail="Choose and start a temporary Project XML schedule before reviewing Tracker facts." /><p className="trial-placeholder">No temporary round-trip project is active.</p></section>;
  return <RoundTripExportWorkflow state={state} onChange={onChange} />;
}

export function Tier1RoundTripHistoryPanel({ state }: { state: Tier1RoundTripWorkspaceState | null }) {
  return (
    <section className="table-panel">
      <PanelHeading title="Current-session round-trip history" detail="Browser-memory trial events only; reload or disposal removes them." />
      <ol className="activity-list trial-history-list">{state ? state.session.history.map((event) => <li key={event.id}><strong>{formatRoundTripMinute(event.at).replace("T", " ")}</strong><span>{event.summary}</span></li>) : <li>No temporary round-trip trial has started.</li>}</ol>
    </section>
  );
}

function RoundTripExportWorkflow({ state, onChange }: { state: Tier1RoundTripWorkspaceState; onChange: Tier1RoundTripChangeHandler }) {
  const [error, setError] = useState("");
  const stateRef = useRef(state);
  const resultInspectionSequence = useRef(0);
  const [notes, setNotes] = useState(state.disposition?.notes ?? "");
  const [disposition, setDisposition] = useState<RoundTripDisposition | "">(state.disposition?.value ?? "");
  const proposals = useMemo(() => deriveTier1RoundTripMappingProposals(state.session), [state.session]);
  const mappings = mergeTier1RoundTripMappingSelections(proposals, state.session.mappings);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => () => {
    resultInspectionSequence.current += 1;
  }, []);

  useEffect(() => {
    setNotes(state.disposition?.notes ?? "");
    setDisposition(state.disposition?.value ?? "");
  }, [state.disposition, state.projectResult?.sha256]);

  function updateMapping(id: string, patch: Partial<RoundTripMappingSelection>) {
    const nextMappings = updateTier1RoundTripMappingSelection(state.session, mappings, id, patch);
    onChange({ ...state, session: { ...state.session, mappings: nextMappings, candidate: null, result: null, disposition: null }, candidate: null, projectResult: null, disposition: null });
    setError("");
  }

  async function generateCandidate() {
    try {
      const projectMappings = mappings
        .filter((mapping): mapping is RoundTripMappingSelection & { projectField: ProjectXmlMappingField } => mapping.included && mapping.projectField !== null)
        .map((mapping) => createProjectXmlMapping({
        taskUid: mapping.projectTaskUid,
        expectedTaskId: state.session.sourceTasks.find((task) => task.trialTaskId === mapping.trialTaskId)?.projectTaskId ?? undefined,
        expectedTaskName: state.session.sourceTasks.find((task) => task.trialTaskId === mapping.trialTaskId)?.name,
        expectedTaskWbs: state.session.sourceTasks.find((task) => task.trialTaskId === mapping.trialTaskId)?.wbs ?? undefined,
        expectedTaskSummary: false,
        field: mapping.projectField,
        expectedSourceValue: stringifySourceValue(mapping.sourceValue),
        proposedValue: String(mapping.proposedValue),
        included: true
      }));
      const candidate = await generateProjectXmlCandidate(state.session.source.xml, projectMappings);
      if (candidate.sourceXml !== state.session.source.xml
        || (state.session.source.hash !== null && candidate.sourceSha256 !== state.session.source.hash)) {
        throw new Error("Candidate integrity check failed: the retained source no longer matches its original bytes.");
      }
      const candidatePreview = parseProjectXmlPreview(candidate.candidateXml);
      assertCandidatePreviewPreserved(state.session.source.preview, candidatePreview);
      if (stateRef.current !== state) {
        setError("Trial state changed while the candidate was generated. Review the current facts and generate again.");
        return;
      }
      onChange((current) => current === state
        ? { ...state, session: { ...state.session, mappings }, candidate, projectResult: null, disposition: null }
        : current);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The experimental candidate could not be generated.");
    }
  }

  async function inspectResult(file: File | null) {
    const requestId = resultInspectionSequence.current + 1;
    resultInspectionSequence.current = requestId;
    if (!file || !state.candidate) return;
    try {
      const { xml, bytes } = await readUtf8ProjectXml(file);
      const preview = parseProjectXmlPreview(xml);
      const candidatePreview = parseProjectXmlPreview(state.candidate.candidateXml);
      const selectedChanges = state.candidate.changes.map((change, index) => ({ id: `selected-${index + 1}`, taskUid: change.taskUid, expectedTaskId: change.taskId, taskName: change.taskName ?? "Unnamed task", wbs: change.taskWbs, field: change.field, sourceValue: normalizeComparableValue(change.field, change.sourceValue), candidateValue: normalizeComparableValue(change.field, change.candidateValue) }));
      const differences = buildConservativeProjectDifferences({
        candidateXml: state.candidate.candidateXml,
        resultXml: xml,
        selectedChanges: state.candidate.changes,
        candidate: candidatePreview,
        projectResult: preview
      });
      const comparison = compareProjectRoundTrip({ source: state.session.source.preview, candidate: candidatePreview, projectResult: preview, selectedChanges, structuralDifferences: differences });
      const sha256 = await sha256Hex(bytes);
      if (resultInspectionSequence.current !== requestId || stateRef.current !== state) {
        setError("Trial state changed while the Project result was inspected. Choose the result again for the current candidate.");
        return;
      }
      onChange((current) => current === state
        ? { ...state, projectResult: { fileName: file.name, xml, preview, sha256, comparison, differences, annotations: [] }, disposition: null }
        : current);
      setError("");
    } catch (caught) {
      if (resultInspectionSequence.current !== requestId) return;
      setError(caught instanceof Error ? caught.message : "The Project-result XML could not be compared.");
    }
  }

  function saveDisposition() {
    try {
      if (!disposition) throw new Error("Choose a current-session trial disposition.");
      const record = recordRoundTripDisposition(disposition, notes);
      onChange({ ...state, disposition: { value: record.disposition, notes: record.notes } });
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The trial disposition could not be recorded.");
    }
  }

  function classifyDifference(differenceId: string, classification: DifferenceAnnotation["classification"] | "") {
    const current = state.projectResult;
    if (!current) return;
    const annotations = current.annotations.filter((item) => item.differenceId !== differenceId);
    const previous = current.annotations.find((item) => item.differenceId === differenceId);
    if (classification) annotations.push({ differenceId, classification, note: previous?.note });
    const differences = current.comparison.differences.map((difference) => difference.id === differenceId ? { ...difference, classification: classification || "Unclassified difference — manual review required" as const } : difference);
    onChange({ ...state, projectResult: { ...current, annotations, comparison: { ...current.comparison, differences } }, disposition: null });
  }

  function noteDifference(differenceId: string, note: string) {
    const current = state.projectResult;
    if (!current) return;
    const existing = current.annotations.find((item) => item.differenceId === differenceId);
    if (!existing) return;
    const annotations = current.annotations.map((item) => item.differenceId === differenceId ? { ...item, note } : item);
    const differences = current.comparison.differences.map((difference) => difference.id === differenceId ? { ...difference, note } : difference);
    onChange({ ...state, projectResult: { ...current, annotations, comparison: { ...current.comparison, differences } } });
  }

  return (
    <div className="roundtrip-export-stack">
      <section className="detail-panel">
        <PanelHeading title="Tracker facts and experimental Project mappings" detail="No mapping is included by default. Start/Finish fields are proposed; progress requires an explicit field choice." />
        {mappings.length === 0 ? <p className="trial-placeholder">Create a Tracker Start, Finish, or field-progress observation from an imported leaf Task Dashboard first.</p> : <div className="table-scroll"><table className="data-table roundtrip-mapping-table"><thead><tr><th>Include</th><th>Tracker fact</th><th>Task identity</th><th>Source value</th><th>Experimental Project field</th><th>Proposed value</th></tr></thead><tbody>{mappings.map((mapping) => <tr key={mapping.id}><td><input aria-label={`Include ${mapping.trackerFact} mapping for ${mapping.projectTaskUid}`} type="checkbox" checked={mapping.included} disabled={mapping.projectField === null} onChange={(event) => updateMapping(mapping.id, { included: event.target.checked })} /></td><td>{mapping.trackerFact}<small>{mapping.trackerFactId}</small></td><td>UID {mapping.projectTaskUid}</td><td>{String(mapping.sourceValue ?? "Absent")}</td><td><select aria-label={`Project field for ${mapping.trackerFact}`} value={mapping.projectField ?? ""} onChange={(event) => updateMapping(mapping.id, { projectField: (event.target.value || null) as RoundTripMappingSelection["projectField"], included: false })}><option value="">Choose experimentally</option>{mapping.trackerFact === "start" ? <option value="ActualStart">Actual Start</option> : null}{mapping.trackerFact === "finish" ? <option value="ActualFinish">Actual Finish</option> : null}{mapping.trackerFact === "progress" ? <><option value="PercentComplete">% Complete</option><option value="PhysicalPercentComplete">Physical % Complete</option></> : null}</select></td><td>{String(mapping.proposedValue)}</td></tr>)}</tbody></table></div>}
        <div className="disabled-action-row"><button className="button-primary" type="button" disabled={!mappings.some((mapping) => mapping.included && mapping.projectField)} onClick={() => void generateCandidate()}>Generate experimental candidate</button><span>Separate artifact · complete original source plus selected field edits only</span></div>
        {error ? <p className="trial-form-error" role="alert">{error}</p> : null}
      </section>
      {state.candidate ? <CandidateReview state={state} onResult={inspectResult} /> : null}
      {state.projectResult ? <RoundTripResultReview result={state.projectResult} disposition={disposition} notes={notes} onDisposition={setDisposition} onNotes={setNotes} onClassify={classifyDifference} onDifferenceNote={noteDifference} onSave={saveDisposition} /> : null}
    </div>
  );
}

function CandidateReview({ state, onResult }: { state: Tier1RoundTripWorkspaceState; onResult: (file: File | null) => Promise<void> }) {
  const candidate = state.candidate!;
  function download() {
    const blob = new Blob([candidate.candidateXml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = trialCandidateFileName(state.session.source.preview.projectName);
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="detail-panel">
      <PanelHeading title="Complete-source candidate review" detail="The candidate is a separate browser-generated artifact; the original source string remains unchanged." />
      <dl className="detail-list"><div><dt>Source file</dt><dd>{state.session.source.fileName}</dd></div><div><dt>Original source-file SHA-256</dt><dd><code>{candidate.sourceSha256}</code></dd></div><div><dt>Candidate-file SHA-256</dt><dd><code>{candidate.candidateSha256}</code></dd></div><div><dt>Selected field changes</dt><dd>{candidate.changes.length}</dd></div><div><dt>Raw integrity check</dt><dd>{candidate.sourceXml === state.session.source.xml && candidate.sourceSha256 === state.session.source.hash ? "Complete source retained; original unchanged; candidate is separate" : "Integrity check unavailable"}</dd></div></dl>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Task</th><th>Field</th><th>Source</th><th>Candidate</th></tr></thead><tbody>{candidate.changes.map((change) => <tr key={`${change.taskUid}-${change.field}`}><td>UID {change.taskUid} · ID {change.taskId ?? "—"}<small>{change.taskWbs ?? "—"} · {change.taskName}</small></td><td>{change.field}</td><td>{change.sourceValue ?? "Absent"}</td><td>{change.candidateValue}</td></tr>)}</tbody></table></div>
      <div className="disabled-action-row"><button className="button-primary" type="button" onClick={download}><Download size={15} aria-hidden="true" /> Download trial XML</button><span>Original source is not overwritten.</span></div>
      <ol className="sequence-list"><li>Open the generated candidate XML in Microsoft Project.</li><li>Confirm the intended task by UID, ID, name, and WBS.</li><li>Confirm the selected Tracker input appears.</li><li>Let Microsoft Project recalculate normally and review obvious consequences.</li><li>Save/export the result as a new XML file. Do not overwrite the source.</li><li>Return here and choose that Project-result XML.</li></ol>
      <label className="import-file-zone"><input type="file" accept=".xml,.mspdi.xml" onChange={(event) => void onResult(event.target.files?.[0] ?? null)} /><span><strong>Choose Microsoft Project result XML</strong><small>Local inspection and comparison only.</small></span></label>
    </section>
  );
}

function RoundTripResultReview({ result, disposition, notes, onDisposition, onNotes, onClassify, onDifferenceNote, onSave }: { result: Tier1RoundTripProjectResult; disposition: RoundTripDisposition | ""; notes: string; onDisposition: (value: RoundTripDisposition | "") => void; onNotes: (value: string) => void; onClassify: (differenceId: string, classification: DifferenceAnnotation["classification"] | "") => void; onDifferenceNote: (differenceId: string, note: string) => void; onSave: () => void }) {
  return (
    <section className="detail-panel">
      <PanelHeading title="Source → Tracker → candidate → Project result" detail="Only selected input is classified automatically. Other differences require human review." />
      <dl className="detail-list"><div><dt>Project result</dt><dd>{result.fileName}</dd></div><div><dt>Project result-file SHA-256</dt><dd><code>{result.sha256}</code></dd></div><div><dt>Project identity</dt><dd>{result.comparison.projectIdentity.status}{result.comparison.projectIdentity.matchedBy ? ` by ${result.comparison.projectIdentity.matchedBy}` : ""}</dd></div></dl>
      <div className="table-scroll"><table className="data-table roundtrip-result-table"><thead><tr><th>Task / field</th><th>Candidate</th><th>Project result</th><th>Classification</th></tr></thead><tbody>{result.comparison.selectedInputs.map((input) => <tr key={input.change.id}><td>UID {input.change.taskUid} · {input.change.field}</td><td>{String(input.change.candidateValue)}</td><td>{String(input.resultValue ?? "Absent")}</td><td>Tracker-selected input · {input.landed ? "landed" : "did not land"}</td></tr>)}{result.comparison.differences.map((difference) => { const annotation = result.annotations.find((item) => item.differenceId === difference.id); return <tr key={difference.id}><td>{difference.path}</td><td>{String(difference.candidateValue ?? "Absent")}</td><td>{String(difference.resultValue ?? "Absent")}</td><td><select aria-label={`Classify ${difference.path}`} value={difference.classification === "Unclassified difference — manual review required" ? "" : difference.classification} onChange={(event) => onClassify(difference.id, event.target.value as DifferenceAnnotation["classification"] | "")}><option value="">Unclassified — manual review required</option><option>Microsoft Project-calculated consequence</option><option>Human Project edit</option><option>Unexplained difference</option></select><input aria-label={`Review note for ${difference.path}`} placeholder="Optional review note" disabled={!annotation} value={annotation?.note ?? ""} onChange={(event) => onDifferenceNote(difference.id, event.target.value)} /></td></tr>; })}</tbody></table></div>
      {result.comparison.issues.length ? <ul className="import-error">{result.comparison.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
      <div className="roundtrip-disposition-form"><label><span>Current-session disposition</span><select required value={disposition} onChange={(event) => onDisposition(event.target.value as RoundTripDisposition | "")}><option value="" disabled>Choose a trial disposition</option>{ROUND_TRIP_DISPOSITIONS.map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Optional notes</span><textarea rows={3} value={notes} onChange={(event) => onNotes(event.target.value)} /></label><button type="button" disabled={!disposition} onClick={onSave}>Record trial disposition</button><small>This is evidence only, not production approval.</small></div>
    </section>
  );
}

function Tier1ExecutionPanel({
  state,
  currentMinute,
  taskId,
  onChange
}: {
  state: Tier1RoundTripWorkspaceState;
  currentMinute: number;
  taskId: string;
  onChange: Tier1RoundTripChangeHandler;
}) {
  const projection = selectTaskProjection(projectTier1RoundTripStateAtMinute(state.session.trialState, currentMinute), taskId);
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");
  const activePause = state.session.trialState.pauseIntervals.find((pause) => pause.taskId === taskId && pause.endedAt === undefined);
  const linkedProblem = activePause?.problemId ? state.session.trialState.problems.find((problem) => problem.id === activePause.problemId && problem.status === "open") : undefined;
  function apply(action: Parameters<typeof applyTier1RoundTripExecutionAction>[1]) {
    try {
      onChange({
        session: applyTier1RoundTripExecutionAction(state.session, action, readSessionCurrentMinute(state.session)),
        candidate: null,
        projectResult: null,
        disposition: null
      });
      setError(""); setOpen(""); return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The execution event could not be recorded."); return false; }
  }
  function progress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const session = recordTier1RoundTripProgress(
        state.session,
        { taskId, completionPercent: Number(data.get("completion")), remainingWork: required(data, "remaining"), nextIssue: optional(data, "issue"), note: optional(data, "note") },
        readSessionCurrentMinute(state.session)
      );
      onChange({ session, candidate: null, projectResult: null, disposition: null });
      setError(""); event.currentTarget.reset();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The progress observation could not be recorded."); }
  }
  if (projection.task.summary) return <><PanelHeading title="Execution" detail="Summary tasks are not executable." /><p className="trial-placeholder">Open an imported leaf task to record Tier 1 execution.</p></>;
  const current = formatRoundTripMinute(currentMinute).replace("T", " ");
  const formId = (action: string) => `roundtrip-execution-${taskId}-${action}`;
  return (
    <><PanelHeading title="Tier 1 execution" detail={`Actions capture current location time when submitted (${current} · ${state.session.locationTimeZone}); there is no manual date/time entry.`} />
      <div className="roundtrip-execution-actions">
        {projection.executionState === "Not Started" ? <><button type="button" aria-expanded={open === "cant"} aria-controls={formId("cant")} onClick={() => setOpen((currentOpen) => currentOpen === "cant" ? "" : "cant")}>Can't Start</button><button type="button" aria-expanded={open === "start"} aria-controls={formId("start")} onClick={() => setOpen((currentOpen) => currentOpen === "start" ? "" : "start")}>Start</button></> : null}
        {projection.executionState === "In Progress" ? <><button type="button" aria-expanded={open === "pause"} aria-controls={formId("pause")} onClick={() => setOpen((currentOpen) => currentOpen === "pause" ? "" : "pause")}>Pause</button><button type="button" aria-expanded={open === "finish"} aria-controls={formId("finish")} onClick={() => setOpen((currentOpen) => currentOpen === "finish" ? "" : "finish")}>Finish</button></> : null}
        {projection.executionState === "Paused" ? <button type="button" aria-expanded={open === "resume"} aria-controls={formId("resume")} onClick={() => setOpen((currentOpen) => currentOpen === "resume" ? "" : "resume")}>Resume</button> : null}
      </div>
      {open === "cant" ? <form id={formId("cant")} className="roundtrip-execution-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); apply({ type: "cant-start", taskId, actorId: TIER1_ROUNDTRIP_ACTOR_ID, reason: required(data, "reason"), whatIsNeeded: required(data, "needed"), createProblem: data.get("problem") === "yes", createAction: data.get("action") === "yes" }); }}><label>Structured reason<select name="reason" required defaultValue=""><option value="" disabled>Choose reason</option><option>Access or scaffold unavailable</option><option>Permit or isolation unavailable</option><option>Material unavailable</option><option>Other operational constraint</option></select></label><label>What needs to happen?<textarea name="needed" required rows={2} /></label><label><input type="checkbox" name="problem" value="yes" /> Create linked problem</label><label><input type="checkbox" name="action" value="yes" /> Create linked action</label><button type="submit">Record Can't Start</button></form> : null}
      {open === "start" ? <form id={formId("start")} className="roundtrip-execution-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); apply({ type: "start", taskId, actorId: TIER1_ROUNDTRIP_ACTOR_ID, lateCause: optional(data, "late"), actionStillNeeded: optional(data, "needed") }); }}>{projection.task.plannedStart !== null && currentMinute > projection.task.plannedStart ? <><label>Late-start cause<textarea name="late" required rows={2} /></label><label>What still needs action?<textarea name="needed" rows={2} /></label></> : <p>{projection.task.plannedStart === null ? "No planned Start was supplied; this trial does not infer lateness." : "Starting on time does not require a reason."}</p>}<button type="submit">Start now</button></form> : null}
      {open === "pause" ? <form id={formId("pause")} className="roundtrip-execution-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); apply({ type: "pause", taskId, actorId: TIER1_ROUNDTRIP_ACTOR_ID, reason: required(data, "reason"), whatIsNeeded: required(data, "needed"), adverseDelay: data.get("classification") === "adverse", createAction: data.get("action") === "yes" }); }}><label>Pause reason<input name="reason" required /></label><label>Classification<select name="classification" defaultValue="normal"><option value="normal">Normal pause — not an adverse delay</option><option value="adverse">Adverse delay — create linked problem</option></select></label><label>What needs to happen?<textarea name="needed" required rows={2} /></label><label><input type="checkbox" name="action" value="yes" /> Create linked action</label><button type="submit">Pause now</button></form> : null}
      {open === "resume" ? <form id={formId("resume")} className="roundtrip-execution-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); apply({ type: "resume", taskId, actorId: TIER1_ROUNDTRIP_ACTOR_ID, issueResolution: linkedProblem ? required(data, "resolution") as "resolved" | "remains-open" : "not-applicable" }); }}>{linkedProblem ? <label>Linked problem state<select name="resolution" required defaultValue=""><option value="" disabled>Choose explicitly</option><option value="resolved">Resolved</option><option value="remains-open">Work resumed; problem remains open</option></select></label> : <p>No open structured problem is linked.</p>}<button type="submit">Resume now</button></form> : null}
      {open === "finish" ? <form id={formId("finish")} className="roundtrip-execution-form" onSubmit={(event) => { event.preventDefault(); apply({ type: "finish", taskId, actorId: TIER1_ROUNDTRIP_ACTOR_ID }); }}><p>Confirm the task is complete. Current location time is captured automatically.</p><button type="submit">Confirm Finish</button></form> : null}
      {projection.executionState === "Completed"
        ? <p className="trial-placeholder">This task is complete. Unfinished-progress observations are no longer available.</p>
        : <form className="roundtrip-progress-form" onSubmit={progress}><strong>How much of the task is complete?</strong><label>Completion percentage<input name="completion" type="number" min="0" max="100" required /></label><label>What remains?<textarea name="remaining" required rows={2} /></label><label>Next issue (enter None if none)<input name="issue" required /></label><label>Optional note<input name="note" /></label><button type="submit">Record Tracker progress observation</button><small>Progress alone does not silently create Start.</small></form>}
      {error ? <p className="trial-form-error" role="alert">{error}</p> : null}
    </>
  );
}

function RoundTripOverview({ state, currentMinute, taskId }: { state: Tier1RoundTripWorkspaceState; currentMinute: number; taskId: string }) {
  const projection = selectTaskProjection(projectTier1RoundTripStateAtMinute(state.session.trialState, currentMinute), taskId);
  const identity = state.session.sourceTasks.find((item) => item.trialTaskId === taskId);
  return <><PanelHeading title="Overview" detail="Imported Project facts and local Tracker truth." /><dl className="detail-list"><div><dt>Execution</dt><dd>{projection.executionState}</dd></div><div><dt>Imported duration</dt><dd>{formatImportedProjectDuration(identity?.sourceValues.duration ?? null, identity?.sourceValues.durationFormat ?? null, state.session.source.preview)}</dd></div><div><dt>Progress</dt><dd>{projection.progressPercent}%</dd></div><div><dt>Progress basis</dt><dd>{projection.progressBasis}</dd></div><div><dt>Active problems</dt><dd>{projection.activeProblems.length}</dd></div></dl></>;
}
function RoundTripPeople({ state, taskId }: { state: Tier1RoundTripWorkspaceState; taskId: string }) { const task = state.session.trialState.tasks.find((item) => item.id === taskId); return <><PanelHeading title="People" detail="Authority is explicit and browser-local for this Tier 1-only trial." /><dl className="detail-list"><div><dt>Current operator</dt><dd>Tier 1 round-trip reviewer</dd></div><div><dt>Task authority</dt><dd>{task?.summary ? "Summary inspection only" : "May execute and update this leaf"}</dd></div><div><dt>Derived assignments</dt><dd>None — Project resource data never creates application authority</dd></div></dl></>; }
function RoundTripProblems({ state, currentMinute, taskId, onChange }: { state: Tier1RoundTripWorkspaceState; currentMinute: number; taskId: string; onChange: Tier1RoundTripChangeHandler }) {
  const projection = selectTaskProjection(projectTier1RoundTripStateAtMinute(state.session.trialState, currentMinute), taskId);
  const [error, setError] = useState("");
  return <><PanelHeading title="Delays / Problems" detail="Pause intervals remain distinct from adverse problems." /><ul className="record-list trial-action-records">{projection.activeProblems.length ? projection.activeProblems.map((problem) => <li key={problem.id}><strong>{problem.reason}</strong><span>{problem.whatIsNeeded}</span><button type="button" onClick={() => { try { onChange({ ...state, session: applyTier1RoundTripRecordAction(state.session, { type: "resolve-problem", problemId: problem.id, actorId: TIER1_ROUNDTRIP_ACTOR_ID }, readSessionCurrentMinute(state.session)), candidate: null, projectResult: null, disposition: null }); setError(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "The problem could not be resolved."); } }}>Resolve problem now</button></li>) : <li><strong>No open problem</strong><span>No structured adverse problem is active.</span></li>}</ul>{error ? <p className="trial-form-error" role="alert">{error}</p> : null}</>;
}
function RoundTripActions({ state, currentMinute, taskId, onChange }: { state: Tier1RoundTripWorkspaceState; currentMinute: number; taskId: string; onChange: Tier1RoundTripChangeHandler }) {
  const projection = selectTaskProjection(projectTier1RoundTripStateAtMinute(state.session.trialState, currentMinute), taskId);
  const [error, setError] = useState("");
  return <><PanelHeading title="Actions" detail="Local actions linked from Can't Start or Pause." /><ul className="record-list trial-action-records">{projection.openActions.length ? projection.openActions.map((action) => <li key={action.id}><strong>{action.description}</strong><span>Open in this browser-memory trial</span><button type="button" onClick={() => { try { onChange({ ...state, session: applyTier1RoundTripRecordAction(state.session, { type: "complete-action", actionId: action.id, actorId: TIER1_ROUNDTRIP_ACTOR_ID }, readSessionCurrentMinute(state.session)), candidate: null, projectResult: null, disposition: null }); setError(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "The action could not be completed."); } }}>Complete action now</button></li>) : <li><strong>No open action</strong><span>No task action is currently outstanding.</span></li>}</ul>{error ? <p className="trial-form-error" role="alert">{error}</p> : null}</>;
}
function RoundTripPlaceholder({ title, detail }: { title: string; detail: string }) { return <><PanelHeading title={title} detail="Browser-local experimental trial" /><p className="trial-placeholder">{detail}</p></>; }
function RoundTripTaskHistory({ state, taskId }: { state: Tier1RoundTripWorkspaceState; taskId: string }) { const progressEvents = state.session.history.filter((item) => item.taskId === taskId && item.type === "progress-observation"); const events = [...state.session.trialState.history.filter((item) => item.taskId === taskId), ...progressEvents].sort((a, b) => b.at - a.at); return <><PanelHeading title="History" detail="Imported activation and local execution/progress events." /><ol className="activity-list trial-history-list">{events.map((event) => <li key={event.id}><strong>{formatRoundTripMinute(event.at).replace("T", " ")}</strong><span>{event.summary}</span></li>)}</ol></>; }
function RoundTripProjectContext({ state, taskId }: { state: Tier1RoundTripWorkspaceState; taskId: string }) { const identity = state.session.sourceTasks.find((item) => item.trialTaskId === taskId); return <><PanelHeading title="Project context" detail="Immutable imported identity and source values." /><dl className="detail-list"><div><dt>Project task UID / ID</dt><dd>{identity?.projectTaskUid} / {identity?.projectTaskId ?? "—"}</dd></div><div><dt>WBS</dt><dd>{identity?.wbs ?? "—"}</dd></div><div><dt>Imported Start</dt><dd>{identity?.sourceValues.start ?? "Absent"}</dd></div><div><dt>Imported Finish</dt><dd>{identity?.sourceValues.finish ?? "Absent"}</dd></div><div><dt>Imported Duration</dt><dd>{formatImportedProjectDuration(identity?.sourceValues.duration ?? null, identity?.sourceValues.durationFormat ?? null, state.session.source.preview)}</dd></div><div><dt>Imported Actual Start</dt><dd>{identity?.sourceValues.actualStart ?? "Absent"}</dd></div><div><dt>Imported Actual Finish</dt><dd>{identity?.sourceValues.actualFinish ?? "Absent"}</dd></div><div><dt>Imported % Complete</dt><dd>{identity?.sourceValues.percentComplete ?? "Absent"}</dd></div></dl></>; }
function TemporaryProjectSummary({ state }: { state: Tier1RoundTripWorkspaceState }) { return <section className="detail-panel"><PanelHeading title="Temporary round-trip trial active" detail="Imported source is the current browser-memory schedule context." /><dl className="detail-list"><div><dt>Source</dt><dd>{state.session.source.fileName}</dd></div><div><dt>Project</dt><dd>{state.session.trialState.project.name}</dd></div><div><dt>Time source</dt><dd>{state.session.initialTimeSource} · {state.session.locationTimeZone}</dd></div><div><dt>Persistence</dt><dd>None</dd></div></dl></section>; }
function RoundTripSourceTaskTable({ tasks, settings }: { tasks: ProjectXmlPreview["tasks"]; settings: ProjectXmlPreview }) { return <div className="table-scroll"><table className="data-table import-task-table"><thead><tr><th>WBS / task</th><th>UID</th><th>ID</th><th>Type</th><th>Start</th><th>Finish</th><th>Duration</th><th>Imported progress</th></tr></thead><tbody>{tasks.map((task, index) => <tr key={`${task.uid ?? "no-uid"}:${task.id ?? "no-id"}:${index}`} className={task.summary ? "summary-row" : ""}><td>{task.wbs ?? task.outlineNumber ?? "—"} · {task.name}</td><td>{task.uid ?? "—"}</td><td>{task.id ?? "—"}</td><td>{task.summary ? "Hierarchy summary" : "Tracked leaf"}</td><td>{task.start ?? "—"}</td><td>{task.finish ?? "—"}</td><td>{formatImportedProjectDuration(task.duration, task.durationFormat, settings)}</td><td>{task.percentComplete === null ? "—" : `${task.percentComplete}%`}</td></tr>)}</tbody></table></div>; }

function stringifySourceValue(value: string | number | null) { return value === null ? null : String(value); }
function normalizeComparableValue(field: ProjectXmlMappingField, value: string | number | null) { if (value === null) return null; return field === "PercentComplete" || field === "PhysicalPercentComplete" ? Number(value) : String(value); }
function roundTripExecutionBasis(state: Tier1RoundTripWorkspaceState, taskId: string) { const identity = state.session.sourceTasks.find((item) => item.trialTaskId === taskId); const trackerEvents = state.session.trialState.executionEvents.filter((event) => event.taskId === taskId); if (trackerEvents.length) return "Tracker trial execution event"; if (identity?.sourceValues.actualFinish) return "Imported Project Actual Finish"; if (identity?.sourceValues.actualStart || (identity?.sourceValues.percentComplete ?? 0) > 0) return "Imported Project execution/progress evidence"; return "No imported or Tracker execution evidence"; }
function trialCandidateFileName(projectName: string) { const safe = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"; return `${safe}-shutdown-tracker-trial.xml`; }
function executionTone(state: ExecutionState) { return state === "Completed" ? "success" as const : state === "Paused" ? "warning" as const : state === "In Progress" ? "info" as const : "neutral" as const; }
function formatImportedTrialMinute(value: number | null) { return value === null ? "Not supplied" : formatRoundTripMinute(value).replace("T", " "); }
function readSessionCurrentMinute(session: Tier1RoundTripSession) { return readTier1RoundTripLocationClock(new Date(), session.locationTimeZone).minute; }
function required(data: FormData, name: string) { const value = data.get(name); if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`); return value.trim(); }
function optional(data: FormData, name: string) { const value = data.get(name); return typeof value === "string" && value.trim() ? value.trim() : undefined; }
