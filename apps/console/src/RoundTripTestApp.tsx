import { useMemo, useState } from "react";
import {
  createShutdownTrackerApiClient,
  type ExportArtifactGenerationResponse,
  type ExportCandidateFieldName,
  type ExportCandidateRecord,
  type ExportPreviewDetail,
  type ImportReviewSnapshotDetail,
  type ImportReviewSnapshotSummary,
  type ImportReviewTaskRow
} from "@shutdown-tracker/api-client";
import "./roundTripTest.css";

const PROJECT_KEY = "shutdown-tracker.round-trip.project-id";
const ACTOR_KEY = "shutdown-tracker.round-trip.actor-id";
const BASE_URL_KEY = "shutdown-tracker.round-trip.api-base-url";
const DEFAULT_ACTOR_ID = "00000000-0000-0000-0000-000000000001";

type StepState = "idle" | "working" | "done" | "error";

type ActivityItem = {
  at: string;
  label: string;
  detail: string;
  state: Exclude<StepState, "working">;
};

function initialStoredValue(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function persistValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage is convenience only. The test workflow still works without it.
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `round-trip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function displayTask(task: ImportReviewTaskRow) {
  const uid = task.externalUid ?? "no UID";
  const id = task.externalId ?? "no ID";
  return `${task.name ?? "Unnamed task"} · UID ${uid} · ID ${id}`;
}

function defaultProposedValue(field: ExportCandidateFieldName, task: ImportReviewTaskRow | null) {
  if (field === "percent_complete") {
    const current = task?.percentComplete ?? 0;
    return String(Math.min(100, Math.max(0, current + 25)));
  }
  if (field === "actual_start") {
    return "2026-01-05T07:00:00+08:00";
  }
  return "2026-01-05T11:00:00+08:00";
}

export function RoundTripTestApp() {
  const envBaseUrl = typeof import.meta.env.VITE_SHUTDOWN_TRACKER_API_BASE_URL === "string"
    ? import.meta.env.VITE_SHUTDOWN_TRACKER_API_BASE_URL.trim()
    : "";
  const envProjectId = typeof import.meta.env.VITE_SHUTDOWN_TRACKER_PROJECT_ID === "string"
    ? import.meta.env.VITE_SHUTDOWN_TRACKER_PROJECT_ID.trim()
    : "";

  const [baseUrl, setBaseUrl] = useState(() =>
    initialStoredValue(BASE_URL_KEY, envBaseUrl || "http://localhost:8080")
  );
  const [projectId, setProjectId] = useState(() => initialStoredValue(PROJECT_KEY, envProjectId));
  const [actorId, setActorId] = useState(() => initialStoredValue(ACTOR_KEY, DEFAULT_ACTOR_ID));
  const [snapshots, setSnapshots] = useState<ImportReviewSnapshotSummary[]>([]);
  const [snapshotId, setSnapshotId] = useState("");
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
  const [verificationNotes, setVerificationNotes] = useState("Opened in Microsoft Project and checked against the approved input.");

  const client = useMemo(() => createShutdownTrackerApiClient({ baseUrl }), [baseUrl]);

  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === snapshotId) ?? null;
  const leafTasks = useMemo(
    () => (snapshotDetail?.tasks ?? []).filter((task) => !task.summary && task.externalUid && task.externalId && task.name),
    [snapshotDetail]
  );
  const selectedTask = leafTasks.find((task) => task.id === taskId) ?? null;

  function log(label: string, detail: string, state: Exclude<StepState, "working"> = "done") {
    setActivity((current) => [
      { at: new Date().toLocaleTimeString(), label, detail, state },
      ...current
    ]);
  }

  function clearForwardState(level: "snapshot" | "task" | "candidate") {
    setError("");
    if (level === "snapshot") {
      setSnapshotDetail(null);
      setTaskId("");
    }
    if (level === "snapshot" || level === "task") {
      setCandidate(null);
      setCandidateApproved(false);
      setPreview(null);
      setArtifact(null);
    }
    if (level === "candidate") {
      setCandidateApproved(false);
      setPreview(null);
      setArtifact(null);
    }
  }

  async function run<T>(label: string, action: () => Promise<T>, onSuccess: (value: T) => string) {
    setBusy(label);
    setError("");
    try {
      const value = await action();
      log(label, onSuccess(value));
      return value;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      log(label, message, "error");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function loadSnapshots() {
    const trimmedProjectId = projectId.trim();
    if (!trimmedProjectId) {
      setError("Project ID is required.");
      return;
    }
    persistValue(PROJECT_KEY, trimmedProjectId);
    persistValue(ACTOR_KEY, actorId.trim());
    persistValue(BASE_URL_KEY, baseUrl.trim());

    const result = await run(
      "Load project snapshots",
      () => client.importReview.listSnapshots(trimmedProjectId),
      (items) => `${items.length} snapshot${items.length === 1 ? "" : "s"} returned.`
    );
    if (!result) return;

    setSnapshots(result);
    const accepted = [...result]
      .filter((item) => item.status === "ACCEPTED")
      .sort((a, b) => b.snapshotVersion - a.snapshotVersion)[0];
    const fallback = [...result].sort((a, b) => b.snapshotVersion - a.snapshotVersion)[0];
    const nextId = accepted?.id ?? fallback?.id ?? "";
    setSnapshotId(nextId);
    if (nextId) {
      await loadSnapshotDetail(nextId);
    }
  }

  async function loadSnapshotDetail(nextSnapshotId = snapshotId) {
    if (!projectId.trim() || !nextSnapshotId) return;
    clearForwardState("snapshot");
    const result = await run(
      "Load snapshot detail",
      () => client.importReview.getSnapshot(projectId.trim(), nextSnapshotId),
      (detail) => `${detail.tasks.length} tasks loaded; snapshot state ${detail.snapshot.status}.`
    );
    if (!result) return;
    setSnapshotDetail(result);
    const firstLeaf = result.tasks.find((task) => !task.summary && task.externalUid && task.externalId && task.name) ?? null;
    setTaskId(firstLeaf?.id ?? "");
    setProposedValue(defaultProposedValue(fieldName, firstLeaf));
  }

  async function acceptSnapshot() {
    if (!projectId.trim() || !snapshotId) return;
    const result = await run(
      "Accept snapshot",
      () => client.importReview.acceptSnapshot(projectId.trim(), snapshotId),
      (response) => `Snapshot is now ${response.snapshot.status}.`
    );
    if (!result) return;
    setSnapshots((current) => current.map((item) => item.id === result.snapshot.id ? result.snapshot : item));
    setSnapshotDetail((current) => current ? { ...current, snapshot: result.snapshot } : current);
  }

  async function createCandidate() {
    if (!selectedSnapshot || selectedSnapshot.status !== "ACCEPTED") {
      setError("Select and accept a snapshot before creating an export candidate.");
      return;
    }
    if (!selectedTask) {
      setError("Select a leaf task.");
      return;
    }
    if (!proposedValue.trim()) {
      setError("Proposed value is required.");
      return;
    }

    clearForwardState("candidate");
    const result = await run(
      "Create authoritative input candidate",
      () => client.exportCandidates.create(projectId.trim(), {
        projectSnapshotId: selectedSnapshot.id,
        importedTaskId: selectedTask.id,
        fieldName,
        proposedValue: proposedValue.trim(),
        sourceEntityType: "round_trip_frontend_test",
        sourceEntityId: randomId(),
        sourceVersion: "round-trip-ui-1",
        sourceActorUserId: actorId.trim() || null,
        sourceTimestamp: nowIso(),
        reason: "Synthetic/local frontend round-trip acceptance test.",
        metadata: {
          source: "round-trip-test-ui",
          synthetic: true
        }
      }),
      (record) => `${record.capturedTaskName}: ${record.fieldName} ${record.normalizedOldValue ?? "—"} → ${record.normalizedNewValue}.`
    );
    if (result) setCandidate(result);
  }

  async function approveCandidate() {
    if (!candidate) return;
    const result = await run(
      "Approve candidate",
      () => client.exportCandidates.createApprovalEvent(projectId.trim(), candidate.id, {
        approvalState: "APPROVED_FOR_EXPORT",
        reviewedByUserId: actorId.trim() || null,
        reviewedAt: nowIso(),
        reason: "Planner approval from local round-trip test UI.",
        metadata: { source: "round-trip-test-ui", synthetic: true }
      }),
      (event) => `Approval event ${event.id}: ${event.approvalState}.`
    );
    if (result) setCandidateApproved(true);
  }

  async function createPreview() {
    if (!candidate || !candidateApproved) return;
    const result = await run(
      "Create sealed preview",
      () => client.exportPreview.create(projectId.trim(), {
        projectSnapshotId: candidate.projectSnapshotId,
        candidateIds: [candidate.id],
        metadata: { source: "round-trip-test-ui", synthetic: true }
      }),
      (detail) => `Batch ${detail.batch.id}; ${detail.batch.eligibleLineCount} eligible line(s).`
    );
    if (result) setPreview(result);
  }

  async function approvePreview() {
    if (!preview) return;
    const result = await run(
      "Approve export batch",
      () => client.exportPreview.approve(projectId.trim(), preview.batch.id, {
        reviewedByUserId: actorId.trim() || null,
        reason: "Approved for local Microsoft Project round-trip test.",
        metadata: { source: "round-trip-test-ui", synthetic: true }
      }),
      (detail) => `Batch ${detail.batch.id} is ${detail.batch.status}.`
    );
    if (result) setPreview(result);
  }

  async function generateArtifact() {
    if (!preview || preview.batch.status !== "APPROVED") return;
    const result = await run(
      "Generate MSPDI/XML artifact",
      () => client.exportPreview.generateArtifact(projectId.trim(), preview.batch.id, {
        generatedByUserId: actorId.trim() || null,
        reason: "Generate local round-trip test artifact.",
        metadata: { source: "round-trip-test-ui", synthetic: true }
      }),
      (response) => `${response.workerResponse.exportFileUri} · SHA-256 ${response.workerResponse.exportFileHash}.`
    );
    if (!result) return;
    setArtifact(result);
    setPreview(result.exportPreview);
  }

  async function markOpened() {
    if (!preview || !actorId.trim()) return;
    const result = await run(
      "Record opened in Microsoft Project",
      () => client.exportPreview.markOpenedInMicrosoftProject(projectId.trim(), preview.batch.id, {
        openedByUserId: actorId.trim(),
        reason: "Planner opened the generated candidate in Microsoft Project.",
        metadata: { source: "round-trip-test-ui", synthetic: true }
      }),
      (detail) => `Batch ${detail.batch.id} is ${detail.batch.status}.`
    );
    if (result) setPreview(result);
  }

  async function verifyArtifact() {
    if (!preview || !actorId.trim()) return;
    const result = await run(
      "Verify Microsoft Project check",
      () => client.exportPreview.verify(projectId.trim(), preview.batch.id, {
        verifiedByUserId: actorId.trim(),
        reason: verificationNotes.trim() || "Manual Project verification completed.",
        metadata: {
          source: "round-trip-test-ui",
          synthetic: true,
          projectCalculatedConsequencesExpected: true
        }
      }),
      (detail) => `Batch ${detail.batch.id} is ${detail.batch.status}.`
    );
    if (result) setPreview(result);
  }

  async function copyArtifactPath() {
    const uri = artifact?.workerResponse.exportFileUri ?? preview?.batch.exportFileUri;
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
      log("Copy artifact path", uri);
    } catch {
      setError("Clipboard access was blocked. Copy the artifact URI manually.");
    }
  }

  const batchStatus = preview?.batch.status ?? "NOT CREATED";
  const generatedUri = artifact?.workerResponse.exportFileUri ?? preview?.batch.exportFileUri ?? "";
  const generatedHash = artifact?.workerResponse.exportFileHash ?? preview?.batch.exportFileHash ?? "";

  return (
    <main className="rt-shell">
      <header className="rt-header">
        <div>
          <p className="rt-kicker">Local acceptance harness</p>
          <h1>Microsoft Project round-trip test</h1>
          <p>
            Drive the existing candidate → approval → preview → artifact → Project verification path from the browser.
            Microsoft Project is expected to recalculate the candidate. The test is checking controlled inputs, provenance,
            and a reviewable result — not preventing the schedule from changing.
          </p>
        </div>
        <div className="rt-header-state">
          <span>Batch</span>
          <strong>{batchStatus}</strong>
        </div>
      </header>

      <section className="rt-warning">
        <strong>Current limitation</strong>
        <span>
          This harness starts from a snapshot that already exists in the API. The current upload/parse-summary endpoint does
          not yet expose a complete upload → persisted snapshot workflow. Once a snapshot exists, the remaining round-trip
          sequence can be driven here without PowerShell/API calls.
        </span>
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading">
          <div>
            <span>1</span>
            <h2>Connect and load a snapshot</h2>
          </div>
          <button type="button" onClick={() => void loadSnapshots()} disabled={Boolean(busy)}>
            {busy === "Load project snapshots" ? "Loading…" : "Load snapshots"}
          </button>
        </div>
        <div className="rt-form-grid three">
          <label>
            API base URL
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>
          <label>
            Project ID
            <input value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="UUID" />
          </label>
          <label>
            Planner/test actor ID
            <input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="UUID" />
          </label>
        </div>
        <div className="rt-form-grid two">
          <label>
            Snapshot
            <select
              value={snapshotId}
              onChange={(event) => {
                const value = event.target.value;
                setSnapshotId(value);
                void loadSnapshotDetail(value);
              }}
              disabled={snapshots.length === 0}
            >
              <option value="">Select snapshot</option>
              {snapshots.map((snapshot) => (
                <option value={snapshot.id} key={snapshot.id}>
                  v{snapshot.snapshotVersion} · {snapshot.status} · {snapshot.externalProjectName ?? snapshot.id}
                </option>
              ))}
            </select>
          </label>
          <div className="rt-inline-action">
            <span>Snapshot state</span>
            <strong>{selectedSnapshot?.status ?? "—"}</strong>
            {selectedSnapshot && selectedSnapshot.status !== "ACCEPTED" ? (
              <button type="button" onClick={() => void acceptSnapshot()} disabled={Boolean(busy)}>
                Accept snapshot
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading">
          <div>
            <span>2</span>
            <h2>Choose the exact Project input</h2>
          </div>
          <button type="button" onClick={() => void createCandidate()} disabled={Boolean(busy) || selectedSnapshot?.status !== "ACCEPTED" || !selectedTask}>
            Create candidate
          </button>
        </div>
        <div className="rt-form-grid three">
          <label className="wide">
            Leaf task
            <select
              value={taskId}
              onChange={(event) => {
                const value = event.target.value;
                setTaskId(value);
                const task = leafTasks.find((item) => item.id === value) ?? null;
                setProposedValue(defaultProposedValue(fieldName, task));
                clearForwardState("task");
              }}
              disabled={leafTasks.length === 0}
            >
              <option value="">Select leaf task</option>
              {leafTasks.map((task) => (
                <option value={task.id} key={task.id}>{displayTask(task)}</option>
              ))}
            </select>
          </label>
          <label>
            Field
            <select
              value={fieldName}
              onChange={(event) => {
                const value = event.target.value as ExportCandidateFieldName;
                setFieldName(value);
                setProposedValue(defaultProposedValue(value, selectedTask));
                clearForwardState("task");
              }}
            >
              <option value="percent_complete">Percent complete</option>
              <option value="actual_start">Actual start</option>
              <option value="actual_finish">Actual finish</option>
            </select>
          </label>
          <label>
            Proposed value
            <input value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} />
          </label>
        </div>
        {selectedTask ? (
          <dl className="rt-facts">
            <div><dt>Task</dt><dd>{selectedTask.name}</dd></div>
            <div><dt>UID / ID</dt><dd>{selectedTask.externalUid} / {selectedTask.externalId}</dd></div>
            <div><dt>Current %</dt><dd>{selectedTask.percentComplete ?? "—"}</dd></div>
            <div><dt>Actual start</dt><dd>{selectedTask.actualStart ?? "—"}</dd></div>
            <div><dt>Actual finish</dt><dd>{selectedTask.actualFinish ?? "—"}</dd></div>
          </dl>
        ) : null}
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading">
          <div>
            <span>3</span>
            <h2>Approve and generate</h2>
          </div>
        </div>
        <div className="rt-action-row">
          <button type="button" onClick={() => void approveCandidate()} disabled={Boolean(busy) || !candidate || candidateApproved}>
            {candidateApproved ? "Candidate approved" : "Approve candidate"}
          </button>
          <button type="button" onClick={() => void createPreview()} disabled={Boolean(busy) || !candidateApproved || Boolean(preview)}>
            Create preview
          </button>
          <button type="button" onClick={() => void approvePreview()} disabled={Boolean(busy) || !preview || preview.batch.status !== "DRAFT_PREVIEW"}>
            Approve batch
          </button>
          <button type="button" onClick={() => void generateArtifact()} disabled={Boolean(busy) || !preview || preview.batch.status !== "APPROVED"}>
            Generate XML
          </button>
        </div>
        {candidate ? (
          <dl className="rt-facts">
            <div><dt>Candidate ID</dt><dd>{candidate.id}</dd></div>
            <div><dt>Captured task</dt><dd>{candidate.capturedTaskName}</dd></div>
            <div><dt>Approved input</dt><dd>{candidate.fieldName}: {candidate.normalizedOldValue ?? "—"} → {candidate.normalizedNewValue}</dd></div>
            <div><dt>Policy</dt><dd>{candidate.bindingPolicyVersion}</dd></div>
          </dl>
        ) : null}
        {preview ? (
          <dl className="rt-facts">
            <div><dt>Batch ID</dt><dd>{preview.batch.id}</dd></div>
            <div><dt>Status</dt><dd>{preview.batch.status}</dd></div>
            <div><dt>Eligible lines</dt><dd>{preview.batch.eligibleLineCount}</dd></div>
            <div><dt>Line set sealed</dt><dd>{String(preview.batch.lineSetSealed)}</dd></div>
          </dl>
        ) : null}
      </section>

      <section className="rt-panel">
        <div className="rt-panel-heading">
          <div>
            <span>4</span>
            <h2>Open in Microsoft Project and verify</h2>
          </div>
          <button type="button" onClick={() => void copyArtifactPath()} disabled={!generatedUri}>Copy artifact URI</button>
        </div>
        {generatedUri ? (
          <div className="rt-artifact">
            <div>
              <span>Generated candidate</span>
              <code>{generatedUri}</code>
            </div>
            <div>
              <span>SHA-256</span>
              <code>{generatedHash}</code>
            </div>
          </div>
        ) : (
          <p className="rt-muted">Generate the artifact first. The API currently returns a local file URI rather than a browser download.</p>
        )}
        <div className="rt-checklist">
          <strong>Manual Project check</strong>
          <ol>
            <li>Open the generated XML in Microsoft Project.</li>
            <li>Confirm the approved input landed on the correct UID/ID task.</li>
            <li>Allow Microsoft Project to recalculate normally.</li>
            <li>Review any date, duration, summary, work, assignment, slack, criticality or project-finish changes as Project-calculated consequences.</li>
            <li>Do not reject the test merely because Project recalculated dependent schedule state.</li>
          </ol>
        </div>
        <label className="rt-notes">
          Verification notes
          <textarea value={verificationNotes} onChange={(event) => setVerificationNotes(event.target.value)} rows={3} />
        </label>
        <div className="rt-action-row">
          <button type="button" onClick={() => void markOpened()} disabled={Boolean(busy) || !preview || preview.batch.status !== "GENERATED"}>
            Mark opened in Project
          </button>
          <button type="button" onClick={() => void verifyArtifact()} disabled={Boolean(busy) || !preview || preview.batch.status !== "OPENED_IN_MICROSOFT_PROJECT"}>
            Record verification
          </button>
        </div>
      </section>

      {error ? <section className="rt-error" role="alert"><strong>Action failed</strong><span>{error}</span></section> : null}

      <section className="rt-panel">
        <div className="rt-panel-heading">
          <div>
            <span>5</span>
            <h2>Activity</h2>
          </div>
          <button type="button" onClick={() => setActivity([])} disabled={activity.length === 0}>Clear</button>
        </div>
        <div className="rt-activity">
          {activity.length === 0 ? <p className="rt-muted">No test actions yet.</p> : activity.map((item, index) => (
            <div className={item.state === "error" ? "error" : ""} key={`${item.at}-${item.label}-${index}`}>
              <time>{item.at}</time>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
