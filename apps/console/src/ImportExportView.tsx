import { RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConsoleReviewData, ConsoleReviewLoadState } from "./apiReviewClient";
import { reviewApiRuntimeConfig } from "./apiReviewClient";
import { buildReviewRows, importExportSections } from "./consoleData";
import { PageHeading, PanelHeading, StatusLabel } from "./ConsoleViews";
import {
  parseProjectXmlPreview,
  type ProjectXmlPreview,
  type ProjectXmlTaskPreview
} from "./projectXmlPreview";
import {
  Tier1RoundTripBoundary,
  Tier1RoundTripExportPanel,
  Tier1RoundTripHistoryPanel,
  Tier1RoundTripImportPanel,
  type Tier1RoundTripChangeHandler,
  type Tier1RoundTripWorkspaceState
} from "./Tier1RoundTripTrialViews";

type ImportExportSection = (typeof importExportSections)[number];

export function ImportExportView({
  reviewData,
  loadState,
  onRefresh,
  initialSection = "Import",
  roundTripTrialMode = false,
  roundTripState = null,
  onRoundTripChange = () => undefined
}: {
  reviewData: ConsoleReviewData | null;
  loadState: ConsoleReviewLoadState;
  onRefresh: () => void;
  initialSection?: ImportExportSection;
  roundTripTrialMode?: boolean;
  roundTripState?: Tier1RoundTripWorkspaceState | null;
  onRoundTripChange?: Tier1RoundTripChangeHandler;
}) {
  const [active, setActive] = useState<ImportExportSection>(initialSection);
  const reviewRows = useMemo(() => buildReviewRows(reviewData), [reviewData]);
  const liveEnabled = !roundTripTrialMode && reviewApiRuntimeConfig.liveEnabled;
  const ordinaryMode = roundTripTrialMode ? "Browser-local experimental trial" : liveEnabled ? "Read-only API-wired" : "Not configured";
  const selectedSnapshot = reviewData?.snapshotDetail?.snapshot ?? null;

  return (
    <>
      <PageHeading
        eyebrow={roundTripTrialMode ? "Import / Export · Tier 1 Project round-trip trial" : "Import / Export · product-trial foundation"}
        title="Project schedule exchange"
        description={roundTripTrialMode ? "Exercise a temporary Project XML schedule and gather evidence for the deferred export contract." : "Review incoming Microsoft Project schedule sources. The final export and round-trip contract is intentionally deferred pending evidence review."}
        status={ordinaryMode}
      />
      {roundTripTrialMode ? <Tier1RoundTripBoundary /> : null}
      <div className="handoff-boundary">
        <strong>Current direction</strong>
        <span>{roundTripTrialMode ? "This opt-in browser-local trial generates an experimental complete-source candidate for evidence only. It is not production export authority and adds no approval lifecycle." : "Import inspection remains useful for the product trial. Export is not finalised and no candidate, approval, or Microsoft Project acceptance workflow is presented as required product behaviour."}</span>
      </div>
      {liveEnabled && (
        <div className="review-context-warning" role="note">
          <strong>Configured read-only source</strong>
          <span>Snapshot reads use configured project <code>{reviewApiRuntimeConfig.projectId}</code>. This read-only configuration does not activate a Tracker project.</span>
        </div>
      )}
      <nav className="section-tabs" aria-label="Import and Export sections">
        {importExportSections.map((section) => (
          <button
            type="button"
            className={active === section ? "selected" : ""}
            onClick={() => setActive(section)}
            key={section}
          >
            {section}
          </button>
        ))}
      </nav>

      {active === "Current Schedule" && (
        <section className="schedule-grid">
          <article className="detail-panel">
            <PanelHeading title="Current Schedule" detail={roundTripTrialMode ? "Temporary browser-memory source context." : "Configured read-only import context; no active Tracker project."} />
            <dl className="detail-list">
              <div><dt>Mode</dt><dd>{ordinaryMode}</dd></div>
              {roundTripTrialMode ? <>
                <div><dt>Temporary project</dt><dd>{roundTripState?.session.source.preview.projectName ?? "No source selected"}</dd></div>
                <div><dt>Source</dt><dd>{roundTripState?.session.source.fileName ?? "Choose Project XML/MSPDI in Import"}</dd></div>
                <div><dt>Project UID</dt><dd>{roundTripState?.session.source.preview.projectUid ?? "Not supplied"}</dd></div>
                <div><dt>Source-file SHA-256</dt><dd>{roundTripState?.session.source.hash ? <code>{roundTripState.session.source.hash}</code> : "Unavailable until a source is selected"}</dd></div>
                <div><dt>Persistence</dt><dd>Browser memory only</dd></div>
              </> : <>
                <div><dt>Active Tracker project</dt><dd>None</dd></div>
                <div><dt>Configured import project</dt><dd>{reviewData?.projectId ?? "No backend project configured"}</dd></div>
                <div><dt>Snapshots returned</dt><dd>{reviewData?.snapshots.length ?? 0}</dd></div>
                <div><dt>Selected snapshot</dt><dd>{selectedSnapshot ? `v${selectedSnapshot.snapshotVersion} · ${selectedSnapshot.status}` : "No imported snapshot selected"}</dd></div>
              </>}
              <div><dt>Read state</dt><dd>{loadState.message}</dd></div>
            </dl>
            {roundTripTrialMode
              ? <p className="surface-caption">Choose or replace the local XML source from Import. Nothing is refreshed from a backend.</p>
              : <button
                  type="button"
                  onClick={onRefresh}
                  disabled={!liveEnabled || loadState.status === "loading"}
                >
                  <RefreshCw size={16} aria-hidden="true" /> Refresh imported schedule
                </button>}
          </article>
          <article className="detail-panel">
            <PanelHeading
              title={roundTripTrialMode ? "Trial boundary" : "Import boundary"}
              detail={roundTripTrialMode ? "The imported schedule is temporary browser-local evidence." : "Schedule-source inspection does not activate or persist a project."}
            />
            <ol className="sequence-list">
              <li>Choose a Project XML/MSPDI source.</li>
              <li>Inspect its identity and task structure.</li>
              <li>{roundTripTrialMode ? "Start a temporary browser-memory schedule from the inspected hierarchy." : "Validate the source and operational mapping in a future production import flow."}</li>
              <li>{roundTripTrialMode ? "Exercise Tier 1 execution and review only explicitly selected experimental field mappings." : "Activate or simulate the imported schedule only through a separately implemented workflow."}</li>
              <li>{roundTripTrialMode ? "Use Microsoft Project manually, then re-import a new result XML for conservative comparison." : "Revisit export only after imported-schedule evidence supports a separately approved contract."}</li>
            </ol>
          </article>
        </section>
      )}

      {active === "Import" && (roundTripTrialMode ? (
        <Tier1RoundTripImportPanel state={roundTripState} onChange={onRoundTripChange} />
      ) : (
        <ImportReview
          reviewRows={reviewRows}
          loadState={loadState}
          liveEnabled={liveEnabled}
          onRefresh={onRefresh}
        />
      ))}

      {active === "Export" && (roundTripTrialMode ? (
        <Tier1RoundTripExportPanel state={roundTripState} onChange={onRoundTripChange} />
      ) : (
        <section className="detail-panel export-deferred-panel">
          <PanelHeading title="Export design not finalised" detail="Designed, not built · intentionally deferred." />
          <div className="implementation-note">
            <strong>Not current product authority</strong>
            <span>Earlier candidate and approval experiments remain technical research. They do not define the required product workflow on this branch.</span>
          </div>
          <p>The Project export and round-trip contract will be reviewed only after the imported-schedule evidence is assessed. No production export action is available here.</p>
          <div className="disabled-action-row">
            <button type="button" disabled>Export unavailable</button>
            <span>No production export action is enabled.</span>
          </div>
        </section>
      ))}

      {active === "History" && (roundTripTrialMode ? (
        <Tier1RoundTripHistoryPanel state={roundTripState} />
      ) : (
        <section className="table-panel">
          <PanelHeading title="Import history" detail="Existing configured snapshot records are shown read-only where available." />
          <ReviewRows rows={reviewRows} />
          <p className="surface-caption">Production project history, activation decisions, and export disposition are not implemented in this visual shell.</p>
        </section>
      ))}
    </>
  );
}

function ImportReview({
  reviewRows,
  loadState,
  liveEnabled,
  onRefresh
}: {
  reviewRows: ReturnType<typeof buildReviewRows>;
  loadState: ConsoleReviewLoadState;
  liveEnabled: boolean;
  onRefresh: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ProjectXmlPreview | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [leafOnly, setLeafOnly] = useState(false);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (preview?.tasks ?? []).filter((task) => {
      if (leafOnly && task.summary) return false;
      if (!normalized) return true;
      return [task.name, task.wbs, task.outlineNumber, task.uid, task.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [leafOnly, preview, query]);

  async function inspectFile(file: File | null) {
    setFileName(file?.name ?? "");
    setPreview(null);
    setError("");
    setQuery("");
    setLeafOnly(false);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setError("Choose a Microsoft Project XML or MSPDI XML file. Native .mpp inspection is not available in the browser.");
      return;
    }
    try {
      setPreview(parseProjectXmlPreview(await file.text()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The selected source could not be inspected.");
    }
  }

  return (
    <div className="import-review-stack">
      <section className="table-panel">
        <PanelHeading title="Browser Project XML inspection" detail="Functional technical foundation · the selected file stays in this browser and is not uploaded." />
        <label className="import-file-zone">
          <input
            type="file"
            accept=".xml,.mspdi.xml"
            onChange={(event) => void inspectFile(event.target.files?.[0] ?? null)}
          />
          <span><strong>{fileName || "Choose Project XML/MSPDI"}</strong><small>Checks XML structure, Project namespace, schedule identity, and task rows.</small></span>
        </label>
        <p className="surface-caption">This is lightweight source inspection, not complete MSPDI semantic validation or production import acceptance.</p>
        {error && <p className="import-error" role="alert">{error}</p>}

        {preview && (
          <>
            <dl className="import-summary-grid">
              <div><dt>Project</dt><dd>{preview.projectName}</dd></div>
              <div><dt>Project UID</dt><dd>{preview.projectUid ?? "Not supplied"}</dd></div>
              <div><dt>Status date</dt><dd>{formatProjectDate(preview.statusDate)}</dd></div>
              <div><dt>Tasks</dt><dd>{preview.taskCount}</dd></div>
              <div><dt>Summary tasks</dt><dd>{preview.summaryTaskCount}</dd></div>
              <div><dt>Leaf tasks</dt><dd>{preview.leafTaskCount}</dd></div>
            </dl>
            <div className="import-task-tools">
              <label className="search-control">
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">Search imported tasks</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search task, WBS, UID, or ID"
                />
              </label>
              <label className="checkbox-control">
                <input type="checkbox" checked={leafOnly} onChange={(event) => setLeafOnly(event.target.checked)} />
                <span>Leaf tasks only</span>
              </label>
              <span>{visibleTasks.length} of {preview.tasks.length} tasks</span>
            </div>
            <ProjectTaskTable tasks={visibleTasks} />
          </>
        )}
      </section>

      <section className="table-panel">
        <div className="panel-heading import-review-heading">
          <div><h2>Persisted import review</h2><p>Configured snapshot list/detail reads only.</p></div>
          <StatusLabel tone={liveEnabled ? "info" : "warning"}>{liveEnabled ? "Read-only API-wired" : "Not configured"}</StatusLabel>
        </div>
        <ReviewRows rows={reviewRows} />
        <div className="disabled-action-row">
          <button type="button" onClick={onRefresh} disabled={!liveEnabled || loadState.status === "loading"}>Refresh read-only snapshots</button>
          <button type="button" disabled>Persist imported schedule</button>
          <button type="button" disabled>Validate Operational Mapping</button>
          <button type="button" disabled>Activate trial schedule</button>
          <span>Production import writes and activation are not implemented.</span>
        </div>
      </section>
    </div>
  );
}

function ProjectTaskTable({ tasks }: { tasks: ProjectXmlTaskPreview[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table import-task-table">
        <thead>
          <tr><th>WBS / task</th><th>UID</th><th>ID</th><th>Type</th><th>Planned start</th><th>Planned finish</th><th>Imported progress</th></tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr key={task.uid ?? task.id ?? `task-${index}`} className={task.summary ? "summary-row" : ""}>
              <td>
                <div className="import-task-name" style={{ paddingInlineStart: `${Math.max(0, (task.outlineLevel ?? 1) - 1) * 18}px` }}>
                  <span>{task.wbs ?? task.outlineNumber ?? "—"}</span>
                  <strong>{task.name}</strong>
                </div>
              </td>
              <td>{task.uid ?? "—"}</td>
              <td>{task.id ?? "—"}</td>
              <td>{task.summary ? "Summary" : "Leaf"}</td>
              <td>{formatProjectDate(task.start)}</td>
              <td>{formatProjectDate(task.finish)}</td>
              <td>{task.percentComplete === null ? "—" : `${task.percentComplete}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewRows({ rows }: { rows: ReturnType<typeof buildReviewRows> }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>Item</th><th>Source</th><th>State</th><th>Context</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.item}-${row.source}`}>
              <td><strong>{row.item}</strong></td><td>{row.source}</td><td>{row.state}</td><td>{row.context}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatProjectDate(value: string | null) {
  return value ? value.replace("T", " ").replace(/Z$/, "") : "—";
}
