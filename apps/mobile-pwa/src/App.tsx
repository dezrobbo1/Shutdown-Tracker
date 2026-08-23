import { useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import {
  mobileTasks,
  syncRecoveryExamples,
  syncSummary,
  type MobileTask,
  type ReviewPersona,
  type StatusLabel,
  type SyncState
} from "./mobileData";

type AppProps = {
  initialPersona?: ReviewPersona;
  initialTaskId?: string;
};

const executionActionGuidance = [
  { action: "Can't Start", detail: "Record the current time, structured reason, what must happen, and an action/problem link where appropriate. Execution stays Not Started." },
  { action: "Start", detail: "Record the current time and establish In Progress. Ask for cause, whether anything still requires action, and optional note/evidence only when the start is late." },
  { action: "Pause", detail: "Record the current time, pause reason, what must happen, and optional note/evidence. Ask separately whether this is an adverse delay and link a problem/action where appropriate." },
  { action: "Resume", detail: "Close the pause interval and return to In Progress. Record whether a linked issue is resolved or remains open." },
  { action: "Finish", detail: "Use a concise confirmation and record the current completion time. Require evidence only when configured policy says so." }
] as const;

export function App({ initialPersona = "tier2", initialTaskId }: AppProps) {
  const [persona, setPersona] = useState<ReviewPersona>(initialPersona);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null);
  const assignedTasks = mobileTasks.filter((task) => task.persona === persona);
  const selectedTask = assignedTasks.find((task) => task.id === selectedTaskId);

  function changePersona(nextPersona: ReviewPersona) {
    setPersona(nextPersona);
    setSelectedTaskId(null);
  }

  return (
    <div className="mobile-frame">
      <header className="mobile-header">
        <div>
          <p className="eyebrow">Mobile App</p>
          <h1>Assigned Tasks</h1>
        </div>
        <span className="client-boundary">Tier 2 / Tier 3 client</span>
      </header>

      <main className="mobile-content">
        <p className="visual-boundary" role="note">
          Visual review shell. Static/synthetic data. No production write workflow.
        </p>

        <label className="persona-control">
          <span>Visual review persona</span>
          <select
            aria-label="Visual review persona"
            value={persona}
            onChange={(event) => changePersona(event.target.value as ReviewPersona)}
          >
            <option value="tier2">Tier 2 example</option>
            <option value="tier3">Tier 3 example</option>
          </select>
        </label>

        {selectedTask ? (
          <TaskDetail task={selectedTask} onBack={() => setSelectedTaskId(null)} />
        ) : (
          <AssignedTasks
            persona={persona}
            tasks={assignedTasks}
            onOpenTask={setSelectedTaskId}
          />
        )}
      </main>
    </div>
  );
}

function AssignedTasks({
  persona,
  tasks,
  onOpenTask
}: {
  persona: ReviewPersona;
  tasks: MobileTask[];
  onOpenTask: (taskId: string) => void;
}) {
  const personaName = persona === "tier2" ? "Tier 2" : "Tier 3";

  return (
    <section className="assigned-tasks" aria-labelledby="assigned-tasks-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{personaName} example</p>
          <h2 id="assigned-tasks-heading">Assigned work</h2>
        </div>
        <strong>{tasks.length} tasks</strong>
      </div>
      <p className="section-copy">
        {persona === "tier2"
          ? "Tasks assigned by Tier 1 for tracking. Tier 2 retains responsibility after field assignment."
          : "Tasks explicitly assigned by Tier 2. This view does not expose the whole project."}
      </p>

      <SyncBanner state={syncSummary} />

      <div className="work-list">
        {tasks.map((task) => (
          <article className="work-card" key={task.id}>
            <div className="task-title-row">
              <div>
                <span className="task-code">{task.taskCode}</span>
                <h3>{task.title}</h3>
                <p>{task.workPackage}</p>
              </div>
              <ExecutionState status={task.executionState} attention={task.attentionCondition} />
            </div>

            <dl className="task-card-facts">
              <div>
                <dt>Planned</dt>
                <dd>{task.plannedWindow}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>{task.percentComplete}</dd>
              </div>
              <div>
                <dt>Assignment</dt>
                <dd>{task.assignmentRelationship}</dd>
              </div>
            </dl>

            <div className="task-card-footer">
              <div className="status-row" aria-label={`${task.taskIndicator.label}; ${task.syncState.label}`}>
                <StatusChip status={task.taskIndicator} />
                <StatusChip status={task.syncState} />
              </div>
              <button className="open-task-button" type="button" aria-label={`Open ${task.title}`} onClick={() => onOpenTask(task.id)}>
                <span>Open task</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskDetail({ task, onBack }: { task: MobileTask; onBack: () => void }) {
  return (
    <article className="task-detail" aria-labelledby="task-detail-heading">
      <header className="task-detail-header">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Back to assigned tasks</span>
        </button>
        <p className="eyebrow">Task Detail</p>
        <span className="task-code">{task.taskCode}</span>
        <h2 id="task-detail-heading">{task.title}</h2>
        <p>{task.workPackage}</p>
        <ExecutionState status={task.executionState} attention={task.attentionCondition} />
      </header>

      <SyncBanner state={task.syncState} />

      <TaskDetailSection title="Overview">
        <dl className="detail-facts">
          <div>
            <dt>Execution state</dt>
            <dd>{task.executionState.label}</dd>
          </div>
          <div>
            <dt>Progress</dt>
            <dd>{task.percentComplete}</dd>
          </div>
          <div>
            <dt>Planned window</dt>
            <dd>{task.plannedWindow}</dd>
          </div>
          <div>
            <dt>Attention</dt>
            <dd>{task.attentionCondition?.label ?? "No current attention condition"}</dd>
          </div>
        </dl>
        <p className="state-basis">
          <strong>State basis:</strong> {task.stateBasis}
        </p>
      </TaskDetailSection>

      <TaskDetailSection title="Execution">
        <p className="execution-time-rule"><strong>Action times are recorded automatically when confirmed.</strong> Ordinary Mobile execution has no manual date/time entry or backdating.</p>
        <div className="execution-actions" aria-label="Static execution controls">
          <button type="button" disabled>Can't Start</button>
          <button type="button" disabled>Start</button>
          <button type="button" disabled>Pause</button>
          <button type="button" disabled>Resume</button>
          <button type="button" disabled>Finish</button>
        </div>
        <dl className="action-context-list">{executionActionGuidance.map((item) => <div key={item.action}><dt>{item.action}</dt><dd>{item.detail}</dd></div>)}</dl>
        <div className="recorded-event-facts"><strong>System-recorded event facts</strong><ul>{task.recordedEventFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></div>
        <p className="ordinary-progress-rule">Execution events, end-of-shift observations, and explicitly requested updates are ordinary task progress. Routine reports are not required for every task.</p>
        <p className="not-implemented">Execution updates are not yet implemented.</p>
      </TaskDetailSection>

      <TaskDetailSection title="End-of-shift progress">
        <div className="end-shift-heading"><strong>How much of the task is complete?</strong><span>Tracker field progress observation · static example</span></div>
        <dl className="detail-facts end-shift-facts">
          <div><dt>Completion</dt><dd>{task.endOfShiftObservation.completion}</dd></div>
          <div><dt>What remains</dt><dd>{task.endOfShiftObservation.remainingWork}</dd></div>
          <div><dt>Issue affecting next shift</dt><dd>{task.endOfShiftObservation.nextShiftIssue}</dd></div>
          <div><dt>Optional note / evidence</dt><dd>{task.endOfShiftObservation.noteEvidence}</dd></div>
        </dl>
        <button type="button" disabled>Record end-of-shift update</button>
      </TaskDetailSection>

      <TaskDetailSection title="People">
        <div className="assignment-summary">
          <StatusChip
            status={{
              label: task.assignmentRelationship,
              tone: task.persona === "tier2" ? "info" : "restricted"
            }}
          />
          <p>{task.assignmentDetail}</p>
        </div>
        {task.persona === "tier2" ? (
          <>
            <div className="direct-report-list">
              <strong>Direct-report field assignments</strong>
              {task.tier3Assignments && task.tier3Assignments.length > 0 ? (
                <ul>
                  {task.tier3Assignments.map((assignment) => <li key={assignment}>{assignment}</li>)}
                </ul>
              ) : (
                <p>No Tier 3 field assignment recorded.</p>
              )}
            </div>
            <button type="button" disabled>Assign Tier 3 direct report</button>
          </>
        ) : (
          <p className="restricted-copy">Tier 3 cannot assign work to others.</p>
        )}
      </TaskDetailSection>

      {task.criticalReport ? (
        <TaskDetailSection title="Critical reporting">
          <dl className="detail-facts">
            <div>
              <dt>Critical item</dt>
              <dd>{task.criticalReport.source}</dd>
            </div>
            <div>
              <dt>Tier 2 reporting owner</dt>
              <dd>{task.criticalReport.reportingOwner}</dd>
            </div>
            <div>
              <dt>Policy / template</dt>
              <dd>{task.criticalReport.policyTemplate} · {task.criticalReport.policyVersion}</dd>
            </div>
            <div>
              <dt>Timing mechanisms</dt>
              <dd>{task.criticalReport.timingMechanisms}</dd>
            </div>
            <div>
              <dt>Triggers</dt>
              <dd>{task.criticalReport.triggers}</dd>
            </div>
            <div>
              <dt>Latest report</dt>
              <dd>{task.criticalReport.latestReport}</dd>
            </div>
            <div>
              <dt>Next report due</dt>
              <dd>{task.criticalReport.nextReportDue}</dd>
            </div>
            <div>
              <dt>Operational condition</dt>
              <dd>{task.criticalReport.operationalCondition}</dd>
            </div>
          </dl>
          <StatusChip status={task.criticalReport.dueState} />
          <div className="critical-report-content">
            <FieldList title="Required supported content" values={task.criticalReport.requiredFields} />
            <FieldList title="Pre-populated known execution facts" values={task.criticalReport.prepopulatedFacts} />
            <FieldList title="Tier 2 judgement / input still needed" values={task.criticalReport.judgementInputs} />
          </div>
          <p className="report-history">{task.criticalReport.history}</p>
          <button type="button" disabled>Submit Critical report</button>
        </TaskDetailSection>
      ) : task.criticalContext ? (
        <TaskDetailSection title="Critical context">
          <p>{task.criticalContext}</p>
          <p className="restricted-copy">Tier 3 can see context but cannot configure Critical reporting.</p>
        </TaskDetailSection>
      ) : null}

      <TaskDetailSection title="Discussion">
        <p>{task.discussionSummary}</p>
        <button type="button" disabled>Add comment</button>
      </TaskDetailSection>

      <TaskDetailSection title="Delays / Problems">
        <p>{task.problemSummary}</p>
        <button type="button" disabled>Log delay or problem</button>
      </TaskDetailSection>

      <TaskDetailSection title="Actions">
        <p>{task.actionSummary}</p>
        <button type="button" disabled>Add action</button>
      </TaskDetailSection>

      <TaskDetailSection title="Evidence">
        <p>{task.evidenceSummary}</p>
        <button type="button" disabled>Add evidence</button>
      </TaskDetailSection>

      <TaskDetailSection title="History">
        <ol className="history-list">
          {task.history.map((event) => <li key={event}>{event}</li>)}
        </ol>
      </TaskDetailSection>
    </article>
  );
}

function SyncBanner({ state }: { state: SyncState }) {
  return (
    <section className="sync-banner" aria-label="Sync status">
      <div className="sync-summary">
        <span className={`sync-dot ${state.tone}`} aria-hidden="true" />
        <div>
          <span>Sync state</span>
          <strong>{state.label}</strong>
          <small>{state.detail}</small>
        </div>
      </div>
      <details className="sync-recovery">
        <summary>Recovery states</summary>
        <ul>
          {syncRecoveryExamples.map((example) => (
            <li key={example.label}>
              <StatusChip status={example} />
              <span>{example.detail}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function TaskDetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="task-detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function FieldList({ title, values }: { title: string; values: string[] }) {
  return <div><strong>{title}</strong><ul>{values.map((value) => <li key={value}>{value}</li>)}</ul></div>;
}

function ExecutionState({ status, attention }: { status: StatusLabel; attention?: StatusLabel }) {
  return (
    <div className="execution-summary">
      <strong className={`execution-state ${status.tone}`}>{status.label}</strong>
      {attention ? <span className={`attention-state ${attention.tone}`}>{attention.label}</span> : null}
    </div>
  );
}

function StatusChip({ status }: { status: StatusLabel }) {
  return <span className={`status-chip ${status.tone}`}>{status.label}</span>;
}
