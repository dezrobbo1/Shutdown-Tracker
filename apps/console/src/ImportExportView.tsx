import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConsoleReviewData, ConsoleReviewLoadState } from "./apiReviewClient";
import { reviewApiConnection, reviewApiRuntimeConfig } from "./apiReviewClient";
import { buildExportPreviewRows, buildReviewRows, importExportSections } from "./consoleData";
import { PageHeading, PanelHeading, StatusLabel } from "./ConsoleViews";

type ImportExportSection = (typeof importExportSections)[number];

export function ImportExportView({
  shellProjectLabel,
  reviewData,
  loadState,
  onRefresh,
  roundTripMode,
  onOpenRoundTrip
}: {
  shellProjectLabel: string;
  reviewData: ConsoleReviewData | null;
  loadState: ConsoleReviewLoadState;
  onRefresh: () => void;
  roundTripMode: boolean;
  onOpenRoundTrip: () => void;
}) {
  const [active, setActive] = useState<ImportExportSection>("Current Schedule");
  const reviewRows = useMemo(() => buildReviewRows(reviewData), [reviewData]);
  const previewRows = useMemo(() => buildExportPreviewRows(reviewData), [reviewData]);
  const ordinaryMode = reviewApiRuntimeConfig.liveEnabled ? "Read-only API-wired" : "Static visual only";
  const selectedSnapshot = reviewData?.snapshotDetail?.snapshot ?? null;

  return (
    <>
      <PageHeading
        eyebrow="Import / Export · schedule handoff"
        title="Microsoft Project handoff"
        description="Inspect immutable schedule snapshots, review exact proposed inputs, and keep adoption under human Microsoft Project control."
        status={ordinaryMode}
      />
      <div className="handoff-boundary">
        <strong>Authority boundary</strong>
        <span>Candidate generation does not update the master Project file. Microsoft Project recalculates; a human reviews and chooses reject, retain, adopt, or merge.</span>
      </div>
      {reviewApiRuntimeConfig.liveEnabled && (
        <div className="review-context-warning" role="note">
          <strong>Independent review-project context</strong>
          <span>The static shell project is {shellProjectLabel}. Read-only API data is bound to configured review project <code>{reviewApiRuntimeConfig.projectId}</code>; project switching in this visual shell does not retarget that environment configuration.</span>
        </div>
      )}
      <nav className="section-tabs" aria-label="Import and Export sections">
        {importExportSections.map((section) => <button type="button" className={active === section ? "selected" : ""} onClick={() => setActive(section)} key={section}>{section}</button>)}
      </nav>

      {active === "Current Schedule" && (
        <section className="schedule-grid">
          <article className="detail-panel">
            <PanelHeading title="Current Schedule" detail="Configured or latest review snapshot; status is shown without assuming acceptance." />
            <dl className="detail-list">
              <div><dt>Review mode</dt><dd>{ordinaryMode}</dd></div>
              <div><dt>Static shell project</dt><dd>{shellProjectLabel}</dd></div>
              <div><dt>Configured review API project</dt><dd>{reviewData?.projectId ?? "No production project configured"}</dd></div>
              <div><dt>Snapshots returned</dt><dd>{reviewData?.snapshots.length ?? 0}</dd></div>
              <div><dt>Selected snapshot status</dt><dd>{selectedSnapshot?.status ?? "No review snapshot selected"}</dd></div>
              <div><dt>State</dt><dd>{loadState.message}</dd></div>
            </dl>
            <button type="button" onClick={onRefresh} disabled={!reviewApiRuntimeConfig.liveEnabled || loadState.status === "loading"}><RefreshCw size={16} aria-hidden="true" /> Refresh read-only data</button>
          </article>
          <article className="detail-panel">
            <PanelHeading title="Schedule authority" detail="Project remains the source of schedule truth." />
            <ol className="sequence-list"><li>Accepted immutable source snapshot</li><li>Tracker execution facts</li><li>Exact proposed Project inputs</li><li>Tier 1 review and approval</li><li>Complete candidate MSPDI/XML</li><li>Microsoft Project recalculation and human disposition</li></ol>
          </article>
        </section>
      )}

      {active === "Import" && (
        <section className="table-panel">
          <PanelHeading title="Import review" detail="Select → validate → parse → inspect → mapping validation → compare/reconcile → accept → activate." />
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Item</th><th>Source</th><th>State</th><th>Context</th></tr></thead><tbody>{reviewRows.map((row) => <tr key={`${row.item}-${row.source}`}><td><strong>{row.item}</strong></td><td>{row.source}</td><td>{row.state}</td><td>{row.context}</td></tr>)}</tbody></table></div>
          <div className="disabled-action-row"><button type="button" disabled>Select Project XML</button><button type="button" disabled>Validate import</button><button type="button" disabled>Compare snapshot</button><span>Ordinary production import is not yet implemented.</span></div>
        </section>
      )}

      {active === "Export" && (
        <section className="table-panel">
          <PanelHeading title="Export review" detail="Execution facts become proposed exact Project inputs before candidate generation." />
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Field</th><th>Candidate task</th><th>Eligibility</th></tr></thead><tbody>{previewRows.map((row) => <tr key={`${row.field}-${row.candidate}`}><td>{row.field}</td><td><strong>{row.candidate}</strong></td><td>{row.eligibility}</td></tr>)}</tbody></table></div>
          <div className="disabled-action-row"><button type="button" disabled>Review proposed inputs</button><button type="button" disabled>Approve exact inputs</button><button type="button" disabled>Generate candidate</button><span>Ordinary production export is not yet implemented.</span></div>
        </section>
      )}

      {active === "History" && (
        <section className="detail-panel">
          <PanelHeading title="Import / Export History" detail="Immutable snapshots, approvals, generated candidates, and human disposition." />
          <ol className="activity-list"><li>Snapshot v4 · Accepted · 24 Aug 05:52</li><li>Snapshot v3 · Superseded · 23 Aug 18:20</li><li>Candidate review · Real Microsoft Project round trip not yet performed</li></ol>
        </section>
      )}

      <section className="review-workspace-entry" aria-label="Round-trip acceptance workspace entry">
        <div>
          <p className="eyebrow">Review workspace</p>
          <h2>Browser round-trip acceptance</h2>
          <p>Preserved PR #48 workflow for local MSPDI inspection, persisted snapshots, exact input approval, sealed preview, complete-source generation, download, and verification metadata.</p>
        </div>
        <div className="workspace-entry-state">
          <StatusLabel tone={roundTripMode ? "success" : "warning"}>{roundTripMode ? "Review workspace enabled" : "Feature flag disabled"}</StatusLabel>
          <button type="button" className="button-primary" onClick={onOpenRoundTrip} disabled={!roundTripMode}>Open round-trip review workspace</button>
        </div>
        <p className="surface-caption">The remaining real Microsoft Project recalculation and human review has not yet been performed.</p>
      </section>

      <details className="technical-disclosure">
        <summary>Read-only API review configuration</summary>
        <p>{reviewApiConnection.baseUrlLabel} · {reviewApiConnection.projectIdLabel} · {reviewApiConnection.operationCount} client contract operations available; this ordinary shell invokes GET review reads only.</p>
      </details>
    </>
  );
}
