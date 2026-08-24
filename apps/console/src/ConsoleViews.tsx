import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  criticalItems,
  criticalSupportedFields,
  criticalTemplates,
  criticalTimingMechanisms,
  criticalTriggerExamples,
  operationalTasks,
  projects,
  recentActivity,
  settingsSections,
  taskDashboardSections,
  type OperationalTask,
  type ProjectStatus,
  type StatusTone
} from "./consoleData";

export function StatusLabel({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`status-label status-${tone}`}>{children}</span>;
}

function stateTone(state: OperationalTask["state"]): StatusTone {
  if (state === "Completed") return "success";
  if (state === "Paused") return "warning";
  if (state === "Not Started") return "neutral";
  return "info";
}

export function LoginView({ onContinue, trialMode = false }: { onContinue: () => void; trialMode?: boolean }) {
  return (
    <main className="entry-screen">
      <section className="entry-panel" aria-labelledby="login-title">
        <div className="entry-brand" aria-hidden="true">ST</div>
        <p className="eyebrow">Master Console · Tier 1</p>
        <h1 id="login-title">Shutdown Tracker</h1>
        <p className="entry-lead">Whole-project operational control, schedule-source review, and shutdown oversight.</p>
        <div className="implementation-note">
          <strong>{trialMode ? "Synthetic operational trial" : "Static visual only"}</strong>
          <span>{trialMode ? "Deterministic local state. No production persistence or backend execution API is used." : "OIDC and production session handling are not yet implemented. This transition exists only for visual review."}</span>
        </div>
        <button className="button-primary" type="button" onClick={onContinue}>Continue to Projects Home</button>
        <p className="entry-footnote">No credentials are collected or stored by this review shell.</p>
      </section>
    </main>
  );
}

export function ProjectsHome({ onOpenProject, trialProject }: { onOpenProject: (projectId: string) => void; trialProject?: { id: string; name: string; code: string; site: string } }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "All">("All");
  const availableProjects = trialProject ? [{ ...trialProject, status: "Active" as const, period: "24–25 August 2026 · deterministic clock", updated: "Resettable synthetic scenario" }] : projects;
  const visibleProjects = availableProjects.filter((project) => {
    const matchesStatus = status === "All" || project.status === status;
    const searchText = `${project.name} ${project.code} ${project.site}`.toLowerCase();
    return matchesStatus && searchText.includes(query.trim().toLowerCase());
  });

  return (
    <main className="projects-screen">
      <header className="projects-header">
        <div>
          <p className="eyebrow">Master Console · Tier 1</p>
          <h1>Projects Home</h1>
          <p>Open or switch a project before entering its Console.</p>
        </div>
        <div className="header-control-group">
          <StatusLabel tone="warning">{trialProject ? "Synthetic operational trial" : "Static visual only"}</StatusLabel>
          <button type="button" disabled title="Project creation API is not implemented">Create Project</button>
        </div>
      </header>

      <section className="project-tools" aria-label="Project search and status filters">
        <label className="search-control">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search projects</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code, or site" />
        </label>
        <div className="segmented-control">
          {(["All", "Active", "Draft", "Closed", "Archived"] as const).map((value) => (
            <button key={value} type="button" className={status === value ? "selected" : ""} onClick={() => setStatus(value)}>
              {value} {value === "All" ? availableProjects.length : availableProjects.filter((project) => project.status === value).length}
            </button>
          ))}
        </div>
      </section>

      <section className="table-panel" aria-label="Projects">
        <div className="table-scroll">
          <table className="data-table projects-table">
            <thead><tr><th>Project</th><th>Status</th><th>Site / asset</th><th>Planned shutdown</th><th>Latest state</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {visibleProjects.map((project) => (
                <tr key={project.id}>
                  <td><strong>{project.name}</strong><span>{project.code}</span></td>
                  <td><StatusLabel tone={project.status === "Active" ? "success" : project.status === "Draft" ? "warning" : "neutral"}>{project.status}</StatusLabel></td>
                  <td>{project.site}</td><td>{project.period}</td><td>{project.updated}</td>
                  <td><button className="button-link" type="button" onClick={() => onOpenProject(project.id)}>Open project</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="surface-caption">Project creation, lifecycle actions, archive, restore, and production switching remain not yet implemented.</p>
    </main>
  );
}

export function TodayView({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const counts = [
    ["Planned in period", "5"], ["Not Started", "1"], ["In Progress", "1"],
    ["Paused", "2"], ["Blocked / delayed", "1"], ["Completed", "1"]
  ] as const;
  return (
    <>
      <PageHeading eyebrow="Today · configurable 24-hour view" title="Operational day" description="24 August 2026 · 06:00 to 25 August 2026 · 06:00 · Australia/Perth" status="Static visual only" />
      <section className="status-strip" aria-label="Execution state and operational condition summary">
        {counts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>
      <section className="split-layout">
        <article className="table-panel wide-panel">
          <PanelHeading title="Work in the operational period" detail="Execution state and attention are kept separate." />
          <TaskTable tasks={operationalTasks.filter((task) => !task.summary)} onOpenTask={onOpenTask} compact />
        </article>
        <aside className="activity-panel">
          <PanelHeading title="Attention now" detail="Current query results, not another state model." />
          <dl className="attention-list">
            <div><dt>Late starts</dt><dd>1</dd></div><div><dt>Running beyond planned finish</dt><dd>1</dd></div>
            <div><dt>No recent update</dt><dd>1</dd></div><div><dt>Critical reports due / overdue</dt><dd>2</dd></div>
            <div><dt>Actions due / overdue</dt><dd>1</dd></div><div><dt>Active delays / problems</dt><dd>2</dd></div>
          </dl>
          <h3>Recent activity</h3>
          <ol className="activity-list">{recentActivity.map((item) => <li key={item}>{item}</li>)}</ol>
        </aside>
      </section>
      <div className="rule-note"><strong>Task-state rule</strong><span>A passed planned start never creates In Progress. Tracker Start/Resume or accepted imported actual/progress evidence is required.</span></div>
    </>
  );
}

export function TasksView({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => operationalTasks.filter((task) => `${task.wbs} ${task.name} ${task.workPackage}`.toLowerCase().includes(query.toLowerCase())), [query]);
  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const visibleRows = rows.filter((task) => !operationalTasks.some((candidate) => candidate.summary && collapsed.has(candidate.id) && task.wbs.startsWith(`${candidate.wbs}.`)));
  return (
    <>
      <PageHeading eyebrow="Tasks · full project explorer" title="Project task structure" description="Imported WBS context with operational state. Schedule editing and date recalculation are not available." status="Static visual only" />
      <section className="explorer-tools" aria-label="Task explorer controls">
        <label className="search-control"><Search size={17} aria-hidden="true" /><span className="sr-only">Search tasks</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search WBS, task, or work package" /></label>
        <button type="button" disabled><SlidersHorizontal size={16} aria-hidden="true" /> Filter</button>
        <button type="button" disabled>Group</button><button type="button" disabled>Columns</button><button type="button" disabled>Saved views</button>
      </section>
      <section className="table-panel">
        <TaskTable tasks={visibleRows} onOpenTask={onOpenTask} onToggleSummary={toggle} collapsedSummaryIds={collapsed} />
      </section>
      <p className="surface-caption">Search and expand/collapse are local review interactions. Filters, grouping, column configuration, and saved views are visual affordances only.</p>
    </>
  );
}

function TaskTable({ tasks, onOpenTask, onToggleSummary, collapsedSummaryIds, compact = false }: { tasks: OperationalTask[]; onOpenTask: (taskId: string) => void; onToggleSummary?: (taskId: string) => void; collapsedSummaryIds?: ReadonlySet<string>; compact?: boolean }) {
  return (
    <div className="table-scroll">
      <table className={`data-table task-table${compact ? " compact" : ""}`}>
        <thead><tr><th>WBS / task</th><th>Execution state</th><th>Schedule attention</th><th>Tier 2 tracking owner</th><th>Planned window</th><th>Progress</th><th>Last update</th></tr></thead>
        <tbody>{tasks.map((task) => (
          <tr key={task.id} className={task.summary ? "summary-row" : ""}>
            <td><div className="task-name-cell" style={{ paddingInlineStart: `${task.depth * 20}px` }}>
              {task.summary && onToggleSummary ? <button type="button" className="tree-toggle" aria-label={`Expand or collapse ${task.name}`} aria-expanded={!collapsedSummaryIds?.has(task.id)} onClick={() => onToggleSummary(task.id)}>{collapsedSummaryIds?.has(task.id) ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</button> : task.depth > 0 ? <ChevronRight className="tree-leaf" size={13} aria-hidden="true" /> : null}
              <span className="wbs">{task.wbs}</span><button className="button-link" type="button" onClick={() => onOpenTask(task.id)}>{task.name}</button><small>{task.workPackage}</small>
            </div></td>
            <td><StatusLabel tone={stateTone(task.state)}>{task.state}</StatusLabel><small>{task.stateEvidence}</small></td>
            <td className={task.attention === "None" ? "muted" : "attention-text"}>{task.attention}</td><td>{task.tier2Owner}</td><td>{task.planned}</td>
            <td><strong>{task.progress}%</strong></td><td>{task.lastUpdate}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function TaskDashboard({ taskId, backLabel, onBack }: { taskId: string; backLabel: "Today" | "Tasks"; onBack: () => void }) {
  const task = operationalTasks.find((item) => item.id === taskId) ?? operationalTasks[3];
  return (
    <>
      <button className="back-link" type="button" onClick={onBack}>← Back to {backLabel}</button>
      <PageHeading eyebrow={`${task.wbs} · ${task.workPackage}`} title={task.name} description={task.summary ? "Summary task · aggregate work-pack view" : "Executable leaf task"} status="Static visual only" />
      <section className="task-state-header">
        <div><span>Execution state</span><StatusLabel tone={stateTone(task.state)}>{task.state}</StatusLabel><small>{task.stateEvidence}</small></div>
        <div><span>Schedule attention</span><strong>{task.attention}</strong><small>Attention does not change execution state.</small></div>
        <div><span>Tier 2 tracking owner</span><strong>{task.tier2Owner}</strong><small>Tier 1 retains unrestricted project authority.</small></div>
      </section>
      <nav className="section-tabs" aria-label="Task Dashboard sections">{taskDashboardSections.map((section, index) => <button type="button" className={index === 0 ? "selected" : ""} aria-current={index === 0 ? "page" : undefined} disabled={index !== 0} key={section}>{section}</button>)}</nav>
      <section className="dashboard-grid">
        <article className="detail-panel"><PanelHeading title="Overview" detail="One operational record for this task." /><dl className="detail-list"><div><dt>Planned window</dt><dd>{task.planned}</dd></div><div><dt>Progress</dt><dd>{task.progress}%</dd></div><div><dt>Last update</dt><dd>{task.lastUpdate}</dd></div><div><dt>Project context</dt><dd>Accepted snapshot v4 · imported read-only schedule context</dd></div></dl></article>
        <article className="detail-panel"><PanelHeading title="Operational record" detail="Task-owned surfaces; no competing applications." /><ul className="record-list"><li><strong>Execution</strong><span>Can't Start, Start, Pause, Resume, and Finish · action times recorded automatically</span></li><li><strong>Discussion</strong><span>Unstructured collaboration and @mentions</span></li><li><strong>Delays / Problems</strong><span>Structured impact and ownership</span></li><li><strong>Actions</strong><span>Owned due work</span></li><li><strong>Evidence</strong><span>Task-linked files and metadata</span></li><li><strong>History</strong><span>Immutable activity trail</span></li></ul></article>
      </section>
      <div className="disabled-action-row"><button type="button" disabled>Can't Start</button><button type="button" disabled>Start</button><button type="button" disabled>Pause</button><button type="button" disabled>Resume</button><button type="button" disabled>Finish</button><span>Not yet implemented · static visual only · no execution API</span></div>
    </>
  );
}

export function CriticalView() {
  return (
    <>
      <PageHeading eyebrow="Critical · Tier 1 configuration and oversight" title="Critical reporting" description="Tier 1 explicitly selects coverage and a versioned per-item reporting policy. Shutdown Tracker does not calculate critical path." status="Static visual only" />
      <section className="critical-summary"><div><span>Active Critical items</span><strong>3</strong></div><div><span>Reports overdue</span><strong>1</strong></div><div><span>Due next 2 hours</span><strong>1</strong></div><button type="button" disabled>Add Critical item</button></section>
      <section className="table-panel"><div className="table-scroll"><table className="data-table critical-table"><thead><tr><th>Critical item / source</th><th>Tier 2 reporting owner</th><th>Policy / template</th><th>Timing, triggers, and required content</th><th>Next due</th><th>Latest report / condition</th><th>Reporting history</th></tr></thead><tbody>{criticalItems.map((item) => <tr key={item.id}>
        <td><strong>{item.name}</strong><StatusLabel>{item.sourceType}</StatusLabel><small>{item.scope}</small></td>
        <td>{item.reportingOwner}</td>
        <td><strong>{item.policyTemplate}</strong><small>{item.policyVersion}</small></td>
        <td><strong>{item.timing}</strong><small>Triggers: {item.triggers}</small><small>Required: {item.requiredContent.join(", ")}</small></td>
        <td><strong>{item.nextDue}</strong><small>{item.reportingState}</small></td>
        <td><strong>{item.latestReport}</strong><StatusLabel tone={item.condition === "Blocked" ? "danger" : item.condition === "At risk" ? "warning" : "success"}>{item.condition}</StatusLabel></td>
        <td>{item.history}</td>
      </tr>)}</tbody></table></div></section>

      <section className="detail-panel critical-policy-panel" aria-labelledby="critical-policy-heading">
        <header className="panel-heading"><div><h2 id="critical-policy-heading">Critical Reporting Policy</h2><p>Disabled Tier 1 configuration preview for the selected item. Supported catalogue only.</p></div></header>
        <div className="policy-config-row">
          <label><span>Tier 2 reporting owner</span><select defaultValue="Morgan Lee · Tier 2" disabled><option>Morgan Lee · Tier 2</option></select></label>
          <label><span>Template</span><select defaultValue="Two-hour critical-task reporting" disabled>{criticalTemplates.map((template) => <option key={template}>{template}</option>)}</select></label>
          <label><span>Current version</span><input value="Policy v3 · effective 24 Aug 06:00" readOnly disabled /></label>
        </div>
        <div className="policy-catalogue-grid">
          <PolicyCatalogue title="Timing mechanisms" values={criticalTimingMechanisms} selected={["Fixed interval", "Event / exception triggered"]} />
          <PolicyCatalogue title="Event / exception triggers" values={criticalTriggerExamples} selected={["Task or work pack starts", "Pause / block", "Finish / completion"]} />
          <PolicyCatalogue title="Supported required content" values={criticalSupportedFields} selected={["Completion / progress", "Operational condition", "Main delay / constraint", "Next target", "Forecast completion"]} />
        </div>
        <div className="disabled-action-row"><button type="button" disabled>Create new policy version</button><button type="button" disabled>Save item override</button><span>Configuration API not implemented</span></div>
      </section>
      <div className="rule-note"><strong>Policy and report history</strong><span>Policy changes create a new effective version and do not mutate templates, sibling items, earlier obligations, or immutable reports. Corrections supersede rather than overwrite.</span></div>
      <div className="rule-note"><strong>Execution truth first</strong><span>Known task facts are pre-populated and reused. Critical reporting is not mandatory for every task and does not create another execution-state model.</span></div>
      <div className="rule-note"><strong>Imported schedule boundary</strong><span>Project Critical is read-only context. Neither automatic selection nor critical-path calculation is provided.</span></div>
    </>
  );
}

function PolicyCatalogue({ title, values, selected }: { title: string; values: readonly string[]; selected: readonly string[] }) {
  return <fieldset><legend>{title}</legend>{values.map((value) => <label key={value}><input type="checkbox" checked={selected.includes(value)} readOnly disabled /><span>{value}</span></label>)}</fieldset>;
}

export function ProjectSettingsView({ initialSection = "General" }: { initialSection?: (typeof settingsSections)[number] }) {
  const [active, setActive] = useState<(typeof settingsSections)[number]>(initialSection);
  return (
    <>
      <PageHeading eyebrow="Project Settings · Tier 1" title="Project configuration" description="Configuration shells are visible for review. Production settings APIs are not implemented." status="Static visual only" />
      <nav className="section-tabs" aria-label="Project Settings sections">{settingsSections.map((section) => <button type="button" className={active === section ? "selected" : ""} aria-current={active === section ? "page" : undefined} onClick={() => setActive(section)} key={section}>{section}</button>)}</nav>
      <section className="settings-panel">{active === "General" && <GeneralSettings />}{active === "Users" && <UsersSettings />}{active === "Operational Mapping" && <MappingSettings />}{active === "Project History" && <ProjectHistory />}{active === "Lifecycle" && <LifecycleSettings />}</section>
    </>
  );
}

function GeneralSettings() { return <><PanelHeading title="General" detail="Static project identity and operational-day configuration." /><div className="form-grid">{[["Name", "Calciner major shutdown"], ["Code", "CLN-26"], ["Site / asset", "West processing plant"], ["Timezone", "Australia/Perth"], ["Operational day start", "06:00"], ["Planned shutdown dates", "24–31 August 2026"]].map(([label, value]) => <label key={label}><span>{label}</span><input value={value} readOnly disabled /></label>)}</div></>; }
function UsersSettings() { return <><PanelHeading title="Users" detail="Exactly three application tiers; job titles do not grant authority." /><div className="settings-table"><div className="settings-head"><span>Tier</span><span>Application</span><span>Authority / relationship</span></div><div><strong>Tier 1</strong><span>Master Console</span><span>Whole-project visibility and unrestricted project-task update authority</span></div><div><strong>Tier 2</strong><span>Mobile App</span><span>Tracks tasks assigned by Tier 1; retains responsibility after Tier 3 assignment</span></div><div><strong>Tier 3</strong><span>Mobile App</span><span>Direct report of Tier 2; assignment type WORKING_ON or FIELD_CONTROL</span></div></div><button type="button" disabled>Manage users</button></>; }
function MappingSettings() { return <><PanelHeading title="Operational Mapping" detail="Classification and query context; never an authorization scope." /><div className="mapping-health"><div><span>Mapping health</span><strong>Review required</strong></div><dl><div><dt>Mapped leaf tasks</dt><dd>184 / 201</dd></div><div><dt>Unmapped fields</dt><dd>2</dd></div><div><dt>Conflicts</dt><dd>1</dd></div></dl></div><p>Supports filtering, grouping, visible columns, saved views, Today, Critical selection/reporting, and bulk Tier 2 selection context.</p><button type="button" disabled>Configure mapping</button></>; }
function ProjectHistory() { return <><PanelHeading title="Project History" detail="Lifecycle and import milestones." /><ol className="activity-list"><li>24 Aug 05:52 · Accepted immutable Project snapshot v4.</li><li>23 Aug 16:10 · Project activated for operational review.</li><li>22 Aug 09:30 · Project created as Draft.</li></ol></>; }
function LifecycleSettings() { return <><PanelHeading title="Lifecycle" detail="Draft → Active → Closed → Archived. Archive is reversible." /><div className="lifecycle-flow"><StatusLabel>Draft</StatusLabel><span>→</span><StatusLabel tone="success">Active</StatusLabel><span>→</span><StatusLabel>Closed</StatusLabel><span>→</span><StatusLabel>Archived</StatusLabel></div><div className="disabled-action-row"><button type="button" disabled>Close</button><button type="button" disabled>Reopen</button><button type="button" disabled>Archive</button><button type="button" disabled>Restore</button><button type="button" disabled>Delete eligible empty draft/test project</button></div><p className="surface-caption">Permanent delete is restricted to eligible empty draft/test projects. There is no generic Clear Project action.</p></>; }

export function PageHeading({ eyebrow, title, description, status }: { eyebrow: string; title: string; description: string; status: string }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><StatusLabel tone="warning">{status}</StatusLabel></header>;
}
export function PanelHeading({ title, detail }: { title: string; detail: string }) { return <header className="panel-heading"><div><h2>{title}</h2><p>{detail}</p></div></header>; }
