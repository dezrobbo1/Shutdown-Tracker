import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConsoleReviewData, ConsoleReviewLoadState } from "./apiReviewClient";
import { reviewApiRuntimeConfig } from "./apiReviewClient";
import { buildReviewRows, importExportSections } from "./consoleData";
import { PageHeading, PanelHeading, StatusLabel } from "./ConsoleViews";
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
  onRoundTripChange = () => undefined,
  onRoundTripStarted = () => undefined
}: {
  reviewData: ConsoleReviewData | null;
  loadState: ConsoleReviewLoadState;
  onRefresh: () => void;
  initialSection?: ImportExportSection;
  roundTripTrialMode?: boolean;
  roundTripState?: Tier1RoundTripWorkspaceState | null;
  onRoundTripChange?: Tier1RoundTripChangeHandler;
  onRoundTripStarted?: () => void;
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
        description={roundTripTrialMode ? "Exercise a temporary Project XML schedule and gather evidence for the deferred export contract." : "Inspect a local Microsoft Project XML source and explicitly start a temporary round-trip trial when ready. The final export contract remains deferred."}
        status={ordinaryMode}
      />
      {roundTripTrialMode ? <Tier1RoundTripBoundary /> : null}
      <div className="handoff-boundary">
        <strong>Current direction</strong>
        <span>{roundTripTrialMode ? "This opt-in browser-local trial generates an experimental complete-source candidate for evidence only. It is not production export authority and adds no approval lifecycle." : "Selecting XML inspects it locally; only the separate Start action creates a temporary browser-memory trial. Nothing activates or persists a production project, and Export remains unfinalised."}</span>
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
            aria-current={active === section ? "page" : undefined}
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
              <li>{roundTripTrialMode ? "Start a temporary browser-memory schedule from the inspected hierarchy." : "Choose Start round-trip trial only after reviewing the inspected source."}</li>
              <li>{roundTripTrialMode ? "Exercise Tier 1 execution and review only explicitly selected experimental field mappings." : "Use the imported hierarchy in the explicitly labelled browser-memory trial; no production project is activated."}</li>
              <li>{roundTripTrialMode ? "Use Microsoft Project manually, then re-import a new result XML for conservative comparison." : "Keep production import/export decisions deferred while gathering local trial evidence."}</li>
            </ol>
          </article>
        </section>
      )}

      {active === "Import" && (
        <div className="import-review-stack">
          <Tier1RoundTripImportPanel
            state={roundTripState}
            onChange={onRoundTripChange}
            onStarted={onRoundTripStarted}
          />
          {!roundTripTrialMode ? (
            <PersistedImportReview
              reviewRows={reviewRows}
              loadState={loadState}
              liveEnabled={liveEnabled}
              onRefresh={onRefresh}
            />
          ) : null}
        </div>
      )}

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

function PersistedImportReview({
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
  return (
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
        <span>Production import writes and activation are not implemented.</span>
      </div>
    </section>
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
