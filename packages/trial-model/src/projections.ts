import { operationalDayWindow } from "./clock";
import type {
  CriticalItem,
  CriticalObligationProjection,
  CriticalPolicyVersion,
  CriticalReport,
  ExecutionEvent,
  ExecutionState,
  ObligationState,
  ReportingField,
  ShiftProgressNeed,
  TaskProjection,
  TodayProjection,
  TrialHistoryEvent,
  TrialState,
  TrialTask,
  TrialUser
} from "./types";

export function selectExecutionState(state: TrialState, taskId: string): ExecutionState {
  const task = requiredTask(state, taskId);
  if (task.summary) {
    const leafStates = selectDescendantTasks(state, taskId)
      .filter((candidate) => !candidate.summary)
      .map((candidate) => selectExecutionState(state, candidate.id));
    if (leafStates.length > 0 && leafStates.every((value) => value === "Completed")) return "Completed";
    if (leafStates.includes("In Progress")) return "In Progress";
    if (leafStates.includes("Paused")) return "Paused";
    return "Not Started";
  }

  const transition = selectLatestExecutionTransition(state, taskId);
  if (transition?.type === "finish") return "Completed";
  if (transition?.type === "pause") return "Paused";
  if (transition?.type === "start" || transition?.type === "resume") return "In Progress";
  if (task.importedActualFinish !== undefined || task.importedProgress >= 100) return "Completed";
  if (task.importedActualStart !== undefined || task.importedProgress > 0) return "In Progress";
  return "Not Started";
}

export function selectStateBasis(state: TrialState, taskId: string) {
  const task = requiredTask(state, taskId);
  if (task.summary) return "Aggregate projection from descendant execution truth.";
  const transition = selectLatestExecutionTransition(state, taskId);
  if (transition) {
    const labels: Record<ExecutionEvent["type"], string> = {
      "cant-start": "Can't Start",
      start: "Start",
      pause: "Pause",
      resume: "Resume",
      finish: "Finish"
    };
    return `Established by Shutdown Tracker ${labels[transition.type]} event at ${timeOnly(transition.at)}.`;
  }
  if (task.importedActualFinish !== undefined || task.importedProgress >= 100) return "Imported completion evidence from the accepted synthetic Project snapshot.";
  if (task.importedActualStart !== undefined || task.importedProgress > 0) return "Imported Actual Start/progress evidence from the accepted synthetic Project snapshot.";
  return "No Tracker Start/Resume event, imported Actual Start, or imported progress evidence.";
}

export function selectTaskProgress(state: TrialState, taskId: string): number {
  const task = requiredTask(state, taskId);
  if (task.summary) {
    const leaves = selectDescendantTasks(state, taskId).filter((candidate) => !candidate.summary);
    if (leaves.length === 0) return 0;
    return Math.round(leaves.reduce((total, leaf) => total + selectTaskProgress(state, leaf.id), 0) / leaves.length);
  }
  const observation = state.progressObservations
    .filter((item) => item.taskId === taskId && item.at <= state.now)
    .sort(byNewestAt)[0];
  if (observation) return observation.completionPercent;
  if (selectExecutionState(state, taskId) === "Completed") return 100;
  return task.importedProgress;
}

export function selectTaskProjection(state: TrialState, taskId: string): TaskProjection {
  const task = requiredTask(state, taskId);
  const latestFieldProgressObservation = task.summary ? null : selectLatestFieldProgressObservation(state, taskId);
  const tracking = state.trackingAssignments
    .filter((assignment) => assignment.taskId === taskId && assignment.active && assignment.assignedAt <= state.now)
    .sort((left, right) => right.assignedAt - left.assignedAt)[0];
  const fieldAssignments = state.fieldAssignments
    .filter((assignment) => assignment.taskId === taskId && assignment.active && assignment.assignedAt <= state.now)
    .map((assignment) => ({ ...assignment, user: requiredUser(state, assignment.tier3UserId) }));
  const activeProblems = state.problems.filter((problem) => problem.taskId === taskId && problem.createdAt <= state.now && problem.status === "open");
  const openActions = state.actions.filter((action) => action.taskId === taskId && action.createdAt <= state.now && action.status === "open");
  const executionState = selectExecutionState(state, taskId);
  const lastActivityAt = selectLastTaskActivityAt(state, taskId);
  const attention: string[] = [];

  if (!task.summary && executionState === "Not Started" && state.now > task.plannedStart) attention.push("Late to Start");
  if (activeProblems.length > 0 && executionState === "Not Started") attention.push("Delayed / blocked before start");
  if (activeProblems.length > 0 && executionState !== "Not Started") attention.push("Active delay / problem");
  if (!task.summary && executionState !== "Completed" && state.now > task.plannedFinish) attention.push("Running beyond planned finish");
  if ((executionState === "In Progress" || executionState === "Paused") && lastActivityAt !== null && state.now - lastActivityAt > 60) attention.push("No recent update");

  const criticalItems = selectCriticalItemsForTask(state, taskId);
  const criticalObligations = selectCriticalObligationProjections(state).filter((item) => criticalItems.some((critical) => critical.id === item.item.id));
  if (criticalObligations.some((item) => item.state === "overdue")) attention.push("Critical report overdue");
  else if (criticalObligations.some((item) => item.state === "due")) attention.push("Critical report due");

  return {
    task,
    executionState,
    stateBasis: selectStateBasis(state, taskId),
    progressPercent: selectTaskProgress(state, taskId),
    latestFieldProgressObservation,
    trackingOwner: tracking ? requiredUser(state, tracking.tier2UserId) : null,
    fieldAssignments,
    attention,
    activeProblems,
    openActions,
    criticalItems,
    lastActivityAt
  };
}

export function selectTodayProjection(state: TrialState): TodayProjection {
  const { start, end } = operationalDayWindow(state);
  const tasks = state.tasks
    .filter((task) => !task.summary && task.plannedStart < end && task.plannedFinish > start)
    .map((task) => selectTaskProjection(state, task.id));
  const counts: Record<ExecutionState, number> = { "Not Started": 0, "In Progress": 0, Paused: 0, Completed: 0 };
  for (const task of tasks) counts[task.executionState] += 1;
  const obligationProjections = selectCriticalObligationProjections(state);
  return {
    windowStart: start,
    windowEnd: end,
    tasks,
    counts,
    lateStarts: tasks.filter((task) => task.attention.includes("Late to Start")).length,
    blocked: tasks.filter((task) => task.activeProblems.length > 0).length,
    runningBeyondFinish: tasks.filter((task) => task.attention.includes("Running beyond planned finish")).length,
    noRecentUpdate: tasks.filter((task) => task.attention.includes("No recent update")).length,
    criticalDue: obligationProjections.filter((item) => item.state === "due").length,
    criticalOverdue: obligationProjections.filter((item) => item.state === "overdue").length,
    activeProblems: state.problems.filter((problem) => problem.status === "open" && problem.createdAt <= state.now).length,
    dueActions: state.actions.filter((action) => action.status === "open" && action.createdAt <= state.now && action.dueAt !== undefined && action.dueAt <= state.now).length,
    recentActivity: selectRecentActivity(state, 6)
  };
}

export function selectTasksForUser(state: TrialState, userId: string): TaskProjection[] {
  const user = requiredUser(state, userId);
  let taskIds: string[];
  if (user.tier === "Tier 1") taskIds = state.tasks.map((task) => task.id);
  else if (user.tier === "Tier 2") {
    taskIds = state.trackingAssignments
      .filter((assignment) => assignment.active && assignment.tier2UserId === userId && assignment.assignedAt <= state.now)
      .map((assignment) => assignment.taskId);
  } else {
    taskIds = state.fieldAssignments
      .filter((assignment) => assignment.active && assignment.tier3UserId === userId && assignment.assignedAt <= state.now)
      .map((assignment) => assignment.taskId);
  }
  return [...new Set(taskIds)]
    .map((taskId) => selectTaskProjection(state, taskId))
    .sort((left, right) => left.task.plannedStart - right.task.plannedStart || left.task.wbs.localeCompare(right.task.wbs));
}

export function selectTaskHistory(state: TrialState, taskId: string): TrialHistoryEvent[] {
  const task = requiredTask(state, taskId);
  const taskIds = new Set([taskId, ...(task.summary ? selectDescendantTasks(state, taskId).map((item) => item.id) : [])]);
  return state.history
    .filter((event) => event.at <= state.now && event.taskId !== undefined && taskIds.has(event.taskId))
    .sort(byNewestAtThenId);
}

export function selectRecentActivity(state: TrialState, limit = 8): TrialHistoryEvent[] {
  return state.history.filter((event) => event.at <= state.now).sort(byNewestAtThenId).slice(0, limit);
}

export function selectCriticalObligationProjections(state: TrialState): CriticalObligationProjection[] {
  return state.criticalObligations
    .filter((obligation) => obligation.createdAt <= state.now)
    .map((obligation) => {
      const item = requiredCriticalItem(state, obligation.criticalItemId);
      const policy = requiredPolicy(state, obligation.policyVersionId);
      const sourceTask = requiredTask(state, item.sourceTaskId);
      const reports = state.criticalReports.filter((report) => report.obligationId === obligation.id).sort((left, right) => left.submittedAt - right.submittedAt);
      const supersededIds = new Set(reports.map((report) => report.supersedesReportId).filter((value): value is string => value !== undefined));
      const currentReport = [...reports].reverse().find((report) => !supersededIds.has(report.id)) ?? null;
      const reportHistory = reports.map((report) => ({
        report,
        state: supersededIds.has(report.id) ? "superseded" as const : "submitted" as const
      }));
      const prepopulatedFacts = selectPrepopulatedFacts(state, item, policy.requiredFields);
      const requiredInputFields = policy.requiredFields.filter((field) => prepopulatedFacts[field] === undefined);
      return {
        obligation,
        item,
        policy,
        sourceTask,
        owner: requiredUser(state, obligation.ownerUserId),
        state: obligationState(state, obligation.dueAt, currentReport, obligation.satisfiedByEventId),
        currentReport,
        reportHistory,
        prepopulatedFacts,
        requiredInputFields
      };
    })
    .sort((left, right) => left.obligation.dueAt - right.obligation.dueAt || left.obligation.id.localeCompare(right.obligation.id));
}

export function selectCriticalObligationsForOwner(state: TrialState, ownerUserId: string) {
  return selectCriticalObligationProjections(state).filter((item) => item.owner.id === ownerUserId);
}

export function selectCriticalItems(state: TrialState) {
  return state.criticalItems.filter((item) => item.active).map((item) => {
    const policy = selectCurrentPolicy(state, item.id);
    const obligations = selectCriticalObligationProjections(state).filter((obligation) => obligation.item.id === item.id);
    const reports = state.criticalReports.filter((report) => report.criticalItemId === item.id).sort((left, right) => right.submittedAt - left.submittedAt);
    const nextObligation = obligations.find((obligation) => ["overdue", "due", "upcoming"].includes(obligation.state)) ?? null;
    return {
      item,
      sourceTask: requiredTask(state, item.sourceTaskId),
      policy,
      owner: requiredUser(state, policy.ownerUserId),
      obligations,
      reports,
      nextObligation,
      latestReport: reports.find((report) => !state.criticalReports.some((candidate) => candidate.supersedesReportId === report.id)) ?? null
    };
  });
}

export function selectCurrentPolicy(state: TrialState, criticalItemId: string): CriticalPolicyVersion {
  const policy = state.criticalPolicies
    .filter((candidate) => candidate.criticalItemId === criticalItemId && candidate.effectiveAt <= state.now)
    .sort((left, right) => right.version - left.version)[0];
  if (!policy) throw new Error(`No active Critical policy for ${criticalItemId}.`);
  return policy;
}

export function selectCriticalItemsForTask(state: TrialState, taskId: string): CriticalItem[] {
  return state.criticalItems.filter((item) => item.active && (item.sourceTaskId === taskId || selectDescendantTasks(state, item.sourceTaskId).some((task) => task.id === taskId)));
}

export function selectShiftProgressNeedsForUser(state: TrialState, userId: string): ShiftProgressNeed[] {
  return state.shiftProgressNeeds.filter((need) => need.userId === userId && need.createdAt <= state.now && need.satisfiedByObservationId === undefined);
}

export function selectDirectReports(state: TrialState, tier2UserId: string) {
  return state.users.filter((user) => user.tier === "Tier 3" && user.directReportTo === tier2UserId);
}

export function selectDescendantTasks(state: TrialState, taskId: string): TrialTask[] {
  const descendants: TrialTask[] = [];
  const pending = [taskId];
  while (pending.length > 0) {
    const parentId = pending.shift();
    const children = state.tasks.filter((task) => task.parentId === parentId);
    descendants.push(...children);
    pending.push(...children.map((child) => child.id));
  }
  return descendants;
}

export function selectUser(state: TrialState, userId: string) {
  return state.users.find((user) => user.id === userId) ?? null;
}

export function selectTask(state: TrialState, taskId: string) {
  return state.tasks.find((task) => task.id === taskId) ?? null;
}

export function selectLatestOpenProblem(state: TrialState, taskId: string) {
  return state.problems.filter((problem) => problem.taskId === taskId && problem.status === "open" && problem.createdAt <= state.now).sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
}

function selectLatestExecutionTransition(state: TrialState, taskId: string) {
  return state.executionEvents
    .filter((event) => event.taskId === taskId && event.type !== "cant-start" && event.at <= state.now)
    .sort((left, right) => right.at - left.at || right.id.localeCompare(left.id))[0] ?? null;
}

function selectLastTaskActivityAt(state: TrialState, taskId: string) {
  const values = [
    ...state.executionEvents.filter((event) => event.taskId === taskId && event.at <= state.now).map((event) => event.at),
    ...state.progressObservations.filter((item) => item.taskId === taskId && item.at <= state.now).map((item) => item.at),
    ...state.history.filter((item) => item.taskId === taskId && item.at <= state.now).map((item) => item.at)
  ];
  return values.length > 0 ? Math.max(...values) : null;
}

function selectPrepopulatedFacts(state: TrialState, item: CriticalItem, fields: ReportingField[]) {
  const task = requiredTask(state, item.sourceTaskId);
  const executionState = selectExecutionState(state, item.sourceTaskId);
  const progressPercent = selectTaskProgress(state, item.sourceTaskId);
  const latestFieldProgressObservation = task.summary ? null : selectLatestFieldProgressObservation(state, item.sourceTaskId);
  const taskIds = new Set([item.sourceTaskId, ...(task.summary ? selectDescendantTasks(state, item.sourceTaskId).map((candidate) => candidate.id) : [])]);
  const activeProblems = state.problems.filter((problem) => taskIds.has(problem.taskId) && problem.createdAt <= state.now && problem.status === "open");
  const openActions = state.actions.filter((action) => taskIds.has(action.taskId) && action.createdAt <= state.now && action.status === "open");
  const values: Partial<Record<ReportingField, string>> = {};
  if (fields.includes("progress")) {
    values.progress = latestFieldProgressObservation
      ? `${progressPercent}% field observation · ${executionState} execution`
      : `${progressPercent}% · ${executionState}`;
  }
  if (fields.includes("condition")) values.condition = activeProblems.length > 0 ? "Constraint active" : executionState;
  if (fields.includes("constraint") && activeProblems.length > 0) values.constraint = activeProblems.map((problem) => problem.reason).join("; ");
  if (fields.includes("recovery") && openActions.length > 0) values.recovery = openActions.map((action) => action.description).join("; ");
  if (fields.includes("evidence") && task.evidenceRequirement) values.evidence = task.evidenceRequirement;
  return values;
}

function selectLatestFieldProgressObservation(state: TrialState, taskId: string) {
  return state.progressObservations
    .filter((observation) => observation.taskId === taskId && observation.at <= state.now)
    .sort(byNewestAt)[0] ?? null;
}

function obligationState(state: TrialState, dueAt: number, report: CriticalReport | null, satisfiedByEventId?: string): ObligationState {
  if (report || satisfiedByEventId) return "submitted";
  if (state.now < dueAt) return "upcoming";
  if (state.now === dueAt) return "due";
  return "overdue";
}

function requiredTask(state: TrialState, taskId: string): TrialTask {
  const task = selectTask(state, taskId);
  if (!task) throw new Error(`Unknown trial task ${taskId}.`);
  return task;
}

function requiredUser(state: TrialState, userId: string): TrialUser {
  const user = selectUser(state, userId);
  if (!user) throw new Error(`Unknown trial user ${userId}.`);
  return user;
}

function requiredCriticalItem(state: TrialState, itemId: string) {
  const item = state.criticalItems.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`Unknown Critical item ${itemId}.`);
  return item;
}

function requiredPolicy(state: TrialState, policyId: string) {
  const policy = state.criticalPolicies.find((candidate) => candidate.id === policyId);
  if (!policy) throw new Error(`Unknown Critical policy ${policyId}.`);
  return policy;
}

function timeOnly(minute: number) {
  const inDay = ((minute % 1440) + 1440) % 1440;
  return `${Math.floor(inDay / 60).toString().padStart(2, "0")}:${(inDay % 60).toString().padStart(2, "0")}`;
}

function byNewestAt<T extends { at: number }>(left: T, right: T) {
  return right.at - left.at;
}

function byNewestAtThenId(left: TrialHistoryEvent, right: TrialHistoryEvent) {
  return right.at - left.at || right.id.localeCompare(left.id);
}
