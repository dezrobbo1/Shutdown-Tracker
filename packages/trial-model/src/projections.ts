import type { ExecutionEvent, ExecutionState, TaskProjection, TrialState, TrialTask } from "./types";

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

export function selectTaskProgress(state: TrialState, taskId: string): number {
  const task = requiredTask(state, taskId);
  if (task.summary) return task.importedProgress;
  if (selectExecutionState(state, taskId) === "Completed") return 100;
  return selectLatestFieldProgressObservation(state, taskId)?.completionPercent ?? task.importedProgress;
}

export function selectTaskProjection(state: TrialState, taskId: string): TaskProjection {
  const task = requiredTask(state, taskId);
  const executionState = selectExecutionState(state, taskId);
  const latestFieldProgressObservation = task.summary ? null : selectLatestFieldProgressObservation(state, taskId);
  const activeProblems = state.problems.filter((problem) => problem.taskId === taskId && problem.createdAt <= state.now && problem.status === "open");
  const openActions = state.actions.filter((action) => action.taskId === taskId && action.createdAt <= state.now && action.status === "open");
  const lastActivityAt = selectLastTaskActivityAt(state, taskId);
  const hasCantStart = executionState === "Not Started"
    && state.executionEvents.some((event) => event.taskId === taskId && event.type === "cant-start" && event.at <= state.now);
  const attention: string[] = [];

  if (!task.summary && task.plannedStart !== null && executionState === "Not Started" && state.now > task.plannedStart) attention.push("Late to Start");
  if ((activeProblems.length > 0 || hasCantStart) && executionState === "Not Started") attention.push("Delayed / blocked before start");
  if (activeProblems.length > 0 && executionState !== "Not Started") attention.push("Active delay / problem");
  if (!task.summary && task.plannedFinish !== null && executionState !== "Completed" && state.now > task.plannedFinish) attention.push("Running beyond planned finish");
  if ((executionState === "In Progress" || executionState === "Paused") && lastActivityAt !== null && state.now - lastActivityAt > 60) attention.push("No recent update");

  return {
    task,
    executionState,
    stateBasis: selectStateBasis(state, taskId),
    progressPercent: selectTaskProgress(state, taskId),
    progressBasis: selectTaskProgressBasis(state, taskId),
    latestFieldProgressObservation,
    attention,
    activeProblems,
    openActions,
    lastActivityAt
  };
}

export function selectTask(state: TrialState, taskId: string) {
  return state.tasks.find((task) => task.id === taskId) ?? null;
}

export function selectUser(state: TrialState, userId: string) {
  return state.users.find((user) => user.id === userId) ?? null;
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

function selectStateBasis(state: TrialState, taskId: string) {
  const task = requiredTask(state, taskId);
  if (task.summary) return "Aggregate projection from descendant execution truth.";
  const transition = selectLatestExecutionTransition(state, taskId);
  if (transition) {
    const labels: Record<ExecutionEvent["type"], string> = { "cant-start": "Can't Start", start: "Start", pause: "Pause", resume: "Resume", finish: "Finish" };
    return `Established by Shutdown Tracker ${labels[transition.type]} event at ${timeOnly(transition.at)}.`;
  }
  if (task.importedActualFinish !== undefined || task.importedProgress >= 100) return "Imported completion evidence from the selected Project source.";
  if (task.importedActualStart !== undefined || task.importedProgress > 0) return "Imported Actual Start/progress evidence from the selected Project source.";
  return "No Tracker Start/Resume event, imported Actual Start, or imported progress evidence.";
}

function selectTaskProgressBasis(state: TrialState, taskId: string): string {
  const task = requiredTask(state, taskId);
  if (task.summary) return "Imported Microsoft Project summary progress; Shutdown Tracker does not calculate a descendant progress roll-up.";
  if (selectExecutionState(state, taskId) === "Completed") return "Current completion projection; earlier field progress observations remain in history.";
  if (selectLatestFieldProgressObservation(state, taskId)) return "Latest Tracker field progress observation.";
  return "Imported Microsoft Project progress context.";
}

function selectLatestExecutionTransition(state: TrialState, taskId: string) {
  return state.executionEvents
    .filter((event) => event.taskId === taskId && event.type !== "cant-start" && event.at <= state.now)
    .sort(byNewestAtThenId)[0] ?? null;
}

function selectLatestFieldProgressObservation(state: TrialState, taskId: string) {
  return state.progressObservations
    .filter((observation) => observation.taskId === taskId && observation.at <= state.now)
    .sort(byNewestAtThenId)[0] ?? null;
}

function selectLastTaskActivityAt(state: TrialState, taskId: string) {
  const values = [
    ...state.executionEvents.filter((event) => event.taskId === taskId && event.at <= state.now).map((event) => event.at),
    ...state.progressObservations.filter((item) => item.taskId === taskId && item.at <= state.now).map((item) => item.at),
    ...state.history.filter((item) => item.taskId === taskId && item.at <= state.now).map((item) => item.at)
  ];
  return values.length > 0 ? Math.max(...values) : null;
}

function requiredTask(state: TrialState, taskId: string): TrialTask {
  const task = selectTask(state, taskId);
  if (!task) throw new Error(`Unknown trial task ${taskId}.`);
  return task;
}

function timeOnly(minute: number) {
  const inDay = ((minute % 1440) + 1440) % 1440;
  return `${Math.floor(inDay / 60).toString().padStart(2, "0")}:${(inDay % 60).toString().padStart(2, "0")}`;
}

function byNewestAtThenId<T extends { at: number; id: string }>(left: T, right: T) {
  return right.at - left.at || right.id.localeCompare(left.id);
}
