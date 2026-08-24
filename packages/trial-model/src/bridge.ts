import { TRIAL_SCENARIO_VERSION } from "./scenario";
import type { CriticalPolicyInput, TrialAction, TrialState } from "./types";

export const TRIAL_BRIDGE_CHANNEL = "shutdown-tracker-deterministic-trial-v1";
export const TRIAL_BRIDGE_REQUEST_TIMEOUT_MS = 2_000;
export const TRIAL_BRIDGE_HEARTBEAT_INTERVAL_MS = 1_000;
export const TRIAL_BRIDGE_TARGET_CHECK_INTERVAL_MS = 500;

export type TrialBridgeSessionId = string;
export type TrialBridgeRequestId = string;

type TrialBridgeEnvelope = {
  channel: typeof TRIAL_BRIDGE_CHANNEL;
  sessionId: TrialBridgeSessionId;
  requestId: TrialBridgeRequestId;
};

export type TrialBridgeMobileReadyMessage = TrialBridgeEnvelope & {
  kind: "mobile-ready";
};

export type TrialBridgeActionMessage = TrialBridgeEnvelope & {
  kind: "action";
  action: TrialAction;
};

export type TrialBridgeStateMessage = TrialBridgeEnvelope & {
  kind: "state";
  state: TrialState;
  responseToRequestId?: TrialBridgeRequestId;
};

export type TrialBridgeActionResultMessage = TrialBridgeEnvelope & {
  kind: "action-result";
  accepted: boolean;
  state: TrialState;
  error?: string;
};

export type TrialBridgeHeartbeatMessage = TrialBridgeEnvelope & {
  kind: "heartbeat";
};

export type TrialBridgeHeartbeatResultMessage = TrialBridgeEnvelope & {
  kind: "heartbeat-result";
};

export type TrialBridgeMessage =
  | TrialBridgeMobileReadyMessage
  | TrialBridgeActionMessage
  | TrialBridgeStateMessage
  | TrialBridgeActionResultMessage
  | TrialBridgeHeartbeatMessage
  | TrialBridgeHeartbeatResultMessage;

export function trialMobileReadyMessage(
  sessionId: TrialBridgeSessionId,
  requestId: TrialBridgeRequestId
): TrialBridgeMobileReadyMessage {
  return { channel: TRIAL_BRIDGE_CHANNEL, kind: "mobile-ready", sessionId, requestId };
}

export function trialActionMessage(
  sessionId: TrialBridgeSessionId,
  requestId: TrialBridgeRequestId,
  action: TrialAction
): TrialBridgeActionMessage {
  return { channel: TRIAL_BRIDGE_CHANNEL, kind: "action", sessionId, requestId, action };
}

export function trialStateMessage(
  sessionId: TrialBridgeSessionId,
  requestId: TrialBridgeRequestId,
  state: TrialState,
  responseToRequestId?: TrialBridgeRequestId
): TrialBridgeStateMessage {
  return responseToRequestId
    ? { channel: TRIAL_BRIDGE_CHANNEL, kind: "state", sessionId, requestId, state, responseToRequestId }
    : { channel: TRIAL_BRIDGE_CHANNEL, kind: "state", sessionId, requestId, state };
}

export function trialActionResultMessage(
  sessionId: TrialBridgeSessionId,
  requestId: TrialBridgeRequestId,
  accepted: boolean,
  state: TrialState,
  error?: string
): TrialBridgeActionResultMessage {
  return error
    ? { channel: TRIAL_BRIDGE_CHANNEL, kind: "action-result", sessionId, requestId, accepted, state, error }
    : { channel: TRIAL_BRIDGE_CHANNEL, kind: "action-result", sessionId, requestId, accepted, state };
}

export function trialHeartbeatMessage(
  sessionId: TrialBridgeSessionId,
  requestId: TrialBridgeRequestId
): TrialBridgeHeartbeatMessage {
  return { channel: TRIAL_BRIDGE_CHANNEL, kind: "heartbeat", sessionId, requestId };
}

export function trialHeartbeatResultMessage(
  sessionId: TrialBridgeSessionId,
  requestId: TrialBridgeRequestId
): TrialBridgeHeartbeatResultMessage {
  return { channel: TRIAL_BRIDGE_CHANNEL, kind: "heartbeat-result", sessionId, requestId };
}

export function isTrialBridgeMessage(value: unknown): value is TrialBridgeMessage {
  if (
    !isRecord(value)
    || value.channel !== TRIAL_BRIDGE_CHANNEL
    || typeof value.kind !== "string"
    || !isIdentifier(value.sessionId)
    || !isIdentifier(value.requestId)
  ) return false;

  if (value.kind === "mobile-ready" || value.kind === "heartbeat" || value.kind === "heartbeat-result") return true;
  if (value.kind === "action") return isTrialAction(value.action);
  if (value.kind === "state") {
    return isTrialState(value.state)
      && (value.responseToRequestId === undefined || isIdentifier(value.responseToRequestId));
  }
  if (value.kind === "action-result") {
    return typeof value.accepted === "boolean"
      && isTrialState(value.state)
      && (value.error === undefined || typeof value.error === "string");
  }
  return false;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 160;
}

function isTrialAction(value: unknown): value is TrialAction {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "advance-minutes":
      return isInteger(value.minutes);
    case "advance-to":
      return isInteger(value.minute);
    case "reset":
      return true;
    case "assign-tier2":
      return hasIdentifiers(value, "taskId", "tier2UserId", "actorId");
    case "assign-tier3":
      return hasIdentifiers(value, "taskId", "tier2UserId", "tier3UserId")
        && TIER_3_RELATIONSHIPS.has(value.relationship);
    case "cant-start":
      return hasIdentifiers(value, "taskId", "actorId")
        && isString(value.reason)
        && isString(value.whatIsNeeded)
        && typeof value.createProblem === "boolean"
        && typeof value.createAction === "boolean";
    case "start":
      return hasIdentifiers(value, "taskId", "actorId")
        && isOptionalString(value.lateCause)
        && isOptionalString(value.actionStillNeeded);
    case "pause":
      return hasIdentifiers(value, "taskId", "actorId")
        && isString(value.reason)
        && typeof value.adverseDelay === "boolean"
        && isString(value.whatIsNeeded)
        && typeof value.createAction === "boolean";
    case "resume":
      return hasIdentifiers(value, "taskId", "actorId")
        && RESUME_RESOLUTIONS.has(value.issueResolution);
    case "finish":
      return hasIdentifiers(value, "taskId", "actorId");
    case "end-shift-progress":
      return hasIdentifiers(value, "needId", "actorId")
        && isFiniteNumber(value.completionPercent)
        && value.completionPercent >= 0
        && value.completionPercent <= 100
        && isString(value.remainingWork)
        && isString(value.nextShiftIssue)
        && isOptionalString(value.noteEvidence);
    case "resolve-problem":
      return hasIdentifiers(value, "problemId", "actorId");
    case "complete-action":
      return hasIdentifiers(value, "actionId", "actorId");
    case "configure-critical":
      return hasIdentifiers(value, "criticalItemId", "actorId")
        && isCriticalPolicyInput(value.policy);
    case "add-critical":
      return hasIdentifiers(value, "sourceTaskId", "actorId")
        && CRITICAL_SOURCE_TYPES.has(value.sourceType)
        && isCriticalPolicyInput(value.policy);
    case "submit-critical-report":
      return hasIdentifiers(value, "obligationId", "actorId")
        && isReportingValues(value.values);
    case "correct-critical-report":
      return hasIdentifiers(value, "reportId", "actorId")
        && isReportingValues(value.values);
    default:
      return false;
  }
}

function isTrialState(value: unknown): value is TrialState {
  if (
    !isRecord(value)
    || value.scenarioVersion !== TRIAL_SCENARIO_VERSION
    || !isInteger(value.now)
    || !isInteger(value.nextSequence)
  ) return false;
  return isTrialProject(value.project)
    && isArrayOf(value.users, isTrialUser)
    && isArrayOf(value.tasks, isTrialTask)
    && isArrayOf(value.trackingAssignments, isTrackingAssignment)
    && isArrayOf(value.fieldAssignments, isFieldAssignment)
    && isArrayOf(value.executionEvents, isExecutionEvent)
    && isArrayOf(value.pauseIntervals, isPauseInterval)
    && isArrayOf(value.progressObservations, isProgressObservation)
    && isArrayOf(value.problems, isTrialProblem)
    && isArrayOf(value.actions, isTrialActionRecord)
    && isArrayOf(value.criticalTemplates, isCriticalTemplate)
    && isArrayOf(value.criticalItems, isCriticalItem)
    && isArrayOf(value.criticalPolicies, isCriticalPolicyVersion)
    && isArrayOf(value.criticalObligations, isCriticalObligation)
    && isArrayOf(value.criticalReports, isCriticalReport)
    && isArrayOf(value.shiftProgressNeeds, isShiftProgressNeed)
    && isArrayOf(value.history, isTrialHistoryEvent)
    && isArrayOf(value.processedClockEvents, isString);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayOf(value: unknown, predicate: (entry: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(predicate);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isOptionalInteger(value: unknown): value is number | undefined {
  return value === undefined || isInteger(value);
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function hasIdentifiers(value: Record<string, unknown>, ...fields: string[]): boolean {
  return fields.every((field) => isIdentifier(value[field]));
}

function isTrialProject(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id")
    && isString(value.name)
    && isString(value.code)
    && isString(value.site)
    && isString(value.timezone)
    && isInteger(value.operationalDayStartMinute)
    && isArrayOf(value.shiftBoundaryMinutes, isInteger)
    && isString(value.importedSnapshot);
}

function isTrialUser(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id")
    && isString(value.name)
    && TRIAL_USER_TIERS.has(value.tier)
    && (value.directReportTo === undefined || isIdentifier(value.directReportTo));
}

function isTrialTask(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id")
    && (value.parentId === null || isIdentifier(value.parentId))
    && isString(value.name)
    && isString(value.wbs)
    && isString(value.workPackage)
    && typeof value.summary === "boolean"
    && isInteger(value.depth)
    && isInteger(value.plannedStart)
    && isInteger(value.plannedFinish)
    && isOptionalInteger(value.importedActualStart)
    && isOptionalInteger(value.importedActualFinish)
    && isFiniteNumber(value.importedProgress)
    && typeof value.projectCritical === "boolean"
    && isOptionalString(value.evidenceRequirement);
}

function isTrackingAssignment(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "tier2UserId")
    && isInteger(value.assignedAt)
    && typeof value.active === "boolean";
}

function isFieldAssignment(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "tier2UserId", "tier3UserId")
    && TIER_3_RELATIONSHIPS.has(value.relationship)
    && isInteger(value.assignedAt)
    && typeof value.active === "boolean";
}

function isExecutionEvent(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "actorId")
    && EXECUTION_EVENT_TYPES.has(value.type)
    && isInteger(value.at)
    && isOptionalString(value.reason)
    && isOptionalString(value.whatIsNeeded)
    && isOptionalString(value.lateCause)
    && isOptionalString(value.actionStillNeeded)
    && isOptionalBoolean(value.adverseDelay)
    && (value.linkedProblemId === undefined || isIdentifier(value.linkedProblemId))
    && (value.linkedActionId === undefined || isIdentifier(value.linkedActionId))
    && (value.resumeResolution === undefined || RESUME_RESOLUTIONS.has(value.resumeResolution))
    && isOptionalBoolean(value.baseline);
}

function isPauseInterval(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "startedByEventId")
    && isInteger(value.startedAt)
    && (value.endedByEventId === undefined || isIdentifier(value.endedByEventId))
    && isOptionalInteger(value.endedAt)
    && isString(value.reason)
    && typeof value.adverseDelay === "boolean"
    && (value.problemId === undefined || isIdentifier(value.problemId));
}

function isProgressObservation(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "actorId")
    && isInteger(value.at)
    && isFiniteNumber(value.completionPercent)
    && value.completionPercent >= 0
    && value.completionPercent <= 100
    && isString(value.remainingWork)
    && isString(value.nextShiftIssue)
    && isOptionalString(value.noteEvidence)
    && isOptionalInteger(value.shiftBoundary);
}

function isTrialProblem(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "createdBy")
    && isInteger(value.createdAt)
    && isString(value.reason)
    && isString(value.whatIsNeeded)
    && typeof value.adverse === "boolean"
    && PROBLEM_STATUSES.has(value.status)
    && isOptionalInteger(value.resolvedAt)
    && (value.resolvedBy === undefined || isIdentifier(value.resolvedBy));
}

function isTrialActionRecord(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "createdBy")
    && isInteger(value.createdAt)
    && isString(value.description)
    && (value.ownerId === undefined || isIdentifier(value.ownerId))
    && isOptionalInteger(value.dueAt)
    && ACTION_STATUSES.has(value.status)
    && isOptionalInteger(value.completedAt);
}

function isCriticalPolicyInput(value: unknown): value is CriticalPolicyInput {
  return isRecord(value)
    && hasIdentifiers(value, "ownerUserId", "templateId")
    && isArrayOf(value.mechanisms, isReportingMechanism)
    && isOptionalInteger(value.intervalMinutes)
    && isArrayOf(value.fixedTimes, isInteger)
    && isArrayOf(value.triggers, isReportingTrigger)
    && isArrayOf(value.requiredFields, isReportingField);
}

function isCriticalTemplate(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id")
    && isString(value.name)
    && isArrayOf(value.mechanisms, isReportingMechanism)
    && isOptionalInteger(value.intervalMinutes)
    && (value.fixedTimes === undefined || isArrayOf(value.fixedTimes, isInteger))
    && isArrayOf(value.triggers, isReportingTrigger)
    && isArrayOf(value.requiredFields, isReportingField);
}

function isCriticalItem(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "sourceTaskId")
    && CRITICAL_SOURCE_TYPES.has(value.sourceType)
    && isInteger(value.createdAt)
    && typeof value.active === "boolean";
}

function isCriticalPolicyVersion(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "criticalItemId", "ownerUserId", "templateId")
    && isInteger(value.version)
    && isInteger(value.effectiveAt)
    && isArrayOf(value.mechanisms, isReportingMechanism)
    && isOptionalInteger(value.intervalMinutes)
    && isArrayOf(value.fixedTimes, isInteger)
    && isArrayOf(value.triggers, isReportingTrigger)
    && isArrayOf(value.requiredFields, isReportingField)
    && typeof value.itemOverride === "boolean";
}

function isCriticalObligation(value: unknown): boolean {
  if (!isRecord(value)
    || !hasIdentifiers(value, "id", "criticalItemId", "policyVersionId", "ownerUserId")
    || !isInteger(value.createdAt)
    || !isInteger(value.dueAt)
    || !REPORTING_OBLIGATION_MECHANISMS.has(value.mechanism)
    || !isArrayOf(value.mechanisms, isReportingObligationMechanism)
    || value.mechanisms.length === 0
    || !value.mechanisms.includes(value.mechanism)
    || (value.triggerEventId !== undefined && !isIdentifier(value.triggerEventId))
    || !isOptionalString(value.requestedReason)
    || (value.satisfiedByEventId !== undefined && !isIdentifier(value.satisfiedByEventId))
    || !isOptionalInteger(value.supersededAt)
    || (value.supersededByPolicyVersionId !== undefined && !isIdentifier(value.supersededByPolicyVersionId))
  ) return false;
  return (value.supersededAt === undefined) === (value.supersededByPolicyVersionId === undefined);
}

function isCriticalReport(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "obligationId", "criticalItemId", "policyVersionId", "submittedBy")
    && isInteger(value.submittedAt)
    && isReportingValues(value.values)
    && (value.supersedesReportId === undefined || isIdentifier(value.supersedesReportId));
}

function isShiftProgressNeed(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "taskId", "userId")
    && isInteger(value.shiftBoundary)
    && isInteger(value.createdAt)
    && (value.satisfiedByObservationId === undefined || isIdentifier(value.satisfiedByObservationId));
}

function isTrialHistoryEvent(value: unknown): boolean {
  return isRecord(value)
    && hasIdentifiers(value, "id", "actorId")
    && TRIAL_HISTORY_TYPES.has(value.type)
    && isInteger(value.at)
    && isString(value.summary)
    && (value.taskId === undefined || isIdentifier(value.taskId))
    && (value.criticalItemId === undefined || isIdentifier(value.criticalItemId))
    && (value.obligationId === undefined || isIdentifier(value.obligationId))
    && (value.reportId === undefined || isIdentifier(value.reportId))
    && isOptionalBoolean(value.baseline);
}

function isReportingValues(value: unknown): boolean {
  return isRecord(value)
    && Object.entries(value).every(([field, entry]) => REPORTING_FIELDS.has(field) && isString(entry));
}

function isReportingMechanism(value: unknown): boolean {
  return REPORTING_MECHANISMS.has(value);
}

function isReportingObligationMechanism(value: unknown): boolean {
  return REPORTING_OBLIGATION_MECHANISMS.has(value);
}

function isReportingTrigger(value: unknown): boolean {
  return REPORTING_TRIGGERS.has(value);
}

function isReportingField(value: unknown): boolean {
  return REPORTING_FIELDS.has(value);
}

const TRIAL_USER_TIERS = new Set<unknown>(["Tier 1", "Tier 2", "Tier 3"]);
const TIER_3_RELATIONSHIPS = new Set<unknown>(["WORKING_ON", "FIELD_CONTROL"]);
const EXECUTION_EVENT_TYPES = new Set<unknown>(["cant-start", "start", "pause", "resume", "finish"]);
const RESUME_RESOLUTIONS = new Set<unknown>(["resolved", "remains-open", "not-applicable"]);
const CRITICAL_SOURCE_TYPES = new Set<unknown>(["Project-critical leaf", "Critical Work Pack"]);
const REPORTING_MECHANISMS = new Set<unknown>(["none", "requested", "interval", "fixed-time", "shift", "event"]);
const REPORTING_OBLIGATION_MECHANISMS = new Set<unknown>(["requested", "interval", "fixed-time", "shift", "event"]);
const REPORTING_TRIGGERS = new Set<unknown>(["cant-start", "start", "pause", "resume", "finish", "planned-finish-exceeded", "condition-change"]);
const REPORTING_FIELDS = new Set<unknown>(["progress", "condition", "focus", "constraint", "recovery", "next-target", "forecast-completion", "resources", "evidence", "update-text"]);
const PROBLEM_STATUSES = new Set<unknown>(["open", "resolved"]);
const ACTION_STATUSES = new Set<unknown>(["open", "completed"]);
const TRIAL_HISTORY_TYPES = new Set<unknown>([
  "import-activated",
  "assignment-tier2",
  "assignment-tier3",
  "cant-start",
  "start",
  "pause",
  "resume",
  "finish",
  "end-shift-progress-due",
  "end-shift-progress",
  "problem-created",
  "problem-resolved",
  "action-created",
  "action-completed",
  "critical-configured",
  "report-obligation",
  "report-due",
  "report-submitted",
  "report-corrected"
]);
