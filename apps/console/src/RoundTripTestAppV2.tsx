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
import "./roundTripTest.css";

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

function displayTask(task: ImportReviewTaskRow) {
  return `${task.name ?? "Unnamed task"} · UID ${task.externalUid ?? "—"} · ID ${task.externalId ?? "—"}`;
}

function defaultValue(field: ExportCandidateFieldName, task: ImportReviewTaskRow | null) {
  if (field === "percent_complete") {
    return String(Math.min(100, (task?.percentComplete ?? 0) + 25));
  }
  if (field === "actual_start") {
    return "2026-01-05T07:00:00+08:00";
  }
  return "2026-01-05T11:00:00+08:00";
}

export function RoundTripTestAppV2() {
  const envBaseUrl = typeof import.meta.env.VITE_SHUTDOWN_TRACKER_API_BASE_URL === "string"
    ? import.meta.env.VITE_SHUTDOWN_TRACKER_API_BASE_URL.trim()
    : "";

  const [baseUrl, setBaseUrl] = useState(() => stored(BASE_URL_KEY, envBaseUrl));
  const [actorId, setActorId] = useState(() => stored(ACTOR_KEY, DEFAULT_ACTOR_ID));
  const [project, setProject] = useState<ReviewProject | null>(null);
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [snapshots, setSnapshots] = useState<ImportReviewSnapshotSummary[]>([]);
  const [snapshotDetail, setSnapshotDetail] = useState<ImportReviewSnapshotDetail | null>(null);
  const [taskId, setTaskId] = useState("");
  const [fieldName, setFieldName] = useState<ExportCandidateFieldName>("percent_complete");
  const [proposedValue, setProposedValue] = useState("75");
  const [candidate, setCandidate] = useState<ExportCandidateRecord | null>(null);
  const [candidateApproved, setCandidateApproved] = useState(false);
  const [preview, setPreview] = useState<ExportPreviewDetail | null>(null);
  const [artifact, setArtifact] = useState<ExportArtifactGenerationResponse | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [verificationNotes, setVerificationNotes] = useState(
    "Approved input present. Microsoft Project recalculated the candidate and the resulting schedule was reviewed."
  );

  const client = useMemo(() => createShutdownTrackerApiClient({ baseUrl }), [baseUrl]);
  const leafTasks = useMemo(
    () => (snapshotDetail?.tasks ?? []).filter((task) => !task.summary && task.externalUid && task.externalId && task.name),
    [snapshotDetail]
  );
  const selectedTask = leafTasks.find((task) => task.id === taskId) ?? null;
  const activeProjectId = projectId || project?.id || "";

  function log(label: string, detail: string, isError = false) {
    setActivity((current) => [
      { at: new Date().toLocaleTimeString(), label, detail, error: isError },
      ...current
    ]);
  }

  function resetAfterTask() {
    setCandidate(null);
    setCandidateApproved(false);
    setPreview(null);
    setArtifact(null);
  }

  async function run<T>(label: string, action: () => Promise<T>, describe: (value: T) => string) {
    setBusy(label);
    setError("");
    try {
      const value = await action();
      log(label, describe(value));
      return value;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      log(label, message, true);
      return null;
    } finally {
      setBusy("");
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

  async function ensureReviewProject() {
    save(BASE_URL_KEY, baseUrl.trim());
    save(ACTOR_KEY, actorId.trim());
    const result = await run(
      "Load local review project",
      () => fetchJson<ReviewProject>("/api/review-project"),
      (record) => `${record.name} · ${record.id}`
    );
    if (!result) return null;
    setProject(result);
    setProjectId(result.id);
    return result;
  }

  async function importSelectedFile() {
    if (!file) {
      setError("Choose a Microsoft Project XML/MSPDI or MPP file first.");
      return;
    }

    let id = activeProjectId;
    if (!id) {
      const reviewProject = await ensureReviewProject();
      if (!reviewProject) return;
      id = reviewProject.id;
    }

    resetAfterTask();
    setSnapshotDetail(null);
    setTaskId("");

    const upload = await run(
      "Upload Project source",
      () => client.sourceFiles.upload(id, file, file.name),
      (response) => response.accepted
        ? `${response.originalFilename} stored; import batch ${response.importBatch?.id ?? "missing"}.`
        : `Upload rejected: ${response.rejectionReason ?? response.message}`
    );
    if (!upload || !upload.accepted || !upload.importBatch) return;

    const parsed = await run(
      "Parse and persist snapshot",
      () => fetchJson<ParseSnapshotResponse>(
        `/api/projects/${encodeURIComponent(id)}/import-batches/${encodeURIComponent(upload.importBatch!.id)}/request-parse-snapshot`,
        { method: "POST" }
      ),
      (response) => `${response.snapshot.tasks.length} tasks persisted from ${response.parseSummary.projectName}.`
    );
    if (!parsed) return;

    setSnapshotDetail(parsed.snapshot);
    setSnapshots([parsed.snapshot.snapshot]);
    const firstLeaf = parsed.snapshot.tasks.find((task) => !task.summary && task.externalUid && task.externalId && task.name) ?? null;
    setTaskId(firstLeaf?.id ?? "");
    setProposedValue(defaultValue(fieldName, firstLeaf));
  }

  async function loadExistingSnapshots() {
    let id = activeProjectId;
    if (!id) {
      const reviewProject = await ensureReviewProject();
      if (!reviewProject) return;
      id = reviewProject.id;
    }
    const result = await run(
      "Load existing snapshots",
      () => client.importReview.listSnapshots(id),
      (items) => `${items.length} snapshot${items.length === 1 ? "" : "s"} found.`
    );
    if (!result) return;
    setSnapshots(result);
    const next = [...result].sort((a, b) => b.snapshotVersion - a.snapshotVersion)[0];
    if (next) await loadSnapshot(next.id, id);
  }

  async function loadSnapshot(snapshotId: string, id = activeProjectId) {
    if (!id) return;
    const result = await run(
      "Load snapshot",
      () => client.importReview.getSnapshot(id, snapshotId),
      (detail) => `${detail.tasks.length} tasks · ${detail.snapshot.status}.`
    );
    if (!result) return;
    setSnapshotDetail(result);
    resetAfterTask();
    const firstLeaf = result.tasks.find((task) => !task.summary && task.externalUid && task.externalId && task.name) ?? null;
    setTaskId(firstLeaf?.id ?? "");
    setProposedValue(defaultValue(fieldName, firstLeaf));
  }

  async function acceptSnapshot() {
    if (!snapshotDetail || !activeProjectId) return;
    const result = await run(
      "Accept imported snapshot",
      () => client.importReview.acceptSnapshot(activeProjectId, snapshotDetail.snapshot.id),
      (response) => `Snapshot ${response.snapshot.snapshotVersion} is ${response.snapshot.status}.`
    );
    if (!result) return;
    setSnapshotDetail((current) => current ? { ...current, snapshot: result.snapshot } : current);
    setSnapshots((current) => current.map((item) => item.id === result.snapshot.id ? result.snapshot : item));
  }

  async function createCandidate() {
    if (!snapshotDetail || snapshotDetail.snapshot.status !== "ACCEPTED") {
      setError("Accept the imported snapshot first.");
      return;
    }
    if (!selectedTask || !activeProjectId) {
      setError("Select a leaf task first.");
      return;
    }

    resetAfterTask();
    const result = await run(
      "Create reviewed Project input",
      () => client.exportCandidates.create(activeProjectId, {
        projectSnapshotId: snapshotDetail.snapshot.id,
        importedTaskId: selectedTask.id,
        fieldName,
        proposedValue: proposedValue.trim(),
        sourceEntityType: "round_trip_frontend_test",
        sourceEntityId: randomId(),
        sourceVersion: "round-trip-ui-2",
        sourceActorUserId: actorId.trim() || null,
        sourceTimestamp: new Date().toISOString(),
        reason: "Browser-driven local Microsoft Project round-trip test.",
        metadata: { source: "round-trip-test-ui", localAcceptance: true }
      }),
      (record) => `${record.capturedTaskName}: ${record.normalizedOldValue ?? "—"} → ${record.normalizedNewValue}.`
    );
    if (result) setCandidate(result);
  }

  async function approveCandidate() {
    if (!candidate || !activeProjectId) return;
    const result = await run(
      "Approve exact input",
      () => client.exportCandidates.createApprovalEvent(activeProjectId, candidate.id, {
        approvalState: "APPROVED_FOR_EXPORT",
        reviewedByUserId: actorId.trim() || null,
        reviewedAt: new Date().toISOString(),
        reason: "Approved in browser round-trip acceptance test.",
        metadata: { source: "round-trip-test-ui", localAcceptance: true }
      }),
      (event) => `${event.approvalState} · ${event.id}`
    );
    if (result) setCandidateApproved(true);
  }

  async function createPreview() {
    if (!candidate || !candidateApproved || !activeProjectId) return;
    const result = await run(
      "Create sealed preview",
      () => client.exportPreview.create(activeProjectId, {
        projectSnapshotId: candidate.projectSnapshotId,
        candidateIds: [candidate.id],
        metadata: { source: "round-trip-test-ui", localAcceptance: true }
      }),
      (detail) => `${detail.batch.id} · ${detail.batch.eligibleLineCount} eligible line(s).`
    );
    if (result) setPreview(result);
  }

  async function approveBatch() {
    if (!preview || !activeProjectId) return;
    const result = await run(
      "Approve export batch",
      () => client.exportPreview.approve(activeProjectId, preview.batch.id, {
        reviewedByUserId: actorId.trim() || null,
        reason: "Approved for Microsoft Project candidate generation.",
        metadata: { source: "round-trip-test-ui", localAcceptance: true }
      }),
      (detail) => detail.batch.status
    );
    if (result) setPreview(result);
  }

  async function generateArtifact() {
    if (!preview || preview.batch.status !== "APPROVED" || !activeProjectId) return;
    const result = await run(
      "Generate candidate XML",
      () => client.exportPreview.generateArtifact(activeProjectId, preview.batch.id, {
        generatedByUserId: actorId.trim() || null,
        reason: "Browser-driven round-trip candidate generation.",
        metadata: { source: "round-trip-test-ui", localAcceptance: true }
      }),
      (response) => `${response.workerResponse.artifactSummary.outputFilename} · SHA-256 ${response.workerResponse.exportFileHash}`
    );
    if (!result) return;
    setArtifact(result);
    setPreview(result.exportPreview);
  }

  async function markOpened() {
    if (!preview || !activeProjectId || !actorId.trim()) return;
    const result = await run(
      "Record Project open",
      () => client.exportPreview.markOpenedInMicrosoftProject(activeProjectId, preview.batch.id, {
        openedByUserId: actorId.trim(),
        reason: "Candidate downloaded and opened in Microsoft Project.",
        metadata: { source: "round-trip-test-ui", localAcceptance: true }
      }),
      (detail) => detail.batch.status
    );
    if (result) setPreview(result);
  }

  async function verify() {
    if (!preview || !activeProjectId || !actorId.trim()) return;
    const result = await run(
      "Record planner verification",
      () => client.exportPreview.verify(activeProjectId, preview.batch.id, {
        verifiedByUserId: actorId.trim(),
        reason: verificationNotes.trim() || "Manual Microsoft Project review completed.",
        metadata: {
          source: "round-trip-test-ui",
          localAcceptance: true,
          projectCalculatedConsequencesExpected: true
        }
      }),
      (detail) => detail.batch.status
    );
    if (result) setPreview(result);
  }

  const artifactHash = artifact?.workerResponse.exportFileHash ?? preview?.batch.exportFileHash ?? "";
  const downloadUrl = preview && activeProjectId
    ? apiPath(baseUrl, `/api/projects/${encodeURIComponent(activeProjectId)}/export-preview/${encodeURIComponent(preview.batch.id)}/artifact`)
    : "";

  return (
    <main className="rt-shell">
      <header className="rt-header">
        <div>
          <p className="rt-kicker">Local acceptance harness</p>
          <h1>Microsoft Project round-trip</h1>
          <p>
            Import a Project file, choose an execution fact, generate the candidate, download it, open it in Microsoft Project,
            and record the review. Microsoft Project is expected to recalculate the schedule.
          </p>
        </div>
        <div className="rt-header-state">
          <span>Candidate batch</span>
          <strong>{preview?.batch.status ?? "NOT CREATED"}</strong>
        </div>
      </header>

      <section className="rt-warning">
        <strong>Authority boundary</strong>
        <span>
          Shutdown Tracker supplies only the approved direct input. Microsoft Project owns the resulting date, duration,
          summary, work, assignment, timephased, slack, criticality and project-finish recalculation. Review those changes;
          do not treat them as automatic failures.
        </span>
      </section>

      {error && <section className="rt-error"><strong>Action failed</strong><span>{error}</span></section>}

      <section className="rt-panel">
        <div className="rt-panel-heading">
          <div><span>1</span><h2>Import a Project file</h2></div>
          <button type="button" onClick={() => void ensureReviewProject()} disabled={Boolean(busy)}>
            {busy === "Load local review project" ? "Connecting…" : "Connect local project"}
          </button>
        </div>
        <div className="rt-form-grid three">
          <label>
            API base URL
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="blank uses Vite proxy" />
          </label>
          <label>
            Review project
            <input value={activeProjectId} onChange={(event) => setProjectId(event.target.value)} placeholder="created automatically" />
          </label>
          <label>
            Planner/test actor UUID
            <input value={actorId} onChange={(event) => setActorId(event.target.value)} />
          </label>
        </div>
        <div className="rt-form-grid two">
          <label>
            Project source (.xml, .mspdi.xml or .mpp)
            <input type="file" accept=".xml,.mspdi.xml,.mpp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="rt-inline-action">
            <strong>{file?.name ?? "No file selected"}</strong>
            <button type="button" onClick={() => void importSelectedFile()} disabled={Boolean(busy) || !file}>
              {busy === "Upload Project source" || busy === "Parse and persist snapshot" ? "Importing…" : "Import file"}
            </button>
          </div>
        </div>
        <div className="rt-action-row">
          <button type="button" onClick={() => void loadExistingSnapshots()} disabled={Boolean(busy)}>Load existing snapshots</button>
          {snapshots.map((snapshot) => (
            <button key={snapshot.id} type="button" onClick={() => void loadSnapshot(snapshot.id)} disabled={Boolean(busy)}>
              Snapshot {snapshot.snapshotVersion} · {snapshot.status}
            </button>
          ))}
        </div>
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading">
          <div><span>2</span><h2>Review and accept the imported snapshot</h2></div>
          <button
            type="button"
            onClick={() => void acceptSnapshot()}
            disabled={Boolean(busy) || !snapshotDetail || snapshotDetail.snapshot.status !== "PARSED"}
          >
            Accept snapshot
          </button>
        </div>
        {snapshotDetail ? (
          <dl className="rt-facts">
            <div><dt>Project</dt><dd>{snapshotDetail.snapshot.externalProjectName ?? "Unnamed"}</dd></div>
            <div><dt>Snapshot</dt><dd>v{snapshotDetail.snapshot.snapshotVersion} · {snapshotDetail.snapshot.status}</dd></div>
            <div><dt>Tasks</dt><dd>{snapshotDetail.tasks.length} total · {leafTasks.length} selectable leaf</dd></div>
            <div><dt>Source status date</dt><dd>{snapshotDetail.snapshot.projectStatusDate ?? "—"}</dd></div>
          </dl>
        ) : <p className="rt-muted">Import a file or load an existing snapshot.</p>}
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading"><div><span>3</span><h2>Choose the execution fact to send to Project</h2></div></div>
        <div className="rt-form-grid three">
          <label>
            Leaf task
            <select
              value={taskId}
              onChange={(event) => {
                setTaskId(event.target.value);
                const task = leafTasks.find((item) => item.id === event.target.value) ?? null;
                setProposedValue(defaultValue(fieldName, task));
                resetAfterTask();
              }}
            >
              <option value="">Select task</option>
              {leafTasks.map((task) => <option key={task.id} value={task.id}>{displayTask(task)}</option>)}
            </select>
          </label>
          <label>
            Direct input field
            <select
              value={fieldName}
              onChange={(event) => {
                const next = event.target.value as ExportCandidateFieldName;
                setFieldName(next);
                setProposedValue(defaultValue(next, selectedTask));
                resetAfterTask();
              }}
            >
              <option value="percent_complete">Percent Complete</option>
              <option value="actual_start">Actual Start</option>
              <option value="actual_finish">Actual Finish</option>
            </select>
          </label>
          <label>
            Proposed value
            <input value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} />
          </label>
        </div>
        {selectedTask && (
          <dl className="rt-facts">
            <div><dt>Task identity</dt><dd>UID {selectedTask.externalUid} · ID {selectedTask.externalId}</dd></div>
            <div><dt>Current %</dt><dd>{selectedTask.percentComplete ?? "—"}</dd></div>
            <div><dt>Actual start</dt><dd>{selectedTask.actualStart ?? "—"}</dd></div>
            <div><dt>Actual finish</dt><dd>{selectedTask.actualFinish ?? "—"}</dd></div>
          </dl>
        )}
        <div className="rt-action-row">
          <button type="button" onClick={() => void createCandidate()} disabled={Boolean(busy) || !selectedTask}>Create reviewed input</button>
          <button type="button" onClick={() => void approveCandidate()} disabled={Boolean(busy) || !candidate || candidateApproved}>Approve exact input</button>
          <button type="button" onClick={() => void createPreview()} disabled={Boolean(busy) || !candidateApproved || Boolean(preview)}>Create preview</button>
          <button type="button" onClick={() => void approveBatch()} disabled={Boolean(busy) || !preview || preview.batch.status !== "DRAFT_PREVIEW"}>Approve batch</button>
          <button type="button" onClick={() => void generateArtifact()} disabled={Boolean(busy) || !preview || preview.batch.status !== "APPROVED"}>Generate candidate</button>
        </div>
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading"><div><span>4</span><h2>Open the candidate in Microsoft Project</h2></div></div>
        {downloadUrl ? (
          <>
            <div className="rt-artifact">
              <div><span>Download</span><a className="rt-download" href={downloadUrl}>Download candidate MSPDI/XML</a></div>
              <div><span>SHA-256</span><code>{artifactHash || "—"}</code></div>
              <div><span>Batch</span><code>{preview?.batch.id}</code></div>
            </div>
            <div className="rt-checklist">
              <strong>In Microsoft Project, check:</strong>
              <ol>
                <li>The approved input landed on the correct task UID/ID.</li>
                <li>Microsoft Project recalculated normally.</li>
                <li>Review planned-date, duration, roll-up, work/assignment, timephased, slack, criticality and finish changes.</li>
                <li>Unexpected or unexplained differences are investigated before adoption.</li>
                <li>The source/master file was not silently overwritten.</li>
              </ol>
            </div>
            <div className="rt-action-row">
              <button type="button" onClick={() => void markOpened()} disabled={Boolean(busy) || !preview || preview.batch.status !== "GENERATED"}>Mark opened in Project</button>
            </div>
            <label className="rt-notes">
              Planner verification notes
              <textarea value={verificationNotes} onChange={(event) => setVerificationNotes(event.target.value)} rows={4} />
            </label>
            <div className="rt-action-row">
              <button type="button" onClick={() => void verify()} disabled={Boolean(busy) || !preview || preview.batch.status !== "OPENED_IN_MICROSOFT_PROJECT"}>Record verification</button>
            </div>
          </>
        ) : <p className="rt-muted">Generate a candidate to enable browser download.</p>}
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading"><div><span>5</span><h2>Test activity</h2></div></div>
        {activity.length ? (
          <div className="rt-activity">
            {activity.map((item, index) => (
              <div className={item.error ? "error" : ""} key={`${item.at}-${item.label}-${index}`}>
                <time>{item.at}</time><strong>{item.label}</strong><span>{item.detail}</span>
              </div>
            ))}
          </div>
        ) : <p className="rt-muted">No actions recorded yet.</p>}
      </section>
    </main>
  );
}
