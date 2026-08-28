import { EXECUTION_EVENT_TYPES, eventsForTask } from "./execution.js";

const ZERO_DURATION = "PT0H0M0S";
const ALLOWED_EVENT_TYPES = new Set([
  EXECUTION_EVENT_TYPES.START,
  EXECUTION_EVENT_TYPES.FINISH,
  EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH
]);

function projectTime(event) {
  return event?.effectiveProjectLocalTime ?? event?.timestamp ?? null;
}

function parseDurationSeconds(value) {
  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
    String(value ?? "")
  );
  if (!match) {
    return null;
  }
  return (
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0)
  );
}

function isPositiveDuration(value) {
  const seconds = parseDurationSeconds(value);
  return seconds != null && seconds > 0;
}

function isZeroDuration(value) {
  const seconds = parseDurationSeconds(value);
  return seconds != null && seconds === 0;
}

function isZeroNumber(value) {
  if (value == null || value === "") {
    return true;
  }
  const number = Number(value);
  return Number.isFinite(number) && number === 0;
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireEqual(actual, expected, message) {
  requireCondition(String(actual ?? "") === String(expected ?? ""), message);
}

function completionIntent(events, task) {
  const taskEvents = eventsForTask(events, task.uid);
  requireCondition(taskEvents.length > 0, `Task UID ${task.uid} has no execution events.`);

  const unsupported = taskEvents.filter((event) => !ALLOWED_EVENT_TYPES.has(event.type));
  requireCondition(
    unsupported.length === 0,
    `Task UID ${task.uid} completion v0 does not support event type(s): ${[
      ...new Set(unsupported.map((event) => event.type))
    ].join(", ")}.`
  );

  const starts = taskEvents.filter((event) => event.type === EXECUTION_EVENT_TYPES.START);
  const completions = taskEvents.filter((event) =>
    [EXECUTION_EVENT_TYPES.FINISH, EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH].includes(event.type)
  );

  requireCondition(starts.length === 1, `Task UID ${task.uid} requires exactly one Start event.`);
  requireCondition(completions.length === 1, `Task UID ${task.uid} requires exactly one Finish or Skip to planned finish event.`);

  const actualStart = projectTime(starts[0]);
  const actualFinish = projectTime(completions[0]);
  requireCondition(actualStart, `Task UID ${task.uid} Start event has no effective Project-local timestamp.`);
  requireCondition(actualFinish, `Task UID ${task.uid} completion event has no effective Project-local timestamp.`);

  requireEqual(
    actualStart,
    task.start,
    `Task UID ${task.uid} native-evidence v0 only supports Actual Start equal to planned Start ${task.start}.`
  );
  requireEqual(
    actualFinish,
    task.finish,
    `Task UID ${task.uid} native-evidence v0 only supports Actual Finish equal to planned Finish ${task.finish}.`
  );

  return { actualStart, actualFinish, completionEventType: completions[0].type };
}

function validateUnstartedTask(task) {
  requireCondition(task && task.uid, "Completion v0 requires a task with a UID.");
  requireCondition(task.active !== false, `Task UID ${task.uid} is inactive.`);
  requireCondition(!task.summary, `Task UID ${task.uid} is a summary task.`);
  requireCondition(!task.isNull, `Task UID ${task.uid} is a null Project task row.`);
  requireCondition(task.start && task.finish, `Task UID ${task.uid} requires planned Start and Finish.`);
  requireCondition(isPositiveDuration(task.duration), `Task UID ${task.uid} requires positive Duration.`);
  requireCondition(isPositiveDuration(task.work), `Task UID ${task.uid} requires positive Work.`);
  requireCondition(isZeroNumber(task.percentComplete), `Task UID ${task.uid} is not at zero Percent Complete.`);
  requireCondition(isZeroNumber(task.percentWorkComplete), `Task UID ${task.uid} is not at zero Percent Work Complete.`);
  requireCondition(!task.actualStart && !task.actualFinish, `Task UID ${task.uid} already contains actual dates.`);
  requireCondition(isZeroDuration(task.actualDuration), `Task UID ${task.uid} Actual Duration is not zero.`);
  requireCondition(isZeroDuration(task.actualWork), `Task UID ${task.uid} Actual Work is not zero.`);
  requireEqual(
    task.remainingDuration,
    task.duration,
    `Task UID ${task.uid} Remaining Duration does not equal Duration.`
  );
  requireEqual(task.remainingWork, task.work, `Task UID ${task.uid} Remaining Work does not equal Work.`);
  requireCondition(!task.stop && !task.resume, `Task UID ${task.uid} already contains Stop or Resume.`);
  requireCondition(
    (task.timephasedData ?? []).length === 0,
    `Task UID ${task.uid} already contains direct task TimephasedData.`
  );
}

function validateUnstartedAssignment(task, assignment) {
  requireCondition(assignment?.uid, `Task UID ${task.uid} assignment requires a UID.`);
  requireCondition(assignment.resourceUid, `Task UID ${task.uid} assignment requires a Resource UID.`);
  requireCondition(isPositiveDuration(assignment.work), `Assignment UID ${assignment.uid} requires positive Work.`);
  requireEqual(assignment.work, task.work, `Assignment UID ${assignment.uid} Work does not equal task Work.`);
  requireEqual(assignment.start, task.start, `Assignment UID ${assignment.uid} Start does not equal task Start.`);
  requireEqual(assignment.finish, task.finish, `Assignment UID ${assignment.uid} Finish does not equal task Finish.`);
  requireCondition(
    isZeroNumber(assignment.percentWorkComplete),
    `Assignment UID ${assignment.uid} is not at zero Percent Work Complete.`
  );
  requireCondition(
    !assignment.actualStart && !assignment.actualFinish,
    `Assignment UID ${assignment.uid} already contains actual dates.`
  );
  requireCondition(isZeroDuration(assignment.actualWork), `Assignment UID ${assignment.uid} Actual Work is not zero.`);
  requireEqual(
    assignment.remainingWork,
    assignment.work,
    `Assignment UID ${assignment.uid} Remaining Work does not equal Work.`
  );
  requireCondition(!assignment.stop && !assignment.resume, `Assignment UID ${assignment.uid} already contains Stop or Resume.`);

  const rows = assignment.timephasedData ?? [];
  requireCondition(rows.length === 1, `Assignment UID ${assignment.uid} requires exactly one timephased row.`);
  const row = rows[0];
  requireEqual(row.type, "1", `Assignment UID ${assignment.uid} timephased Type must be 1.`);
  requireEqual(row.uid, assignment.uid, `Assignment UID ${assignment.uid} timephased UID does not match the assignment.`);
  requireEqual(row.start, assignment.start, `Assignment UID ${assignment.uid} timephased Start does not match the assignment.`);
  requireEqual(row.finish, assignment.finish, `Assignment UID ${assignment.uid} timephased Finish does not match the assignment.`);
  requireEqual(row.value, assignment.work, `Assignment UID ${assignment.uid} timephased Value does not equal Work.`);
  requireCondition(row.unit != null && row.unit !== "", `Assignment UID ${assignment.uid} timephased Unit is missing.`);
}

export function buildAssignedCompletionNativeV0Transaction(project, events) {
  const touchedTaskUids = [...new Set(events.map((event) => String(event.taskUid)))];
  requireCondition(
    touchedTaskUids.length === 1,
    `Assigned completion native-evidence v0 requires exactly one touched task; found ${touchedTaskUids.length}.`
  );

  const taskUid = touchedTaskUids[0];
  const task = project?.taskByUid?.get(taskUid);
  requireCondition(task, `Execution events reference unknown task UID ${taskUid}.`);
  validateUnstartedTask(task);

  const assignments = project?.assignmentsByTaskUid?.get(taskUid) ?? [];
  requireCondition(
    assignments.length === 1,
    `Task UID ${taskUid} requires exactly one assignment; found ${assignments.length}.`
  );
  const assignment = assignments[0];
  validateUnstartedAssignment(task, assignment);

  const intent = completionIntent(events, task);
  return {
    taskUid,
    taskId: task.id,
    taskName: task.name,
    taskWbs: task.wbs,
    taskGuid: task.guid,
    assignmentUid: assignment.uid,
    resourceUid: assignment.resourceUid,
    actualStart: intent.actualStart,
    actualFinish: intent.actualFinish,
    duration: task.duration,
    work: task.work,
    assignmentTimephased: { ...assignment.timephasedData[0] },
    completionEventType: intent.completionEventType
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectPrefix(block, identityField) {
  const match = new RegExp(`<((?:[A-Za-z_][\\w.-]*:)?${identityField})\\b`).exec(block);
  if (!match || !match[1].includes(":")) {
    return "";
  }
  return match[1].slice(0, match[1].indexOf(":"));
}

function qualified(prefix, field) {
  return prefix ? `${prefix}:${field}` : field;
}

function readScalar(block, field) {
  const expression = new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${field}\\b[^>]*>\\s*([\\s\\S]*?)\\s*<\\/(?:[A-Za-z_][\\w.-]*:)?${field}>`
  );
  const match = expression.exec(block);
  return match ? match[1].trim() : null;
}

function escapeXmlText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceRequiredScalar(block, prefix, field, value) {
  const name = qualified(prefix, field);
  const expression = new RegExp(`(<${escapeRegExp(name)}\\b[^>]*>)[\\s\\S]*?(<\\/${escapeRegExp(name)}>)`);
  requireCondition(expression.test(block), `Required ${field} element is missing.`);
  return block.replace(expression, `$1${escapeXmlText(value)}$2`);
}

function insertScalarBefore(block, prefix, field, value, anchor) {
  const name = qualified(prefix, field);
  const anchorName = qualified(prefix, anchor);
  requireCondition(!new RegExp(`<${escapeRegExp(name)}\\b`).test(block), `${field} already exists.`);
  const expression = new RegExp(`(^|\\n)([ \\t]*)<${escapeRegExp(anchorName)}\\b`, "m");
  const match = expression.exec(block);
  requireCondition(match, `Required insertion anchor ${anchor} is missing for ${field}.`);
  const insertionPoint = match.index + (match[1] ? 1 : 0);
  const line = `${match[2]}<${name}>${escapeXmlText(value)}</${name}>`;
  return `${block.slice(0, insertionPoint)}${line}\n${block.slice(insertionPoint)}`;
}

function patchTaskBlock(block, transaction) {
  const prefix = detectPrefix(block, "UID");
  requireEqual(readScalar(block, "UID"), transaction.taskUid, `Task UID ${transaction.taskUid} identity mismatch.`);
  requireEqual(readScalar(block, "ID"), transaction.taskId, `Task UID ${transaction.taskUid} ID identity mismatch.`);
  requireEqual(readScalar(block, "Name"), transaction.taskName, `Task UID ${transaction.taskUid} Name identity mismatch.`);
  requireEqual(readScalar(block, "WBS"), transaction.taskWbs, `Task UID ${transaction.taskUid} WBS identity mismatch.`);
  requireEqual(readScalar(block, "Summary"), "0", `Task UID ${transaction.taskUid} is not a leaf task.`);

  let updated = block;
  updated = insertScalarBefore(updated, prefix, "Stop", transaction.actualFinish, "ResumeValid");
  updated = insertScalarBefore(updated, prefix, "Resume", transaction.actualFinish, "ResumeValid");
  updated = replaceRequiredScalar(updated, prefix, "PercentComplete", "100");
  updated = replaceRequiredScalar(updated, prefix, "PercentWorkComplete", "100");
  updated = insertScalarBefore(updated, prefix, "ActualStart", transaction.actualStart, "ActualDuration");
  updated = insertScalarBefore(updated, prefix, "ActualFinish", transaction.actualFinish, "ActualDuration");
  updated = replaceRequiredScalar(updated, prefix, "ActualDuration", transaction.duration);
  updated = replaceRequiredScalar(updated, prefix, "ActualWork", transaction.work);
  updated = replaceRequiredScalar(updated, prefix, "RemainingDuration", ZERO_DURATION);
  updated = replaceRequiredScalar(updated, prefix, "RemainingWork", ZERO_DURATION);
  return updated;
}

function patchAssignmentTimephased(block, prefix, transaction) {
  const timephasedName = qualified(prefix, "TimephasedData");
  const expression = new RegExp(
    `<${escapeRegExp(timephasedName)}\\b[^>]*>[\\s\\S]*?<\\/${escapeRegExp(timephasedName)}>`,
    "g"
  );
  const matches = [...block.matchAll(expression)];
  requireCondition(matches.length === 1, `Assignment UID ${transaction.assignmentUid} requires exactly one TimephasedData block.`);
  const sourceBlock = matches[0][0];
  requireEqual(readScalar(sourceBlock, "Type"), "1", `Assignment UID ${transaction.assignmentUid} timephased Type is not 1.`);
  requireEqual(readScalar(sourceBlock, "UID"), transaction.assignmentUid, `Assignment UID ${transaction.assignmentUid} timephased UID mismatch.`);
  requireEqual(readScalar(sourceBlock, "Start"), transaction.assignmentTimephased.start, `Assignment UID ${transaction.assignmentUid} timephased Start mismatch.`);
  requireEqual(readScalar(sourceBlock, "Finish"), transaction.assignmentTimephased.finish, `Assignment UID ${transaction.assignmentUid} timephased Finish mismatch.`);
  requireEqual(readScalar(sourceBlock, "Unit"), transaction.assignmentTimephased.unit, `Assignment UID ${transaction.assignmentUid} timephased Unit mismatch.`);
  requireEqual(readScalar(sourceBlock, "Value"), transaction.assignmentTimephased.value, `Assignment UID ${transaction.assignmentUid} timephased Value mismatch.`);
  const updatedBlock = replaceRequiredScalar(sourceBlock, prefix, "Type", "2");
  return `${block.slice(0, matches[0].index)}${updatedBlock}${block.slice(matches[0].index + sourceBlock.length)}`;
}

function patchAssignmentBlock(block, transaction) {
  const prefix = detectPrefix(block, "UID");
  requireEqual(readScalar(block, "UID"), transaction.assignmentUid, `Assignment UID ${transaction.assignmentUid} identity mismatch.`);
  requireEqual(readScalar(block, "TaskUID"), transaction.taskUid, `Assignment UID ${transaction.assignmentUid} TaskUID mismatch.`);
  requireEqual(readScalar(block, "ResourceUID"), transaction.resourceUid, `Assignment UID ${transaction.assignmentUid} ResourceUID mismatch.`);

  let updated = block;
  updated = replaceRequiredScalar(updated, prefix, "PercentWorkComplete", "100");
  updated = insertScalarBefore(updated, prefix, "ActualFinish", transaction.actualFinish, "ActualOvertimeCost");
  updated = insertScalarBefore(updated, prefix, "ActualStart", transaction.actualStart, "ActualWork");
  updated = replaceRequiredScalar(updated, prefix, "ActualWork", transaction.work);
  updated = replaceRequiredScalar(updated, prefix, "RemainingWork", ZERO_DURATION);
  updated = insertScalarBefore(updated, prefix, "Stop", transaction.actualFinish, "StartVariance");
  updated = insertScalarBefore(updated, prefix, "Resume", transaction.actualFinish, "StartVariance");
  return patchAssignmentTimephased(updated, prefix, transaction);
}

function patchUniqueBlock(sourceXml, elementName, identityField, identityValue, patcher) {
  const expression = new RegExp(
    `<((?:[A-Za-z_][\\w.-]*:)?${elementName})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
    "g"
  );
  let count = 0;
  const candidate = sourceXml.replace(expression, (block) => {
    if (String(readScalar(block, identityField)) !== String(identityValue)) {
      return block;
    }
    count += 1;
    return patcher(block);
  });
  requireCondition(count === 1, `${elementName} ${identityField} ${identityValue} matched ${count} blocks; expected exactly one.`);
  return candidate;
}

export function applyAssignedCompletionNativeV0(sourceXml, transaction) {
  const withTask = patchUniqueBlock(
    sourceXml,
    "Task",
    "UID",
    transaction.taskUid,
    (block) => patchTaskBlock(block, transaction)
  );
  return patchUniqueBlock(
    withTask,
    "Assignment",
    "UID",
    transaction.assignmentUid,
    (block) => patchAssignmentBlock(block, transaction)
  );
}

export function generateAssignedCompletionNativeV0({ sourceXml, project, events }) {
  const transaction = buildAssignedCompletionNativeV0Transaction(project, events);
  const candidateText = applyAssignedCompletionNativeV0(sourceXml, transaction);
  return {
    candidateText,
    transaction,
    patchEntries: [],
    changedTaskUids: [transaction.taskUid],
    changedAssignmentUids: [transaction.assignmentUid]
  };
}
