export const EXECUTION_EVENT_TYPES = Object.freeze({
  START: "START",
  PAUSE: "PAUSE",
  RESUME: "RESUME",
  FINISH: "FINISH",
  OBSERVED_PROGRESS: "OBSERVED_PROGRESS",
  MARK_ON_TRACK: "MARK_ON_TRACK",
  PROGRESS_TO_SHIFT_END: "PROGRESS_TO_SHIFT_END",
  SKIP_TO_PLANNED_FINISH: "SKIP_TO_PLANNED_FINISH"
});

export const EVENT_LABELS = Object.freeze({
  START: "Started",
  PAUSE: "Paused",
  RESUME: "Resumed",
  FINISH: "Finished now",
  OBSERVED_PROGRESS: "Observed progress",
  MARK_ON_TRACK: "Mark on Track intent",
  PROGRESS_TO_SHIFT_END: "Expected shift-end progress",
  SKIP_TO_PLANNED_FINISH: "Skipped to planned finish"
});

const ACTUAL_STATE_EVENTS = new Set([
  EXECUTION_EVENT_TYPES.START,
  EXECUTION_EVENT_TYPES.PAUSE,
  EXECUTION_EVENT_TYPES.RESUME,
  EXECUTION_EVENT_TYPES.FINISH
]);

export function parseProjectTimestamp(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toProjectLocalTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot format an invalid date as a Project timestamp.");
  }

  const pad = (number) => String(number).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds())
  ].join("");
}

export function toDateTimeLocalValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toProjectLocalTimestamp(date).slice(0, 16);
}

export function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, value));
}

export function calculateExpectedPercent(task, instant) {
  const start = parseProjectTimestamp(task?.start);
  const finish = parseProjectTimestamp(task?.finish);
  const point = instant instanceof Date ? instant : new Date(instant);

  if (!start || !finish || Number.isNaN(point.getTime()) || finish <= start) {
    return null;
  }

  const fraction = (point.getTime() - start.getTime()) / (finish.getTime() - start.getTime());
  return clampPercent(fraction * 100);
}

export function resolveShiftEndInstant(referenceInstant, shiftEnd) {
  const reference = referenceInstant instanceof Date ? new Date(referenceInstant) : new Date(referenceInstant);
  if (Number.isNaN(reference.getTime())) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(String(shiftEnd ?? ""));
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  const result = new Date(reference);
  result.setHours(hours, minutes, 0, 0);
  if (result < reference) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

export function createExecutionEvent({ taskUid, type, timestamp, expectedPercent = null, observedPercent = null }) {
  if (!taskUid) {
    throw new Error("A task UID is required for an execution event.");
  }
  if (!Object.values(EXECUTION_EVENT_TYPES).includes(type)) {
    throw new Error(`Unsupported execution event type: ${type}`);
  }

  const instant = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(instant.getTime())) {
    throw new Error("Execution event timestamp is invalid.");
  }

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${taskUid}-${type}-${instant.getTime()}-${Math.random()}`,
    taskUid: String(taskUid),
    type,
    timestamp: toProjectLocalTimestamp(instant),
    expectedPercent: expectedPercent == null ? null : Math.round(clampPercent(Number(expectedPercent))),
    observedPercent: observedPercent == null ? null : Math.round(clampPercent(Number(observedPercent)))
  };
}

export function eventsForTask(events, taskUid) {
  return events
    .filter((event) => String(event.taskUid) === String(taskUid))
    .slice()
    .sort((left, right) => {
      const timeDifference = new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
      return timeDifference || String(left.id).localeCompare(String(right.id));
    });
}

export function deriveExecutionState(events, taskUid) {
  const actualEvents = eventsForTask(events, taskUid).filter((event) => ACTUAL_STATE_EVENTS.has(event.type));
  const latest = actualEvents.at(-1);

  if (!latest) {
    return "Not started";
  }

  switch (latest.type) {
    case EXECUTION_EVENT_TYPES.START:
    case EXECUTION_EVENT_TYPES.RESUME:
      return "In progress";
    case EXECUTION_EVENT_TYPES.PAUSE:
      return "Paused";
    case EXECUTION_EVENT_TYPES.FINISH:
      return "Completed";
    default:
      return "Not started";
  }
}

export function allowedExecutionActions(events, taskUid) {
  const state = deriveExecutionState(events, taskUid);
  return {
    start: state === "Not started",
    pause: state === "In progress",
    resume: state === "Paused",
    finish: state === "In progress" || state === "Paused"
  };
}

function latestProgressEvent(taskEvents) {
  return taskEvents
    .filter((event) =>
      event.type === EXECUTION_EVENT_TYPES.OBSERVED_PROGRESS ||
      event.type === EXECUTION_EVENT_TYPES.MARK_ON_TRACK ||
      event.type === EXECUTION_EVENT_TYPES.PROGRESS_TO_SHIFT_END ||
      event.type === EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH
    )
    .at(-1);
}

export function buildTaskScalarDiagnosticPatch(events, taskUid) {
  const taskEvents = eventsForTask(events, taskUid);
  const startEvent = taskEvents.find((event) => event.type === EXECUTION_EVENT_TYPES.START);
  const finishEvent = taskEvents.findLast((event) => event.type === EXECUTION_EVENT_TYPES.FINISH);
  const skipEvent = taskEvents.findLast((event) => event.type === EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH);
  const progressEvent = latestProgressEvent(taskEvents);

  let percentComplete = null;
  if (finishEvent || skipEvent) {
    percentComplete = 100;
  } else if (progressEvent?.observedPercent != null) {
    percentComplete = progressEvent.observedPercent;
  } else if (progressEvent?.expectedPercent != null) {
    percentComplete = progressEvent.expectedPercent;
  }

  const patch = {};
  if (startEvent) {
    patch.ActualStart = startEvent.timestamp;
  }
  if (finishEvent || skipEvent) {
    patch.ActualFinish = (finishEvent ?? skipEvent).timestamp;
  }
  if (percentComplete != null) {
    patch.PercentComplete = String(Math.round(clampPercent(percentComplete)));
  }

  return patch;
}
