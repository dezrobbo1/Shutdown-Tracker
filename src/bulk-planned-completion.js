import { EXECUTION_EVENT_TYPES, parseProjectTimestamp } from "./execution.js";
import {
  applyAssignedCompletionNativeV0,
  buildAssignedCompletionNativeV0Transaction
} from "./native-completion-v0.js";

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function asCutoffDate(value) {
  if (value instanceof Date) {
    requireCondition(!Number.isNaN(value.getTime()), "Reporting cutoff is invalid.");
    return value;
  }
  const parsed = parseProjectTimestamp(value);
  requireCondition(parsed, "Reporting cutoff is invalid.");
  return parsed;
}

function evidenceEventsForTask(task) {
  return [
    {
      id: `${task.uid}-bulk-start`,
      sequence: 1,
      taskUid: String(task.uid),
      type: EXECUTION_EVENT_TYPES.START,
      timestamp: task.start,
      effectiveProjectLocalTime: task.start
    },
    {
      id: `${task.uid}-bulk-finish`,
      sequence: 2,
      taskUid: String(task.uid),
      type: EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH,
      timestamp: task.finish,
      effectiveProjectLocalTime: task.finish,
      expectedPercent: 100
    }
  ];
}

function eligibilityCategory(message) {
  const text = String(message ?? "");
  if (/requires positive Duration/.test(text)) return "Non-positive duration / milestone";
  if (/requires positive Work/.test(text)) return "Non-positive work";
  if (/requires exactly one assignment/.test(text)) return "Assignment count outside proven shape";
  if (/timephased/.test(text)) return "Timephased shape outside proven shape";
  if (/Resource UID 0|requires a Resource UID/.test(text)) return "No usable assigned resource";
  if (/already contains|not at zero|Remaining .* does not equal/.test(text)) return "Already progressed or inconsistent source state";
  if (/Work does not equal|Start does not equal|Finish does not equal/.test(text)) return "Assignment does not align with task plan";
  return "Other unsupported source shape";
}

function finishAtOrBefore(task, cutoff) {
  const finish = parseProjectTimestamp(task?.finish);
  return Boolean(finish && finish.getTime() <= cutoff.getTime());
}

function trackerEventsForTask(events, uid) {
  return events.filter((event) => String(event.taskUid) === String(uid));
}

export function analyzePlannedCompletionCut({ project, cutoff, existingEvents = [] }) {
  requireCondition(project?.taskByUid && Array.isArray(project?.leafTasks), "Parsed Project task data is required.");
  const cutoffDate = asCutoffDate(cutoff);
  const plannedFinishedTasks = project.leafTasks.filter((task) => finishAtOrBefore(task, cutoffDate));
  const eligible = [];
  const unsupported = [];

  for (const task of plannedFinishedTasks) {
    const priorTrackerEvents = trackerEventsForTask(existingEvents, task.uid);
    if (priorTrackerEvents.length > 0) {
      unsupported.push({
        taskUid: String(task.uid),
        taskName: task.name,
        finish: task.finish,
        category: "Tracker events already recorded",
        reason: `Task UID ${task.uid} already has ${priorTrackerEvents.length} Tracker event(s).`
      });
      continue;
    }

    try {
      const transaction = buildAssignedCompletionNativeV0Transaction(project, evidenceEventsForTask(task));
      eligible.push({
        taskUid: String(task.uid),
        taskName: task.name,
        taskId: task.id,
        wbs: task.wbs,
        start: task.start,
        finish: task.finish,
        transaction
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      unsupported.push({
        taskUid: String(task.uid),
        taskName: task.name,
        finish: task.finish,
        category: eligibilityCategory(reason),
        reason
      });
    }
  }

  const reasonCounts = new Map();
  for (const item of unsupported) {
    reasonCounts.set(item.category, (reasonCounts.get(item.category) ?? 0) + 1);
  }

  return {
    cutoff: cutoffDate,
    plannedFinishedCount: plannedFinishedTasks.length,
    eligible,
    unsupported,
    reasonCounts: Array.from(reasonCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category))
  };
}

function replaceUniqueBlockWithMarker(xml, elementName, identityField, identityValue, marker) {
  const expression = new RegExp(
    `<((?:[A-Za-z_][\\w.-]*:)?${elementName})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
    "g"
  );
  const scalar = (block, field) => {
    const match = new RegExp(
      `<(?:[A-Za-z_][\\w.-]*:)?${field}\\b[^>]*>\\s*([\\s\\S]*?)\\s*<\\/(?:[A-Za-z_][\\w.-]*:)?${field}>`
    ).exec(block);
    return match?.[1]?.trim() ?? null;
  };
  let count = 0;
  const normalized = xml.replace(expression, (block) => {
    if (String(scalar(block, identityField)) !== String(identityValue)) {
      return block;
    }
    count += 1;
    return marker;
  });
  requireCondition(
    count === 1,
    `${elementName} ${identityField} ${identityValue} matched ${count} blocks while checking the bulk mutation boundary.`
  );
  return normalized;
}

function normalizeBulkTargets(xml, transactions) {
  let normalized = xml;
  for (const transaction of transactions) {
    normalized = replaceUniqueBlockWithMarker(
      normalized,
      "Task",
      "UID",
      transaction.taskUid,
      `<!-- BULK_TARGET_TASK_${transaction.taskUid} -->`
    );
    normalized = replaceUniqueBlockWithMarker(
      normalized,
      "Assignment",
      "UID",
      transaction.assignmentUid,
      `<!-- BULK_TARGET_ASSIGNMENT_${transaction.assignmentUid} -->`
    );
  }
  return normalized;
}

export function generateBulkAssignedCompletionNativeV0({ sourceXml, analysis }) {
  requireCondition(typeof sourceXml === "string" && sourceXml.length > 0, "Source XML is required.");
  requireCondition(analysis?.eligible?.length > 0, "No proven-shape tasks are eligible for bulk completion.");

  const transactions = analysis.eligible
    .map((item) => item.transaction)
    .slice()
    .sort((left, right) => {
      const leftId = Number(left.taskId);
      const rightId = Number(right.taskId);
      if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
        return leftId - rightId;
      }
      return String(left.taskUid).localeCompare(String(right.taskUid), undefined, { numeric: true });
    });

  let candidateText = sourceXml;
  for (const transaction of transactions) {
    candidateText = applyAssignedCompletionNativeV0(candidateText, transaction);
  }

  const normalizedSource = normalizeBulkTargets(sourceXml, transactions);
  const normalizedCandidate = normalizeBulkTargets(candidateText, transactions);
  requireCondition(
    normalizedSource === normalizedCandidate,
    "Bulk planned completion changed XML outside the selected task and assignment blocks."
  );

  return {
    candidateText,
    transactions,
    changedTaskUids: transactions.map((transaction) => String(transaction.taskUid)),
    changedAssignmentUids: transactions.map((transaction) => String(transaction.assignmentUid))
  };
}

export function buildBulkCompletionExecutionIntent({ analysis, recordedAt = new Date(), startingSequence = 1 }) {
  let sequence = startingSequence;
  const events = [];
  for (const item of analysis?.eligible ?? []) {
    const task = item.transaction;
    events.push({
      id: `${task.taskUid}-bulk-start-${sequence}`,
      sequence: sequence++,
      taskUid: String(task.taskUid),
      type: EXECUTION_EVENT_TYPES.START,
      effectiveProjectLocalTime: task.actualStart,
      recordedAtUtc: recordedAt.toISOString(),
      source: "bulk-planned-completion"
    });
    events.push({
      id: `${task.taskUid}-bulk-finish-${sequence}`,
      sequence: sequence++,
      taskUid: String(task.taskUid),
      type: EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH,
      effectiveProjectLocalTime: task.actualFinish,
      expectedPercent: 100,
      recordedAtUtc: recordedAt.toISOString(),
      source: "bulk-planned-completion"
    });
  }
  return events;
}

function positiveNumber(value) {
  if (value == null || value === "") return false;
  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(String(value));
  if (!match) return false;
  const seconds = Number(match[1] ?? 0) * 86400 + Number(match[2] ?? 0) * 3600 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0);
  return seconds > 0;
}

function spansCutoff(task, cutoff) {
  const start = parseProjectTimestamp(task?.start);
  const finish = parseProjectTimestamp(task?.finish);
  return Boolean(start && finish && start.getTime() <= cutoff.getTime() && finish.getTime() > cutoff.getTime());
}

export function planMondayFiftyPercentSample({ project, cutoff, fraction = 0.5 }) {
  requireCondition(project?.taskByUid && Array.isArray(project?.leafTasks), "Parsed Project task data is required.");
  const cutoffDate = asCutoffDate(cutoff);
  const boundedFraction = Math.min(1, Math.max(0, Number(fraction)));
  const pool = project.leafTasks
    .filter((task) => spansCutoff(task, cutoffDate))
    .filter((task) => Number(task.percentComplete ?? 0) === 0)
    .filter((task) => positiveNumber(task.duration) && positiveNumber(task.work))
    .sort((left, right) => {
      const leftId = Number(left.id);
      const rightId = Number(right.id);
      if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) return leftId - rightId;
      return String(left.uid).localeCompare(String(right.uid), undefined, { numeric: true });
    });

  const targetCount = Math.ceil(pool.length * boundedFraction);
  const selected = [];
  if (targetCount > 0) {
    for (let index = 0; index < pool.length && selected.length < targetCount; index += 2) {
      selected.push(pool[index]);
    }
    for (let index = 1; index < pool.length && selected.length < targetCount; index += 2) {
      selected.push(pool[index]);
    }
  }

  return {
    cutoff: cutoffDate,
    fraction: boundedFraction,
    activePoolCount: pool.length,
    selected: selected.map((task) => ({
      taskUid: String(task.uid),
      taskId: task.id,
      taskName: task.name,
      wbs: task.wbs,
      start: task.start,
      finish: task.finish,
      reportedPercent: 50
    })),
    exportable: false,
    note: "Intent plan only. Assigned-task partial-progress XML is not yet Microsoft Project-proven and must not be generated."
  };
}
