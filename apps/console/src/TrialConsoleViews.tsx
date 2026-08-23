import {
  GUIDED_TRIAL_STEPS,
  REPORTING_FIELD_LABELS,
  REPORTING_MECHANISM_LABELS,
  REPORTING_TRIGGER_LABELS,
  TRIAL_DAY_END_MINUTE,
  formatTrialDateTime,
  formatTrialTime,
  formatTrialWindow,
  nextGuidedEventMinute,
  nextReportDueMinute,
  nextShiftBoundaryMinute,
  selectCriticalItems,
  selectCriticalObligationProjections,
  selectTaskHistory,
  selectTaskProjection,
  selectTodayProjection,
  type CriticalPolicyInput,
  type ReportingField,
  type ReportingMechanism,
  type ReportingTrigger,
  type TaskProjection,
  type TrialAction,
  type TrialState
} from "@shutdown-tracker/trial-model";
import { ChevronDown, ChevronRight, ExternalLink, RotateCcw, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeading, PanelHeading, StatusLabel } from "./ConsoleViews";
import { taskDashboardSections, type StatusTone } from "./consoleData";

type TrialActionHandler = (action: TrialAction) => void;

export function TrialClock({
  state,
  onAction,
  onOpenMobile,
  mobileConfigured
}: {
  state: TrialState;
  onAction: TrialActionHandler;
  onOpenMobile: () => void;
  mobileConfigured: boolean;
}) {
  const nextEvent = nextGuidedEventMinute(state);
  const nextReport = nextReportDueMinute(state);
  const nextShift = nextShiftBoundaryMinute(state);
  return (
    <section className="trial-control-bar" aria-label="Deterministic simulation clock">
      <div className="trial-clock-readout">
        <span>Simulated shutdown time</span>
        <strong>{formatTrialDateTime(state.now)}</strong>
        <small>{state.project.timezone} · {state.scenarioVersion}</small>
      </div>
      <div className="trial-clock-actions">
        <button type="button" disabled={state.now + 15 > TRIAL_DAY_END_MINUTE} onClick={() => onAction({ type: "advance-minutes", minutes: 15 })}>+15 minutes</button>
        <button type="button" disabled={state.now + 60 > TRIAL_DAY_END_MINUTE} onClick={() => onAction({ type: "advance-minutes", minutes: 60 })}>+1 hour</button>
        <button type="button" disabled={nextEvent === null} onClick={() => nextEvent !== null && onAction({ type: "advance-to", minute: nextEvent })}>Next event</button>
        <button type="button" disabled={nextReport === null} onClick={() => nextReport !== null && onAction({ type: "advance-to", minute: nextReport })}>Next report due</button>
        <button type="button" disabled={nextShift > TRIAL_DAY_END_MINUTE} onClick={() => onAction({ type: "advance-to", minute: nextShift })}>Next shift boundary</button>
        <button type="button" onClick={() => onAction({ type: "reset" })}><RotateCcw size={15} aria-hidden="true" /> Reset trial</button>
        <button type="button" disabled={!mobileConfigured} onClick={onOpenMobile}><ExternalLink size={15} aria-hidden="true" /> Open Mobile trial</button>
      </div>
      <p>Deterministic local state · no production persistence · all event times use this clock.</p>
    </section>
  );
}

export function TrialTodayView({ state, onOpenTask, onAction }: { state: TrialState; onOpenTask: (taskId: string) => void; onAction: TrialActionHandler }) {
  const today = selectTodayProjection(state);
  const counts = [
    ["Planned in period", today.tasks.length, "neutral"],
    ["Not Started", today.counts["Not Started"], "warning"],
    ["In Progress", today.counts["In Progress"], "info"],
    ["Paused", today.counts.Paused, "warning"],
    ["Blocked / Can't Start", today.blocked, "danger"],
    ["Completed", today.counts.Completed, "success"]
  ] as const;

  return (
    <>
      <PageHeading
        eyebrow="Today · deterministic 24-hour projection"
        title="Operational day"
        description={`${formatTrialDateTime(today.windowStart)} to ${formatTrialDateTime(today.windowEnd)} · ${state.project.timezone}`}
        status="Synthetic operational trial"
      />
      <section className="status-strip" aria-label="Derived execution state and attention summary">
        {counts.map(([label, value, tone]) => <div key={label}><span>{label}</span><strong>{value}</strong><StatusLabel tone={tone}>{label}</StatusLabel></div>)}
      </section>
      <section className="split-layout">
        <article className="table-panel wide-panel">
          <PanelHeading title="Work in the operational period" detail="Derived from imported facts, Tracker events, assignments, problems, actions, and simulated time." />
          <TrialTaskTable rows={today.tasks} onOpenTask={onOpenTask} compact />
        </article>
        <aside className="activity-panel">
          <PanelHeading title="Attention now" detail="Schedule attention remains separate from execution state." />
          <dl className="attention-list">
            <div><dt>Late starts</dt><dd>{today.lateStarts}</dd></div>
            <div><dt>Running beyond planned finish</dt><dd>{today.runningBeyondFinish}</dd></div>
            <div><dt>No recent update</dt><dd>{today.noRecentUpdate}</dd></div>
            <div><dt>Critical reports due / overdue</dt><dd>{today.criticalDue} / {today.criticalOverdue}</dd></div>
            <div><dt>Actions due / overdue</dt><dd>{today.dueActions}</dd></div>
            <div><dt>Active delays / problems</dt><dd>{today.activeProblems}</dd></div>
          </dl>
          <h3>Recent activity</h3>
          <ol className="activity-list">{today.recentActivity.map((event) => <li key={event.id}><strong>{formatTrialTime(event.at)}</strong> · {event.summary}</li>)}</ol>
        </aside>
      </section>
      <GuidedTrial state={state} onAction={onAction} />
      <div className="rule-note"><strong>Task-state rule</strong><span>Planned-time passage can create Late to Start, but never In Progress. Only accepted imported evidence or a Tracker Start/Resume event establishes execution.</span></div>
    </>
  );
}

export function TrialTasksView({ state, onOpenTask }: { state: TrialState; onOpenTask: (taskId: string) => void }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const projections = useMemo(() => state.tasks.map((task) => selectTaskProjection(state, task.id)), [state]);
  const normalized = query.trim().toLowerCase();
  const rows = projections.filter(({ task }) => !normalized || `${task.wbs} ${task.name} ${task.workPackage}`.toLowerCase().includes(normalized));
  const visibleRows = rows.filter(({ task }) => !state.tasks.some((candidate) => candidate.summary && collapsed.has(candidate.id) && task.wbs.startsWith(`${candidate.wbs}.`)));

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      <PageHeading eyebrow="Tasks · deterministic project explorer" title="Synthetic task structure" description="Imported schedule context with live local execution, assignment, Critical, and attention projections." status="Synthetic operational trial" />
      <section className="explorer-tools" aria-label="Task explorer controls">
        <label className="search-control"><Search size={17} aria-hidden="true" /><span className="sr-only">Search trial tasks</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search WBS, task, or work package" /></label>
        <button type="button" disabled>Filter</button><button type="button" disabled>Group</button><button type="button" disabled>Columns</button><button type="button" disabled>Saved views</button>
      </section>
      <section className="table-panel">
        <TrialTaskTable rows={visibleRows} onOpenTask={onOpenTask} onToggleSummary={toggle} collapsedSummaryIds={collapsed} />
      </section>
      <p className="surface-caption">Search and hierarchy controls are local. The trial does not edit planned dates, dependencies, or Project-calculated schedule facts.</p>
    </>
  );
}

function TrialTaskTable({
  rows,
  onOpenTask,
  onToggleSummary,
  collapsedSummaryIds,
  compact = false
}: {
  rows: TaskProjection[];
  onOpenTask: (taskId: string) => void;
  onToggleSummary?: (taskId: string) => void;
  collapsedSummaryIds?: ReadonlySet<string>;
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className={`data-table task-table${compact ? " compact" : ""}`}>
        <thead><tr><th>WBS / task</th><th>Execution state</th><th>Schedule attention</th><th>Tier 2 tracking owner</th><th>Planned window</th><th>Progress</th><th>Last activity</th></tr></thead>
        <tbody>{rows.map((projection) => {
          const { task } = projection;
          return <tr key={task.id} className={task.summary ? "summary-row" : ""}>
            <td><div className="task-name-cell" style={{ paddingInlineStart: `${task.depth * 20}px` }}>
              {task.summary && onToggleSummary ? <button type="button" className="tree-toggle" aria-label={`Expand or collapse ${task.name}`} aria-expanded={!collapsedSummaryIds?.has(task.id)} onClick={() => onToggleSummary(task.id)}>{collapsedSummaryIds?.has(task.id) ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</button> : task.depth > 0 ? <ChevronRight className="tree-leaf" size={13} aria-hidden="true" /> : null}
              <span className="wbs">{task.wbs}</span><button className="button-link" type="button" onClick={() => onOpenTask(task.id)}>{task.name}</button><small>{task.workPackage}</small>
            </div></td>
            <td><StatusLabel tone={executionTone(projection.executionState)}>{projection.executionState}</StatusLabel><small>{projection.stateBasis}</small></td>
            <td className={projection.attention.length === 0 ? "muted" : "attention-text"}>{projection.attention.join(" · ") || "None"}</td>
            <td>{projection.trackingOwner?.name ?? "Unassigned"}</td>
            <td>{formatTrialWindow(task.plannedStart, task.plannedFinish)}</td>
            <td><strong>{projection.progressPercent}%</strong></td>
            <td>{projection.lastActivityAt === null ? "No activity" : formatTrialTime(projection.lastActivityAt)}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

export function TrialTaskDashboard({ state, taskId, backLabel, onBack, onAction, initialSection = "Overview" }: { state: TrialState; taskId: string; backLabel: "Today" | "Tasks"; onBack: () => void; onAction: TrialActionHandler; initialSection?: (typeof taskDashboardSections)[number] }) {
  const [activeSection, setActiveSection] = useState<(typeof taskDashboardSections)[number]>(initialSection);
  const projection = selectTaskProjection(state, taskId);
  const { task } = projection;
  const tier2Users = state.users.filter((user) => user.tier === "Tier 2");
  const history = selectTaskHistory(state, task.id);

  return (
    <>
      <button className="back-link" type="button" onClick={onBack}>← Back to {backLabel}</button>
      <PageHeading eyebrow={`${task.wbs} · ${task.workPackage}`} title={task.name} description={task.summary ? "Summary task · aggregate work-pack projection" : "Executable leaf task · deterministic local trial"} status="Synthetic operational trial" />
      <section className="task-state-header">
        <div><span>Execution state</span><StatusLabel tone={executionTone(projection.executionState)}>{projection.executionState}</StatusLabel><small>{projection.stateBasis}</small></div>
        <div><span>Schedule attention</span><strong>{projection.attention.join(" · ") || "None"}</strong><small>Attention does not alter execution state.</small></div>
        <div><span>Tier 2 tracking owner</span><strong>{projection.trackingOwner?.name ?? "Unassigned"}</strong><small>Updates the shared Tier 2 Mobile projection immediately.</small></div>
      </section>
      <div className="trial-assignment-row">
        <label><span>Reassign Tier 2 tracking responsibility</span><select value={projection.trackingOwner?.id ?? ""} onChange={(event) => onAction({ type: "assign-tier2", taskId: task.id, tier2UserId: event.target.value, actorId: "tier1-dana" })}><option value="" disabled>Choose Tier 2</option>{tier2Users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <span>Local trial action · Tier 2 retains responsibility after Tier 3 delegation.</span>
      </div>
      <nav className="section-tabs" aria-label="Task Dashboard sections">{taskDashboardSections.map((section) => <button type="button" className={activeSection === section ? "selected" : ""} onClick={() => setActiveSection(section)} key={section}>{section}</button>)}</nav>
      <section className="detail-panel trial-dashboard-panel">
        {activeSection === "Overview" && <OverviewPanel projection={projection} />}
        {activeSection === "Execution" && <ExecutionPanel state={state} taskId={task.id} />}
        {activeSection === "People" && <PeoplePanel projection={projection} />}
        {activeSection === "Discussion" && <PlaceholderPanel title="Discussion" text="Task-linked discussion is represented for product review; production communications persistence is not implemented." />}
        {activeSection === "Delays / Problems" && <ProblemsPanel projection={projection} onAction={onAction} />}
        {activeSection === "Actions" && <ActionsPanel projection={projection} onAction={onAction} />}
        {activeSection === "Evidence" && <PlaceholderPanel title="Evidence" text={task.evidenceRequirement ?? "Optional task-linked evidence placeholder. No file is uploaded or persisted."} />}
        {activeSection === "History" && <HistoryPanel state={state} events={history} />}
        {activeSection === "Project / import / export context" && <PlaceholderPanel title="Project / import / export context" text={`${state.project.importedSnapshot} · imported schedule facts remain read-only · final Project export design is deferred.`} />}
      </section>
    </>
  );
}

function OverviewPanel({ projection }: { projection: TaskProjection }) {
  return <><PanelHeading title="Overview" detail="One operational record for the selected task." /><dl className="detail-list"><div><dt>Planned window</dt><dd>{formatTrialWindow(projection.task.plannedStart, projection.task.plannedFinish)}</dd></div><div><dt>Tracker progress</dt><dd>{projection.progressPercent}%</dd></div><div><dt>Field assignments</dt><dd>{projection.fieldAssignments.length}</dd></div><div><dt>Critical context</dt><dd>{projection.criticalItems.length > 0 ? `${projection.criticalItems.length} configured item(s)` : "Not selected"}</dd></div></dl></>;
}

function ExecutionPanel({ state, taskId }: { state: TrialState; taskId: string }) {
  const events = state.executionEvents.filter((event) => event.taskId === taskId && event.at <= state.now).sort((left, right) => right.at - left.at);
  return <><PanelHeading title="Execution" detail="Mobile actions use the simulated clock; Tier 1 observes the same truth." /><ol className="activity-list trial-record-list">{events.length === 0 ? <li>No Tracker execution event yet.</li> : events.map((event) => <li key={event.id}><strong>{formatTrialTime(event.at)} · {executionEventLabel(event.type)}</strong><span>{event.reason ?? event.lateCause ?? "System-captured action time"}</span></li>)}</ol></>;
}

function PeoplePanel({ projection }: { projection: TaskProjection }) {
  return <><PanelHeading title="People" detail="Explicit assignment, not category-derived authority." /><div className="settings-table"><div className="settings-head"><span>Responsibility</span><span>User</span><span>Context</span></div><div><strong>Tier 2 tracking</strong><span>{projection.trackingOwner?.name ?? "Unassigned"}</span><span>Retained after delegation</span></div>{projection.fieldAssignments.map((assignment) => <div key={assignment.id}><strong>Tier 3</strong><span>{assignment.user.name}</span><span>{assignment.relationship}</span></div>)}</div></>;
}

function ProblemsPanel({ projection, onAction }: { projection: TaskProjection; onAction: TrialActionHandler }) {
  return <><PanelHeading title="Delays / Problems" detail="Pause intervals and structured adverse problems remain distinct." /><ul className="record-list trial-action-records">{projection.activeProblems.length === 0 ? <li><strong>No active problem</strong><span>No unresolved structured problem is linked.</span></li> : projection.activeProblems.map((problem) => <li key={problem.id}><strong>{problem.reason}</strong><span>{problem.whatIsNeeded} · {problem.adverse ? "Adverse delay" : "Operational context"}</span><button type="button" onClick={() => onAction({ type: "resolve-problem", problemId: problem.id, actorId: "tier1-dana" })}>Resolve problem in trial</button></li>)}</ul></>;
}

function ActionsPanel({ projection, onAction }: { projection: TaskProjection; onAction: TrialActionHandler }) {
  return <><PanelHeading title="Actions" detail="Open task-owned recovery work." /><ul className="record-list trial-action-records">{projection.openActions.length === 0 ? <li><strong>No open action</strong><span>No task action is currently outstanding.</span></li> : projection.openActions.map((action) => <li key={action.id}><strong>{action.description}</strong><span>{action.dueAt === undefined ? "No due time" : `Due ${formatTrialTime(action.dueAt)}`}</span><button type="button" onClick={() => onAction({ type: "complete-action", actionId: action.id, actorId: "tier1-dana" })}>Complete action in trial</button></li>)}</ul></>;
}

function HistoryPanel({ state, events }: { state: TrialState; events: ReturnType<typeof selectTaskHistory> }) {
  return <><PanelHeading title="History" detail="The same deterministic history feeds Today recent activity." /><ol className="activity-list trial-history-list">{events.length === 0 ? <li>No task history yet.</li> : events.map((event) => <li key={event.id}><strong>{formatTrialDateTime(event.at)}</strong><span>{event.summary} · {state.users.find((user) => user.id === event.actorId)?.name ?? "System"}</span></li>)}</ol></>;
}

function PlaceholderPanel({ title, text }: { title: string; text: string }) {
  return <><PanelHeading title={title} detail="Synthetic operational trial" /><p className="trial-placeholder">{text}</p></>;
}

export function TrialCriticalView({ state, onAction }: { state: TrialState; onAction: TrialActionHandler }) {
  const items = selectCriticalItems(state);
  const obligations = selectCriticalObligationProjections(state);
  const [selectedId, setSelectedId] = useState(items[0]?.item.id ?? "");
  const selected = items.find((item) => item.item.id === selectedId) ?? items[0];
  const overdue = obligations.filter((item) => item.state === "overdue").length;
  const due = obligations.filter((item) => item.state === "due").length;

  return (
    <>
      <PageHeading eyebrow="Critical · Tier 1 deterministic configuration" title="Critical reporting" description="Selected Project-critical leaf tasks and summary-plus-descendant work packs share one versioned policy model. No critical path is calculated." status="Synthetic operational trial" />
      <section className="critical-summary"><div><span>Active Critical items</span><strong>{items.length}</strong></div><div><span>Reports overdue</span><strong>{overdue}</strong></div><div><span>Reports due now</span><strong>{due}</strong></div><span className="critical-summary-note">Configured supported catalogue only</span></section>
      <section className="table-panel"><div className="table-scroll"><table className="data-table critical-table"><thead><tr><th>Critical item / source</th><th>Tier 2 reporting owner</th><th>Policy / template</th><th>Mechanisms and required content</th><th>Next obligation</th><th>Latest report</th></tr></thead><tbody>{items.map((entry) => {
        const template = state.criticalTemplates.find((candidate) => candidate.id === entry.policy.templateId);
        return <tr key={entry.item.id} className={selected?.item.id === entry.item.id ? "selected-row" : ""}>
          <td><button className="button-link" type="button" onClick={() => setSelectedId(entry.item.id)}>{entry.sourceTask.name}</button><StatusLabel>{entry.item.sourceType}</StatusLabel><small>{entry.item.sourceType === "Critical Work Pack" ? "Selected summary plus all descendants" : "Explicit selected Project-critical leaf"}</small></td>
          <td>{entry.owner.name} · Tier 2</td>
          <td><strong>Policy v{entry.policy.version}</strong><small>{template?.name ?? entry.policy.templateId}{entry.policy.itemOverride ? " · item override" : ""}</small></td>
          <td><strong>{entry.policy.mechanisms.map((value) => REPORTING_MECHANISM_LABELS[value]).join(" + ")}</strong><small>{entry.policy.requiredFields.map((value) => REPORTING_FIELD_LABELS[value]).join(", ")}</small></td>
          <td>{entry.nextObligation ? <><strong>{formatTrialTime(entry.nextObligation.obligation.dueAt)}</strong><StatusLabel tone={obligationTone(entry.nextObligation.state)}>{entry.nextObligation.state}</StatusLabel></> : "No routine obligation"}</td>
          <td>{entry.latestReport ? <><strong>{formatTrialTime(entry.latestReport.submittedAt)}</strong><small>Immutable report</small></> : "No report submitted"}</td>
        </tr>;
      })}</tbody></table></div></section>
      {selected && <><CriticalPolicyEditor key={selected.policy.id} state={state} selected={selected} onAction={onAction} /><CriticalReportHistory state={state} selected={selected} /></>}
      <AddCriticalItem state={state} onAction={onAction} />
      <div className="rule-note"><strong>Versioning and history</strong><span>Saving an item override creates a new effective policy version. Existing obligations and immutable reports retain their original policy identity; report corrections supersede rather than overwrite.</span></div>
      <div className="rule-note"><strong>Execution truth first</strong><span>Known task facts pre-populate reporting. Critical reporting does not create another execution-state model or require routine reports for every task.</span></div>
    </>
  );
}

type CriticalSelection = ReturnType<typeof selectCriticalItems>[number];

function CriticalReportHistory({ state, selected }: { state: TrialState; selected: CriticalSelection }) {
  const reports = selected.reports;
  return (
    <section className="detail-panel critical-report-history">
      <PanelHeading title="Report history" detail="Submitted reports are immutable; corrections append a superseding revision." />
      <ol className="activity-list">
        {reports.length === 0 ? <li>No report submitted for this Critical item.</li> : reports.map((report) => {
          const superseded = state.criticalReports.some((candidate) => candidate.supersedesReportId === report.id);
          const policy = state.criticalPolicies.find((candidate) => candidate.id === report.policyVersionId);
          return <li key={report.id}><strong>{formatTrialDateTime(report.submittedAt)} · {superseded ? "Superseded" : "Submitted"}</strong><span>Policy v{policy?.version ?? "?"} · {report.id}</span></li>;
        })}
      </ol>
    </section>
  );
}

function CriticalPolicyEditor({ state, selected, onAction }: { state: TrialState; selected: CriticalSelection; onAction: TrialActionHandler }) {
  const [ownerUserId, setOwnerUserId] = useState(selected.policy.ownerUserId);
  const [templateId, setTemplateId] = useState(selected.policy.templateId);
  const [mechanisms, setMechanisms] = useState<ReportingMechanism[]>(selected.policy.mechanisms);
  const [intervalMinutes, setIntervalMinutes] = useState(selected.policy.intervalMinutes ?? 120);
  const [fixedTimes, setFixedTimes] = useState(selected.policy.fixedTimes.map(formatTrialTime).join(", "));
  const [triggers, setTriggers] = useState<ReportingTrigger[]>(selected.policy.triggers);
  const [requiredFields, setRequiredFields] = useState<ReportingField[]>(selected.policy.requiredFields);
  const [formError, setFormError] = useState("");
  const tier2Users = state.users.filter((user) => user.tier === "Tier 2");

  function chooseTemplate(nextTemplateId: string) {
    const template = state.criticalTemplates.find((candidate) => candidate.id === nextTemplateId);
    if (!template) return;
    setTemplateId(template.id);
    setMechanisms(template.mechanisms);
    setIntervalMinutes(template.intervalMinutes ?? 120);
    setFixedTimes((template.fixedTimes ?? []).map(formatTrialTime).join(", "));
    setTriggers(template.triggers);
    setRequiredFields(template.requiredFields);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const parsedFixedTimes = parseFixedTimes(fixedTimes);
      const policy: CriticalPolicyInput = { ownerUserId, templateId, mechanisms, intervalMinutes: mechanisms.includes("interval") ? intervalMinutes : undefined, fixedTimes: mechanisms.includes("fixed-time") ? parsedFixedTimes : [], triggers, requiredFields };
      setFormError("");
      onAction({ type: "configure-critical", criticalItemId: selected.item.id, actorId: "tier1-dana", policy });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The supported policy configuration is invalid.");
    }
  }

  return (
    <form className="detail-panel critical-policy-panel" aria-labelledby="trial-critical-policy-heading" onSubmit={submit}>
      <header className="panel-heading"><div><h2 id="trial-critical-policy-heading">Configure {selected.sourceTask.name}</h2><p>Current Policy v{selected.policy.version}. Saving creates Policy v{selected.policy.version + 1} for this item only.</p></div></header>
      <div className="policy-config-row">
        <label><span>Tier 2 reporting owner</span><select value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)}>{tier2Users.map((user) => <option key={user.id} value={user.id}>{user.name} · Tier 2</option>)}</select></label>
        <label><span>Template starting point</span><select value={templateId} onChange={(event) => chooseTemplate(event.target.value)}>{state.criticalTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        <label><span>Fixed interval minutes</span><input type="number" min="15" step="15" value={intervalMinutes} disabled={!mechanisms.includes("interval")} onChange={(event) => setIntervalMinutes(Number(event.target.value))} /></label>
        <label><span>Fixed times (HH:MM)</span><input value={fixedTimes} disabled={!mechanisms.includes("fixed-time")} onChange={(event) => setFixedTimes(event.target.value)} placeholder="08:00, 12:00" /></label>
      </div>
      <div className="policy-catalogue-grid">
        <PolicyChecklist title="Timing mechanisms" values={typedEntries(REPORTING_MECHANISM_LABELS)} selected={mechanisms} onToggle={(value) => setMechanisms((current) => toggleMechanism(current, value))} />
        <PolicyChecklist title="Event / exception triggers" values={typedEntries(REPORTING_TRIGGER_LABELS)} selected={triggers} onToggle={(value) => setTriggers((current) => toggleValue(current, value))} />
        <PolicyChecklist title="Supported required content" values={typedEntries(REPORTING_FIELD_LABELS)} selected={requiredFields} onToggle={(value) => setRequiredFields((current) => toggleValue(current, value))} />
      </div>
      {formError && <p className="trial-form-error" role="alert">{formError}</p>}
      <div className="disabled-action-row"><button className="button-primary" type="submit">Create new policy version</button><span>Supported fields only · no generic form builder · reusable template remains unchanged</span></div>
    </form>
  );
}

function PolicyChecklist<T extends string>({ title, values, selected, onToggle }: { title: string; values: Array<[T, string]>; selected: readonly T[]; onToggle: (value: T) => void }) {
  return <fieldset><legend>{title}</legend>{values.map(([value, label]) => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} /><span>{label}</span></label>)}</fieldset>;
}

function AddCriticalItem({ state, onAction }: { state: TrialState; onAction: TrialActionHandler }) {
  const [sourceType, setSourceType] = useState<"Project-critical leaf" | "Critical Work Pack">("Project-critical leaf");
  const [sourceTaskId, setSourceTaskId] = useState("task-refractory-inspection");
  const [ownerUserId, setOwnerUserId] = useState("tier2-morgan");
  const [templateId, setTemplateId] = useState("template-two-hour-task");
  const existingSourceIds = new Set(state.criticalItems.filter((item) => item.active).map((item) => item.sourceTaskId));
  const eligibleTasks = state.tasks.filter((task) => !existingSourceIds.has(task.id) && (sourceType === "Project-critical leaf" ? !task.summary && task.projectCritical : task.summary && task.id !== "shutdown"));
  const selectedSource = eligibleTasks.some((task) => task.id === sourceTaskId) ? sourceTaskId : eligibleTasks[0]?.id ?? "";

  function addItem() {
    const template = state.criticalTemplates.find((candidate) => candidate.id === templateId);
    if (!template || !selectedSource) return;
    onAction({
      type: "add-critical",
      sourceTaskId: selectedSource,
      sourceType,
      actorId: "tier1-dana",
      policy: { ownerUserId, templateId, mechanisms: template.mechanisms, intervalMinutes: template.intervalMinutes, fixedTimes: template.fixedTimes ?? [], triggers: template.triggers, requiredFields: template.requiredFields }
    });
  }

  return (
    <section className="detail-panel add-critical-panel">
      <PanelHeading title="Select another Critical item" detail="Choose an imported Project-critical leaf or one summary task plus all descendants." />
      <div className="policy-config-row">
        <label><span>Source type</span><select value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}><option>Project-critical leaf</option><option>Critical Work Pack</option></select></label>
        <label><span>Task / work pack</span><select value={selectedSource} onChange={(event) => setSourceTaskId(event.target.value)}>{eligibleTasks.map((task) => <option key={task.id} value={task.id}>{task.wbs} · {task.name}</option>)}</select></label>
        <label><span>Tier 2 reporting owner</span><select value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)}>{state.users.filter((user) => user.tier === "Tier 2").map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <label><span>Template starting point</span><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{state.criticalTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
      </div>
      <div className="disabled-action-row"><button type="button" className="button-primary" disabled={!selectedSource} onClick={addItem}>Add Critical item</button><span>Project Critical remains imported read-only context; selection is explicit.</span></div>
    </section>
  );
}

function GuidedTrial({ state, onAction }: { state: TrialState; onAction: TrialActionHandler }) {
  return (
    <details className="guided-trial">
      <summary>Guided operational scenario</summary>
      <p>Optional review path. Controls remain available for free interaction.</p>
      <ol>{GUIDED_TRIAL_STEPS.map((step) => <li key={`${step.minute}-${step.label}`} className={state.now === step.minute ? "current" : state.now > step.minute ? "reached" : ""}>
        <div><strong>{step.label} · {step.instruction}</strong><span>{step.expected}</span></div>
        <button type="button" disabled={step.minute <= state.now} onClick={() => onAction({ type: "advance-to", minute: step.minute })}>{step.minute < state.now ? "Time passed" : step.minute === state.now ? "Current time" : "Advance here"}</button>
      </li>)}</ol>
    </details>
  );
}

function executionTone(state: TaskProjection["executionState"]): StatusTone {
  if (state === "Completed") return "success";
  if (state === "Paused" || state === "Not Started") return "warning";
  return "info";
}

function obligationTone(state: string): StatusTone {
  if (state === "overdue") return "danger";
  if (state === "due") return "warning";
  if (state === "submitted" || state === "superseded") return "success";
  return "info";
}

function executionEventLabel(type: string) {
  const labels: Record<string, string> = { "cant-start": "Can't Start", start: "Start", pause: "Pause", resume: "Resume", finish: "Finish" };
  return labels[type] ?? type;
}

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value];
}

function toggleMechanism(values: ReportingMechanism[], value: ReportingMechanism): ReportingMechanism[] {
  if (value === "none") return values.includes("none") ? [] : ["none"];
  const withoutNone = values.filter((candidate) => candidate !== "none");
  return toggleValue(withoutNone, value);
}

function typedEntries<T extends string>(record: Record<T, string>) {
  return Object.entries(record) as Array<[T, string]>;
}

function parseFixedTimes(value: string) {
  if (!value.trim()) return [];
  return value.split(",").map((entry) => {
    const match = entry.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) throw new Error("Fixed times must use HH:MM, separated by commas.");
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new Error("Fixed times must be valid 24-hour times.");
    return hour * 60 + minute;
  });
}
