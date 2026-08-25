import { selectExecutionState, selectTask, selectUser } from "./projections";
import type { ExecutionEvent, TrialAction, TrialHistoryEvent, TrialState } from "./types";

export function applyTrialAction(state: TrialState, action: TrialAction): TrialState {
  const next = structuredClone(state);
  switch (action.type) {
    case "cant-start":
      recordCantStart(next, action);
      break;
    case "start":
      recordStart(next, action);
      break;
    case "pause":
      recordPause(next, action);
      break;
    case "resume":
      recordResume(next, action);
      break;
    case "finish":
      recordFinish(next, action);
      break;
    case "resolve-problem":
      resolveProblem(next, action.problemId, action.actorId);
      break;
    case "complete-action":
      completeAction(next, action.actionId, action.actorId);
      break;
    default:
      assertNever(action);
  }
  return next;
}

function recordCantStart(state: TrialState, action: Extract<TrialAction, { type: "cant-start" }>) {
  requireExecutableTask(state, action.taskId);
  requireTier1Authority(state, action.actorId);
  if (selectExecutionState(state, action.taskId) !== "Not Started") {
    throw new Error("Can't Start is available only before execution begins.");
  }
  const recordedAtCurrentTime = state.executionEvents.some((event) => event.taskId === action.taskId
    && event.type === "cant-start"
    && event.at === state.now);
  if (recordedAtCurrentTime) throw new Error("Can't Start has already been recorded for this task at the current trial time.");
  requireNonBlank(action.reason, "Can't Start reason");
  requireNonBlank(action.whatIsNeeded, "What must happen");

  let problemId: string | undefined;
  let actionId: string | undefined;
  if (action.createProblem) {
    problemId = createProblem(state, action.taskId, action.actorId, action.reason, action.whatIsNeeded, true);
  }
  if (action.createAction) {
    actionId = createActionRecord(state, action.taskId, action.actorId, action.whatIsNeeded);
  }
  const event: ExecutionEvent = {
    id: nextId(state, "event"),
    taskId: action.taskId,
    actorId: action.actorId,
    type: "cant-start",
    at: state.now,
    reason: action.reason.trim(),
    whatIsNeeded: action.whatIsNeeded.trim(),
    linkedProblemId: problemId,
    linkedActionId: actionId
  };
  state.executionEvents.push(event);
  appendHistory(state, "cant-start", action.actorId, `Can't Start recorded: ${action.reason.trim()}. Execution remains Not Started.`, action.taskId);
}

function recordStart(state: TrialState, action: Extract<TrialAction, { type: "start" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTier1Authority(state, action.actorId);
  if (selectExecutionState(state, task.id) !== "Not Started") {
    throw new Error("Start is available only for Not Started work.");
  }
  const late = task.plannedStart !== null && state.now > task.plannedStart;
  if (late) requireNonBlank(action.lateCause, "Late-start cause");
  const event: ExecutionEvent = {
    id: nextId(state, "event"),
    taskId: task.id,
    actorId: action.actorId,
    type: "start",
    at: state.now,
    lateCause: action.lateCause?.trim(),
    actionStillNeeded: action.actionStillNeeded?.trim()
  };
  state.executionEvents.push(event);
  appendHistory(state, "start", action.actorId, `${task.name} started${late ? ` late: ${action.lateCause?.trim()}` : ""}.`, task.id);
}

function recordPause(state: TrialState, action: Extract<TrialAction, { type: "pause" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTier1Authority(state, action.actorId);
  if (selectExecutionState(state, task.id) !== "In Progress") {
    throw new Error("Pause is available only while work is In Progress.");
  }
  requireNonBlank(action.reason, "Pause reason");
  requireNonBlank(action.whatIsNeeded, "What must happen");

  let problemId: string | undefined;
  let actionId: string | undefined;
  if (action.adverseDelay) {
    problemId = createProblem(state, task.id, action.actorId, action.reason, action.whatIsNeeded, true);
  }
  if (action.createAction) {
    actionId = createActionRecord(state, task.id, action.actorId, action.whatIsNeeded);
  }
  const event: ExecutionEvent = {
    id: nextId(state, "event"),
    taskId: task.id,
    actorId: action.actorId,
    type: "pause",
    at: state.now,
    reason: action.reason.trim(),
    whatIsNeeded: action.whatIsNeeded.trim(),
    adverseDelay: action.adverseDelay,
    linkedProblemId: problemId,
    linkedActionId: actionId
  };
  state.executionEvents.push(event);
  state.pauseIntervals.push({
    id: nextId(state, "pause"),
    taskId: task.id,
    startedByEventId: event.id,
    startedAt: state.now,
    reason: action.reason.trim(),
    adverseDelay: action.adverseDelay,
    problemId
  });
  appendHistory(state, "pause", action.actorId, `${task.name} paused: ${action.reason.trim()}. ${action.adverseDelay ? "Linked adverse delay recorded." : "Pause is not classified as an adverse delay."}`, task.id);
}

function recordResume(state: TrialState, action: Extract<TrialAction, { type: "resume" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTier1Authority(state, action.actorId);
  if (selectExecutionState(state, task.id) !== "Paused") {
    throw new Error("Resume is available only while work is Paused.");
  }
  const pause = state.pauseIntervals
    .filter((interval) => interval.taskId === task.id && interval.endedAt === undefined)
    .sort((left, right) => right.startedAt - left.startedAt)[0];
  if (!pause) throw new Error("The active pause interval could not be found.");
  const linkedProblem = pause.problemId
    ? state.problems.find((problem) => problem.id === pause.problemId && problem.status === "open")
    : undefined;
  if (linkedProblem && action.issueResolution === "not-applicable") {
    throw new Error("Choose whether the linked problem is resolved or remains open.");
  }
  if (linkedProblem && action.issueResolution === "resolved") {
    resolveProblem(state, linkedProblem.id, action.actorId);
  }
  const event: ExecutionEvent = {
    id: nextId(state, "event"),
    taskId: task.id,
    actorId: action.actorId,
    type: "resume",
    at: state.now,
    linkedProblemId: linkedProblem?.id,
    resumeResolution: action.issueResolution
  };
  state.executionEvents.push(event);
  pause.endedAt = state.now;
  pause.endedByEventId = event.id;
  appendHistory(state, "resume", action.actorId, `${task.name} resumed. ${linkedProblem ? action.issueResolution === "resolved" ? "Linked problem resolved explicitly." : "Linked problem remains open." : "No linked problem."}`, task.id);
}

function recordFinish(state: TrialState, action: Extract<TrialAction, { type: "finish" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTier1Authority(state, action.actorId);
  if (selectExecutionState(state, task.id) !== "In Progress") {
    throw new Error("Finish is available only while work is In Progress.");
  }
  state.executionEvents.push({
    id: nextId(state, "event"),
    taskId: task.id,
    actorId: action.actorId,
    type: "finish",
    at: state.now
  });
  appendHistory(state, "finish", action.actorId, `${task.name} finished. Completion time was recorded automatically.`, task.id);
}

function resolveProblem(state: TrialState, problemId: string, actorId: string) {
  requireTier1Authority(state, actorId);
  const problem = state.problems.find((candidate) => candidate.id === problemId);
  if (!problem || problem.status !== "open") throw new Error("The problem is not open.");
  problem.status = "resolved";
  problem.resolvedAt = state.now;
  problem.resolvedBy = actorId;
  appendHistory(state, "problem-resolved", actorId, `Problem resolved explicitly: ${problem.reason}.`, problem.taskId);
}

function completeAction(state: TrialState, actionId: string, actorId: string) {
  requireTier1Authority(state, actorId);
  const record = state.actions.find((candidate) => candidate.id === actionId);
  if (!record || record.status !== "open") throw new Error("The action is not open.");
  record.status = "completed";
  record.completedAt = state.now;
  appendHistory(state, "action-completed", actorId, `Action completed: ${record.description}.`, record.taskId);
}

function createProblem(state: TrialState, taskId: string, actorId: string, reason: string, whatIsNeeded: string, adverse: boolean) {
  const id = nextId(state, "problem");
  state.problems.push({ id, taskId, createdAt: state.now, createdBy: actorId, reason: reason.trim(), whatIsNeeded: whatIsNeeded.trim(), adverse, status: "open" });
  appendHistory(state, "problem-created", actorId, `Problem recorded: ${reason.trim()}.`, taskId);
  return id;
}

function createActionRecord(state: TrialState, taskId: string, actorId: string, description: string) {
  const id = nextId(state, "action");
  state.actions.push({ id, taskId, createdAt: state.now, createdBy: actorId, description: description.trim(), status: "open" });
  appendHistory(state, "action-created", actorId, `Action recorded: ${description.trim()}.`, taskId);
  return id;
}

function appendHistory(state: TrialState, type: TrialHistoryEvent["type"], actorId: string, summary: string, taskId?: string) {
  state.history.push({ id: nextId(state, "history"), type, at: state.now, actorId, summary, taskId });
}

function nextId(state: TrialState, prefix: string) {
  const id = `${prefix}-${state.nextSequence.toString().padStart(5, "0")}`;
  state.nextSequence += 1;
  return id;
}

function requireExecutableTask(state: TrialState, taskId: string) {
  const task = selectTask(state, taskId);
  if (!task) throw new Error(`Unknown trial task ${taskId}.`);
  if (task.summary) throw new Error("Execution actions apply to executable leaf tasks.");
  return task;
}

function requireTier1Authority(state: TrialState, actorId: string) {
  const actor = selectUser(state, actorId);
  if (!actor) throw new Error(`Unknown trial user ${actorId}.`);
  if (actor.tier !== "Tier 1") throw new Error(`${actor.name} is not a Tier 1 trial operator.`);
  return actor;
}

function requireNonBlank(value: string | undefined, field: string) {
  if (!value?.trim()) throw new Error(`${field} is required.`);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported trial action: ${JSON.stringify(value)}`);
}
