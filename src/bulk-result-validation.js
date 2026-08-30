const PROJECT_INVARIANT_FIELDS = Object.freeze([
  ["Project Start", "startDate"],
  ["Project Finish", "finishDate"],
  ["Status Date", "statusDate"]
]);

const TASK_PROGRESS_FIELDS = Object.freeze([
  ["Percent Complete", "percentComplete", "percent"],
  ["Percent Work Complete", "percentWorkComplete", "percent"],
  ["Actual Start", "actualStart", "text"],
  ["Actual Finish", "actualFinish", "text"],
  ["Actual Duration", "actualDuration", "duration"],
  ["Actual Work", "actualWork", "duration"],
  ["Remaining Duration", "remainingDuration", "duration"],
  ["Remaining Work", "remainingWork", "duration"],
  ["Stop", "stop", "text"],
  ["Resume", "resume", "text"]
]);

const ASSIGNMENT_PROGRESS_FIELDS = Object.freeze([
  ["Percent Work Complete", "percentWorkComplete", "percent"],
  ["Actual Start", "actualStart", "text"],
  ["Actual Finish", "actualFinish", "text"],
  ["Actual Work", "actualWork", "duration"],
  ["Remaining Work", "remainingWork", "duration"],
  ["Stop", "stop", "text"],
  ["Resume", "resume", "text"]
]);

function durationSeconds(value) {
  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
    String(value ?? "")
  );
  if (!match) return null;
  return (
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0)
  );
}

function normalizedText(value) {
  return value == null ? "" : String(value);
}

function valuesEqual(left, right, kind = "text") {
  if (kind === "duration") {
    const leftText = normalizedText(left);
    const rightText = normalizedText(right);
    if (leftText === "" && rightText === "") return true;
    const leftSeconds = durationSeconds(left);
    const rightSeconds = durationSeconds(right);
    return leftSeconds != null && rightSeconds != null && leftSeconds === rightSeconds;
  }
  if (kind === "percent") {
    const leftNumber = Number(left ?? 0);
    const rightNumber = Number(right ?? 0);
    return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber;
  }
  return normalizedText(left) === normalizedText(right);
}

function isZeroDuration(value) {
  return valuesEqual(value, "PT0H0M0S", "duration");
}

function addMismatch(failures, scope, label, actual, expected) {
  failures.push(
    `${scope} ${label} mismatch: result ${normalizedText(actual) || "—"}, expected ${normalizedText(expected) || "—"}.`
  );
}

function requireField(failures, scope, label, actual, expected, kind = "text") {
  if (!valuesEqual(actual, expected, kind)) {
    addMismatch(failures, scope, label, actual, expected);
  }
}

function canonicalTimephasedRows(rows = []) {
  return rows
    .map((row) => {
      const durationValue = durationSeconds(row?.value);
      const value = durationValue == null ? `text:${normalizedText(row?.value)}` : `duration:${durationValue}`;
      return [
        normalizedText(row?.type),
        normalizedText(row?.uid),
        normalizedText(row?.start),
        normalizedText(row?.finish),
        normalizedText(row?.unit),
        value
      ].join("|");
    })
    .sort();
}

function compareTimephasedRows(failures, scope, candidateRows, resultRows, label = "timephased data") {
  const candidateCanonical = canonicalTimephasedRows(candidateRows);
  const resultCanonical = canonicalTimephasedRows(resultRows);
  if (candidateCanonical.join("\n") !== resultCanonical.join("\n")) {
    failures.push(
      `${scope} ${label} mismatch: result [${resultCanonical.join(", ")}], expected [${candidateCanonical.join(", ")}].`
    );
  }
}

function validateProjectInvariants(candidate, result) {
  const failures = [];
  for (const [label, property] of PROJECT_INVARIANT_FIELDS) {
    requireField(
      failures,
      "Project",
      label,
      result?.project?.[property],
      candidate?.project?.[property]
    );
  }
  return { pass: failures.length === 0, failures };
}

function validateExactTask(resultTask, transaction) {
  const failures = [];
  const scope = `Task UID ${transaction.taskUid}`;
  if (!resultTask) {
    return { pass: false, failures: [`${scope} is missing from the result.`] };
  }

  requireField(failures, scope, "Percent Complete", resultTask.percentComplete, 100, "percent");
  requireField(failures, scope, "Percent Work Complete", resultTask.percentWorkComplete, 100, "percent");
  requireField(failures, scope, "Start", resultTask.start, transaction.actualStart);
  requireField(failures, scope, "Finish", resultTask.finish, transaction.actualFinish);
  requireField(failures, scope, "Duration", resultTask.duration, transaction.duration, "duration");
  requireField(failures, scope, "Work", resultTask.work, transaction.work, "duration");
  requireField(failures, scope, "Actual Start", resultTask.actualStart, transaction.actualStart);
  requireField(failures, scope, "Actual Finish", resultTask.actualFinish, transaction.actualFinish);
  requireField(failures, scope, "Actual Duration", resultTask.actualDuration, transaction.duration, "duration");
  requireField(failures, scope, "Actual Work", resultTask.actualWork, transaction.work, "duration");
  if (!isZeroDuration(resultTask.remainingDuration)) {
    addMismatch(failures, scope, "Remaining Duration", resultTask.remainingDuration, "PT0H0M0S");
  }
  if (!isZeroDuration(resultTask.remainingWork)) {
    addMismatch(failures, scope, "Remaining Work", resultTask.remainingWork, "PT0H0M0S");
  }
  requireField(failures, scope, "Stop", resultTask.stop, transaction.actualFinish);
  requireField(failures, scope, "Resume", resultTask.resume, transaction.actualFinish);
  return { pass: failures.length === 0, failures };
}

function validateExactAssignment(resultAssignments, transaction) {
  const failures = [];
  const scope = `Task UID ${transaction.taskUid} assignment`;
  if (resultAssignments.length !== 1) {
    failures.push(`${scope} count mismatch: result ${resultAssignments.length}, expected 1.`);
    return { pass: false, failures };
  }

  const assignment = resultAssignments[0];
  requireField(failures, scope, "UID", assignment.uid, transaction.assignmentUid);
  requireField(failures, scope, "Task UID", assignment.taskUid, transaction.taskUid);
  requireField(failures, scope, "Resource UID", assignment.resourceUid, transaction.resourceUid);
  requireField(failures, scope, "Percent Work Complete", assignment.percentWorkComplete, 100, "percent");
  requireField(failures, scope, "Start", assignment.start, transaction.actualStart);
  requireField(failures, scope, "Finish", assignment.finish, transaction.actualFinish);
  requireField(failures, scope, "Actual Start", assignment.actualStart, transaction.actualStart);
  requireField(failures, scope, "Actual Finish", assignment.actualFinish, transaction.actualFinish);
  requireField(failures, scope, "Work", assignment.work, transaction.work, "duration");
  requireField(failures, scope, "Actual Work", assignment.actualWork, transaction.work, "duration");
  if (!isZeroDuration(assignment.remainingWork)) {
    addMismatch(failures, scope, "Remaining Work", assignment.remainingWork, "PT0H0M0S");
  }
  requireField(failures, scope, "Stop", assignment.stop, transaction.actualFinish);
  requireField(failures, scope, "Resume", assignment.resume, transaction.actualFinish);

  const rows = assignment.timephasedData ?? [];
  if (rows.length !== 1) {
    failures.push(`${scope} timephased row count mismatch: result ${rows.length}, expected 1.`);
  } else {
    const row = rows[0];
    requireField(failures, scope, "timephased Type", row.type, "2");
    requireField(failures, scope, "timephased UID", row.uid, transaction.assignmentUid);
    requireField(
      failures,
      scope,
      "timephased Start",
      row.start,
      transaction.assignmentTimephased.start
    );
    requireField(
      failures,
      scope,
      "timephased Finish",
      row.finish,
      transaction.assignmentTimephased.finish
    );
    requireField(
      failures,
      scope,
      "timephased Unit",
      row.unit,
      transaction.assignmentTimephased.unit
    );
    requireField(
      failures,
      scope,
      "timephased Value",
      row.value,
      transaction.assignmentTimephased.value,
      "duration"
    );
  }

  return { pass: failures.length === 0, failures };
}

function compareProgressFields(failures, scope, candidateValue, resultValue, fields) {
  for (const [label, property, kind] of fields) {
    if (!valuesEqual(candidateValue?.[property], resultValue?.[property], kind)) {
      addMismatch(failures, scope, label, resultValue?.[property], candidateValue?.[property]);
    }
  }
}

function sortedAssignments(project, taskUid) {
  return (project?.assignmentsByTaskUid?.get(String(taskUid)) ?? [])
    .slice()
    .sort((left, right) =>
      String(left.uid ?? "").localeCompare(String(right.uid ?? ""), undefined, { numeric: true })
    );
}

function taskTypeElevenRows(task) {
  return (task?.timephasedData ?? []).filter((row) => String(row?.type) === "11");
}

function validatePreservedTask(candidate, result, taskUid) {
  const failures = [];
  const scope = `Untouched task UID ${taskUid}`;
  const candidateTask = candidate?.taskByUid?.get(String(taskUid));
  const resultTask = result?.taskByUid?.get(String(taskUid));
  if (!candidateTask || !resultTask) {
    failures.push(`${scope} is missing from ${!candidateTask ? "candidate" : "result"}.`);
    return { pass: false, failures };
  }

  compareProgressFields(failures, scope, candidateTask, resultTask, TASK_PROGRESS_FIELDS);
  compareTimephasedRows(
    failures,
    scope,
    taskTypeElevenRows(candidateTask),
    taskTypeElevenRows(resultTask),
    "Type 11 task progress"
  );

  const candidateAssignments = sortedAssignments(candidate, taskUid);
  const resultAssignments = sortedAssignments(result, taskUid);
  const candidateUids = candidateAssignments.map((assignment) => String(assignment.uid ?? ""));
  const resultUids = resultAssignments.map((assignment) => String(assignment.uid ?? ""));
  if (candidateUids.join("|") !== resultUids.join("|")) {
    failures.push(
      `${scope} assignment UID set mismatch: result [${resultUids.join(", ")}], expected [${candidateUids.join(", ")}].`
    );
    return { pass: false, failures };
  }

  for (let index = 0; index < candidateAssignments.length; index += 1) {
    const candidateAssignment = candidateAssignments[index];
    const resultAssignment = resultAssignments[index];
    const assignmentScope = `${scope} assignment UID ${candidateAssignment.uid}`;
    requireField(failures, assignmentScope, "Task UID", resultAssignment.taskUid, candidateAssignment.taskUid);
    requireField(
      failures,
      assignmentScope,
      "Resource UID",
      resultAssignment.resourceUid,
      candidateAssignment.resourceUid
    );
    compareProgressFields(
      failures,
      assignmentScope,
      candidateAssignment,
      resultAssignment,
      ASSIGNMENT_PROGRESS_FIELDS
    );
    compareTimephasedRows(
      failures,
      assignmentScope,
      candidateAssignment.timephasedData ?? [],
      resultAssignment.timephasedData ?? [],
      "assignment timephased progress"
    );
  }

  return { pass: failures.length === 0, failures };
}

function preservedTaskUids(candidate, touchedTaskUids) {
  const touched = new Set(touchedTaskUids.map(String));
  return Array.from(candidate?.taskByUid?.values?.() ?? [])
    .filter((task) => task?.uid != null && !touched.has(String(task.uid)))
    .filter((task) => !task.summary && !task.isNull)
    .map((task) => String(task.uid))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

export function validateBulkCompletionResult({
  candidate,
  result,
  transactions = [],
  compatibility
}) {
  const failures = [];
  const strictResult = compatibility?.classification === "strict-result";
  if (!strictResult) {
    failures.push(
      `Result provenance is ${compatibility?.classification ?? "unknown"}; strict-result is required for a successful candidate round trip.`
    );
  }

  const projectCheck = validateProjectInvariants(candidate, result);
  failures.push(...projectCheck.failures);

  let coherentTaskCount = 0;
  let coherentAssignmentCount = 0;
  for (const transaction of transactions) {
    const taskCheck = validateExactTask(
      result?.taskByUid?.get(String(transaction.taskUid)),
      transaction
    );
    if (taskCheck.pass) coherentTaskCount += 1;
    failures.push(...taskCheck.failures);

    const assignmentCheck = validateExactAssignment(
      sortedAssignments(result, transaction.taskUid),
      transaction
    );
    if (assignmentCheck.pass) coherentAssignmentCount += 1;
    failures.push(...assignmentCheck.failures);
  }

  const untouchedTaskUids = preservedTaskUids(
    candidate,
    transactions.map((transaction) => transaction.taskUid)
  );
  let untouchedPreservedCount = 0;
  for (const taskUid of untouchedTaskUids) {
    const check = validatePreservedTask(candidate, result, taskUid);
    if (check.pass) untouchedPreservedCount += 1;
    failures.push(...check.failures);
  }

  return {
    pass: failures.length === 0,
    strictResult,
    projectInvariantsPreserved: projectCheck.pass,
    projectInvariantCount: PROJECT_INVARIANT_FIELDS.length,
    coherentTaskCount,
    coherentAssignmentCount,
    untouchedPreservedCount,
    touchedTaskCount: transactions.length,
    untouchedTaskCount: untouchedTaskUids.length,
    failures
  };
}
