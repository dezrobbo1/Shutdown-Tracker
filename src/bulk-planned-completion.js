import { EXECUTION_EVENT_TYPES, parseProjectTimestamp } from "./execution.js";
import {
  applyAssignedCompletionNativeV0,
  buildAssignedCompletionNativeV0Transaction
} from "./native-completion-v0.js";

export const BULK_PLANNED_COMPLETION_PROFILE = Object.freeze({
  id: "bulk-planned-completion-native-v0",
  label: "Bulk planned completion through reporting cutoff — Microsoft Project-verified bounded composition",
  classification: "native-evidence-derived",
  baseProfileId: "assigned-completion-native-v0",
  proofBoundary:
    "One active unstarted leaf task per transaction, one non-zero-resource assignment, one Unit 1 Type 1 assignment timephased row, and planned-window 100% completion."
});

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

function localTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function cutoffProjectLocal(value, date) {
  if (typeof value === "string") {
    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return `${text}:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  }
  return localTimestamp(date);
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

function assertEvidenceProfileIdentity(transaction) {
  requireCondition(
    transaction.taskId != null && transaction.taskId !== "",
    `Task UID ${transaction.taskUid} requires an ID.`
  );
  requireCondition(transaction.taskName, `Task UID ${transaction.taskUid} requires a Name.`);
  requireCondition(transaction.taskWbs, `Task UID ${transaction.taskUid} requires a WBS value.`);
  requireCondition(
    String(transaction.resourceUid) !== "0",
    `Assignment UID ${transaction.assignmentUid} uses Resource UID 0 and is outside the proven assigned-task shape.`
  );
  requireCondition(
    String(transaction.assignmentTimephased.unit) === "1",
    `Assignment UID ${transaction.assignmentUid} timephased Unit must be 1 for the proven completion shape.`
  );
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
      assertEvidenceProfileIdentity(transaction);
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
    cutoffProjectLocal: cutoffProjectLocal(cutoff, cutoffDate),
    plannedFinishedCount: plannedFinishedTasks.length,
    eligible,
    unsupported,
    reasonCounts: Array.from(reasonCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category))
  };
}

function rawScalarFromBlock(block, field) {
  const match = new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${field}\\b[^>]*>\\s*([\\s\\S]*?)\\s*<\\/(?:[A-Za-z_][\\w.-]*:)?${field}>`
  ).exec(block);
  return match?.[1]?.trim() ?? null;
}

function decodeXmlText(value) {
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized === "amp") return "&";
    if (normalized === "lt") return "<";
    if (normalized === "gt") return ">";
    if (normalized === "quot") return '"';
    if (normalized === "apos") return "'";
    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return match;
  });
}

function rawTaskNameForUid(xml, taskUid) {
  const expression = /<((?:[A-Za-z_][\w.-]*:)?Task)\b[^>]*>[\s\S]*?<\/\1>/g;
  let rawName = null;
  let count = 0;
  for (const match of xml.matchAll(expression)) {
    const block = match[0];
    if (String(rawScalarFromBlock(block, "UID")) !== String(taskUid)) continue;
    count += 1;
    rawName = rawScalarFromBlock(block, "Name");
  }
  requireCondition(count === 1, `Task UID ${taskUid} matched ${count} source Task blocks while resolving XML identity.`);
  requireCondition(rawName != null && rawName !== "", `Task UID ${taskUid} requires a source Name.`);
  return rawName;
}

function sourceTaskNameForTransaction(xml, transaction) {
  const rawName = rawTaskNameForUid(xml, transaction.taskUid);
  const decodedName = decodeXmlText(rawName);
  requireCondition(
    decodedName === String(transaction.taskName),
    `Task UID ${transaction.taskUid} Name identity mismatch: source ${decodedName}, analysis ${transaction.taskName}.`
  );
  return rawName;
}

function replaceUniqueBlockWithMarker(xml, elementName, identityField, identityValue, marker) {
  const expression = new RegExp(
    `<((?:[A-Za-z_][\\w.-]*:)?${elementName})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
    "g"
  );
  let count = 0;
  const normalized = xml.replace(expression, (block) => {
    if (String(rawScalarFromBlock(block, identityField)) !== String(identityValue)) {
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
    assertEvidenceProfileIdentity(transaction);
    const rawSourceTaskName = sourceTaskNameForTransaction(sourceXml, transaction);
    const patchTransaction = { ...transaction, taskName: rawSourceTaskName };
    candidateText = applyAssignedCompletionNativeV0(candidateText, patchTransaction);
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
    profile: BULK_PLANNED_COMPLETION_PROFILE,
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

export function buildBulkCompletionIntentDocument({
  source,
  candidate,
  analysis,
  createdAt = new Date()
}) {
  requireCondition(source?.fileName && source?.sha256, "Source provenance is required.");
  requireCondition(candidate?.fileName && candidate?.sha256, "Candidate provenance is required.");
  requireCondition(analysis?.cutoffProjectLocal, "Reporting-cut analysis provenance is required.");
  return {
    format: "shutdown-tracker-bulk-planned-completion/v0",
    createdAt: createdAt.toISOString(),
    profile: BULK_PLANNED_COMPLETION_PROFILE,
    source: { fileName: source.fileName, sha256: source.sha256 },
    candidate: {
      fileName: candidate.fileName,
      sha256: candidate.sha256,
      profileId: BULK_PLANNED_COMPLETION_PROFILE.id
    },
    cutoff: analysis.cutoffProjectLocal,
    supportedTaskUids: candidate.changedTaskUids,
    unsupported: analysis.unsupported,
    executionIntent: candidate.executionIntent
  };
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
    cutoffProjectLocal: cutoffProjectLocal(cutoff, cutoffDate),
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

export function buildPartialProgressIntentDocument({ source, plan, createdAt = new Date() }) {
  requireCondition(source?.fileName && source?.sha256, "Source provenance is required.");
  requireCondition(plan?.cutoffProjectLocal, "Partial-progress plan provenance is required.");
  return {
    format: "shutdown-tracker-partial-progress-intent/v0",
    createdAt: createdAt.toISOString(),
    source: { fileName: source.fileName, sha256: source.sha256 },
    cutoff: plan.cutoffProjectLocal,
    fraction: plan.fraction,
    reportedPercent: 50,
    selected: plan.selected,
    exportable: false,
    note: plan.note
  };
}
