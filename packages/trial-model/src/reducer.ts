import { operationalDayWindow } from "./clock";
import { TRIAL_DAY_END_MINUTE, TRIAL_START_MINUTE, TRIAL_SYSTEM_ACTOR_ID, createInitialTrialState } from "./scenario";
import {
  selectCriticalItemsForTask,
  selectCriticalObligationProjections,
  selectCurrentPolicy,
  selectDescendantTasks,
  selectDirectReports,
  selectExecutionState,
  selectLatestOpenProblem,
  selectTask,
  selectUser
} from "./projections";
import type {
  CriticalItem,
  CriticalObligation,
  CriticalPolicyInput,
  CriticalPolicyVersion,
  ExecutionEvent,
  ReportingField,
  ReportingTrigger,
  TrialAction,
  TrialHistoryEvent,
  TrialState
} from "./types";

export function applyTrialAction(state: TrialState, action: TrialAction): TrialState {
  if (action.type === "reset") return createInitialTrialState();
  if (action.type === "advance-minutes") return advanceTrialClock(state, state.now + action.minutes);
  if (action.type === "advance-to") return advanceTrialClock(state, action.minute);

  const next = structuredClone(state);
  if (action.type === "assign-tier2") assignTier2(next, action.taskId, action.tier2UserId, action.actorId);
  else if (action.type === "assign-tier3") assignTier3(next, action.taskId, action.tier2UserId, action.tier3UserId, action.relationship);
  else if (action.type === "cant-start") recordCantStart(next, action);
  else if (action.type === "start") recordStart(next, action);
  else if (action.type === "pause") recordPause(next, action);
  else if (action.type === "resume") recordResume(next, action);
  else if (action.type === "finish") recordFinish(next, action);
  else if (action.type === "end-shift-progress") recordEndShiftProgress(next, action);
  else if (action.type === "resolve-problem") resolveProblem(next, action.problemId, action.actorId);
  else if (action.type === "complete-action") completeAction(next, action.actionId, action.actorId);
  else if (action.type === "configure-critical") configureCritical(next, action.criticalItemId, action.actorId, action.policy);
  else if (action.type === "add-critical") addCritical(next, action.sourceTaskId, action.sourceType, action.actorId, action.policy);
  else if (action.type === "submit-critical-report") submitCriticalReport(next, action.obligationId, action.actorId, action.values);
  else if (action.type === "correct-critical-report") correctCriticalReport(next, action.reportId, action.actorId, action.values);
  return next;
}

export function advanceTrialClock(state: TrialState, targetMinute: number): TrialState {
  if (!Number.isInteger(targetMinute) || targetMinute < state.now) throw new Error("Trial time can only move forward in whole minutes. Use Reset to replay.");
  if (targetMinute > TRIAL_DAY_END_MINUTE) throw new Error("The bounded trial ends at the next 06:00 operational-day boundary.");
  if (targetMinute === state.now) return structuredClone(state);
  const next = structuredClone(state);
  const previousMinute = next.now;

  processPlannedFinishTriggers(next, previousMinute, targetMinute);
  processReportDueEvents(next, previousMinute, targetMinute);
  processShiftBoundaries(next, previousMinute, targetMinute);
  next.now = targetMinute;
  return next;
}

function assignTier2(state: TrialState, taskId: string, tier2UserId: string, actorId: string) {
  requireTask(state, taskId);
  requireTier(state, tier2UserId, "Tier 2");
  requireTier(state, actorId, "Tier 1");
  for (const assignment of state.trackingAssignments) {
    if (assignment.taskId === taskId && assignment.active) assignment.active = false;
  }
  state.trackingAssignments.push({ id: nextId(state, "tracking"), taskId, tier2UserId, assignedAt: state.now, active: true });
  const task = requireTask(state, taskId);
  appendHistory(state, "assignment-tier2", actorId, `${requireUser(state, tier2UserId).name} received Tier 2 tracking responsibility for ${task.name}.`, taskId);
}

function assignTier3(state: TrialState, taskId: string, tier2UserId: string, tier3UserId: string, relationship: "WORKING_ON" | "FIELD_CONTROL") {
  requireTask(state, taskId);
  requireTier(state, tier2UserId, "Tier 2");
  requireTier(state, tier3UserId, "Tier 3");
  const currentTracking = state.trackingAssignments.some((assignment) => assignment.taskId === taskId && assignment.tier2UserId === tier2UserId && assignment.active);
  if (!currentTracking) throw new Error("Tier 2 can assign only work they currently track.");
  if (!selectDirectReports(state, tier2UserId).some((user) => user.id === tier3UserId)) throw new Error("Tier 3 must be a direct report of the tracking Tier 2 user.");
  const identicalAssignment = state.fieldAssignments.some((assignment) => assignment.taskId === taskId && assignment.tier2UserId === tier2UserId && assignment.tier3UserId === tier3UserId && assignment.relationship === relationship && assignment.active);
  if (identicalAssignment) throw new Error("That Tier 3 assignment is already active. Choose another direct report or relationship to make a change.");
  for (const assignment of state.fieldAssignments) {
    if (assignment.taskId === taskId && assignment.tier3UserId === tier3UserId && assignment.active) assignment.active = false;
  }
  state.fieldAssignments.push({ id: nextId(state, "field"), taskId, tier2UserId, tier3UserId, relationship, assignedAt: state.now, active: true });
  const task = requireTask(state, taskId);
  appendHistory(state, "assignment-tier3", tier2UserId, `${requireUser(state, tier3UserId).name} received ${relationship} assignment for ${task.name}; Tier 2 tracking responsibility was retained.`, taskId);
}

function recordCantStart(state: TrialState, action: Extract<TrialAction, { type: "cant-start" }>) {
  requireExecutableTask(state, action.taskId);
  requireTaskUpdateAuthority(state, action.taskId, action.actorId);
  if (selectExecutionState(state, action.taskId) !== "Not Started") throw new Error("Can't Start is available only before execution begins.");
  const recordedAtCurrentTime = state.executionEvents.some((event) => event.taskId === action.taskId && event.type === "cant-start" && event.at === state.now);
  if (recordedAtCurrentTime) throw new Error("Can't Start has already been recorded for this task at the current simulated time.");
  requireNonBlank(action.reason, "Can't Start reason");
  requireNonBlank(action.whatIsNeeded, "What must happen");
  let problemId: string | undefined;
  let actionId: string | undefined;
  if (action.createProblem) problemId = createProblem(state, action.taskId, action.actorId, action.reason, action.whatIsNeeded, true);
  if (action.createAction) actionId = createActionRecord(state, action.taskId, action.actorId, action.whatIsNeeded, state.now + 30);
  const event: ExecutionEvent = { id: nextId(state, "event"), taskId: action.taskId, actorId: action.actorId, type: "cant-start", at: state.now, reason: action.reason, whatIsNeeded: action.whatIsNeeded, linkedProblemId: problemId, linkedActionId: actionId };
  state.executionEvents.push(event);
  appendHistory(state, "cant-start", action.actorId, `Can't Start recorded: ${action.reason}. Execution remains Not Started.`, action.taskId);
  createEventObligations(state, action.taskId, "cant-start", event.id);
}

function recordStart(state: TrialState, action: Extract<TrialAction, { type: "start" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTaskUpdateAuthority(state, task.id, action.actorId);
  if (selectExecutionState(state, action.taskId) !== "Not Started") throw new Error("Start is available only for Not Started work.");
  if (state.now > task.plannedStart) requireNonBlank(action.lateCause, "Late-start cause");
  const event: ExecutionEvent = { id: nextId(state, "event"), taskId: action.taskId, actorId: action.actorId, type: "start", at: state.now, lateCause: action.lateCause?.trim(), actionStillNeeded: action.actionStillNeeded?.trim() };
  state.executionEvents.push(event);
  appendHistory(state, "start", action.actorId, `${task.name} started${state.now > task.plannedStart ? ` late: ${action.lateCause?.trim()}` : ""}.`, task.id);
  createEventObligations(state, task.id, "start", event.id);
}

function recordPause(state: TrialState, action: Extract<TrialAction, { type: "pause" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTaskUpdateAuthority(state, task.id, action.actorId);
  if (selectExecutionState(state, task.id) !== "In Progress") throw new Error("Pause is available only while work is In Progress.");
  requireNonBlank(action.reason, "Pause reason");
  requireNonBlank(action.whatIsNeeded, "What must happen");
  let problemId: string | undefined;
  let actionId: string | undefined;
  if (action.adverseDelay) problemId = createProblem(state, task.id, action.actorId, action.reason, action.whatIsNeeded, true);
  if (action.createAction) actionId = createActionRecord(state, task.id, action.actorId, action.whatIsNeeded, state.now + 45);
  const event: ExecutionEvent = { id: nextId(state, "event"), taskId: task.id, actorId: action.actorId, type: "pause", at: state.now, reason: action.reason, whatIsNeeded: action.whatIsNeeded, adverseDelay: action.adverseDelay, linkedProblemId: problemId, linkedActionId: actionId };
  state.executionEvents.push(event);
  state.pauseIntervals.push({ id: nextId(state, "pause"), taskId: task.id, startedByEventId: event.id, startedAt: state.now, reason: action.reason, adverseDelay: action.adverseDelay, problemId });
  appendHistory(state, "pause", action.actorId, `${task.name} paused: ${action.reason}. ${action.adverseDelay ? "Linked adverse delay recorded." : "Pause is not classified as an adverse delay."}`, task.id);
  createEventObligations(state, task.id, "pause", event.id);
}

function recordResume(state: TrialState, action: Extract<TrialAction, { type: "resume" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTaskUpdateAuthority(state, task.id, action.actorId);
  if (selectExecutionState(state, task.id) !== "Paused") throw new Error("Resume is available only while work is Paused.");
  const pause = state.pauseIntervals.filter((interval) => interval.taskId === task.id && interval.endedAt === undefined).sort((left, right) => right.startedAt - left.startedAt)[0];
  if (!pause) throw new Error("The active pause interval could not be found.");
  const linkedProblem = pause.problemId ? state.problems.find((problem) => problem.id === pause.problemId && problem.status === "open") : undefined;
  if (linkedProblem && action.issueResolution === "not-applicable") throw new Error("Choose whether the linked problem is resolved or remains open.");
  if (linkedProblem && action.issueResolution === "resolved") resolveProblem(state, linkedProblem.id, action.actorId);
  const event: ExecutionEvent = { id: nextId(state, "event"), taskId: task.id, actorId: action.actorId, type: "resume", at: state.now, linkedProblemId: linkedProblem?.id, resumeResolution: action.issueResolution };
  state.executionEvents.push(event);
  pause.endedAt = state.now;
  pause.endedByEventId = event.id;
  appendHistory(state, "resume", action.actorId, `${task.name} resumed. ${linkedProblem ? action.issueResolution === "resolved" ? "Linked problem resolved explicitly." : "Linked problem remains open." : "No linked problem."}`, task.id);
  createEventObligations(state, task.id, "resume", event.id);
}

function recordFinish(state: TrialState, action: Extract<TrialAction, { type: "finish" }>) {
  const task = requireExecutableTask(state, action.taskId);
  requireTaskUpdateAuthority(state, task.id, action.actorId);
  if (selectExecutionState(state, task.id) !== "In Progress") throw new Error("Finish is available only while work is In Progress.");
  const event: ExecutionEvent = { id: nextId(state, "event"), taskId: task.id, actorId: action.actorId, type: "finish", at: state.now };
  state.executionEvents.push(event);
  appendHistory(state, "finish", action.actorId, `${task.name} finished. Completion time was recorded automatically.`, task.id);
  createEventObligations(state, task.id, "finish", event.id);
}

function recordEndShiftProgress(state: TrialState, action: Extract<TrialAction, { type: "end-shift-progress" }>) {
  const need = state.shiftProgressNeeds.find((candidate) => candidate.id === action.needId);
  if (!need || need.satisfiedByObservationId) throw new Error("The end-of-shift progress need is not available.");
  if (need.userId !== action.actorId) throw new Error("Only the assigned Mobile user can satisfy this progress need.");
  if (!Number.isFinite(action.completionPercent) || action.completionPercent < 0 || action.completionPercent > 100) throw new Error("Completion must be between 0 and 100.");
  requireNonBlank(action.remainingWork, "What remains");
  const observationId = nextId(state, "progress");
  state.progressObservations.push({ id: observationId, taskId: need.taskId, actorId: action.actorId, at: state.now, completionPercent: action.completionPercent, remainingWork: action.remainingWork.trim(), nextShiftIssue: action.nextShiftIssue.trim(), noteEvidence: action.noteEvidence?.trim(), shiftBoundary: need.shiftBoundary });
  need.satisfiedByObservationId = observationId;
  appendHistory(state, "end-shift-progress", action.actorId, `End-of-shift field progress recorded at ${action.completionPercent}%; remaining work: ${action.remainingWork.trim()}.`, need.taskId);
}

function resolveProblem(state: TrialState, problemId: string, actorId: string) {
  const problem = state.problems.find((candidate) => candidate.id === problemId);
  if (!problem || problem.status !== "open") throw new Error("The problem is not open.");
  requireTaskUpdateAuthority(state, problem.taskId, actorId);
  problem.status = "resolved";
  problem.resolvedAt = state.now;
  problem.resolvedBy = actorId;
  appendHistory(state, "problem-resolved", actorId, `Problem resolved explicitly: ${problem.reason}.`, problem.taskId);
}

function completeAction(state: TrialState, actionId: string, actorId: string) {
  const record = state.actions.find((candidate) => candidate.id === actionId);
  if (!record || record.status !== "open") throw new Error("The action is not open.");
  requireTaskUpdateAuthority(state, record.taskId, actorId);
  record.status = "completed";
  record.completedAt = state.now;
  appendHistory(state, "action-completed", actorId, `Action completed: ${record.description}.`, record.taskId);
}

function configureCritical(state: TrialState, criticalItemId: string, actorId: string, input: CriticalPolicyInput) {
  requireTier(state, actorId, "Tier 1");
  requireCriticalItem(state, criticalItemId);
  validatePolicyInput(state, input);
  const previous = selectCurrentPolicy(state, criticalItemId);
  const policy: CriticalPolicyVersion = { id: nextId(state, "policy"), criticalItemId, version: previous.version + 1, effectiveAt: state.now, ownerUserId: input.ownerUserId, templateId: input.templateId, mechanisms: unique(input.mechanisms), intervalMinutes: input.intervalMinutes, fixedTimes: unique(input.fixedTimes).sort((a, b) => a - b), triggers: unique(input.triggers), requiredFields: unique(input.requiredFields), itemOverride: true };
  state.criticalPolicies.push(policy);
  const supersededCount = supersedeFuturePolicyObligations(state, criticalItemId, policy.id);
  appendHistory(state, "critical-configured", actorId, `Critical policy v${policy.version} created as an item-level override; earlier policy/report history remains unchanged${supersededCount > 0 ? ` and ${supersededCount} future unreported obligation${supersededCount === 1 ? " was" : "s were"} superseded` : ""}.`, undefined, criticalItemId);
  schedulePolicyObligations(state, requireCriticalItem(state, criticalItemId), policy);
}

function addCritical(state: TrialState, sourceTaskId: string, sourceType: "Project-critical leaf" | "Critical Work Pack", actorId: string, input: CriticalPolicyInput) {
  requireTier(state, actorId, "Tier 1");
  const source = requireTask(state, sourceTaskId);
  if (sourceType === "Project-critical leaf" && (source.summary || !source.projectCritical)) throw new Error("A selected Project-critical source must be a Project-critical executable leaf.");
  if (sourceType === "Critical Work Pack" && !source.summary) throw new Error("A Critical Work Pack source must be one summary task plus descendants.");
  validatePolicyInput(state, input);
  const item: CriticalItem = { id: nextId(state, "critical"), sourceType, sourceTaskId, createdAt: state.now, active: true };
  const policy: CriticalPolicyVersion = { id: nextId(state, "policy"), criticalItemId: item.id, version: 1, effectiveAt: state.now, ownerUserId: input.ownerUserId, templateId: input.templateId, mechanisms: unique(input.mechanisms), intervalMinutes: input.intervalMinutes, fixedTimes: unique(input.fixedTimes).sort((a, b) => a - b), triggers: unique(input.triggers), requiredFields: unique(input.requiredFields), itemOverride: true };
  state.criticalItems.push(item);
  state.criticalPolicies.push(policy);
  appendHistory(state, "critical-configured", actorId, `${source.name} selected as ${sourceType} with Policy v1.`, source.id, item.id);
  schedulePolicyObligations(state, item, policy);
}

function submitCriticalReport(state: TrialState, obligationId: string, actorId: string, values: Partial<Record<ReportingField, string>>) {
  const projection = selectCriticalObligationProjections(state).find((item) => item.obligation.id === obligationId);
  if (!projection) throw new Error("The reporting obligation is not available yet.");
  if (projection.owner.id !== actorId) throw new Error("Only the assigned Tier 2 reporting owner can submit this report.");
  if (projection.obligation.supersededByPolicyVersionId) throw new Error("The reporting obligation was superseded by a newer Critical policy version.");
  if (projection.obligation.satisfiedByEventIds.length > 0) throw new Error("Known structured task facts already satisfied this event-triggered reporting obligation.");
  if (projection.currentReport) throw new Error("The immutable report already exists; use a superseding correction.");
  for (const field of projection.requiredInputFields) requireNonBlank(values[field], `Critical report field ${field}`);
  const reportId = nextId(state, "report");
  state.criticalReports.push({ id: reportId, obligationId, criticalItemId: projection.item.id, policyVersionId: projection.policy.id, submittedAt: state.now, submittedBy: actorId, values: { ...projection.prepopulatedFacts, ...cleanValues(values) } });
  appendHistory(state, "report-submitted", actorId, `Critical report submitted for ${projection.sourceTask.name} under Policy v${projection.policy.version}.`, projection.sourceTask.id, projection.item.id, obligationId, reportId);
}

function correctCriticalReport(state: TrialState, reportId: string, actorId: string, values: Partial<Record<ReportingField, string>>) {
  const original = state.criticalReports.find((report) => report.id === reportId);
  if (!original) throw new Error("The report to correct was not found.");
  if (state.criticalReports.some((report) => report.supersedesReportId === reportId)) throw new Error("That report has already been superseded.");
  if (original.submittedBy !== actorId) throw new Error("Only the reporting owner can submit this trial correction.");
  const correctedId = nextId(state, "report");
  state.criticalReports.push({ ...original, id: correctedId, submittedAt: state.now, values: { ...original.values, ...cleanValues(values) }, supersedesReportId: original.id });
  const item = requireCriticalItem(state, original.criticalItemId);
  appendHistory(state, "report-corrected", actorId, `Critical report corrected by immutable supersession; report ${original.id} remains in history.`, item.sourceTaskId, item.id, original.obligationId, correctedId);
}

function processReportDueEvents(state: TrialState, previousMinute: number, targetMinute: number) {
  for (const obligation of state.criticalObligations) {
    const key = `report-due:${obligation.id}`;
    if (obligation.dueAt > previousMinute && obligation.dueAt <= targetMinute && !state.processedClockEvents.includes(key)) {
      state.processedClockEvents.push(key);
      const alreadyReported = state.criticalReports.some((report) => report.obligationId === obligation.id);
      if (alreadyReported || obligation.satisfiedByEventIds.length > 0 || obligation.supersededByPolicyVersionId) continue;
      const item = requireCriticalItem(state, obligation.criticalItemId);
      appendHistoryAt(state, "report-due", obligation.dueAt, TRIAL_SYSTEM_ACTOR_ID, `Critical report became due for ${requireTask(state, item.sourceTaskId).name}.`, item.sourceTaskId, item.id, obligation.id);
    }
  }
}

function processShiftBoundaries(state: TrialState, previousMinute: number, targetMinute: number) {
  for (const boundary of state.project.shiftBoundaryMinutes) {
    if (boundary <= previousMinute || boundary > targetMinute) continue;
    const key = `shift:${boundary}`;
    if (state.processedClockEvents.includes(key)) continue;
    state.processedClockEvents.push(key);
    const stateAtBoundary = { ...state, now: boundary };
    for (const task of state.tasks.filter((candidate) => !candidate.summary && candidate.plannedStart < boundary)) {
      if (selectExecutionState(stateAtBoundary, task.id) === "Completed") continue;
      const fieldUsers = state.fieldAssignments.filter((assignment) => assignment.taskId === task.id && assignment.active && assignment.assignedAt <= boundary).map((assignment) => assignment.tier3UserId);
      const users = fieldUsers.length > 0 ? fieldUsers : state.trackingAssignments.filter((assignment) => assignment.taskId === task.id && assignment.active && assignment.assignedAt <= boundary).map((assignment) => assignment.tier2UserId);
      for (const userId of unique(users)) {
        const id = nextId(state, "shift-need");
        state.shiftProgressNeeds.push({ id, taskId: task.id, userId, shiftBoundary: boundary, createdAt: boundary });
        appendHistoryAt(state, "end-shift-progress-due", boundary, TRIAL_SYSTEM_ACTOR_ID, `End-of-shift progress requested for unfinished work: ${task.name}.`, task.id);
      }
    }
  }
}

function processPlannedFinishTriggers(state: TrialState, previousMinute: number, targetMinute: number) {
  for (const task of state.tasks.filter((candidate) => !candidate.summary && candidate.plannedFinish > previousMinute && candidate.plannedFinish <= targetMinute)) {
    const key = `planned-finish:${task.id}:${task.plannedFinish}`;
    if (state.processedClockEvents.includes(key)) continue;
    state.processedClockEvents.push(key);
    const stateAtFinish = { ...state, now: task.plannedFinish };
    if (selectExecutionState(stateAtFinish, task.id) !== "Completed") createEventObligations(state, task.id, "planned-finish-exceeded", key, task.plannedFinish);
  }
}

function createEventObligations(state: TrialState, taskId: string, trigger: ReportingTrigger, triggerEventId: string, eventAt = state.now) {
  for (const item of selectCriticalItemsForTask({ ...state, now: eventAt }, taskId)) {
    const policy = selectCurrentPolicy({ ...state, now: eventAt }, item.id);
    if (!policy.mechanisms.includes("event") || !policy.triggers.includes(trigger)) continue;
    const key = `event-obligation:${item.id}:${triggerEventId}`;
    if (state.processedClockEvents.includes(key)) continue;
    state.processedClockEvents.push(key);
    const dueAt = eventAt + 15;
    const obligation: CriticalObligation = state.criticalObligations.find((candidate) => candidate.criticalItemId === item.id
      && candidate.policyVersionId === policy.id
      && candidate.dueAt === dueAt
      && candidate.supersededByPolicyVersionId === undefined
      && !state.criticalReports.some((report) => report.obligationId === candidate.id))
      ?? {
        id: nextId(state, "obligation"),
        criticalItemId: item.id,
        policyVersionId: policy.id,
        ownerUserId: policy.ownerUserId,
        createdAt: eventAt,
        dueAt,
        mechanism: "event" as const,
        mechanisms: ["event" as const],
        triggerEventIds: [],
        satisfiedByEventIds: []
      };
    if (!state.criticalObligations.includes(obligation)) state.criticalObligations.push(obligation);
    if (!obligation.mechanisms.includes("event")) obligation.mechanisms.push("event");
    if (!obligation.triggerEventIds.includes(triggerEventId)) obligation.triggerEventIds.push(triggerEventId);
    const projection = selectCriticalObligationProjections({ ...state, now: eventAt })
      .find((candidate) => candidate.obligation.id === obligation.id);
    const satisfied = policy.requiredFields.every((field) => projection?.prepopulatedFacts[field] !== undefined);
    if (satisfied && !obligation.satisfiedByEventIds.includes(triggerEventId)) obligation.satisfiedByEventIds.push(triggerEventId);
    appendHistoryAt(state, "report-obligation", eventAt, TRIAL_SYSTEM_ACTOR_ID, satisfied ? `Event-triggered reporting obligation for ${requireTask(state, item.sourceTaskId).name} was satisfied by known structured task facts.` : `Event-triggered Critical report requested for ${requireTask(state, item.sourceTaskId).name}.`, item.sourceTaskId, item.id, obligation.id);
  }
}

function schedulePolicyObligations(state: TrialState, item: CriticalItem, policy: CriticalPolicyVersion) {
  const candidates = new Map<number, Set<CriticalObligation["mechanism"]>>();
  const addCandidate = (dueAt: number, mechanism: CriticalObligation["mechanism"]) => {
    const mechanisms = candidates.get(dueAt) ?? new Set<CriticalObligation["mechanism"]>();
    mechanisms.add(mechanism);
    candidates.set(dueAt, mechanisms);
  };
  if (policy.mechanisms.includes("interval") && policy.intervalMinutes && policy.intervalMinutes > 0) {
    for (let dueAt = state.now + policy.intervalMinutes; dueAt <= TRIAL_DAY_END_MINUTE; dueAt += policy.intervalMinutes) addCandidate(dueAt, "interval");
  }
  if (policy.mechanisms.includes("fixed-time")) {
    const { start, end } = operationalDayWindow(state);
    const operationalStartMinute = modulo(start, 1440);
    for (const fixedTime of policy.fixedTimes) {
      const dueAt = start + modulo(fixedTime - operationalStartMinute, 1440);
      if (dueAt > state.now && dueAt < end && dueAt <= TRIAL_DAY_END_MINUTE) addCandidate(dueAt, "fixed-time");
    }
  }
  if (policy.mechanisms.includes("shift")) {
    for (const dueAt of state.project.shiftBoundaryMinutes) if (dueAt > state.now && dueAt <= TRIAL_DAY_END_MINUTE) addCandidate(dueAt, "shift");
  }
  for (const [dueAt, mechanismSet] of [...candidates.entries()].sort(([left], [right]) => left - right)) {
    const mechanisms = [...mechanismSet];
    const obligation: CriticalObligation = {
      id: nextId(state, "obligation"),
      criticalItemId: item.id,
      policyVersionId: policy.id,
      ownerUserId: policy.ownerUserId,
      createdAt: state.now,
      dueAt,
      mechanism: mechanisms[0],
      mechanisms,
      triggerEventIds: [],
      satisfiedByEventIds: []
    };
    state.criticalObligations.push(obligation);
  }
}

function supersedeFuturePolicyObligations(state: TrialState, criticalItemId: string, supersedingPolicyVersionId: string) {
  const reportedObligationIds = new Set(state.criticalReports.map((report) => report.obligationId));
  let supersededCount = 0;
  for (const obligation of state.criticalObligations) {
    if (
      obligation.criticalItemId !== criticalItemId
      || obligation.policyVersionId === supersedingPolicyVersionId
      || obligation.dueAt <= state.now
      || reportedObligationIds.has(obligation.id)
      || obligation.satisfiedByEventIds.length > 0
      || obligation.supersededByPolicyVersionId
    ) continue;
    obligation.supersededAt = state.now;
    obligation.supersededByPolicyVersionId = supersedingPolicyVersionId;
    supersededCount += 1;
  }
  return supersededCount;
}

function createProblem(state: TrialState, taskId: string, actorId: string, reason: string, whatIsNeeded: string, adverse: boolean) {
  const id = nextId(state, "problem");
  state.problems.push({ id, taskId, createdAt: state.now, createdBy: actorId, reason: reason.trim(), whatIsNeeded: whatIsNeeded.trim(), adverse, status: "open" });
  appendHistory(state, "problem-created", actorId, `Problem recorded: ${reason.trim()}.`, taskId);
  return id;
}

function createActionRecord(state: TrialState, taskId: string, actorId: string, description: string, dueAt: number) {
  const id = nextId(state, "action");
  state.actions.push({ id, taskId, createdAt: state.now, createdBy: actorId, description: description.trim(), ownerId: actorId, dueAt, status: "open" });
  appendHistory(state, "action-created", actorId, `Action recorded: ${description.trim()}.`, taskId);
  return id;
}

function validatePolicyInput(state: TrialState, input: CriticalPolicyInput) {
  requireTier(state, input.ownerUserId, "Tier 2");
  if (!state.criticalTemplates.some((template) => template.id === input.templateId)) throw new Error("Choose a supported Critical reporting template.");
  if (input.mechanisms.length === 0) throw new Error("Choose at least one supported reporting mechanism.");
  if (input.mechanisms.includes("none") && input.mechanisms.length > 1) throw new Error("No routine reporting cannot be combined with routine mechanisms.");
  if (input.mechanisms.includes("interval") && (!input.intervalMinutes || input.intervalMinutes < 15)) throw new Error("Fixed interval must be at least 15 minutes.");
  if (input.mechanisms.includes("fixed-time") && input.fixedTimes.length === 0) throw new Error("Choose at least one fixed reporting time.");
  if (input.mechanisms.includes("fixed-time") && input.fixedTimes.some((value) => !Number.isInteger(value) || value < 0 || value >= 1440)) throw new Error("Fixed reporting times must be whole wall-clock minutes from 00:00 to 23:59.");
  if (input.requiredFields.length === 0) throw new Error("Choose at least one supported report field.");
}

function appendHistory(state: TrialState, type: TrialHistoryEvent["type"], actorId: string, summary: string, taskId?: string, criticalItemId?: string, obligationId?: string, reportId?: string) {
  appendHistoryAt(state, type, state.now, actorId, summary, taskId, criticalItemId, obligationId, reportId);
}

function appendHistoryAt(state: TrialState, type: TrialHistoryEvent["type"], at: number, actorId: string, summary: string, taskId?: string, criticalItemId?: string, obligationId?: string, reportId?: string) {
  state.history.push({ id: nextId(state, "history"), type, at, actorId, summary, taskId, criticalItemId, obligationId, reportId });
}

function nextId(state: TrialState, prefix: string) {
  const id = `${prefix}-${state.nextSequence.toString().padStart(5, "0")}`;
  state.nextSequence += 1;
  return id;
}

function requireTask(state: TrialState, taskId: string) {
  const task = selectTask(state, taskId);
  if (!task) throw new Error(`Unknown trial task ${taskId}.`);
  return task;
}

function requireExecutableTask(state: TrialState, taskId: string) {
  const task = requireTask(state, taskId);
  if (task.summary) throw new Error("Execution actions apply to executable leaf tasks.");
  return task;
}

function requireUser(state: TrialState, userId: string) {
  const user = selectUser(state, userId);
  if (!user) throw new Error(`Unknown trial user ${userId}.`);
  return user;
}

function requireTier(state: TrialState, userId: string, tier: "Tier 1" | "Tier 2" | "Tier 3") {
  const user = requireUser(state, userId);
  if (user.tier !== tier) throw new Error(`${user.name} is not ${tier}.`);
  return user;
}

function requireTaskUpdateAuthority(state: TrialState, taskId: string, actorId: string) {
  const actor = requireUser(state, actorId);
  if (actor.tier === "Tier 1") return actor;
  if (actor.tier === "Tier 2") {
    const tracksTask = state.trackingAssignments.some((assignment) => assignment.taskId === taskId
      && assignment.tier2UserId === actorId
      && assignment.active
      && assignment.assignedAt <= state.now);
    if (tracksTask) return actor;
  }
  if (actor.tier === "Tier 3") {
    const hasFieldAssignment = state.fieldAssignments.some((assignment) => assignment.taskId === taskId
      && assignment.tier3UserId === actorId
      && assignment.active
      && assignment.assignedAt <= state.now);
    if (hasFieldAssignment) return actor;
  }
  throw new Error(`${actor.name} does not have task-update authority for this assigned work.`);
}

function requireCriticalItem(state: TrialState, itemId: string) {
  const item = state.criticalItems.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`Unknown Critical item ${itemId}.`);
  return item;
}

function requireNonBlank(value: string | undefined, field: string) {
  if (!value?.trim()) throw new Error(`${field} is required.`);
}

function cleanValues(values: Partial<Record<ReportingField, string>>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value?.trim()).map(([key, value]) => [key, value?.trim()])) as Partial<Record<ReportingField, string>>;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
