import {
  MSPDI_NAMESPACE,
  applyTaskScalarDiagnostic as applyTaskScalarDiagnosticCore,
  candidateFilename,
  decodeXmlBytes,
  encodeXmlText,
  parseProjectXml as parseProjectXmlCore,
  sha256Hex
} from "./project-xml-core.js";

export { MSPDI_NAMESPACE, candidateFilename, decodeXmlBytes, encodeXmlText, sha256Hex };

const COMPARISON_TASK_FIELDS = Object.freeze([
  ["Task ID", "id"],
  ["Task name", "name"],
  ["WBS", "wbs"],
  ["Outline number", "outlineNumber"],
  ["Summary", "summary"],
  ["Start", "start"],
  ["Finish", "finish"],
  ["Duration", "duration"],
  ["Percent complete", "percentComplete"],
  ["Percent work complete", "percentWorkComplete"],
  ["Actual start", "actualStart"],
  ["Actual finish", "actualFinish"],
  ["Actual duration", "actualDuration"],
  ["Remaining duration", "remainingDuration"],
  ["Work", "work"],
  ["Actual work", "actualWork"],
  ["Remaining work", "remainingWork"],
  ["Stop", "stop"],
  ["Resume", "resume"],
  ["Critical", "critical"],
  ["Total slack", "totalSlack"],
  ["Free slack", "freeSlack"]
]);

const TASK_IDENTITY_FIELDS = Object.freeze([
  ["ID", "id"],
  ["Name", "name"],
  ["WBS", "wbs"],
  ["Summary", "summary"]
]);

const INSERT_ANCHORS = Object.freeze({
  PercentComplete: [
    "PercentWorkComplete",
    "Cost",
    "OvertimeCost",
    "OvertimeWork",
    "ActualStart",
    "ActualFinish",
    "ActualDuration",
    "RemainingDuration"
  ],
  ActualStart: ["ActualFinish", "ActualDuration", "ActualCost", "ActualWork", "RemainingDuration"],
  ActualFinish: ["ActualDuration", "ActualCost", "ActualWork", "RemainingDuration"]
});

function directChildText(element, localName) {
  for (const child of element.children) {
    if (child.localName === localName) {
      return child.textContent?.trim() ?? "";
    }
  }
  return null;
}

function parseTimephasedElement(element, parentType, ownerUid) {
  return {
    parentType: parentType ?? null,
    ownerUid: ownerUid ?? null,
    uid: directChildText(element, "UID"),
    type: directChildText(element, "Type"),
    start: directChildText(element, "Start"),
    finish: directChildText(element, "Finish"),
    unit: directChildText(element, "Unit"),
    value: directChildText(element, "Value")
  };
}

function directTimephasedData(element) {
  const parentType = element.localName;
  const ownerUid = directChildText(element, "UID");
  return Array.from(element.children)
    .filter((child) => child.localName === "TimephasedData")
    .map((child) => parseTimephasedElement(child, parentType, ownerUid));
}

function buildUniqueIndex(items, keySelector, label) {
  const index = new Map();
  for (const item of items) {
    const rawKey = keySelector(item);
    if (rawKey == null || rawKey === "") {
      continue;
    }
    const key = String(rawKey);
    if (index.has(key)) {
      throw new Error(`Duplicate ${label} ${key} in Project XML.`);
    }
    index.set(key, item);
  }
  return index;
}

function addHierarchyPaths(parsed) {
  const summariesByOutline = new Map(
    parsed.tasks
      .filter((task) => task.summary && task.outlineNumber)
      .map((task) => [String(task.outlineNumber), task])
  );

  for (const task of parsed.tasks) {
    const segments = String(task.outlineNumber ?? "").split(".").filter(Boolean);
    const names = [];
    for (let depth = 1; depth < segments.length; depth += 1) {
      const summary = summariesByOutline.get(segments.slice(0, depth).join("."));
      if (summary?.name) {
        names.push(summary.name);
      }
    }
    task.hierarchyPath = names.join(" › ");
  }
}

function enrichParsedProject(parsed) {
  const taskElements = Array.from(parsed.document.getElementsByTagNameNS(MSPDI_NAMESPACE, "Task"));
  parsed.tasks.forEach((task, index) => {
    const element = taskElements[index];
    if (!element) {
      return;
    }
    task.isNull = directChildText(element, "IsNull") === "1";
    task.critical = directChildText(element, "Critical");
    task.totalSlack = directChildText(element, "TotalSlack");
    task.freeSlack = directChildText(element, "FreeSlack");
    task.stop = directChildText(element, "Stop");
    task.resume = directChildText(element, "Resume");
    task.timephasedData = directTimephasedData(element);
  });

  const assignmentElements = Array.from(
    parsed.document.getElementsByTagNameNS(MSPDI_NAMESPACE, "Assignment")
  );
  parsed.assignments.forEach((assignment, index) => {
    const element = assignmentElements[index];
    if (!element) {
      return;
    }
    assignment.stop = directChildText(element, "Stop");
    assignment.resume = directChildText(element, "Resume");
    assignment.actualOvertimeWork = directChildText(element, "ActualOvertimeWork");
    assignment.remainingOvertimeWork = directChildText(element, "RemainingOvertimeWork");
    assignment.timephasedData = directTimephasedData(element);
  });

  const allTimephasedElements = Array.from(
    parsed.document.getElementsByTagNameNS(MSPDI_NAMESPACE, "TimephasedData")
  );
  parsed.timephasedData = allTimephasedElements.map((element) => {
    const parent = element.parentElement;
    return parseTimephasedElement(
      element,
      parent?.localName ?? null,
      parent ? directChildText(parent, "UID") : null
    );
  });

  parsed.taskByUid = buildUniqueIndex(parsed.tasks, (task) => task.uid, "task UID");
  buildUniqueIndex(parsed.assignments, (assignment) => assignment.uid, "assignment UID");
  parsed.leafTasks = parsed.tasks.filter((task) => !task.isNull && !task.summary && task.active);
  parsed.summaryTasks = parsed.tasks.filter((task) => task.summary);
  addHierarchyPaths(parsed);
  return parsed;
}

export function parseProjectXml(xmlText) {
  return enrichParsedProject(parseProjectXmlCore(xmlText));
}

function readScalarFromBlock(block, field) {
  const expression = new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${field}\\b[^>]*>\\s*([\\s\\S]*?)\\s*<\\/(?:[A-Za-z_][\\w.-]*:)?${field}>`
  );
  const match = expression.exec(block);
  return match
    ? match[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim()
    : null;
}

function hasScalar(block, field) {
  return new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${field}\\b`).test(block);
}

function preflightTaskShape(block, entry) {
  for (const field of ["PercentComplete", "ActualStart", "ActualFinish"]) {
    if (entry.fields[field] == null || hasScalar(block, field)) {
      continue;
    }
    const anchor = (INSERT_ANCHORS[field] ?? []).find((candidate) => hasScalar(block, candidate));
    if (!anchor) {
      throw new Error(
        `Task UID ${entry.taskUid} cannot safely insert ${field}: no verified MSPDI ordering anchor is present.`
      );
    }
  }
}

function targetedTaskBlocks(sourceXml, patchEntries) {
  const targets = new Map(
    patchEntries
      .filter(
        (entry) => entry?.taskUid != null && entry?.fields && Object.keys(entry.fields).length > 0
      )
      .map((entry) => [String(entry.taskUid), entry])
  );
  const counts = new Map(Array.from(targets.keys(), (uid) => [uid, 0]));
  const taskExpression = /<((?:[A-Za-z_][\w.-]*:)?Task)\b[^>]*>[\s\S]*?<\/\1>/g;

  for (const match of sourceXml.matchAll(taskExpression)) {
    const uid = readScalarFromBlock(match[0], "UID");
    if (uid == null || !targets.has(String(uid))) {
      continue;
    }
    counts.set(String(uid), (counts.get(String(uid)) ?? 0) + 1);
    preflightTaskShape(match[0], targets.get(String(uid)));
  }

  for (const [uid, count] of counts) {
    if (count === 0) {
      throw new Error(`Candidate generation could not find task UID ${uid}.`);
    }
    if (count > 1) {
      throw new Error(`Duplicate task UID ${uid} in source XML.`);
    }
  }
}

export function applyTaskScalarDiagnostic(sourceXml, patchEntries) {
  targetedTaskBlocks(sourceXml, patchEntries);
  return applyTaskScalarDiagnosticCore(sourceXml, patchEntries);
}

function normalizedIdentityValue(task, property) {
  if (property === "summary") {
    return task?.summary ? "1" : "0";
  }
  return task?.[property] == null ? "" : String(task[property]);
}

function taskIdentityDifferences(candidateTask, resultTask) {
  const differences = [];
  for (const [label, property] of TASK_IDENTITY_FIELDS) {
    const candidateValue = normalizedIdentityValue(candidateTask, property);
    const resultValue = normalizedIdentityValue(resultTask, property);
    if (candidateValue !== resultValue) {
      differences.push(`${label}: candidate ${candidateValue || "—"}, result ${resultValue || "—"}`);
    }
  }
  return differences;
}

function sortedTaskUids(project) {
  return Array.from(project?.taskByUid?.keys?.() ?? [], String).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true })
  );
}

export function classifyProjectResultCompatibility({ candidate, result, touchedTaskUids = [] }) {
  if (!candidate?.taskByUid || !result?.taskByUid) {
    throw new Error("Candidate and result task indexes are required for result classification.");
  }

  const warnings = [];
  const candidateProject = candidate.project ?? {};
  const resultProject = result.project ?? {};

  if (candidateProject.uid && resultProject.uid && String(candidateProject.uid) !== String(resultProject.uid)) {
    warnings.push(`Project UID changed from ${candidateProject.uid} to ${resultProject.uid}.`);
  }
  if (
    candidateProject.guid &&
    resultProject.guid &&
    String(candidateProject.guid) !== String(resultProject.guid)
  ) {
    warnings.push(`Project GUID changed from ${candidateProject.guid} to ${resultProject.guid}.`);
  }
  if (
    candidateProject.name &&
    resultProject.name &&
    String(candidateProject.name) !== String(resultProject.name)
  ) {
    warnings.push(`Project name changed from ${candidateProject.name} to ${resultProject.name}.`);
  }

  const touched = [...new Set(touchedTaskUids.map(String))];
  for (const uid of touched) {
    const candidateTask = candidate.taskByUid.get(uid);
    const resultTask = result.taskByUid.get(uid);
    if (!candidateTask) {
      throw new Error(`Touched task UID ${uid} is missing from the candidate task index.`);
    }
    if (!resultTask) {
      throw new Error(`Touched task UID ${uid} is missing from the Project result.`);
    }
    const differences = taskIdentityDifferences(candidateTask, resultTask);
    if (differences.length > 0) {
      throw new Error(`Touched task UID ${uid} identity mismatch: ${differences.join("; ")}.`);
    }
  }

  const candidateUids = sortedTaskUids(candidate);
  const resultUids = sortedTaskUids(result);
  const candidateSet = new Set(candidateUids);
  const resultSet = new Set(resultUids);
  const missingFromResult = candidateUids.filter((uid) => !resultSet.has(uid));
  const addedInResult = resultUids.filter((uid) => !candidateSet.has(uid));
  const identityMismatches = [];

  for (const uid of candidateUids) {
    if (!resultSet.has(uid)) {
      continue;
    }
    const differences = taskIdentityDifferences(candidate.taskByUid.get(uid), result.taskByUid.get(uid));
    if (differences.length > 0) {
      identityMismatches.push({ uid, differences });
    }
  }

  if (missingFromResult.length > 0 || addedInResult.length > 0) {
    warnings.push(
      `Task set differs: ${missingFromResult.length} candidate task(s) missing and ${addedInResult.length} result task(s) added.`
    );
  }
  if (identityMismatches.length > 0) {
    warnings.push(`${identityMismatches.length} common task identity fingerprint(s) changed.`);
  }

  const strict =
    missingFromResult.length === 0 &&
    addedInResult.length === 0 &&
    identityMismatches.length === 0;

  return {
    classification: strict ? "strict-result" : "reference",
    label: strict ? "Strict candidate result" : "Reference schedule",
    identityMethod: strict
      ? "complete task UID/ID/name/WBS/summary fingerprint"
      : touched.length > 0
        ? "touched task UID/ID/name/WBS/summary fingerprint; broader task set differs"
        : "task-set comparison only; no touched task fingerprint was supplied",
    warnings,
    projectIdentifiers: {
      candidateUid: candidateProject.uid ?? null,
      resultUid: resultProject.uid ?? null,
      candidateGuid: candidateProject.guid ?? null,
      resultGuid: resultProject.guid ?? null,
      candidateName: candidateProject.name ?? null,
      resultName: resultProject.name ?? null
    },
    taskSet: {
      candidateCount: candidateUids.length,
      resultCount: resultUids.length,
      missingFromResult,
      addedInResult,
      identityMismatches
    },
    touchedTaskUids: touched
  };
}

function checksumText(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function summarizeTimephasedRows(rows = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const parentCounts = new Map();
  const typeCounts = new Map();

  for (const row of normalizedRows) {
    const parent = row.parentType || "Unknown";
    const type = row.type == null || row.type === "" ? "—" : String(row.type);
    parentCounts.set(parent, (parentCounts.get(parent) ?? 0) + 1);
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  const canonical = normalizedRows
    .map((row) =>
      [
        row.parentType,
        row.ownerUid,
        row.uid,
        row.type,
        row.start,
        row.finish,
        row.unit,
        row.value
      ]
        .map((value) => value ?? "")
        .join("|")
    )
    .sort()
    .join("\n");

  const parentSummary = Array.from(parentCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([parent, count]) => `${parent} ${count}`)
    .join(", ");
  const typeSummary = Array.from(typeCounts)
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([type, count]) => `${type}=${count}`)
    .join(", ");

  return [
    `${normalizedRows.length} rows`,
    `parents ${parentSummary || "none"}`,
    `types ${typeSummary || "none"}`,
    `checksum ${checksumText(canonical)}`
  ].join(" · ");
}

function timephasedRowsForProject(project, parentType = null) {
  if (Array.isArray(project?.timephasedData)) {
    return parentType
      ? project.timephasedData.filter((row) => row.parentType === parentType)
      : project.timephasedData;
  }

  const rows = [];
  for (const task of project?.taskByUid?.values?.() ?? []) {
    for (const row of task.timephasedData ?? []) {
      rows.push({ ...row, parentType: row.parentType ?? "Task", ownerUid: row.ownerUid ?? task.uid });
    }
  }
  for (const assignments of project?.assignmentsByTaskUid?.values?.() ?? []) {
    for (const assignment of assignments) {
      for (const row of assignment.timephasedData ?? []) {
        rows.push({
          ...row,
          parentType: row.parentType ?? "Assignment",
          ownerUid: row.ownerUid ?? assignment.uid
        });
      }
    }
  }
  return parentType ? rows.filter((row) => row.parentType === parentType) : rows;
}

function taskTimephasedSummary(task) {
  return summarizeTimephasedRows(task?.timephasedData ?? []);
}

function assignmentSummary(project, taskUid) {
  const assignments = project?.assignmentsByTaskUid?.get(String(taskUid)) ?? [];
  if (assignments.length === 0) {
    return "No assignments";
  }

  return assignments
    .slice()
    .sort((left, right) =>
      String(left.uid ?? "").localeCompare(String(right.uid ?? ""), undefined, { numeric: true })
    )
    .map((assignment) =>
      [
        `UID ${assignment.uid ?? "—"}`,
        `%Work ${assignment.percentWorkComplete ?? "—"}`,
        `Work ${assignment.work ?? "—"}`,
        `ActualWork ${assignment.actualWork ?? "—"}`,
        `RemainingWork ${assignment.remainingWork ?? "—"}`,
        `Start ${assignment.start ?? "—"}`,
        `Finish ${assignment.finish ?? "—"}`,
        `ActualStart ${assignment.actualStart ?? "—"}`,
        `ActualFinish ${assignment.actualFinish ?? "—"}`,
        `Stop ${assignment.stop ?? "—"}`,
        `Resume ${assignment.resume ?? "—"}`,
        `ActualOT ${assignment.actualOvertimeWork ?? "—"}`,
        `RemainingOT ${assignment.remainingOvertimeWork ?? "—"}`,
        `Timephased ${summarizeTimephasedRows(assignment.timephasedData ?? [])}`
      ].join(" · ")
    )
    .join(" | ");
}

function displayValue(value) {
  return value == null || value === "" ? "—" : String(value);
}

function valuesDiffer(values) {
  return new Set(values).size > 1;
}

function unionTaskUids(...projects) {
  const result = new Set();
  for (const project of projects) {
    for (const uid of project?.taskByUid?.keys?.() ?? []) {
      result.add(String(uid));
    }
  }
  return result;
}

function taskHasComparisonDifference(source, candidate, result, taskUid) {
  const tasks = [source, candidate, result].map((project) =>
    project?.taskByUid?.get(String(taskUid))
  );
  if (
    COMPARISON_TASK_FIELDS.some(([, property]) =>
      valuesDiffer(tasks.map((task) => displayValue(task?.[property])))
    )
  ) {
    return true;
  }
  return valuesDiffer([source, candidate, result].map((project) => assignmentSummary(project, taskUid)));
}

function comparisonRow(key, label, sourceValue, candidateValue, resultValue) {
  return {
    key,
    label,
    source: displayValue(sourceValue),
    candidate: displayValue(candidateValue),
    result: displayValue(resultValue)
  };
}

export function buildComparisonRows({ source, candidate, result, taskUids = [] }) {
  const rows = [
    comparisonRow("project-uid", "Project · UID", source?.project?.uid, candidate?.project?.uid, result?.project?.uid),
    comparisonRow("project-guid", "Project · GUID", source?.project?.guid, candidate?.project?.guid, result?.project?.guid),
    comparisonRow("project-name", "Project · Name", source?.project?.name, candidate?.project?.name, result?.project?.name),
    comparisonRow("project-start", "Project · Start date", source?.project?.startDate, candidate?.project?.startDate, result?.project?.startDate),
    comparisonRow("project-finish", "Project · Finish date", source?.project?.finishDate, candidate?.project?.finishDate, result?.project?.finishDate),
    comparisonRow("project-current-date", "Project · Current date", source?.project?.currentDate, candidate?.project?.currentDate, result?.project?.currentDate),
    comparisonRow("project-status-date", "Project · Status date", source?.project?.statusDate, candidate?.project?.statusDate, result?.project?.statusDate),
    comparisonRow(
      "project-timephased-all",
      "Project · All timephased data",
      summarizeTimephasedRows(timephasedRowsForProject(source)),
      summarizeTimephasedRows(timephasedRowsForProject(candidate)),
      summarizeTimephasedRows(timephasedRowsForProject(result))
    ),
    comparisonRow(
      "project-timephased-task",
      "Project · Task timephased data",
      summarizeTimephasedRows(timephasedRowsForProject(source, "Task")),
      summarizeTimephasedRows(timephasedRowsForProject(candidate, "Task")),
      summarizeTimephasedRows(timephasedRowsForProject(result, "Task"))
    ),
    comparisonRow(
      "project-timephased-resource",
      "Project · Resource timephased data",
      summarizeTimephasedRows(timephasedRowsForProject(source, "Resource")),
      summarizeTimephasedRows(timephasedRowsForProject(candidate, "Resource")),
      summarizeTimephasedRows(timephasedRowsForProject(result, "Resource"))
    ),
    comparisonRow(
      "project-timephased-assignment",
      "Project · Assignment timephased data",
      summarizeTimephasedRows(timephasedRowsForProject(source, "Assignment")),
      summarizeTimephasedRows(timephasedRowsForProject(candidate, "Assignment")),
      summarizeTimephasedRows(timephasedRowsForProject(result, "Assignment"))
    )
  ];

  const explicitTaskUids = new Set(taskUids.map(String));
  const selected = new Set(explicitTaskUids);
  for (const uid of unionTaskUids(source, candidate, result)) {
    if (taskHasComparisonDifference(source, candidate, result, uid)) {
      selected.add(uid);
    }
  }

  const orderedTaskUids = Array.from(selected).sort((left, right) => {
    const leftTask =
      source?.taskByUid?.get(left) ?? candidate?.taskByUid?.get(left) ?? result?.taskByUid?.get(left);
    const rightTask =
      source?.taskByUid?.get(right) ?? candidate?.taskByUid?.get(right) ?? result?.taskByUid?.get(right);
    const leftId = Number(leftTask?.id);
    const rightId = Number(rightTask?.id);
    if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
      return leftId - rightId;
    }
    return left.localeCompare(right, undefined, { numeric: true });
  });

  for (const taskUid of orderedTaskUids) {
    const sourceTask = source?.taskByUid?.get(taskUid);
    const candidateTask = candidate?.taskByUid?.get(taskUid);
    const resultTask = result?.taskByUid?.get(taskUid);
    const taskName = sourceTask?.name ?? candidateTask?.name ?? resultTask?.name ?? `Task UID ${taskUid}`;
    const context = sourceTask?.summary || candidateTask?.summary || resultTask?.summary ? "summary" : "leaf";

    for (const [label, property] of COMPARISON_TASK_FIELDS) {
      const values = [sourceTask?.[property], candidateTask?.[property], resultTask?.[property]].map(displayValue);
      if (!explicitTaskUids.has(taskUid) && !valuesDiffer(values)) {
        continue;
      }
      rows.push({
        key: `${taskUid}-${property}`,
        label: `${taskName} · ${context} · ${label}`,
        source: values[0],
        candidate: values[1],
        result: values[2]
      });
    }

    const taskTimephasedValues = [sourceTask, candidateTask, resultTask].map(taskTimephasedSummary);
    if (explicitTaskUids.has(taskUid) || valuesDiffer(taskTimephasedValues)) {
      rows.push({
        key: `${taskUid}-task-timephased`,
        label: `${taskName} · ${context} · Task timephased data`,
        source: taskTimephasedValues[0],
        candidate: taskTimephasedValues[1],
        result: taskTimephasedValues[2]
      });
    }

    const assignmentValues = [source, candidate, result].map((project) =>
      assignmentSummary(project, taskUid)
    );
    if (explicitTaskUids.has(taskUid) || valuesDiffer(assignmentValues)) {
      rows.push({
        key: `${taskUid}-assignments`,
        label: `${taskName} · ${context} · Assignment progress`,
        source: assignmentValues[0],
        candidate: assignmentValues[1],
        result: assignmentValues[2]
      });
    }
  }

  return rows;
}
