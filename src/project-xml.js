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
  ["Task ID", "id"], ["Task name", "name"], ["WBS", "wbs"], ["Outline number", "outlineNumber"],
  ["Summary", "summary"], ["Start", "start"], ["Finish", "finish"], ["Duration", "duration"],
  ["Percent complete", "percentComplete"], ["Percent work complete", "percentWorkComplete"],
  ["Actual start", "actualStart"], ["Actual finish", "actualFinish"], ["Actual duration", "actualDuration"],
  ["Remaining duration", "remainingDuration"], ["Work", "work"], ["Actual work", "actualWork"],
  ["Remaining work", "remainingWork"], ["Critical", "critical"], ["Total slack", "totalSlack"], ["Free slack", "freeSlack"]
]);

const INSERT_ANCHORS = Object.freeze({
  PercentComplete: ["PercentWorkComplete", "Cost", "OvertimeCost", "OvertimeWork", "ActualStart", "ActualFinish", "ActualDuration", "RemainingDuration"],
  ActualStart: ["ActualFinish", "ActualDuration", "ActualCost", "ActualWork", "RemainingDuration"],
  ActualFinish: ["ActualDuration", "ActualCost", "ActualWork", "RemainingDuration"]
});

function directChildText(element, localName) {
  for (const child of element.children) if (child.localName === localName) return child.textContent?.trim() ?? "";
  return null;
}

function buildUniqueIndex(items, keySelector, label) {
  const index = new Map();
  for (const item of items) {
    const rawKey = keySelector(item);
    if (rawKey == null || rawKey === "") continue;
    const key = String(rawKey);
    if (index.has(key)) throw new Error(`Duplicate ${label} ${key} in Project XML.`);
    index.set(key, item);
  }
  return index;
}

function addHierarchyPaths(parsed) {
  const summariesByOutline = new Map(
    parsed.tasks.filter((task) => task.summary && task.outlineNumber).map((task) => [String(task.outlineNumber), task])
  );
  for (const task of parsed.tasks) {
    const outline = String(task.outlineNumber ?? "");
    const segments = outline.split(".").filter(Boolean);
    const names = [];
    for (let depth = 1; depth < segments.length; depth += 1) {
      const summary = summariesByOutline.get(segments.slice(0, depth).join("."));
      if (summary?.name) names.push(summary.name);
    }
    task.hierarchyPath = names.join(" › ");
  }
}

function enrichParsedProject(parsed) {
  const taskElements = Array.from(parsed.document.getElementsByTagNameNS(MSPDI_NAMESPACE, "Task"));
  parsed.tasks.forEach((task, index) => {
    const element = taskElements[index];
    if (!element) return;
    task.isNull = directChildText(element, "IsNull") === "1";
    task.critical = directChildText(element, "Critical");
    task.totalSlack = directChildText(element, "TotalSlack");
    task.freeSlack = directChildText(element, "FreeSlack");
  });

  const assignmentElements = Array.from(parsed.document.getElementsByTagNameNS(MSPDI_NAMESPACE, "Assignment"));
  parsed.assignments.forEach((assignment, index) => {
    const element = assignmentElements[index];
    if (!element) return;
    assignment.stop = directChildText(element, "Stop");
    assignment.resume = directChildText(element, "Resume");
    assignment.actualOvertimeWork = directChildText(element, "ActualOvertimeWork");
    assignment.remainingOvertimeWork = directChildText(element, "RemainingOvertimeWork");
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
  const expression = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${field}\\b[^>]*>\\s*([\\s\\S]*?)\\s*<\\/(?:[A-Za-z_][\\w.-]*:)?${field}>`);
  const match = expression.exec(block);
  return match ? match[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim() : null;
}

function hasScalar(block, field) {
  return new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${field}\\b`).test(block);
}

function preflightTaskShape(block, entry) {
  for (const field of ["PercentComplete", "ActualStart", "ActualFinish"]) {
    if (entry.fields[field] == null || hasScalar(block, field)) continue;
    const anchor = (INSERT_ANCHORS[field] ?? []).find((candidate) => hasScalar(block, candidate));
    if (!anchor) {
      throw new Error(`Task UID ${entry.taskUid} cannot safely insert ${field}: no verified MSPDI ordering anchor is present.`);
    }
  }
}

function targetedTaskBlocks(sourceXml, patchEntries) {
  const targets = new Map(
    patchEntries.filter((entry) => entry?.taskUid != null && entry?.fields && Object.keys(entry.fields).length > 0)
      .map((entry) => [String(entry.taskUid), entry])
  );
  const counts = new Map(Array.from(targets.keys(), (uid) => [uid, 0]));
  const taskExpression = /<((?:[A-Za-z_][\w.-]*:)?Task)\b[^>]*>[\s\S]*?<\/\1>/g;
  for (const match of sourceXml.matchAll(taskExpression)) {
    const uid = readScalarFromBlock(match[0], "UID");
    if (uid == null || !targets.has(String(uid))) continue;
    counts.set(String(uid), (counts.get(String(uid)) ?? 0) + 1);
    preflightTaskShape(match[0], targets.get(String(uid)));
  }
  for (const [uid, count] of counts) {
    if (count === 0) throw new Error(`Candidate generation could not find task UID ${uid}.`);
    if (count > 1) throw new Error(`Duplicate task UID ${uid} in source XML.`);
  }
}

export function applyTaskScalarDiagnostic(sourceXml, patchEntries) {
  targetedTaskBlocks(sourceXml, patchEntries);
  return applyTaskScalarDiagnosticCore(sourceXml, patchEntries);
}

export function assertProjectIdentityCompatible(sourceProject, resultProject) {
  const source = sourceProject?.project ?? sourceProject ?? {};
  const result = resultProject?.project ?? resultProject ?? {};
  if (source.uid && result.uid && String(source.uid) !== String(result.uid)) {
    throw new Error(`Project UID mismatch: source ${source.uid}, result ${result.uid}.`);
  }
  if (source.guid && result.guid && String(source.guid) !== String(result.guid)) {
    throw new Error(`Project GUID mismatch: source ${source.guid}, result ${result.guid}.`);
  }
  if (source.uid && result.uid) return { method: "UID", value: String(source.uid) };
  if (source.guid && result.guid) return { method: "GUID", value: String(source.guid) };
  if (source.name && result.name && String(source.name) === String(result.name)) return { method: "name fallback", value: String(source.name) };
  if ((source.uid || source.guid || source.name) && (result.uid || result.guid || result.name)) {
    throw new Error("Project identity could not be matched using like-for-like UID, GUID, or name fallback.");
  }
  return { method: "unverified", value: null };
}

function checksumText(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function timephasedDigest(rows) {
  const canonical = rows.map((row) => [row.uid, row.type, row.start, row.finish, row.unit, row.value].map((value) => value ?? "").join("|"))
    .sort().join("\n");
  return `${rows.length} rows · ${checksumText(canonical)}`;
}

function assignmentSummary(project, taskUid) {
  const assignments = project?.assignmentsByTaskUid?.get(String(taskUid)) ?? [];
  if (assignments.length === 0) return "No assignments";
  return assignments.slice().sort((left, right) => String(left.uid ?? "").localeCompare(String(right.uid ?? ""), undefined, { numeric: true }))
    .map((assignment) => [
      `UID ${assignment.uid ?? "—"}`, `%Work ${assignment.percentWorkComplete ?? "—"}`, `Work ${assignment.work ?? "—"}`,
      `ActualWork ${assignment.actualWork ?? "—"}`, `RemainingWork ${assignment.remainingWork ?? "—"}`,
      `Start ${assignment.start ?? "—"}`, `Finish ${assignment.finish ?? "—"}`, `ActualStart ${assignment.actualStart ?? "—"}`,
      `ActualFinish ${assignment.actualFinish ?? "—"}`, `Stop ${assignment.stop ?? "—"}`, `Resume ${assignment.resume ?? "—"}`,
      `ActualOT ${assignment.actualOvertimeWork ?? "—"}`, `RemainingOT ${assignment.remainingOvertimeWork ?? "—"}`,
      `Timephased ${timephasedDigest(assignment.timephasedData)}`
    ].join(" · ")).join(" | ");
}

function displayValue(value) { return value == null || value === "" ? "—" : String(value); }
function valuesDiffer(values) { return new Set(values).size > 1; }
function unionTaskUids(...projects) {
  const result = new Set();
  for (const project of projects) for (const uid of project?.taskByUid?.keys?.() ?? []) result.add(String(uid));
  return result;
}

function taskHasComparisonDifference(source, candidate, result, taskUid) {
  const tasks = [source, candidate, result].map((project) => project?.taskByUid?.get(String(taskUid)));
  if (COMPARISON_TASK_FIELDS.some(([, property]) => valuesDiffer(tasks.map((task) => displayValue(task?.[property]))))) return true;
  return valuesDiffer([source, candidate, result].map((project) => assignmentSummary(project, taskUid)));
}

export function buildComparisonRows({ source, candidate, result, taskUids = [] }) {
  const rows = [
    ["project-start", "Project · Start date", source?.project?.startDate, candidate?.project?.startDate, result?.project?.startDate],
    ["project-finish", "Project · Finish date", source?.project?.finishDate, candidate?.project?.finishDate, result?.project?.finishDate],
    ["project-current-date", "Project · Current date", source?.project?.currentDate, candidate?.project?.currentDate, result?.project?.currentDate],
    ["project-status-date", "Project · Status date", source?.project?.statusDate, candidate?.project?.statusDate, result?.project?.statusDate]
  ].map(([key, label, sourceValue, candidateValue, resultValue]) => ({
    key, label, source: displayValue(sourceValue), candidate: displayValue(candidateValue), result: displayValue(resultValue)
  }));

  const explicitTaskUids = new Set(taskUids.map(String));
  const selected = new Set(explicitTaskUids);
  for (const uid of unionTaskUids(source, candidate, result)) if (taskHasComparisonDifference(source, candidate, result, uid)) selected.add(uid);

  const orderedTaskUids = Array.from(selected).sort((left, right) => {
    const leftTask = source?.taskByUid?.get(left) ?? candidate?.taskByUid?.get(left) ?? result?.taskByUid?.get(left);
    const rightTask = source?.taskByUid?.get(right) ?? candidate?.taskByUid?.get(right) ?? result?.taskByUid?.get(right);
    const leftId = Number(leftTask?.id); const rightId = Number(rightTask?.id);
    if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) return leftId - rightId;
    return left.localeCompare(right, undefined, { numeric: true });
  });

  for (const taskUid of orderedTaskUids) {
    const sourceTask = source?.taskByUid?.get(taskUid); const candidateTask = candidate?.taskByUid?.get(taskUid); const resultTask = result?.taskByUid?.get(taskUid);
    const taskName = sourceTask?.name ?? candidateTask?.name ?? resultTask?.name ?? `Task UID ${taskUid}`;
    const context = sourceTask?.summary || candidateTask?.summary || resultTask?.summary ? "summary" : "leaf";
    for (const [label, property] of COMPARISON_TASK_FIELDS) {
      const values = [sourceTask?.[property], candidateTask?.[property], resultTask?.[property]].map(displayValue);
      if (!explicitTaskUids.has(taskUid) && !valuesDiffer(values)) continue;
      rows.push({ key: `${taskUid}-${property}`, label: `${taskName} · ${context} · ${label}`, source: values[0], candidate: values[1], result: values[2] });
    }
    const assignmentValues = [source, candidate, result].map((project) => assignmentSummary(project, taskUid));
    if (explicitTaskUids.has(taskUid) || valuesDiffer(assignmentValues)) {
      rows.push({ key: `${taskUid}-assignments`, label: `${taskName} · ${context} · Assignment progress`, source: assignmentValues[0], candidate: assignmentValues[1], result: assignmentValues[2] });
    }
  }
  return rows;
}
