import {
  applyTrialAction,
  selectExecutionState,
  type TrialAction,
  type TrialHistoryEvent,
  type TrialState,
  type TrialTask
} from "@shutdown-tracker/trial-model";
import type {
  ProjectXmlPreview,
  ProjectXmlTaskPreview
} from "./projectXmlPreview";

export const TIER1_ROUNDTRIP_ACTOR_ID = "tier1-roundtrip-operator";
export const TIER1_ROUNDTRIP_MODEL_VERSION = "tier1-project-roundtrip-trial-v1";

export type Tier1RoundTripLocationClock = {
  minute: number;
  timeZone: string;
};

export type ExperimentalProjectField =
  | "ActualStart"
  | "ActualFinish"
  | "PercentComplete"
  | "PhysicalPercentComplete";

export type RoundTripSourceTaskIdentity = {
  trialTaskId: string;
  projectTaskUid: string;
  projectTaskId: string | null;
  name: string;
  wbs: string | null;
  outlineNumber: string | null;
  outlineLevel: number;
  summary: boolean;
  critical: boolean;
  sourceValues: {
    start: string | null;
    finish: string | null;
    actualStart: string | null;
    actualFinish: string | null;
    percentComplete: number | null;
    physicalPercentComplete: number | null;
  };
};

export type RoundTripMappingSelection = {
  id: string;
  trackerFactId: string;
  trialTaskId: string;
  projectTaskUid: string;
  trackerFact: "start" | "finish" | "progress";
  projectField: ExperimentalProjectField | null;
  sourceValue: string | number | null;
  proposedValue: string | number;
  included: boolean;
};

export type RoundTripCandidatePlaceholder = {
  xml: string;
  sourceHash: string | null;
  candidateHash: string | null;
};

export type RoundTripResultPlaceholder = {
  fileName: string;
  xml: string;
  hash: string | null;
};

export type RoundTripDisposition =
  | "Works as expected"
  | "Mapping needs revision"
  | "Candidate generation problem"
  | "Project compatibility problem"
  | "Unexplained differences"
  | "Not suitable";

export type Tier1RoundTripSessionHistoryEvent = {
  id: string;
  at: number;
  type: "source-loaded" | "execution" | "progress-observation" | "record-management";
  summary: string;
  taskId?: string;
};

export type Tier1RoundTripSession = {
  source: {
    fileName: string;
    xml: string;
    bytes: Uint8Array;
    hash: string | null;
    preview: ProjectXmlPreview;
  };
  initialTimeSource: "Current device time";
  locationTimeZone: string;
  initialTrialState: TrialState;
  trialState: TrialState;
  sourceTasks: RoundTripSourceTaskIdentity[];
  mappings: RoundTripMappingSelection[];
  candidate: RoundTripCandidatePlaceholder | null;
  result: RoundTripResultPlaceholder | null;
  disposition: { value: RoundTripDisposition; notes: string } | null;
  history: Tier1RoundTripSessionHistoryEvent[];
};

export type CreateTier1RoundTripSessionInput = {
  fileName: string;
  sourceXml: string;
  sourceBytes?: Uint8Array;
  preview: ProjectXmlPreview;
  sourceHash?: string | null;
  clock?: Tier1RoundTripLocationClock;
};

export type Tier1RoundTripExecutionAction = Extract<
  TrialAction,
  { type: "cant-start" | "start" | "pause" | "resume" | "finish" }
>;

export type Tier1RoundTripRecordAction = Extract<
  TrialAction,
  { type: "resolve-problem" | "complete-action" }
>;

export type Tier1ProgressObservationInput = {
  taskId: string;
  completionPercent: number;
  remainingWork: string;
  nextIssue?: string;
  note?: string;
};

type PreviewTaskWithCritical = ProjectXmlTaskPreview & { critical?: boolean };

export function createTier1RoundTripSession(input: CreateTier1RoundTripSessionInput): Tier1RoundTripSession {
  if (!input.fileName.trim()) throw new Error("The source filename is required.");
  if (!input.sourceXml) throw new Error("The exact source XML is required.");
  const sourceBytes = input.sourceBytes
    ? Uint8Array.from(input.sourceBytes)
    : new TextEncoder().encode(input.sourceXml);
  let decodedSource: string;
  try {
    decodedSource = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(sourceBytes);
  } catch {
    throw new Error("The retained Project source bytes are not valid UTF-8.");
  }
  if (decodedSource !== input.sourceXml) {
    throw new Error("The retained Project source bytes do not match the inspected XML text.");
  }

  const suppliedClock = input.clock ?? readTier1RoundTripLocationClock();
  assertRoundTripMinute(suppliedClock.minute, "Current location time");
  const clock = { ...suppliedClock, timeZone: requireSupportedTimeZone(suppliedClock.timeZone) };
  const adapted = adaptImportedProjectToTrialState(input.fileName, input.preview, clock);
  const sourcePreview = structuredClone(input.preview);
  const baselineHistory: Tier1RoundTripSessionHistoryEvent[] = [{
    id: "roundtrip-session-1",
    at: adapted.state.now,
    type: "source-loaded",
    summary: `Temporary browser-memory trial created from ${input.fileName.trim()}.`
  }];

  return {
    source: {
      fileName: input.fileName.trim(),
      xml: input.sourceXml,
      bytes: sourceBytes,
      hash: input.sourceHash ?? null,
      preview: sourcePreview
    },
    initialTimeSource: adapted.initialTimeSource,
    locationTimeZone: clock.timeZone,
    initialTrialState: structuredClone(adapted.state),
    trialState: structuredClone(adapted.state),
    sourceTasks: adapted.sourceTasks,
    mappings: [],
    candidate: null,
    result: null,
    disposition: null,
    history: baselineHistory
  };
}

export function applyTier1RoundTripExecutionAction(
  session: Tier1RoundTripSession,
  action: Tier1RoundTripExecutionAction,
  at = readTier1RoundTripLocationClock(new Date(), session.locationTimeZone).minute
): Tier1RoundTripSession {
  if (action.actorId !== TIER1_ROUNDTRIP_ACTOR_ID) {
    throw new Error("Round-trip execution actions must use the browser-local Tier 1 trial identity.");
  }

  const currentSession = setRoundTripEventTime(session, at);
  const nextState = applyTrialAction(currentSession.trialState, action);
  const task = requiredTask(nextState, action.taskId);
  return invalidateDerivedExportState({
    ...currentSession,
    trialState: nextState,
    history: appendSessionHistory(currentSession, {
      at: nextState.now,
      type: "execution",
      summary: `${executionActionLabel(action.type)} recorded for ${task.name}.`,
      taskId: task.id
    })
  });
}

export function applyTier1RoundTripRecordAction(
  session: Tier1RoundTripSession,
  action: Tier1RoundTripRecordAction,
  at = readTier1RoundTripLocationClock(new Date(), session.locationTimeZone).minute
): Tier1RoundTripSession {
  if (action.actorId !== TIER1_ROUNDTRIP_ACTOR_ID) {
    throw new Error("Round-trip record actions must use the browser-local Tier 1 trial identity.");
  }
  const currentSession = setRoundTripEventTime(session, at);
  const record = action.type === "resolve-problem"
    ? currentSession.trialState.problems.find((problem) => problem.id === action.problemId)
    : currentSession.trialState.actions.find((item) => item.id === action.actionId);
  const nextState = applyTrialAction(currentSession.trialState, action);
  const task = record ? requiredTask(nextState, record.taskId) : null;
  return invalidateDerivedExportState({
    ...currentSession,
    trialState: nextState,
    history: appendSessionHistory(currentSession, {
      at: nextState.now,
      type: "record-management",
      summary: `${action.type === "resolve-problem" ? "Problem resolved" : "Action completed"}${task ? ` for ${task.name}` : ""}.`,
      ...(task ? { taskId: task.id } : {})
    })
  });
}

export function recordTier1RoundTripProgress(
  session: Tier1RoundTripSession,
  input: Tier1ProgressObservationInput,
  at = readTier1RoundTripLocationClock(new Date(), session.locationTimeZone).minute
): Tier1RoundTripSession {
  const currentSession = setRoundTripEventTime(session, at);
  const nextState = structuredClone(currentSession.trialState);
  const task = requiredTask(nextState, input.taskId);
  if (task.summary) throw new Error("Progress observations apply to executable leaf tasks.");
  if (selectExecutionState(nextState, task.id) === "Completed") {
    throw new Error("Completed tasks cannot receive an unfinished-progress observation in this trial.");
  }
  if (!Number.isFinite(input.completionPercent)
    || input.completionPercent < 0
    || input.completionPercent > 100) {
    throw new Error("Completion must be between 0 and 100.");
  }
  if (!input.remainingWork.trim()) throw new Error("What remains is required.");
  if (!input.nextIssue?.trim()) throw new Error("Next issue is required; enter None if there is no next issue.");

  const observationId = nextStateId(nextState, "progress");
  nextState.progressObservations.push({
    id: observationId,
    taskId: task.id,
    actorId: TIER1_ROUNDTRIP_ACTOR_ID,
    at: nextState.now,
    completionPercent: input.completionPercent,
    remainingWork: input.remainingWork.trim(),
    nextShiftIssue: input.nextIssue.trim(),
    noteEvidence: input.note?.trim() || undefined
  });

  return invalidateDerivedExportState({
    ...currentSession,
    trialState: nextState,
    history: appendSessionHistory(currentSession, {
      at: nextState.now,
      type: "progress-observation",
      summary: `Tier 1 recorded ${input.completionPercent}% Tracker field progress for ${task.name}.`,
      taskId: task.id
    })
  });
}

export function resetTier1RoundTripSession(
  session: Tier1RoundTripSession,
  at = readTier1RoundTripLocationClock(new Date(), session.locationTimeZone).minute
): Tier1RoundTripSession {
  assertRoundTripMinute(at, "Current location time");
  const initialTrialState = structuredClone(session.initialTrialState);
  initialTrialState.now = at;
  initialTrialState.history = initialTrialState.history.map((event) => event.baseline ? { ...event, at } : event);
  return {
    ...session,
    source: {
      ...session.source,
      bytes: Uint8Array.from(session.source.bytes),
      preview: structuredClone(session.source.preview)
    },
    initialTrialState: structuredClone(initialTrialState),
    trialState: structuredClone(initialTrialState),
    sourceTasks: structuredClone(session.sourceTasks),
    mappings: [],
    candidate: null,
    result: null,
    disposition: null,
    history: [{
      id: "roundtrip-session-1",
      at,
      type: "source-loaded",
      summary: `Temporary browser-memory trial created from ${session.source.fileName}.`
    }]
  };
}

export function deriveTier1RoundTripMappingProposals(
  session: Tier1RoundTripSession
): RoundTripMappingSelection[] {
  const proposals: RoundTripMappingSelection[] = [];
  for (const event of session.trialState.executionEvents) {
    if (event.type !== "start" && event.type !== "finish") continue;
    const identity = session.sourceTasks.find((task) => task.trialTaskId === event.taskId);
    if (!identity) continue;
    proposals.push({
      id: `mapping-${event.id}`,
      trackerFactId: event.id,
      trialTaskId: event.taskId,
      projectTaskUid: identity.projectTaskUid,
      trackerFact: event.type,
      projectField: event.type === "start" ? "ActualStart" : "ActualFinish",
      sourceValue: event.type === "start" ? identity.sourceValues.actualStart : identity.sourceValues.actualFinish,
      proposedValue: formatRoundTripMinute(event.at),
      included: false
    });
  }
  for (const observation of session.trialState.progressObservations) {
    const identity = session.sourceTasks.find((task) => task.trialTaskId === observation.taskId);
    if (!identity) continue;
    proposals.push({
      id: `mapping-${observation.id}`,
      trackerFactId: observation.id,
      trialTaskId: observation.taskId,
      projectTaskUid: identity.projectTaskUid,
      trackerFact: "progress",
      projectField: null,
      sourceValue: null,
      proposedValue: observation.completionPercent,
      included: false
    });
  }
  return proposals;
}

export function mergeTier1RoundTripMappingSelections(
  proposals: RoundTripMappingSelection[],
  selections: RoundTripMappingSelection[]
) {
  const byId = new Map(selections.map((selection) => [selection.id, selection]));
  return proposals.map((proposal) => ({ ...proposal, ...byId.get(proposal.id) }));
}

export function updateTier1RoundTripMappingSelection(
  session: Tier1RoundTripSession,
  mappings: RoundTripMappingSelection[],
  id: string,
  patch: Partial<RoundTripMappingSelection>
) {
  let found = false;
  const nextMappings = mappings.map((mapping) => {
    if (mapping.id !== id) return mapping;
    found = true;
    const next = { ...mapping, ...patch };
    const identity = session.sourceTasks.find((task) => task.trialTaskId === mapping.trialTaskId);
    if (!identity) throw new Error(`Unknown imported trial task ${mapping.trialTaskId}.`);
    if (Object.hasOwn(patch, "projectField")) {
      next.included = false;
      if (next.projectField === "PercentComplete") next.sourceValue = identity.sourceValues.percentComplete;
      else if (next.projectField === "PhysicalPercentComplete") next.sourceValue = identity.sourceValues.physicalPercentComplete;
      else if (next.projectField === "ActualStart") next.sourceValue = identity.sourceValues.actualStart;
      else if (next.projectField === "ActualFinish") next.sourceValue = identity.sourceValues.actualFinish;
      else next.sourceValue = null;
    }
    if (next.projectField === null) next.included = false;
    return next;
  });
  if (!found) throw new Error(`Unknown experimental mapping ${id}.`);
  return nextMappings;
}

export function formatRoundTripMinute(minute: number): string {
  if (!Number.isInteger(minute)) throw new Error("Round-trip time must be a whole minute.");
  const date = new Date(minute * 60_000);
  if (!Number.isFinite(date.getTime())) throw new Error("Round-trip time is outside the supported date range.");
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minuteValue = date.getUTCMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minuteValue}:00`;
}

export function parseProjectIsoMinute(value: string, field: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) throw new Error(`${field} must be a timezone-neutral Microsoft Project ISO date-time.`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const milliseconds = Date.UTC(year, month - 1, day, hour, minute, second);
  const roundTrip = new Date(milliseconds);
  if (roundTrip.getUTCFullYear() !== year
    || roundTrip.getUTCMonth() + 1 !== month
    || roundTrip.getUTCDate() !== day
    || roundTrip.getUTCHours() !== hour
    || roundTrip.getUTCMinutes() !== minute
    || roundTrip.getUTCSeconds() !== second) {
    throw new Error(`${field} is not a valid Microsoft Project date-time.`);
  }
  if (second !== 0) throw new Error(`${field} must resolve to a whole minute for this trial.`);
  return milliseconds / 60_000;
}

export function readTier1RoundTripLocationClock(
  instant = new Date(),
  timeZone = resolveBrowserTimeZone()
): Tier1RoundTripLocationClock {
  if (!Number.isFinite(instant.getTime())) throw new Error("The current device time is invalid.");
  const supportedTimeZone = requireSupportedTimeZone(timeZone);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA-u-ca-iso8601-nu-latn", {
      timeZone: supportedTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(instant);
  } catch {
    throw new Error(`The device timezone ${supportedTimeZone} could not be read.`);
  }
  const value = (type: "year" | "month" | "day" | "hour" | "minute") => {
    const part = parts.find((candidate) => candidate.type === type)?.value;
    if (!part) throw new Error(`The browser could not resolve the current ${type} for ${supportedTimeZone}.`);
    return Number(part);
  };
  const minute = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute")) / 60_000;
  assertRoundTripMinute(minute, "Current location time");
  return { minute, timeZone: supportedTimeZone };
}

export function resolveBrowserTimeZone(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
  if (!timeZone) {
    throw new Error("The browser did not report an IANA timezone. Set the device timezone before starting the trial.");
  }
  return requireSupportedTimeZone(timeZone);
}

export function projectTier1RoundTripStateAtMinute(state: TrialState, minute: number): TrialState {
  assertRoundTripMinute(minute, "Current location time");
  return state.now === minute ? state : { ...state, now: minute };
}

export function tier1RoundTripLocalDayWindow(currentMinute: number, operationalDayStartMinute = 0) {
  assertRoundTripMinute(currentMinute, "Current location time");
  if (!Number.isInteger(operationalDayStartMinute)
    || operationalDayStartMinute < 0
    || operationalDayStartMinute >= 1440) {
    throw new Error("Operational day start must be a whole minute from 0 to 1439.");
  }
  const offset = ((currentMinute - operationalDayStartMinute) % 1440 + 1440) % 1440;
  const start = currentMinute - offset;
  return { start, end: start + 1440 };
}

function adaptImportedProjectToTrialState(
  fileName: string,
  preview: ProjectXmlPreview,
  clock: Tier1RoundTripLocationClock
): {
  state: TrialState;
  sourceTasks: RoundTripSourceTaskIdentity[];
  initialTimeSource: Tier1RoundTripSession["initialTimeSource"];
} {
  if (preview.tasks.length === 0) throw new Error("The imported Project source contains no tasks.");
  const seenUids = new Set<string>();
  const minimumOutlineLevel = Math.min(...preview.tasks.map((task) => requiredOutlineLevel(task)));
  const hierarchy: Array<string | undefined> = [];
  const sourceTasks: RoundTripSourceTaskIdentity[] = [];
  const tasks: TrialTask[] = [];

  for (const rawTask of preview.tasks) {
    const task = rawTask as PreviewTaskWithCritical;
    const uid = task.uid?.trim();
    if (!uid) throw new Error(`Imported task ${task.name} has no Project task UID.`);
    if (seenUids.has(uid)) throw new Error(`Project task UID ${uid} occurs more than once.`);
    seenUids.add(uid);

    const outlineLevel = requiredOutlineLevel(task);
    const trialTaskId = taskIdForProjectUid(uid);
    const plannedStart = nullableTaskDate(task.start, `Task UID ${uid} planned Start`);
    const plannedFinish = nullableTaskDate(task.finish, `Task UID ${uid} planned Finish`);
    if (plannedStart !== null && plannedFinish !== null && plannedFinish < plannedStart) {
      throw new Error(`Task UID ${uid} planned Finish precedes planned Start.`);
    }
    const importedProgress = task.percentComplete ?? 0;
    requirePercentage(importedProgress, `Task UID ${uid} imported PercentComplete`);
    if (task.physicalPercentComplete !== null) {
      requirePercentage(task.physicalPercentComplete, `Task UID ${uid} imported PhysicalPercentComplete`);
    }

    const parentId = outlineLevel > minimumOutlineLevel ? hierarchy[outlineLevel - 1] ?? null : null;
    if (outlineLevel > minimumOutlineLevel && parentId === null) {
      throw new Error(`Task UID ${uid} has no imported parent at OutlineLevel ${outlineLevel - 1}.`);
    }
    if (parentId !== null) {
      const parent = tasks.find((candidate) => candidate.id === parentId);
      if (!parent?.summary) {
        throw new Error(`Task UID ${uid} has a non-summary imported parent at OutlineLevel ${outlineLevel - 1}.`);
      }
    }
    hierarchy.length = outlineLevel + 1;
    hierarchy[outlineLevel] = trialTaskId;
    const actualStart = optionalTaskDate(task.actualStart, `Task UID ${uid} ActualStart`);
    const actualFinish = optionalTaskDate(task.actualFinish, `Task UID ${uid} ActualFinish`);
    const critical = task.critical === true;

    tasks.push({
      id: trialTaskId,
      parentId,
      wbs: task.wbs ?? task.outlineNumber ?? `UID ${uid}`,
      name: task.name,
      workPackage: "Imported Microsoft Project task",
      summary: task.summary,
      depth: Math.max(0, outlineLevel - minimumOutlineLevel),
      plannedStart,
      plannedFinish,
      importedActualStart: actualStart,
      importedActualFinish: actualFinish,
      importedProgress,
      projectCritical: critical
    });
    sourceTasks.push({
      trialTaskId,
      projectTaskUid: uid,
      projectTaskId: task.id,
      name: task.name,
      wbs: task.wbs,
      outlineNumber: task.outlineNumber,
      outlineLevel,
      summary: task.summary,
      critical,
      sourceValues: {
        start: task.start,
        finish: task.finish,
        actualStart: task.actualStart,
        actualFinish: task.actualFinish,
        percentComplete: task.percentComplete,
        physicalPercentComplete: task.physicalPercentComplete
      }
    });
  }

  const importedHistory: TrialHistoryEvent[] = [{
    id: "history-imported-roundtrip-source",
    type: "import-activated",
    at: clock.minute,
    actorId: TIER1_ROUNDTRIP_ACTOR_ID,
    summary: `Temporary browser-local Project source ${fileName.trim()} started the Tier 1 round-trip trial.`,
    baseline: true
  }];

  return {
    initialTimeSource: "Current device time",
    sourceTasks,
    state: {
      modelVersion: TIER1_ROUNDTRIP_MODEL_VERSION,
      now: clock.minute,
      nextSequence: 1,
      project: {
        id: `roundtrip-project:${preview.projectUid?.trim() || "identity-not-supplied"}`,
        name: preview.projectName,
        code: "TEMPORARY-ROUNDTRIP",
        site: "Browser-local Project source",
        timezone: clock.timeZone,
        operationalDayStartMinute: 0,
        importedSnapshot: `Temporary browser source: ${fileName.trim()}`
      },
      users: [{ id: TIER1_ROUNDTRIP_ACTOR_ID, name: "Tier 1 round-trip reviewer", tier: "Tier 1" }],
      tasks,
      executionEvents: [],
      pauseIntervals: [],
      progressObservations: [],
      problems: [],
      actions: [],
      history: importedHistory
    }
  };
}

function setRoundTripEventTime(session: Tier1RoundTripSession, targetMinute: number): Tier1RoundTripSession {
  assertRoundTripMinute(targetMinute, "Current location time");
  if (targetMinute < latestTrackerFactMinute(session)) {
    throw new Error("The current device time precedes an existing Tracker event. Check the device clock before continuing.");
  }
  const nextState = structuredClone(session.trialState);
  nextState.now = targetMinute;
  return { ...session, trialState: nextState };
}

function latestTrackerFactMinute(session: Tier1RoundTripSession) {
  return Math.max(
    ...session.history.map((event) => event.at),
    ...session.trialState.executionEvents.map((event) => event.at),
    ...session.trialState.progressObservations.map((event) => event.at),
    ...session.trialState.problems.map((record) => record.resolvedAt ?? record.createdAt),
    ...session.trialState.actions.map((record) => record.completedAt ?? record.createdAt),
    Number.NEGATIVE_INFINITY
  );
}

function assertRoundTripMinute(minute: number, field: string) {
  if (!Number.isInteger(minute)) throw new Error(`${field} must resolve to a whole minute.`);
  if (!Number.isFinite(new Date(minute * 60_000).getTime())) {
    throw new Error(`${field} is outside the supported date range.`);
  }
}

function requireSupportedTimeZone(timeZone: string) {
  const value = timeZone.trim();
  if (!value) throw new Error("The device timezone was not supplied or is not supported.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0));
  } catch {
    throw new Error(`The device timezone ${value} is not supported.`);
  }
  return value;
}

function appendSessionHistory(
  session: Tier1RoundTripSession,
  event: Omit<Tier1RoundTripSessionHistoryEvent, "id">
): Tier1RoundTripSessionHistoryEvent[] {
  return [...session.history, { ...event, id: `roundtrip-session-${session.history.length + 1}` }];
}

function invalidateDerivedExportState(session: Tier1RoundTripSession): Tier1RoundTripSession {
  return {
    ...session,
    mappings: [],
    candidate: null,
    result: null,
    disposition: null
  };
}

function requiredTask(state: TrialState, taskId: string) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new Error(`Unknown imported trial task ${taskId}.`);
  return task;
}

function requiredOutlineLevel(task: ProjectXmlTaskPreview) {
  if (!Number.isInteger(task.outlineLevel) || task.outlineLevel === null || task.outlineLevel < 0) {
    throw new Error(`Imported task ${task.name} has no valid OutlineLevel.`);
  }
  return task.outlineLevel;
}

function nullableTaskDate(value: string | null, field: string) {
  return value ? parseProjectIsoMinute(value, field) : null;
}

function optionalTaskDate(value: string | null, field: string) {
  return value ? parseProjectIsoMinute(value, field) : undefined;
}

function requirePercentage(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${field} must be between 0 and 100.`);
  }
}

function nextStateId(state: TrialState, prefix: string) {
  const id = `${prefix}-${state.nextSequence}`;
  state.nextSequence += 1;
  return id;
}

function taskIdForProjectUid(uid: string) {
  return `project-task-uid:${uid}`;
}

function executionActionLabel(type: Tier1RoundTripExecutionAction["type"]) {
  const labels: Record<Tier1RoundTripExecutionAction["type"], string> = {
    "cant-start": "Can't Start",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    finish: "Finish"
  };
  return labels[type];
}

export function roundTripTaskExecutionState(session: Tier1RoundTripSession, taskId: string) {
  return selectExecutionState(session.trialState, taskId);
}
