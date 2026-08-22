import { useMemo, useState } from "react";
import {
  createShutdownTrackerApiClient,
  type ExportArtifactGenerationResponse,
  type ExportCandidateFieldName,
  type ExportCandidateRecord,
  type ExportPreviewDetail,
  type ImportBatchRecord,
  type ImportReviewSnapshotDetail,
  type ImportReviewSnapshotSummary,
  type ImportReviewTaskRow,
  type ProjectParseSummaryResponse
} from "@shutdown-tracker/api-client";
import {
  parseProjectXmlPreview,
  type ProjectXmlPreview,
  type ProjectXmlTaskPreview
} from "./projectXmlPreview";
import "./roundTripWorkspace.css";

const ACTOR_KEY = "shutdown-tracker.round-trip.actor-id";
const BASE_URL_KEY = "shutdown-tracker.round-trip.api-base-url";
const DEFAULT_ACTOR_ID = "00000000-0000-0000-0000-000000000001";

type ActivityItem = {
  at: string;
  label: string;
  detail: string;
  error?: boolean;
};

type ReviewProject = {
  id: string;
  name: string;
  status: string;
  timezone: string;
};

type ParseSnapshotResponse = {
  importBatch: ImportBatchRecord;
  snapshot: ImportReviewSnapshotDetail;
  parseSummary: ProjectParseSummaryResponse;
  message: string;
};

type ReviewRow = {
  key: string;
  uid: string | null;
  id: string | null;
  name: string;
  wbs: string | null;
  outlineLevel: number | null;
  summary: boolean;
  start: string | null;
  finish: string | null;
  duration: string | null;
  percentComplete: number | null;
  actualStart: string | null;
  actualFinish: string | null;
};

type BackendState = "browser_only" | "connected" | "unavailable";

function stored(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Convenience only.
  }
}

function apiPath(baseUrl: string, path: string) {
  const base = baseUrl.trim().replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `round-trip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultValue(field: ExportCandidateFieldName, task: ImportReviewTaskRow | null) {
  if (field === "percent_complete") {
    return String(Math.min(100, (task?.percentComplete ?? 0) + 25));
  }
  if (field === "actual_start") {
    return new Date().toISOString().replace("Z", "+00:00").replace(/\.\d{3}/, "");
  }
  return new Date().toISOString().replace("Z", "+00:00").replace(/\.\d{3}/, "");
}

function displayValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function displayProjectDate(value: string | null) {
  if (!value) return "—";
  return value.replace("T", " ").replace(/Z$/, "");
}

function sourceRows(preview: ProjectXmlPreview | null): ReviewRow[] {
  return (preview?.tasks ?? []).map((task, index) => xmlTaskRow(task, index));
}

function xmlTaskRow(task: ProjectXmlTaskPreview, index: number): ReviewRow {
  return {
    key: task.uid ?? task.id ?? `xml-task-${index}`,
    uid: task.uid,
    id: task.id,
    name: task.name,
    wbs: task.wbs,
    outlineLevel: task.outlineLevel,
    summary: task.summary,
    start: task.start,
    finish: task.finish,
    duration: task.duration,
    percentComplete: task.percentComplete,
    actualStart: task.actualStart,
    actualFinish: task.actualFinish
  };
}

function snapshotRows(snapshot: ImportReviewSnapshotDetail | null): ReviewRow[] {
  return (snapshot?.tasks ?? []).map((task) => ({
    key: task.id,
    uid: task.externalUid,
    id: task.externalId,
    name: task.name ?? "Unnamed task",
    wbs: task.wbs,
    outlineLevel: task.outlineLevel,
    summary: task.summary,
    start: task.plannedStart,
    finish: task.plannedFinish,
    duration: null,
    percentComplete: task.percentComplete,
    actualStart: task.actualStart,
    actualFinish: task.actualFinish
  }));
}

function TaskReviewTable({
  rows,
  selectedKey,
  onSelect,
  label
}: {
  rows: ReviewRow[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const [leafOnly, setLeafOnly] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (leafOnly && row.summary) return false;
      if (!normalized) return true;
      return [row.name, row.wbs, row.uid, row.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [leafOnly, query, rows]);

  return (
    <div className="rt-table-block">
      <div className="rt-table-tools">
        <label>
          <span>Find task</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Task name, WBS, UID or ID"
            aria-label={`Search ${label}`}
          />
        </label>
        <label className="rt-checkbox">
          <input type="checkbox" checked={leafOnly} onChange={(event) => setLeafOnly(event.target.checked)} />
          Leaf tasks only
        </label>
        <span className="rt-table-count">{filtered.length} of {rows.length} tasks</span>
      </div>
      <div className="rt-table-scroll">
        <table className="rt-task-table">
          <thead>
            <tr>
              <th>WBS / task</th>
              <th>UID</th>
              <th>ID</th>
              <th>Start</th>
              <th>Finish</th>
              <th>Duration</th>
              <th>%</th>
              <th>Actual start</th>
              <th>Actual finish</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const selectable = Boolean(onSelect) && !row.summary;
              const selected = row.key === selectedKey;
              return (
                <tr key={row.key} className={`${row.summary ? "summary" : ""} ${selected ? "selected" : ""}`}>
                  <td>
                    <div
                      className="rt-task-name"
                      style={{ paddingLeft: `${Math.max(0, (row.outlineLevel ?? 1) - 1) * 18}px` }}
                    >
                      <span className="rt-wbs">{displayValue(row.wbs)}</span>
                      {selectable ? (
                        <button type="button" onClick={() => onSelect?.(row.key)}>{row.name}</button>
                      ) : (
                        <strong>{row.name}</strong>
                      )}
                    </div>
                  </td>
                  <td>{displayValue(row.uid)}</td>
                  <td>{displayValue(row.id)}</td>
                  <td>{displayProjectDate(row.start)}</td>
                  <td>{displayProjectDate(row.finish)}</td>
                  <td>{displayValue(row.duration)}</td>
                  <td>{displayValue(row.percentComplete)}</td>
                  <td>{displayProjectDate(row.actualStart)}</td>
                  <td>{displayProjectDate(row.actualFinish)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RoundTripWorkspace() {
  const envBaseUrl = typeof import.meta.env.VITE_SHUTDOWN_TRACKER_API_BASE_URL === "string"
    ? import.meta.env.VITE_SHUTDOWN_TRACKER_API_BASE_URL.trim()
    : "";

  const [baseUrl, setBaseUrl] = useState(() => stored(BASE_URL_KEY, envBaseUrl));
  const [actorId, setActorId] = useState(() => stored(ACTOR_KEY, DEFAULT_ACTOR_ID));
  const [backendState, setBackendState] = useState<BackendState>("browser_only");
  const [project, setProject] = useState<ReviewProject | null>(null);
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [sourcePreview, setSourcePreview] = useState<ProjectXmlPreview | null>(null);
  const [sourcePreviewError, setSourcePreviewError] = useState("");
  const [snapshots, setSnapshots] = useState<ImportReviewSnapshotSummary[]>([]);
  const [snapshotDetail, setSnapshotDetail] = useState<ImportReviewSnapshotDetail | null>(null);
  const [taskId, setTaskId] = useState("");
  const [fieldName, setFieldName] = useState<ExportCandidateFieldName>("percent_complete");
  const [proposedValue, setProposedValue] = useState("75");
  const [candidate, setCandidate] = useState<ExportCandidateRecord | null>(null);
  const [preview, setPreview] = useState<ExportPreviewDetail | null>(null);
  const [artifact, setArtifact] = useState<ExportArtifactGenerationResponse | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    "XML review works in the browser without a backend. Connect the API only when you are ready to run the controlled round trip."
  );
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [verificationNotes, setVerificationNotes] = useState(
    "Approved input present. Microsoft Project recalculated the candidate and the resulting schedule was reviewed."
  );

  const client = useMemo(() => createShutdownTrackerApiClient({ baseUrl }), [baseUrl]);
  const activeProjectId = projectId || project?.id || "";
  const leafTasks = useMemo(
    () => (snapshotDetail?.tasks ?? []).filter((task) => !task.summary && task.externalUid && task.externalId && task.name),
    [snapshotDetail]
  );
  const selectedTask = leafTasks.find((task) => task.id === taskId) ?? null;
  const selectedSourceIsMpp = file?.name.toLowerCase().endsWith(".mpp") ?? false;
  const browserRows = useMemo(() => sourceRows(sourcePreview), [sourcePreview]);
  const importedRows = useMemo(() => snapshotRows(snapshotDetail), [snapshotDetail]);

  function log(label: string, detail: string, isError = false) {
    setActivity((current) => [
      { at: new Date().toLocaleTimeString(), label, detail, error: isError },
      ...current
    ]);
  }

  function resetBackendWorkflow() {
    setSnapshots([]);
    setSnapshotDetail(null);
    setTaskId("");
    setCandidate(null);
    setPreview(null);
    setArtifact(null);
  }

  function resetReviewSession(clearProject: boolean) {
    setFile(null);
    setFileInputKey((current) => current + 1);
    setSourcePreview(null);
    setSourcePreviewError("");
    resetBackendWorkflow();
    setError("");
    setActivity([]);
    if (clearProject) {
      setProject(null);
      setProjectId("");
      setBackendState("browser_only");
    }
  }

  async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(apiPath(baseUrl, path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}${body ? `: ${body}` : ""}`);
    }
    return response.json() as Promise<T>;
  }

  function saveConnectionSettings() {
    save(BASE_URL_KEY, baseUrl.trim());
    save(ACTOR_KEY, actorId.trim());
  }

  async function connectBackend() {
    setBusy("Connect backend");
    setError("");
    saveConnectionSettings();
    try {
      const result = await fetchJson<ReviewProject>("/api/review-project");
      setProject(result);
      setProjectId(result.id);
      setBackendState("connected");
      setNotice(`Connected to ${result.name}. Use Start clean test before a new acceptance run if you want isolated data.`);
      log("Backend connected", `${result.name} · ${result.id}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setBackendState("unavailable");
      setError(`Backend connection failed: ${message}`);
      log("Backend connection failed", message, true);
    } finally {
      setBusy("");
    }
  }

  async function startCleanTest() {
    resetReviewSession(true);
    setBusy("Start clean test");
    saveConnectionSettings();
    try {
      const result = await fetchJson<ReviewProject>("/api/review-project/new", { method: "POST" });
      setProject(result);
      setProjectId(result.id);
      setBackendState("connected");
      setNotice(
        "Fresh isolated test project created. Prior export/audit history was not deleted because those records are intentionally immutable."
      );
      log("Clean test started", `${result.name} · ${result.id}`);
    } catch {
      setBackendState("browser_only");
      setNotice(
        "Browser review was cleared. No backend is reachable from this deployment, so XML inspection still works here but persisted round-trip actions remain unavailable."
      );
    } finally {
      setBusy("");
    }
  }

  async function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setSourcePreview(null);
    setSourcePreviewError("");
    resetBackendWorkflow();
    setError("");
    if (!nextFile) return;

    const lowerName = nextFile.name.toLowerCase();
    if (lowerName.endsWith(".mpp")) {
      setNotice("MPP can be sent to the backend for import review, but browser inspection and complete-source candidate generation require Project XML.");
      log("Source selected", `${nextFile.name} · MPP requires backend parsing.`);
      return;
    }

    if (!lowerName.endsWith(".xml")) {
      setSourcePreviewError("Choose a Microsoft Project .xml, .mspdi.xml or .mpp file.");
      return;
    }

    try {
      const parsed = parseProjectXmlPreview(await nextFile.text());
      setSourcePreview(parsed);
      setNotice("XML loaded locally. Review the schedule below before sending it to the round-trip backend.");
      log("XML reviewed in browser", `${parsed.projectName} · ${parsed.taskCount} tasks · ${parsed.leafTaskCount} leaf tasks.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setSourcePreviewError(message);
      log("XML preview failed", message, true);
    }
  }

  async function importSelectedFile() {
    if (!file) {
      setError("Choose a Microsoft Project XML/MSPDI or MPP file first.");
      return;
    }

    setBusy("Import Project source");
    setError("");
    saveConnectionSettings();
    try {
      let id = activeProjectId;
      if (!id) {
        const fresh = await fetchJson<ReviewProject>("/api/review-project/new", { method: "POST" });
        setProject(fresh);
        setProjectId(fresh.id);
        setBackendState("connected");
        id = fresh.id;
        log("Fresh backend test project", `${fresh.name} · ${fresh.id}`);
      }

      resetBackendWorkflow();
      const upload = await client.sourceFiles.upload(id, file, file.name);
      if (!upload.accepted || !upload.importBatch) {
        throw new Error(upload.rejectionReason ?? upload.message ?? "The source upload was rejected.");
      }
      log("Source uploaded", `${file.name} · import batch ${upload.importBatch.id}`);

      const parsed = await fetchJson<ParseSnapshotResponse>(
        `/api/projects/${encodeURIComponent(id)}/import-batches/${encodeURIComponent(upload.importBatch.id)}/request-parse-snapshot`,
        { method: "POST" }
      );
      setSnapshotDetail(parsed.snapshot);
      setSnapshots([parsed.snapshot.snapshot]);
      const firstLeaf = parsed.snapshot.tasks.find((task) => !task.summary && task.externalUid && task.externalId && task.name) ?? null;
      setTaskId(firstLeaf?.id ?? "");
      setProposedValue(defaultValue(fieldName, firstLeaf));
      setBackendState("connected");
      setNotice("Backend import complete. Review the persisted snapshot and accept it before creating a Project input.");
      log("Snapshot persisted", `${parsed.parseSummary.projectName} · ${parsed.snapshot.tasks.length} tasks · ${parsed.snapshot.snapshot.status}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setBackendState("unavailable");
      setError(`Backend import failed: ${message}`);
      log("Backend import failed", message, true);
    } finally {
      setBusy("");
    }
  }

  async function loadExistingSnapshots() {
    if (!activeProjectId) {
      setError("Connect a review project first.");
      return;
    }
    setBusy("Load snapshots");
    setError("");
    try {
      const items = await client.importReview.listSnapshots(activeProjectId);
      setSnapshots(items);
      log("Snapshots loaded", `${items.length} snapshot${items.length === 1 ? "" : "s"}.`);
      const latest = [...items].sort((a, b) => b.snapshotVersion - a.snapshotVersion)[0];
      if (latest) await loadSnapshot(latest.id);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      log("Load snapshots failed", message, true);
    } finally {
      setBusy("");
    }
  }

  async function loadSnapshot(snapshotId: string) {
    if (!activeProjectId) return;
    const detail = await client.importReview.getSnapshot(activeProjectId, snapshotId);
    setSnapshotDetail(detail);
    setCandidate(null);
    setPreview(null);
    setArtifact(null);
    const firstLeaf = detail.tasks.find((task) => !task.summary && task.externalUid && task.externalId && task.name) ?? null;
    setTaskId(firstLeaf?.id ?? "");
    setProposedValue(defaultValue(fieldName, firstLeaf));
  }

  async function acceptSnapshot() {
    if (!snapshotDetail || !activeProjectId) return;
    setBusy("Accept snapshot");
    setError("");
    try {
      const result = await client.importReview.acceptSnapshot(activeProjectId, snapshotDetail.snapshot.id);
      setSnapshotDetail((current) => current ? { ...current, snapshot: result.snapshot } : current);
      setSnapshots((current) => current.map((item) => item.id === result.snapshot.id ? result.snapshot : item));
      setNotice("Snapshot accepted. Select the execution fact to send to Microsoft Project.");
      log("Snapshot accepted", `Snapshot v${result.snapshot.snapshotVersion} · ${result.snapshot.id}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      log("Snapshot acceptance failed", message, true);
    } finally {
      setBusy("");
    }
  }

  async function rejectSnapshot() {
    if (!snapshotDetail || !activeProjectId) return;
    setBusy("Reject snapshot");
    setError("");
    try {
      const result = await client.importReview.rejectSnapshot(activeProjectId, snapshotDetail.snapshot.id);
      setSnapshotDetail((current) => current ? { ...current, snapshot: result.snapshot } : current);
      setSnapshots((current) => current.map((item) => item.id === result.snapshot.id ? result.snapshot : item));
      setNotice("Snapshot rejected. Start a clean test or import another source to continue.");
      log("Snapshot rejected", `Snapshot v${result.snapshot.snapshotVersion} · ${result.snapshot.id}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      log("Snapshot rejection failed", message, true);
    } finally {
      setBusy("");
    }
  }

  async function buildCandidate() {
    if (!snapshotDetail || snapshotDetail.snapshot.status !== "ACCEPTED") {
      setError("Accept the imported snapshot first.");
      return;
    }
    if (!selectedTask || !activeProjectId) {
      setError("Select a leaf task first.");
      return;
    }
    if (selectedSourceIsMpp) {
      setError("Complete-source candidate generation requires the accepted source to be Microsoft Project XML.");
      return;
    }

    setBusy("Build candidate XML");
    setError("");
    setCandidate(null);
    setPreview(null);
    setArtifact(null);
    try {
      const nextCandidate = await client.exportCandidates.create(activeProjectId, {
        projectSnapshotId: snapshotDetail.snapshot.id,
        importedTaskId: selectedTask.id,
        fieldName,
        proposedValue: proposedValue.trim(),
        sourceEntityType: "round_trip_frontend_test",
        sourceEntityId: randomId(),
        sourceVersion: "round-trip-workspace-1",
        sourceActorUserId: actorId.trim() || null,
        sourceTimestamp: new Date().toISOString(),
        reason: "Browser-driven Microsoft Project round-trip acceptance test.",
        metadata: { source: "round-trip-workspace", localAcceptance: true }
      });
      setCandidate(nextCandidate);
      log("Reviewed input created", `${nextCandidate.capturedTaskName}: ${nextCandidate.normalizedOldValue ?? "—"} → ${nextCandidate.normalizedNewValue}`);

      const approval = await client.exportCandidates.createApprovalEvent(activeProjectId, nextCandidate.id, {
        approvalState: "APPROVED_FOR_EXPORT",
        reviewedByUserId: actorId.trim() || null,
        reviewedAt: new Date().toISOString(),
        reason: "Approved in browser round-trip acceptance test.",
        metadata: { source: "round-trip-workspace", localAcceptance: true }
      });
      log("Exact input approved", `${approval.approvalState} · ${approval.id}`);

      const draft = await client.exportPreview.create(activeProjectId, {
        projectSnapshotId: nextCandidate.projectSnapshotId,
        candidateIds: [nextCandidate.id],
        metadata: { source: "round-trip-workspace", localAcceptance: true }
      });
      log("Preview sealed", `${draft.batch.id} · ${draft.batch.eligibleLineCount} eligible line(s)`);

      const approved = await client.exportPreview.approve(activeProjectId, draft.batch.id, {
        reviewedByUserId: actorId.trim() || null,
        reason: "Approved for Microsoft Project candidate generation.",
        metadata: { source: "round-trip-workspace", localAcceptance: true }
      });
      log("Export batch approved", approved.batch.status);

      const generated = await client.exportPreview.generateArtifact(activeProjectId, approved.batch.id, {
        generatedByUserId: actorId.trim() || null,
        reason: "Browser-driven complete-source candidate generation.",
        metadata: { source: "round-trip-workspace", localAcceptance: true }
      });
      setArtifact(generated);
      setPreview(generated.exportPreview);
      setNotice("Candidate generated. Download it and open it in Microsoft Project for recalculation and planner review.");
      log(
        "Candidate generated",
        `${generated.workerResponse.artifactSummary.outputFilename} · SHA-256 ${generated.workerResponse.exportFileHash}`
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(`Candidate build failed: ${message}`);
      log("Candidate build failed", message, true);
    } finally {
      setBusy("");
    }
  }

  async function markOpened() {
    if (!preview || !activeProjectId || !actorId.trim()) return;
    setBusy("Mark opened");
    setError("");
    try {
      const result = await client.exportPreview.markOpenedInMicrosoftProject(activeProjectId, preview.batch.id, {
        openedByUserId: actorId.trim(),
        reason: "Candidate downloaded and opened in Microsoft Project.",
        metadata: { source: "round-trip-workspace", localAcceptance: true }
      });
      setPreview(result);
      log("Project open recorded", result.batch.status);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      log("Project open recording failed", message, true);
    } finally {
      setBusy("");
    }
  }

  async function verify() {
    if (!preview || !activeProjectId || !actorId.trim()) return;
    setBusy("Record verification");
    setError("");
    try {
      const result = await client.exportPreview.verify(activeProjectId, preview.batch.id, {
        verifiedByUserId: actorId.trim(),
        reason: verificationNotes.trim() || "Manual Microsoft Project review completed.",
        metadata: {
          source: "round-trip-workspace",
          localAcceptance: true,
          projectCalculatedConsequencesExpected: true
        }
      });
      setPreview(result);
      setNotice("Microsoft Project verification recorded for this candidate.");
      log("Planner verification recorded", result.batch.status);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      log("Verification recording failed", message, true);
    } finally {
      setBusy("");
    }
  }

  const artifactHash = artifact?.workerResponse.exportFileHash ?? preview?.batch.exportFileHash ?? "";
  const downloadUrl = preview && activeProjectId
    ? apiPath(baseUrl, `/api/projects/${encodeURIComponent(activeProjectId)}/export-preview/${encodeURIComponent(preview.batch.id)}/artifact`)
    : "";

  return (
    <main className="rt-workspace">
      <header className="rt-topbar">
        <div>
          <p className="rt-eyebrow">Shutdown Tracker · acceptance workspace</p>
          <h1>Microsoft Project round-trip</h1>
          <p>Load Project XML, review the actual schedule first, then run the controlled handoff when the backend is connected.</p>
        </div>
        <div className="rt-topbar-actions">
          <button type="button" className="secondary" onClick={() => resetReviewSession(false)} disabled={Boolean(busy)}>
            Clear current review
          </button>
          <button type="button" className="primary" onClick={() => void startCleanTest()} disabled={Boolean(busy)}>
            {busy === "Start clean test" ? "Starting…" : "Start clean test"}
          </button>
        </div>
      </header>

      <section className="rt-state-grid" aria-label="Round-trip state">
        <div><span>Source</span><strong>{sourcePreview ? "XML REVIEWED" : file ? "FILE SELECTED" : "WAITING"}</strong></div>
        <div><span>Backend</span><strong>{backendState === "connected" ? "CONNECTED" : backendState === "unavailable" ? "UNAVAILABLE" : "BROWSER ONLY"}</strong></div>
        <div><span>Snapshot</span><strong>{snapshotDetail?.snapshot.status ?? "NOT IMPORTED"}</strong></div>
        <div><span>Candidate</span><strong>{preview?.batch.status ?? (candidate ? "INPUT CREATED" : "NOT CREATED")}</strong></div>
      </section>

      <section className="rt-notice">
        <strong>Current state</strong>
        <span>{notice}</span>
      </section>

      {error && <section className="rt-error"><strong>Action failed</strong><span>{error}</span></section>}

      <section className="rt-section">
        <div className="rt-section-heading">
          <div><span className="rt-step">1</span><div><h2>Load and review the source schedule</h2><p>This browser review does not upload the file.</p></div></div>
        </div>

        <label className="rt-file-zone">
          <input
            key={fileInputKey}
            type="file"
            accept=".xml,.mspdi.xml,.mpp"
            onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
          />
          <span className="rt-file-zone-copy">
            <strong>{file?.name ?? "Choose Microsoft Project XML"}</strong>
            <small>Project XML is reviewed immediately in this browser. MPP requires the connected worker.</small>
          </span>
        </label>

        {sourcePreviewError && <p className="rt-inline-error">{sourcePreviewError}</p>}

        {sourcePreview && (
          <>
            <dl className="rt-summary-grid">
              <div><dt>Project</dt><dd>{sourcePreview.projectName}</dd></div>
              <div><dt>Tasks</dt><dd>{sourcePreview.taskCount}</dd></div>
              <div><dt>Leaf tasks</dt><dd>{sourcePreview.leafTaskCount}</dd></div>
              <div><dt>Summary tasks</dt><dd>{sourcePreview.summaryTaskCount}</dd></div>
              <div><dt>Status date</dt><dd>{displayProjectDate(sourcePreview.statusDate)}</dd></div>
              <div><dt>File</dt><dd>{file?.name}</dd></div>
            </dl>
            <TaskReviewTable rows={browserRows} label="source XML" />
          </>
        )}

        <div className="rt-primary-row">
          <button
            type="button"
            className="primary"
            onClick={() => void importSelectedFile()}
            disabled={Boolean(busy) || !file || Boolean(sourcePreviewError)}
          >
            {busy === "Import Project source" ? "Importing…" : "Import into round-trip backend"}
          </button>
          <span>Backend import creates a persisted snapshot; it does not modify the source Project file.</span>
        </div>
      </section>

      <section className="rt-section">
        <div className="rt-section-heading">
          <div><span className="rt-step">2</span><div><h2>Review the persisted snapshot</h2><p>Accept only after the imported task set matches the source you intend to test.</p></div></div>
          {snapshotDetail && (
            <div className="rt-heading-actions">
              <button type="button" className="danger-text" onClick={() => void rejectSnapshot()} disabled={Boolean(busy) || snapshotDetail.snapshot.status !== "PARSED"}>Reject</button>
              <button type="button" className="primary" onClick={() => void acceptSnapshot()} disabled={Boolean(busy) || snapshotDetail.snapshot.status !== "PARSED"}>Accept snapshot</button>
            </div>
          )}
        </div>

        {snapshotDetail ? (
          <>
            <dl className="rt-summary-grid">
              <div><dt>Project</dt><dd>{snapshotDetail.snapshot.externalProjectName ?? "Unnamed"}</dd></div>
              <div><dt>Snapshot</dt><dd>v{snapshotDetail.snapshot.snapshotVersion}</dd></div>
              <div><dt>Status</dt><dd>{snapshotDetail.snapshot.status}</dd></div>
              <div><dt>Tasks</dt><dd>{snapshotDetail.tasks.length}</dd></div>
              <div><dt>Warnings</dt><dd>{snapshotDetail.snapshot.warningCount}</dd></div>
              <div><dt>Errors</dt><dd>{snapshotDetail.snapshot.errorCount}</dd></div>
            </dl>
            <TaskReviewTable
              rows={importedRows}
              selectedKey={taskId}
              onSelect={(key) => {
                setTaskId(key);
                const task = leafTasks.find((item) => item.id === key) ?? null;
                setProposedValue(defaultValue(fieldName, task));
                setCandidate(null);
                setPreview(null);
                setArtifact(null);
              }}
              label="persisted snapshot"
            />
          </>
        ) : (
          <p className="rt-empty">Nothing persisted yet. The source XML above can still be reviewed without a backend connection.</p>
        )}
      </section>

      <section className="rt-section">
        <div className="rt-section-heading">
          <div><span className="rt-step">3</span><div><h2>Choose the execution input</h2><p>The test harness will create, approve, seal and generate one exact Project-bound input.</p></div></div>
        </div>

        <div className="rt-form-grid">
          <label>
            <span>Leaf task</span>
            <select
              value={taskId}
              onChange={(event) => {
                setTaskId(event.target.value);
                const task = leafTasks.find((item) => item.id === event.target.value) ?? null;
                setProposedValue(defaultValue(fieldName, task));
                setCandidate(null);
                setPreview(null);
                setArtifact(null);
              }}
              disabled={!snapshotDetail}
            >
              <option value="">Select task</option>
              {leafTasks.map((task) => (
                <option key={task.id} value={task.id}>{task.wbs ? `${task.wbs} · ` : ""}{task.name} · UID {task.externalUid}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Project input</span>
            <select
              value={fieldName}
              onChange={(event) => {
                const next = event.target.value as ExportCandidateFieldName;
                setFieldName(next);
                setProposedValue(defaultValue(next, selectedTask));
                setCandidate(null);
                setPreview(null);
                setArtifact(null);
              }}
              disabled={!snapshotDetail}
            >
              <option value="percent_complete">Percent Complete</option>
              <option value="actual_start">Actual Start</option>
              <option value="actual_finish">Actual Finish</option>
            </select>
          </label>
          <label>
            <span>Proposed value</span>
            <input value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} disabled={!selectedTask} />
          </label>
        </div>

        {selectedTask && (
          <div className="rt-input-review">
            <div><span>Task</span><strong>{selectedTask.wbs ? `${selectedTask.wbs} · ` : ""}{selectedTask.name}</strong></div>
            <div><span>Identity</span><strong>UID {selectedTask.externalUid} · ID {selectedTask.externalId}</strong></div>
            <div><span>Current %</span><strong>{displayValue(selectedTask.percentComplete)}</strong></div>
            <div><span>Actual start</span><strong>{displayProjectDate(selectedTask.actualStart)}</strong></div>
            <div><span>Actual finish</span><strong>{displayProjectDate(selectedTask.actualFinish)}</strong></div>
          </div>
        )}

        <div className="rt-primary-row">
          <button
            type="button"
            className="primary"
            onClick={() => void buildCandidate()}
            disabled={Boolean(busy) || snapshotDetail?.snapshot.status !== "ACCEPTED" || !selectedTask || selectedSourceIsMpp}
          >
            {busy === "Build candidate XML" ? "Building candidate…" : "Approve input and build candidate XML"}
          </button>
          <span>The backend still performs the exact candidate, approval, preview, batch approval and generation checks; the UI simply removes the repetitive clicks.</span>
        </div>
      </section>

      <section className="rt-section">
        <div className="rt-section-heading">
          <div><span className="rt-step">4</span><div><h2>Open and review in Microsoft Project</h2><p>Project is expected to recalculate the complete candidate.</p></div></div>
        </div>

        {downloadUrl ? (
          <>
            <div className="rt-artifact-grid">
              <div><span>Candidate</span><a href={downloadUrl}>Download candidate XML</a></div>
              <div><span>SHA-256</span><code>{artifactHash || "—"}</code></div>
              <div><span>Batch</span><code>{preview?.batch.id}</code></div>
            </div>
            <div className="rt-project-checks">
              <strong>Review in Project</strong>
              <ol>
                <li>Confirm the approved input landed on the intended UID/ID.</li>
                <li>Allow Microsoft Project to perform its normal recalculation.</li>
                <li>Review dates, duration, summaries, work/assignments, timephased values, slack, criticality and project finish.</li>
                <li>Investigate unexplained differences before adopting anything.</li>
                <li>Confirm the accepted source/master remains unchanged.</li>
              </ol>
            </div>
            <div className="rt-primary-row">
              <button type="button" onClick={() => void markOpened()} disabled={Boolean(busy) || preview?.batch.status !== "GENERATED"}>Mark opened in Project</button>
              <span>Record this only after you have actually opened the downloaded candidate.</span>
            </div>
            <label className="rt-verification-notes">
              <span>Planner verification notes</span>
              <textarea value={verificationNotes} onChange={(event) => setVerificationNotes(event.target.value)} rows={4} />
            </label>
            <div className="rt-primary-row">
              <button type="button" className="primary" onClick={() => void verify()} disabled={Boolean(busy) || preview?.batch.status !== "OPENED_IN_MICROSOFT_PROJECT"}>Record verification</button>
            </div>
          </>
        ) : (
          <p className="rt-empty">No candidate generated yet.</p>
        )}
      </section>

      <details className="rt-technical">
        <summary>Connection, existing test data and activity</summary>
        <div className="rt-technical-body">
          <div className="rt-form-grid technical">
            <label>
              <span>API base URL</span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="blank uses same origin / Vite proxy" />
            </label>
            <label>
              <span>Review project UUID</span>
              <input value={activeProjectId} onChange={(event) => setProjectId(event.target.value)} placeholder="created automatically" />
            </label>
            <label>
              <span>Planner/test actor UUID</span>
              <input value={actorId} onChange={(event) => setActorId(event.target.value)} />
            </label>
          </div>
          <div className="rt-button-row">
            <button type="button" onClick={() => void connectBackend()} disabled={Boolean(busy)}>{busy === "Connect backend" ? "Connecting…" : "Connect backend"}</button>
            <button type="button" onClick={() => void loadExistingSnapshots()} disabled={Boolean(busy) || !activeProjectId}>Load existing snapshots</button>
            {snapshots.length > 0 && (
              <select value={snapshotDetail?.snapshot.id ?? ""} onChange={(event) => void loadSnapshot(event.target.value)}>
                <option value="">Choose snapshot</option>
                {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>v{snapshot.snapshotVersion} · {snapshot.status}</option>)}
              </select>
            )}
          </div>
          <p className="rt-technical-note">
            Start clean test creates a new isolated synthetic project instead of deleting old approval/export/audit records. Those records are deliberately append-only and should not be erased just to reset an acceptance run.
          </p>
          <div className="rt-activity">
            {activity.length ? activity.map((item, index) => (
              <div className={item.error ? "error" : ""} key={`${item.at}-${item.label}-${index}`}>
                <time>{item.at}</time><strong>{item.label}</strong><span>{item.detail}</span>
              </div>
            )) : <p className="rt-empty">No test activity recorded in this browser session.</p>}
          </div>
        </div>
      </details>

      <footer className="rt-authority-footer">
        <strong>Authority boundary:</strong> Shutdown Tracker supplies reviewed direct inputs. Microsoft Project owns schedule recalculation. The planner owns candidate adoption or rejection.
      </footer>
    </main>
  );
}
