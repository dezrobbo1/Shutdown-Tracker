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
  ["Actual Overtime Work", "actualOvertimeWork", "duration"],
  ["Remaining Overtime Work", "remainingOvertimeWork", "duration"],
  ["Stop", "stop", "text"],
  ["Resume", "resume", "text"]
]);

const TYPE_ELEVEN_SENTINEL = 32768;
const PERCENT_TOLERANCE = 0.05;

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

function directChildText(element, localName) {
  for (const child of element?.children ?? []) {
    if (child.localName === localName) return child.textContent?.trim() ?? "";
  }
  return null;
}

function canonicalElement(element, excludedNames = new Set(["GUID"])) {
  if (!element || excludedNames.has(element.localName)) return null;
  const attributes = Array.from(element.attributes ?? [])
    .map((attribute) => `${attribute.namespaceURI ?? ""}|${attribute.localName}=${attribute.value}`)
    .sort();
  const children = Array.from(element.children ?? [])
    .map((child) => canonicalElement(child, excludedNames))
    .filter(Boolean)
    .sort();
  const text = children.length === 0 ? element.textContent?.trim() ?? "" : "";
  return `${element.namespaceURI ?? ""}|${element.localName}[${attributes.join(";")}](${text}){${children.join("|")}}`;
}

function structureFromDocument(project) {
  const document = project?.document;
  const root = document?.documentElement;
  if (!root) return null;
  const namespace = root.namespaceURI;
  const taskElements = Array.from(document.getElementsByTagNameNS(namespace, "Task"));
  const predecessorLinks = [];
  for (const taskElement of taskElements) {
    const taskUid = directChildText(taskElement, "UID");
    for (const child of taskElement.children) {
      if (child.localName !== "PredecessorLink") continue;
      predecessorLinks.push(`${taskUid ?? ""}|${canonicalElement(child, new Set())}`);
    }
  }

  const calendars = Array.from(document.getElementsByTagNameNS(namespace, "Calendar"))
    .map((calendar) => `${directChildText(calendar, "UID") ?? ""}|${canonicalElement(calendar)}`)
    .sort();

  return {
    calendarUid: directChildText(root, "CalendarUID"),
    predecessorLinks: predecessorLinks.sort(),
    calendars
  };
}

function normalizedSchedulingStructure(project) {
  const explicit = project?.schedulingStructure;
  if (explicit) {
    return {
      calendarUid: normalizedText(explicit.calendarUid),
      predecessorLinks: [...(explicit.predecessorLinks ?? [])].map(String).sort(),
      calendars: [...(explicit.calendars ?? [])].map(String).sort()
    };
  }
  return structureFromDocument(project);
}

function compareCanonicalSets(failures, label, candidateValues, resultValues) {
  const candidateText = [...candidateValues].sort().join("\n");
  const resultText = [...resultValues].sort().join("\n");
  if (candidateText !== resultText) {
    const candidateSet = new Set(candidateValues);
    const resultSet = new Set(resultValues);
    const missing = candidateValues.filter((value) => !resultSet.has(value));
    const added = resultValues.filter((value) => !candidateSet.has(value));
    failures.push(`${label} mismatch: ${missing.length} missing and ${added.length} added/changed item(s).`);
  }
}

function validateSchedulingStructure(candidate, result) {
  const failures = [];
  const candidateStructure = normalizedSchedulingStructure(candidate);
  const resultStructure = normalizedSchedulingStructure(result);
  if (!candidateStructure && !resultStructure) {
    return { pass: true, invariantCount: 0, failures };
  }
  if (!candidateStructure || !resultStructure) {
    failures.push("Project scheduling structure is unavailable in either the candidate or result.");
    return { pass: false, invariantCount: 3, failures };
  }

  requireField(
    failures,
    "Project",
    "Calendar UID",
    resultStructure.calendarUid,
    candidateStructure.calendarUid
  );
  compareCanonicalSets(
    failures,
    "Project predecessor-link semantics",
    candidateStructure.predecessorLinks,
    resultStructure.predecessorLinks
  );
  compareCanonicalSets(
    failures,
    "Project calendar semantics",
    candidateStructure.calendars,
    resultStructure.calendars
  );
  return { pass: failures.length === 0, invariantCount: 3, failures };
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
  const scheduling = validateSchedulingStructure(candidate, result);
  failures.push(...scheduling.failures);
  return {
    pass: failures.length === 0,
    invariantCount: PROJECT_INVARIANT_FIELDS.length + scheduling.invariantCount,
    schedulingStructurePreserved: scheduling.pass,
    failures
  };
}

function typeElevenRows(task) {
  return (task?.timephasedData ?? []).filter((row) => String(row?.type) === "11");
}

function validateTypeElevenCoverage(resultTask, transaction) {
  const failures = [];
  const scope = `Task UID ${transaction.taskUid} Type 11 progress`;
  const allRows = resultTask?.timephasedData ?? [];
  const rows = typeElevenRows(resultTask).slice().sort((left, right) =>
    normalizedText(left.start).localeCompare(normalizedText(right.start))
  );

  if (rows.length === 0) {
    return { pass: false, failures: [`${scope} is missing.`] };
  }
  if (rows.length !== allRows.length) {
    failures.push(`${scope} contains non-Type 11 direct task timephasing.`);
  }

  for (const row of rows) {
    requireField(failures, scope, "row Type", row.type, "11");
    requireField(failures, scope, "row UID", row.uid, transaction.taskUid);
    if (!row.start || !row.finish || normalizedText(row.start) >= normalizedText(row.finish)) {
      failures.push(`${scope} contains an invalid interval ${row.start ?? "—"} → ${row.finish ?? "—"}.`);
    }
    if (
      normalizedText(row.start) < normalizedText(transaction.actualStart) ||
      normalizedText(row.finish) > normalizedText(transaction.actualFinish)
    ) {
      failures.push(`${scope} interval ${row.start} → ${row.finish} falls outside the Actual Start/Finish window.`);
    }
  }

  requireField(failures, scope, "coverage Start", rows[0]?.start, transaction.actualStart);
  requireField(failures, scope, "coverage Finish", rows.at(-1)?.finish, transaction.actualFinish);
  for (let index = 1; index < rows.length; index += 1) {
    if (normalizedText(rows[index - 1].finish) !== normalizedText(rows[index].start)) {
      failures.push(
        `${scope} has a gap or overlap between ${rows[index - 1].finish ?? "—"} and ${rows[index].start ?? "—"}.`
      );
    }
  }

  const units = new Set(rows.map((row) => normalizedText(row.unit)));
  if (units.size !== 1) {
    failures.push(`${scope} mixes Unit values: ${[...units].join(", ")}.`);
  } else if (units.has("2")) {
    if (rows.length !== 1 || Math.abs(Number(rows[0].value) - 100) > PERCENT_TOLERANCE) {
      failures.push(`${scope} Unit 2 form must be one whole-window Value 100 row.`);
    }
  } else if (units.has("1")) {
    let progressTotal = 0;
    let progressRows = 0;
    for (const row of rows) {
      const rawValue = normalizedText(row.value).trim();
      if (rawValue === "") {
        failures.push(`${scope} contains a missing or empty Value.`);
        continue;
      }
      const value = Number(rawValue);
      if (!Number.isFinite(value)) {
        failures.push(`${scope} contains non-numeric Value ${row.value ?? "—"}.`);
        continue;
      }
      if (value === TYPE_ELEVEN_SENTINEL) continue;
      if (value < 0 || value > 100) {
        failures.push(`${scope} contains unsupported percentage Value ${row.value}.`);
        continue;
      }
      progressTotal += value;
      progressRows += 1;
    }
    if (progressRows === 0 || Math.abs(progressTotal - 100) > PERCENT_TOLERANCE) {
      failures.push(`${scope} Unit 1 percentages total ${progressTotal}, expected 100.`);
    }
  } else {
    failures.push(`${scope} uses unsupported Unit ${[...units][0] || "—"}; expected 1 or 2.`);
  }

  return { pass: failures.length === 0, failures };
}

function validateExactTask(resultTask, transaction) {
  const failures = [];
  const scope = `Task UID ${transaction.taskUid}`;
  if (!resultTask) {
    return { pass: false, failures: [`${scope} is missing from the result.`] };
  }

  if (resultTask.active === false) failures.push(`${scope} became inactive in the result.`);
  if (resultTask.isNull === true) failures.push(`${scope} became a null task in the result.`);
  if (resultTask.summary === true) failures.push(`${scope} became a summary task in the result.`);

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

  const typeEleven = validateTypeElevenCoverage(resultTask, transaction);
  failures.push(...typeEleven.failures);
  return { pass: failures.length === 0, typeElevenPass: typeEleven.pass, failures };
}

function validateExactAssignment(candidateAssignments, resultAssignments, transaction) {
  const failures = [];
  const scope = `Task UID ${transaction.taskUid} assignment`;
  if (candidateAssignments.length !== 1) {
    failures.push(`${scope} candidate count mismatch: candidate ${candidateAssignments.length}, expected 1.`);
    return { pass: false, failures };
  }
  if (resultAssignments.length !== 1) {
    failures.push(`${scope} count mismatch: result ${resultAssignments.length}, expected 1.`);
    return { pass: false, failures };
  }

  const candidateAssignment = candidateAssignments[0];
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
  requireField(
    failures,
    scope,
    "Actual Overtime Work",
    assignment.actualOvertimeWork,
    candidateAssignment.actualOvertimeWork,
    "duration"
  );
  requireField(
    failures,
    scope,
    "Remaining Overtime Work",
    assignment.remainingOvertimeWork,
    candidateAssignment.remainingOvertimeWork,
    "duration"
  );
  requireField(failures, scope, "Stop", assignment.stop, transaction.actualFinish);
  requireField(failures, scope, "Resume", assignment.resume, transaction.actualFinish);

  const rows = assignment.timephasedData ?? [];
  if (rows.length !== 1) {
    failures.push(`${scope} timephased row count mismatch: result ${rows.length}, expected 1.`);
  } else {
    const row = rows[0];
    requireField(failures, scope, "timephased Type", row.type, "2");
    requireField(failures, scope, "timephased UID", row.uid, transaction.assignmentUid);
    requireField(failures, scope, "timephased Start", row.start, transaction.assignmentTimephased.start);
    requireField(failures, scope, "timephased Finish", row.finish, transaction.assignmentTimephased.finish);
    requireField(failures, scope, "timephased Unit", row.unit, transaction.assignmentTimephased.unit);
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

function allAssignments(project) {
  if (Array.isArray(project?.assignments)) return project.assignments.slice();
  const flattened = [];
  for (const assignments of project?.assignmentsByTaskUid?.values?.() ?? []) {
    flattened.push(...assignments);
  }
  return flattened;
}

function assignmentIdentityRows(project) {
  return allAssignments(project)
    .map((assignment) =>
      [assignment?.uid, assignment?.taskUid, assignment?.resourceUid]
        .map((value) => normalizedText(value))
        .join("|")
    )
    .sort();
}

function validateAssignmentClosure(candidate, result) {
  const failures = [];
  compareCanonicalSets(
    failures,
    "Project assignment UID/TaskUID/ResourceUID closure",
    assignmentIdentityRows(candidate),
    assignmentIdentityRows(result)
  );
  return { pass: failures.length === 0, failures };
}

function resourceIdentityIndex(project) {
  if (project?.resourceByUid instanceof Map) return project.resourceByUid;
  if (Array.isArray(project?.resources)) {
    return new Map(
      project.resources
        .filter((resource) => resource?.uid != null && resource.uid !== "")
        .map((resource) => [String(resource.uid), resource])
    );
  }

  const document = project?.document;
  const root = document?.documentElement;
  if (!root) return null;
  const namespace = root.namespaceURI;
  const resources = Array.from(document.getElementsByTagNameNS(namespace, "Resource"));
  const index = new Map();
  for (const element of resources) {
    const uid = directChildText(element, "UID");
    if (uid == null || uid === "") continue;
    index.set(String(uid), {
      uid,
      name: directChildText(element, "Name"),
      type: directChildText(element, "Type"),
      initials: directChildText(element, "Initials"),
      group: directChildText(element, "Group")
    });
  }
  return index;
}

function resourceFingerprint(resource) {
  return [resource?.uid, resource?.name, resource?.type, resource?.initials, resource?.group]
    .map((value) => normalizedText(value))
    .join("|");
}

function validateReferencedResources(candidate, result) {
  const failures = [];
  const candidateResources = resourceIdentityIndex(candidate);
  const resultResources = resourceIdentityIndex(result);
  if (!candidateResources && !resultResources) {
    return { pass: true, checkedResourceCount: 0, failures };
  }
  if (!candidateResources || !resultResources) {
    failures.push("Referenced resource identity data is unavailable in either the candidate or result.");
    return { pass: false, checkedResourceCount: 0, failures };
  }

  const referenced = [...new Set(allAssignments(candidate).map((assignment) => String(assignment?.resourceUid ?? "")))]
    .filter((uid) => candidateResources.has(uid))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  for (const uid of referenced) {
    const candidateResource = candidateResources.get(uid);
    const resultResource = resultResources.get(uid);
    if (!resultResource) {
      failures.push(`Referenced Resource UID ${uid} is missing from the result.`);
      continue;
    }
    const candidateFingerprint = resourceFingerprint(candidateResource);
    const resultFingerprint = resourceFingerprint(resultResource);
    if (candidateFingerprint !== resultFingerprint) {
      failures.push(
        `Referenced Resource UID ${uid} identity mismatch: result ${resultFingerprint || "—"}, expected ${candidateFingerprint || "—"}.`
      );
    }
  }

  return { pass: failures.length === 0, checkedResourceCount: referenced.length, failures };
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
    requireField(failures, assignmentScope, "Resource UID", resultAssignment.resourceUid, candidateAssignment.resourceUid);
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

  const assignmentClosure = validateAssignmentClosure(candidate, result);
  failures.push(...assignmentClosure.failures);

  const referencedResources = validateReferencedResources(candidate, result);
  failures.push(...referencedResources.failures);

  let coherentTaskCount = 0;
  let coherentAssignmentCount = 0;
  let typeElevenTaskCount = 0;
  for (const transaction of transactions) {
    const taskCheck = validateExactTask(result?.taskByUid?.get(String(transaction.taskUid)), transaction);
    if (taskCheck.pass) coherentTaskCount += 1;
    if (taskCheck.typeElevenPass) typeElevenTaskCount += 1;
    failures.push(...taskCheck.failures);

    const assignmentCheck = validateExactAssignment(
      sortedAssignments(candidate, transaction.taskUid),
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
    schedulingStructurePreserved: projectCheck.schedulingStructurePreserved,
    assignmentClosurePreserved: assignmentClosure.pass,
    referencedResourcesPreserved: referencedResources.pass,
    referencedResourceCount: referencedResources.checkedResourceCount,
    projectInvariantCount: projectCheck.invariantCount,
    coherentTaskCount,
    coherentAssignmentCount,
    typeElevenTaskCount,
    untouchedPreservedCount,
    touchedTaskCount: transactions.length,
    untouchedTaskCount: untouchedTaskUids.length,
    failures
  };
}
