import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import {
  GUIDED_TRIAL_STEPS,
  REPORTING_FIELD_LABELS,
  REPORTING_MECHANISM_LABELS,
  TRIAL_DAY_END_MINUTE,
  TRIAL_START_MINUTE,
  applyTrialAction,
  createInitialTrialState,
  formatTrialDateTime,
  formatTrialTime,
  formatTrialWindow,
  nextGuidedEventMinute,
  nextReportDueMinute,
  nextShiftBoundaryMinute,
  selectCriticalObligationsForOwner,
  selectDirectReports,
  selectShiftProgressNeedsForUser,
  selectTaskHistory,
  selectTasksForUser,
  type CriticalObligationProjection,
  type ReportingField,
  type ShiftProgressNeed,
  type TaskProjection,
  type Tier3Relationship,
  type TrialAction,
  type TrialState,
  type TrialUser
} from "@shutdown-tracker/trial-model";
import { useTrialBridge } from "./trialBridgeClient";

type TrialMobileAppProps = {
  initialState?: TrialState;
  initialTaskId?: string;
  initialUserId?: string;
};

const DEFAULT_USER_ID = "tier2-morgan";
type TrialDispatch = (action: TrialAction) => boolean;

export function TrialMobileApp({
  initialState,
  initialTaskId,
  initialUserId = DEFAULT_USER_ID
}: TrialMobileAppProps) {
  const [state, setState] = useState<TrialState>(() => initialState ?? createInitialTrialState());
  const [userId, setUserId] = useState(initialUserId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const acceptHostState = useCallback((nextState: TrialState) => {
    setState(nextState);
    if (isCanonicalResetState(nextState)) {
      setUserId(DEFAULT_USER_ID);
      setSelectedTaskId(null);
    }
    setActionError(null);
  }, []);
  const { connectedToHost, sendAction } = useTrialBridge(acceptHostState);

  const mobileUsers = useMemo(
    () => state.users.filter((user) => user.tier === "Tier 2" || user.tier === "Tier 3"),
    [state.users]
  );
  const user = mobileUsers.find((candidate) => candidate.id === userId) ?? mobileUsers[0];
  const tasks = useMemo(
    () => user ? selectTasksForUser(state, user.id) : [],
    [state, user]
  );
  const selectedTask = tasks.find((projection) => projection.task.id === selectedTaskId) ?? null;

  const dispatch = useCallback((action: TrialAction) => {
    try {
      const nextState = applyTrialAction(state, action);
      if (!sendAction(action)) setState(nextState);
      if (action.type === "reset") {
        setUserId(DEFAULT_USER_ID);
        setSelectedTaskId(null);
      }
      setActionError(null);
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The trial action could not be applied.");
      return false;
    }
  }, [sendAction, state]);

  function changePersona(nextUserId: string) {
    setUserId(nextUserId);
    setSelectedTaskId(null);
    setActionError(null);
  }

  if (!user) return null;

  return (
    <div className="mobile-frame trial-mobile-frame">
      <header className="mobile-header">
        <div>
          <p className="eyebrow">Mobile App</p>
          <h1>Assigned Tasks</h1>
        </div>
        <span className="client-boundary">Tier 2 / Tier 3 client</span>
      </header>

      <main className="mobile-content">
        <section className="trial-boundary" aria-label="Trial boundary">
          <strong>Synthetic operational trial</strong>
          <span>Deterministic local state · No production persistence</span>
          <small>{formatTrialDateTime(state.now)} simulated · {connectedToHost ? "Connected to the Console trial host." : "Standalone in-memory trial session."}</small>
        </section>

        <label className="persona-control">
          <span>Trial persona</span>
          <select
            aria-label="Trial persona"
            value={user.id}
            onChange={(event) => changePersona(event.target.value)}
          >
            <optgroup label="Tier 2 tracking users">
              {mobileUsers.filter((candidate) => candidate.tier === "Tier 2").map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name} · Tier 2</option>
              ))}
            </optgroup>
            <optgroup label="Tier 3 field users">
              {mobileUsers.filter((candidate) => candidate.tier === "Tier 3").map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name} · Tier 3</option>
              ))}
            </optgroup>
          </select>
        </label>

        {actionError ? <p className="trial-error" role="alert">{actionError}</p> : null}

        {selectedTask ? (
          <TrialTaskDetail
            state={state}
            user={user}
            projection={selectedTask}
            dispatch={dispatch}
            onBack={() => setSelectedTaskId(null)}
          />
        ) : (
          <TrialAssignedTasks
            user={user}
            tasks={tasks}
            onOpenTask={setSelectedTaskId}
          />
        )}

        <details className="trial-tools">
          <summary><span>Trial controls and guided review</span><strong>{formatTrialTime(state.now)} simulated</strong></summary>
          <TrialClock state={state} dispatch={dispatch} />
        </details>
      </main>
    </div>
  );
}

function TrialClock({ state, dispatch }: { state: TrialState; dispatch: TrialDispatch }) {
  const nextEvent = nextGuidedEventMinute(state);
  const nextReport = nextReportDueMinute(state);
  const nextShift = nextShiftBoundaryMinute(state);
  const canAdvance15 = state.now + 15 <= TRIAL_DAY_END_MINUTE;
  const canAdvanceHour = state.now + 60 <= TRIAL_DAY_END_MINUTE;
  const canAdvanceShift = nextShift <= TRIAL_DAY_END_MINUTE;

  return (
    <section className="trial-clock" aria-labelledby="trial-clock-heading">
      <div>
        <span id="trial-clock-heading">Simulated shutdown time</span>
        <strong>{formatTrialDateTime(state.now)}</strong>
      </div>
      <div className="trial-clock-actions" aria-label="Simulation clock controls">
        <button type="button" disabled={!canAdvance15} onClick={() => dispatch({ type: "advance-minutes", minutes: 15 })}>+15 min</button>
        <button type="button" disabled={!canAdvanceHour} onClick={() => dispatch({ type: "advance-minutes", minutes: 60 })}>+1 hour</button>
        <button type="button" disabled={nextEvent === null} onClick={() => nextEvent !== null && dispatch({ type: "advance-to", minute: nextEvent })}>Next event</button>
        <button type="button" disabled={nextReport === null} onClick={() => nextReport !== null && dispatch({ type: "advance-to", minute: nextReport })}>Next report due</button>
        <button type="button" disabled={!canAdvanceShift} onClick={() => canAdvanceShift && dispatch({ type: "advance-to", minute: nextShift })}>Next shift</button>
        <button type="button" onClick={() => dispatch({ type: "reset" })}>Reset trial</button>
      </div>
      <details className="guided-trial">
        <summary>Guided operational review</summary>
        <ol>
          {GUIDED_TRIAL_STEPS.map((step) => (
            <li className={step.minute === state.now ? "current" : step.minute < state.now ? "complete" : ""} key={step.minute}>
              <strong>{step.label}</strong>
              <span>{step.instruction}</span>
              <small>{step.expected}</small>
              {step.minute > state.now ? <button type="button" onClick={() => dispatch({ type: "advance-to", minute: step.minute })}>Go to {step.label}</button> : null}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function TrialAssignedTasks({
  user,
  tasks,
  onOpenTask
}: {
  user: TrialUser;
  tasks: TaskProjection[];
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <section className="assigned-tasks" aria-labelledby="assigned-tasks-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{user.name} · {user.tier}</p>
          <h2 id="assigned-tasks-heading">Assigned work</h2>
        </div>
        <strong>{tasks.length} tasks</strong>
      </div>
      <p className="section-copy">
        {user.tier === "Tier 2"
          ? "Only work explicitly assigned by Tier 1 for tracking. Delegation does not remove Tier 2 responsibility."
          : "Only work explicitly assigned by the direct-report Tier 2 user. No whole-project browsing."}
      </p>

      <div className="work-list">
        {tasks.map((projection) => {
          const relationship = user.tier === "Tier 2"
            ? "Tracking responsibility"
            : projection.fieldAssignments.find((assignment) => assignment.tier3UserId === user.id)?.relationship ?? "Assigned work";
          return (
            <article className="work-card" key={projection.task.id}>
              <div className="task-title-row">
                <div>
                  <span className="task-code">{projection.task.wbs}</span>
                  <h3>{projection.task.name}</h3>
                  <p>{projection.task.workPackage}</p>
                </div>
                <TrialExecutionState projection={projection} />
              </div>
              <dl className="task-card-facts">
                <div><dt>Planned</dt><dd>{formatTrialWindow(projection.task.plannedStart, projection.task.plannedFinish)}</dd></div>
                <div>
                  <dt>{projection.latestFieldProgressObservation ? "Field observation" : "Progress"}</dt>
                  <dd>{projection.progressPercent}%{projection.latestFieldProgressObservation ? " complete" : ""}</dd>
                </div>
                <div><dt>Assignment</dt><dd>{relationship}</dd></div>
              </dl>
              {hasUnstartedFieldProgress(projection) ? <p className="field-progress-note">Field progress recorded without a Tracker Start. Execution remains Not Started.</p> : null}
              <div className="task-card-footer">
                <div className="status-row">
                  {projection.attention.slice(0, 2).map((attention) => <TrialStatus key={attention} label={attention} tone={attentionTone(attention)} />)}
                  {projection.criticalItems.length > 0 ? <TrialStatus label="Critical context" tone="warning" /> : null}
                </div>
                <button className="open-task-button" type="button" aria-label={`Open ${projection.task.name}`} onClick={() => onOpenTask(projection.task.id)}>
                  <span>Open task</span><ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TrialTaskDetail({
  state,
  user,
  projection,
  dispatch,
  onBack
}: {
  state: TrialState;
  user: TrialUser;
  projection: TaskProjection;
  dispatch: TrialDispatch;
  onBack: () => void;
}) {
  const task = projection.task;
  const history = selectTaskHistory(state, task.id);
  const shiftNeed = selectShiftProgressNeedsForUser(state, user.id).find((need) => need.taskId === task.id);
  const relevantItemIds = new Set(projection.criticalItems.map((item) => item.id));
  const obligations = user.tier === "Tier 2"
    ? selectCriticalObligationsForOwner(state, user.id).filter((item) => relevantItemIds.has(item.item.id))
    : [];
  const currentObligations = compactMobileObligations(obligations);

  return (
    <article className="task-detail trial-task-detail" aria-labelledby="trial-task-detail-heading">
      <header className="task-detail-header">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" /><span>Back to assigned tasks</span></button>
        <p className="eyebrow">Task Detail · live trial state</p>
        <span className="task-code">{task.wbs}</span>
        <h2 id="trial-task-detail-heading">{task.name}</h2>
        <p>{task.workPackage}</p>
        <TrialExecutionState projection={projection} />
      </header>

      <TrialDetailSection title="Overview">
        <dl className="detail-facts">
          <div><dt>Execution state</dt><dd>{projection.executionState}</dd></div>
          <div>
            <dt>{projection.latestFieldProgressObservation ? "Tracker field observation" : "Progress"}</dt>
            <dd>{projection.progressPercent}%{projection.latestFieldProgressObservation ? ` at ${formatTrialTime(projection.latestFieldProgressObservation.at)}` : ""}</dd>
          </div>
          <div><dt>Planned window</dt><dd>{formatTrialWindow(task.plannedStart, task.plannedFinish)}</dd></div>
          <div><dt>Attention</dt><dd>{projection.attention.join(" · ") || "No current attention condition"}</dd></div>
        </dl>
        <p className="state-basis"><strong>State basis:</strong> {projection.stateBasis}</p>
        {hasUnstartedFieldProgress(projection) ? <p className="field-progress-note"><strong>Field observation:</strong> Progress does not establish Start; execution remains Not Started until valid imported start/progress evidence or a Tracker Start event exists.</p> : null}
      </TrialDetailSection>

      <TrialDetailSection title="Execution">
        {task.summary ? (
          <p className="restricted-copy">Execution actions apply to executable leaf tasks. This summary is an aggregate work-pack view.</p>
        ) : (
          <TrialExecutionControls state={state} user={user} projection={projection} dispatch={dispatch} />
        )}
      </TrialDetailSection>

      <TrialDetailSection title="End-of-shift progress">
        {shiftNeed ? (
          <EndShiftProgressForm need={shiftNeed} taskName={task.name} user={user} dispatch={dispatch} />
        ) : projection.latestFieldProgressObservation ? (
          <SubmittedFieldProgress projection={projection} />
        ) : (
          <p>No unfinished-work update is due for this persona and task at the current simulated time.</p>
        )}
      </TrialDetailSection>

      <TrialDetailSection title="People">
        <p><strong>Tier 2 tracking owner:</strong> {projection.trackingOwner?.name ?? "Not assigned"}</p>
        {projection.fieldAssignments.length > 0 ? (
          <ul className="plain-list">{projection.fieldAssignments.map((assignment) => <li key={assignment.id}>{assignment.user.name} · {assignment.relationship}</li>)}</ul>
        ) : <p>No active Tier 3 field assignment.</p>}
        {user.tier === "Tier 2" && !task.summary ? <Tier3AssignmentForm state={state} user={user} taskId={task.id} dispatch={dispatch} /> : null}
        {user.tier === "Tier 3" ? <p className="restricted-copy">Tier 3 cannot assign work onward.</p> : null}
      </TrialDetailSection>

      {user.tier === "Tier 2" && currentObligations.length > 0 ? (
        <TrialDetailSection title="Critical reporting">
          <p>Known execution facts are pre-populated. Enter only the required Tier 2 judgement that is not already recorded.</p>
          <div className="trial-obligation-list">
            {currentObligations.map((obligation) => <CriticalObligationCard key={obligation.obligation.id} projection={obligation} user={user} dispatch={dispatch} />)}
          </div>
        </TrialDetailSection>
      ) : projection.criticalItems.length > 0 ? (
        <TrialDetailSection title="Critical context">
          <p>{projection.criticalItems.map((item) => item.sourceType).join(" · ")}</p>
          <p className="restricted-copy">Critical reporting is contextual. Tier 3 does not own the formal Tier 2 reporting obligation by default.</p>
        </TrialDetailSection>
      ) : null}

      <TrialDetailSection title="Discussion"><p>Synthetic discussion remains task-owned. No production message is sent.</p></TrialDetailSection>
      <TrialDetailSection title="Delays / Problems">
        {projection.activeProblems.length > 0 ? (
          <ul className="record-list">
            {projection.activeProblems.map((problem) => (
              <li key={problem.id}>
                <span><strong>{problem.reason}</strong> — {problem.whatIsNeeded}</span>
                <button type="button" onClick={() => dispatch({ type: "resolve-problem", problemId: problem.id, actorId: user.id })}>Resolve problem</button>
              </li>
            ))}
          </ul>
        ) : <p>No active structured problem.</p>}
      </TrialDetailSection>
      <TrialDetailSection title="Actions">
        {projection.openActions.length > 0 ? (
          <ul className="record-list">
            {projection.openActions.map((action) => (
              <li key={action.id}>
                <span>{action.description}{action.dueAt !== undefined ? ` · due ${formatTrialTime(action.dueAt)}` : ""}</span>
                <button type="button" onClick={() => dispatch({ type: "complete-action", actionId: action.id, actorId: user.id })}>Complete action</button>
              </li>
            ))}
          </ul>
        ) : <p>No open action.</p>}
      </TrialDetailSection>
      <TrialDetailSection title="Evidence"><p>{task.evidenceRequirement ?? "Optional evidence placeholder. No file is uploaded in this trial."}</p></TrialDetailSection>
      <TrialDetailSection title="History">
        <ol className="history-list">{history.map((event) => <li key={event.id}><strong>{formatTrialTime(event.at)}</strong> · {event.summary}</li>)}</ol>
      </TrialDetailSection>
    </article>
  );
}

function TrialExecutionControls({
  state,
  user,
  projection,
  dispatch
}: {
  state: TrialState;
  user: TrialUser;
  projection: TaskProjection;
  dispatch: TrialDispatch;
}) {
  const [openAction, setOpenAction] = useState<string | null>(null);
  const task = projection.task;
  const late = state.now > task.plannedStart;
  const cantStartRecordedAtCurrentTime = state.executionEvents
    .filter((event) => event.taskId === task.id && event.type === "cant-start" && event.at === state.now)
    .sort((left, right) => right.id.localeCompare(left.id))[0];
  const activePause = state.pauseIntervals
    .filter((pause) => pause.taskId === task.id && pause.endedAt === undefined)
    .sort((left, right) => right.startedAt - left.startedAt)[0];
  const linkedProblem = activePause?.problemId
    ? state.problems.find((problem) => problem.id === activePause.problemId && problem.status === "open")
    : undefined;

  return (
    <div className="trial-execution-workflow">
      <p className="execution-time-rule"><strong>All action times use the simulated clock: {formatTrialTime(state.now)}.</strong> There is no manual date/time entry or backdating.</p>
      {projection.executionState === "Not Started" ? (
        <>
          {cantStartRecordedAtCurrentTime ? (
            <p className="completed-copy"><strong>Can't Start recorded at {formatTrialTime(cantStartRecordedAtCurrentTime.at)}.</strong> Execution remains Not Started. Advance the simulated time before recording another distinct Can't Start observation.</p>
          ) : <ActionDisclosure label="Can't Start" open={openAction === "cant-start"} onOpenChange={(open) => setOpenAction(open ? "cant-start" : null)}>
            <form className="trial-form" onSubmit={(event) => {
              const form = event.currentTarget;
              const data = formData(event);
              const applied = dispatch({
                type: "cant-start",
                taskId: task.id,
                actorId: user.id,
                reason: requiredString(data, "reason"),
                whatIsNeeded: requiredString(data, "whatIsNeeded"),
                createProblem: data.get("createProblem") === "yes",
                createAction: data.get("createAction") === "yes"
              });
              if (applied) {
                form.reset();
                setOpenAction(null);
              }
            }}>
              <label>Structured reason<select name="reason" required defaultValue=""><option value="" disabled>Choose reason</option><option>Access or scaffold unavailable</option><option>Permit or isolation unavailable</option><option>Material unavailable</option><option>Resource unavailable</option><option>Other operational constraint</option></select></label>
              <label>What needs to happen?<textarea name="whatIsNeeded" required rows={3} /></label>
              <label className="check-row"><input type="checkbox" name="createProblem" value="yes" defaultChecked /> Create linked structured problem</label>
              <label className="check-row"><input type="checkbox" name="createAction" value="yes" /> Create linked action</label>
              <button type="submit">Record Can't Start at {formatTrialTime(state.now)}</button>
              <small>Execution remains Not Started. Late to Start is shown separately when applicable.</small>
            </form>
          </ActionDisclosure>}
          <ActionDisclosure label="Start" open={openAction === "start"} onOpenChange={(open) => setOpenAction(open ? "start" : null)}>
            <form className="trial-form" onSubmit={(event) => {
              const form = event.currentTarget;
              const data = formData(event);
              const applied = dispatch({
                type: "start",
                taskId: task.id,
                actorId: user.id,
                lateCause: optionalString(data, "lateCause"),
                actionStillNeeded: optionalString(data, "actionStillNeeded")
              });
              if (applied) {
                form.reset();
                setOpenAction(null);
              }
            }}>
              {late ? (
                <>
                  <p className="trial-attention">This start is late against the accepted planned start. Capture the operational context.</p>
                  <label>What caused the late start?<textarea name="lateCause" required rows={3} /></label>
                  <label>What still needs action?<textarea name="actionStillNeeded" rows={2} /></label>
                </>
              ) : <p>Starting now does not require a late-start reason.</p>}
              <button type="submit">Start at {formatTrialTime(state.now)}</button>
            </form>
          </ActionDisclosure>
        </>
      ) : null}

      {projection.executionState === "In Progress" ? (
        <>
          <ActionDisclosure label="Pause" open={openAction === "pause"} onOpenChange={(open) => setOpenAction(open ? "pause" : null)}>
            <form className="trial-form" onSubmit={(event) => {
              const form = event.currentTarget;
              const data = formData(event);
              const adverseDelay = data.get("classification") === "adverse";
              const applied = dispatch({
                type: "pause",
                taskId: task.id,
                actorId: user.id,
                reason: requiredString(data, "reason"),
                adverseDelay,
                whatIsNeeded: requiredString(data, "whatIsNeeded"),
                createAction: data.get("createAction") === "yes"
              });
              if (applied) {
                form.reset();
                setOpenAction(null);
              }
            }}>
              <label>Pause reason<select name="reason" required defaultValue=""><option value="" disabled>Choose reason</option><option>Planned break or shift change</option><option>Await material</option><option>Await access or permit</option><option>Safety or quality hold</option><option>Other field interruption</option></select></label>
              <label>Classification<select name="classification" required defaultValue="normal"><option value="normal">Normal pause — not an adverse delay</option><option value="adverse">Adverse delay — create linked problem</option></select></label>
              <label>What needs to happen?<textarea name="whatIsNeeded" required rows={3} /></label>
              <label className="check-row"><input type="checkbox" name="createAction" value="yes" /> Create linked action</label>
              <button type="submit">Pause at {formatTrialTime(state.now)}</button>
            </form>
          </ActionDisclosure>
          <ActionDisclosure label="Finish" open={openAction === "finish"} onOpenChange={(open) => setOpenAction(open ? "finish" : null)}>
            <form className="trial-form" onSubmit={(event) => {
              event.preventDefault();
              if (dispatch({ type: "finish", taskId: task.id, actorId: user.id })) setOpenAction(null);
            }}>
              <p>Confirm this assigned task is complete. Completion time will be recorded automatically.</p>
              {task.evidenceRequirement ? (
                <>
                  <p className="trial-attention">Configured evidence: {task.evidenceRequirement}</p>
                  <label className="check-row"><input type="checkbox" required /> Required evidence placeholder reviewed</label>
                </>
              ) : <p>No completion evidence is configured as required for this task.</p>}
              <button type="submit">Confirm Finish at {formatTrialTime(state.now)}</button>
            </form>
          </ActionDisclosure>
        </>
      ) : null}

      {projection.executionState === "Paused" ? (
        <ActionDisclosure label="Resume" open={openAction === "resume"} onOpenChange={(open) => setOpenAction(open ? "resume" : null)}>
          <form className="trial-form" onSubmit={(event) => {
            const form = event.currentTarget;
            const data = formData(event);
            const applied = dispatch({
              type: "resume",
              taskId: task.id,
              actorId: user.id,
              issueResolution: linkedProblem
                ? requiredString(data, "issueResolution") as "resolved" | "remains-open"
                : "not-applicable"
            });
            if (applied) {
              form.reset();
              setOpenAction(null);
            }
          }}>
            {linkedProblem ? (
              <>
                <p>Linked problem: <strong>{linkedProblem.reason}</strong></p>
                <label>Underlying problem state<select name="issueResolution" required defaultValue=""><option value="" disabled>Choose explicitly</option><option value="resolved">Resolved</option><option value="remains-open">Work resumed; problem remains open</option></select></label>
              </>
            ) : <p>No open structured problem is linked to this pause.</p>}
            <button type="submit">Resume at {formatTrialTime(state.now)}</button>
          </form>
        </ActionDisclosure>
      ) : null}

      {projection.executionState === "Completed" ? <p className="completed-copy">Completed through recorded execution truth. No further execution action is available.</p> : null}
    </div>
  );
}

function Tier3AssignmentForm({ state, user, taskId, dispatch }: { state: TrialState; user: TrialUser; taskId: string; dispatch: TrialDispatch }) {
  const reports = selectDirectReports(state, user.id);
  const initialAssignment = state.fieldAssignments.find((assignment) => assignment.taskId === taskId && assignment.tier2UserId === user.id && assignment.active && reports.some((report) => report.id === assignment.tier3UserId));
  const [open, setOpen] = useState(false);
  const [tier3UserId, setTier3UserId] = useState(initialAssignment?.tier3UserId ?? reports[0]?.id ?? "");
  const [relationship, setRelationship] = useState<Tier3Relationship>(initialAssignment?.relationship ?? "WORKING_ON");
  if (reports.length === 0) return <p className="restricted-copy">No active direct-report Tier 3 user is available in this synthetic scenario.</p>;
  const identicalAssignment = state.fieldAssignments.some((assignment) => assignment.taskId === taskId && assignment.tier2UserId === user.id && assignment.tier3UserId === tier3UserId && assignment.relationship === relationship && assignment.active);
  return (
    <details className="action-disclosure" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Assign or update direct-report Tier 3</summary>
      <form className="trial-form" onSubmit={(event) => {
        event.preventDefault();
        const applied = dispatch({
          type: "assign-tier3",
          taskId,
          tier2UserId: user.id,
          tier3UserId,
          relationship
        });
        if (applied) setOpen(false);
      }}>
        <label>Direct report<select name="tier3UserId" required value={tier3UserId} onChange={(event) => setTier3UserId(event.target.value)}>{reports.map((report) => <option key={report.id} value={report.id}>{report.name}</option>)}</select></label>
        <label>Assignment relationship<select name="relationship" required value={relationship} onChange={(event) => setRelationship(event.target.value as Tier3Relationship)}><option value="WORKING_ON">WORKING_ON</option><option value="FIELD_CONTROL">FIELD_CONTROL</option></select></label>
        <button type="submit" disabled={identicalAssignment}>Assign field work</button>
        {identicalAssignment ? <p className="assignment-current">This exact field assignment is already active. Choose another direct report or relationship to make a change.</p> : null}
        <small>{user.name} retains Tier 2 tracking responsibility.</small>
      </form>
    </details>
  );
}

function EndShiftProgressForm({ need, taskName, user, dispatch }: { need: ShiftProgressNeed; taskName: string; user: TrialUser; dispatch: TrialDispatch }) {
  return (
    <form className="trial-form end-shift-form" onSubmit={(event) => {
      const data = formData(event);
      dispatch({
        type: "end-shift-progress",
        needId: need.id,
        actorId: user.id,
        completionPercent: Number(requiredString(data, "completionPercent")),
        remainingWork: requiredString(data, "remainingWork"),
        nextShiftIssue: optionalString(data, "nextShiftIssue") ?? "None reported",
        noteEvidence: optionalString(data, "noteEvidence")
      });
    }}>
      <p><strong>How much of the task is complete?</strong></p>
      <small>{taskName} is unfinished at the {formatTrialTime(need.shiftBoundary)} shift boundary.</small>
      <label>Completion percentage<input name="completionPercent" type="number" min="0" max="100" step="1" required /></label>
      <label>What remains?<textarea name="remainingWork" rows={3} required /></label>
      <label>Issue affecting the next shift (if any)<textarea name="nextShiftIssue" rows={3} /></label>
      <label>Optional note / evidence placeholder<textarea name="noteEvidence" rows={2} /></label>
      <button type="submit">Record end-of-shift progress</button>
    </form>
  );
}

function SubmittedFieldProgress({ projection }: { projection: TaskProjection }) {
  const observation = projection.latestFieldProgressObservation;
  if (!observation) return null;
  return (
    <div className="submitted-field-progress">
      <p><strong>Tracker field observation · {observation.completionPercent}% complete</strong></p>
      <dl className="detail-facts">
        <div><dt>Recorded</dt><dd>{formatTrialDateTime(observation.at)}</dd></div>
        <div><dt>What remains</dt><dd>{observation.remainingWork}</dd></div>
        <div><dt>Next-shift issue</dt><dd>{observation.nextShiftIssue}</dd></div>
      </dl>
      {hasUnstartedFieldProgress(projection) ? <p className="field-progress-note">This field observation does not establish Start; execution remains Not Started.</p> : null}
    </div>
  );
}

function CriticalObligationCard({ projection, user, dispatch }: { projection: CriticalObligationProjection; user: TrialUser; dispatch: TrialDispatch }) {
  const report = projection.currentReport;
  const prepopulated = Object.entries(projection.prepopulatedFacts).filter((entry): entry is [ReportingField, string] => entry[1] !== undefined);
  return (
    <article className="trial-obligation">
      <header>
        <div><strong>{projection.sourceTask.name}</strong><span>{projection.item.sourceType} · Policy v{projection.policy.version}</span></div>
        <TrialStatus label={projection.state} tone={obligationTone(projection.state)} />
      </header>
      <dl className="detail-facts">
        <div><dt>Due</dt><dd>{formatTrialDateTime(projection.obligation.dueAt)}</dd></div>
        <div><dt>Mechanism</dt><dd>{REPORTING_MECHANISM_LABELS[projection.obligation.mechanism]}</dd></div>
      </dl>
      {prepopulated.length > 0 ? <div className="known-facts"><strong>Known execution facts</strong><ul>{prepopulated.map(([field, value]) => <li key={field}>{REPORTING_FIELD_LABELS[field]}: {value}</li>)}</ul></div> : null}
      {projection.obligation.satisfiedByEventId ? <p className="completed-copy">Required structured facts were already supplied by the execution event; no duplicate report entry is required.</p> : null}
      {!report && !projection.obligation.satisfiedByEventId ? (
        <form className="trial-form critical-report-form" onSubmit={(event) => {
          const data = formData(event);
          const values: Partial<Record<ReportingField, string>> = {};
          for (const field of projection.requiredInputFields) values[field] = requiredString(data, field);
          dispatch({ type: "submit-critical-report", obligationId: projection.obligation.id, actorId: user.id, values });
        }}>
          {projection.requiredInputFields.map((field) => <label key={field}>{REPORTING_FIELD_LABELS[field]}<textarea name={field} rows={2} required /></label>)}
          <button type="submit">Submit immutable Critical report</button>
        </form>
      ) : null}
      {report ? (
        <details className="action-disclosure report-correction">
          <summary>Submitted report · immutable</summary>
          <ol className="report-revision-history" aria-label="Critical report revision history">
            {projection.reportHistory.map((revision) => <li key={revision.report.id}><strong>{revision.state === "superseded" ? "Superseded" : "Submitted"}</strong><span>{formatTrialDateTime(revision.report.submittedAt)} · Policy v{projection.policy.version}</span></li>)}
          </ol>
          <dl className="submitted-values">{Object.entries(report.values).map(([field, value]) => <div key={field}><dt>{REPORTING_FIELD_LABELS[field as ReportingField]}</dt><dd>{value}</dd></div>)}</dl>
          <form className="trial-form" onSubmit={(event) => {
            const data = formData(event);
            const values: Partial<Record<ReportingField, string>> = {};
            for (const field of projection.requiredInputFields) values[field] = requiredString(data, field);
            dispatch({ type: "correct-critical-report", reportId: report.id, actorId: user.id, values });
          }}>
            <p>Correction creates a new report that supersedes this one. The original remains in history.</p>
            {projection.requiredInputFields.map((field) => <label key={field}>{REPORTING_FIELD_LABELS[field]}<textarea name={field} rows={2} required defaultValue={report.values[field] ?? "Not recorded"} /></label>)}
            <button type="submit">Submit superseding correction</button>
          </form>
        </details>
      ) : null}
    </article>
  );
}

function ActionDisclosure({ label, children, open, onOpenChange }: { label: string; children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <details className="action-disclosure" open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}><summary>{label}</summary>{children}</details>;
}

function TrialDetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="task-detail-section"><h3>{title}</h3>{children}</section>;
}

function TrialExecutionState({ projection }: { projection: TaskProjection }) {
  const tone = projection.executionState === "Completed" ? "success" : projection.executionState === "Paused" ? "warning" : projection.executionState === "In Progress" ? "info" : "neutral";
  return (
    <div className="execution-summary">
      <strong className={`execution-state ${tone}`}>{projection.executionState}</strong>
      {projection.attention.slice(0, 2).map((attention) => <span className={`attention-state ${attentionTone(attention)}`} key={attention}>{attention}</span>)}
    </div>
  );
}

function hasUnstartedFieldProgress(projection: TaskProjection) {
  return projection.executionState === "Not Started" && projection.latestFieldProgressObservation !== null && projection.progressPercent > 0;
}

function TrialStatus({ label, tone }: { label: string; tone: "neutral" | "info" | "warning" | "critical" | "success" }) {
  return <span className={`status-chip ${tone}`}>{label}</span>;
}

function attentionTone(attention: string): "warning" | "critical" {
  return attention.includes("blocked") || attention.includes("overdue") || attention.includes("delay") ? "critical" : "warning";
}

function obligationTone(state: CriticalObligationProjection["state"]): "neutral" | "info" | "warning" | "critical" | "success" {
  if (state === "overdue") return "critical";
  if (state === "due") return "warning";
  if (state === "submitted" || state === "superseded") return "success";
  return "info";
}

function compactMobileObligations(obligations: CriticalObligationProjection[]) {
  const selected = new Map<string, CriticalObligationProjection>();
  const byItem = new Map<string, CriticalObligationProjection[]>();
  for (const obligation of obligations) {
    const current = byItem.get(obligation.item.id) ?? [];
    current.push(obligation);
    byItem.set(obligation.item.id, current);
    if (obligation.state === "due" || obligation.state === "overdue") selected.set(obligation.obligation.id, obligation);
  }
  for (const itemObligations of byItem.values()) {
    const submitted = itemObligations.filter((item) => item.state === "submitted" || item.state === "superseded").at(-1);
    const upcoming = itemObligations.find((item) => item.state === "upcoming");
    if (submitted) selected.set(submitted.obligation.id, submitted);
    if (upcoming) selected.set(upcoming.obligation.id, upcoming);
  }
  return [...selected.values()].sort((left, right) => left.obligation.dueAt - right.obligation.dueAt);
}

function formData(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return new FormData(event.currentTarget);
}

function requiredString(data: FormData, name: string) {
  return String(data.get(name) ?? "").trim();
}

function optionalString(data: FormData, name: string) {
  const value = requiredString(data, name);
  return value || undefined;
}

function isCanonicalResetState(state: TrialState) {
  return state.now === TRIAL_START_MINUTE && state.nextSequence === 1000;
}
