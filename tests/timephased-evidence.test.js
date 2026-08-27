import test from "node:test";
import assert from "node:assert/strict";
import { buildComparisonRows, summarizeTimephasedRows } from "../src/project-xml.js";

function timephased(parentType, ownerUid, type, value) {
  return {
    parentType,
    ownerUid: String(ownerUid),
    uid: String(ownerUid),
    type: String(type),
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    unit: "2",
    value
  };
}

function task(timephasedData = [], overrides = {}) {
  const uid = String(overrides.uid ?? "43");
  return {
    uid,
    id: String(overrides.id ?? uid),
    guid: overrides.guid ?? `GUID-${uid}`,
    name: overrides.name ?? `Task ${uid}`,
    wbs: overrides.wbs ?? uid,
    outlineNumber: overrides.outlineNumber ?? uid,
    summary: false,
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    duration: "PT8H0M0S",
    percentComplete: "100",
    percentWorkComplete: "100",
    actualStart: "2026-01-05T08:00:00",
    actualFinish: "2026-01-05T16:00:00",
    actualDuration: "PT8H0M0S",
    remainingDuration: "PT0H0M0S",
    work: "PT16H0M0S",
    actualWork: "PT16H0M0S",
    remainingWork: "PT0H0M0S",
    stop: "2026-01-05T16:00:00",
    resume: "2026-01-05T16:00:00",
    critical: "0",
    totalSlack: "0",
    freeSlack: "0",
    timephasedData,
    ...overrides,
    uid
  };
}

function project(taskRows, assignmentRows, resourceRows = []) {
  const taskValue = task(taskRows, { uid: "43", id: "7", name: "Assigned leaf", wbs: "1.1", outlineNumber: "1.1" });
  const assignment = {
    uid: "91",
    resourceUid: "5",
    percentWorkComplete: "100",
    work: "PT16H0M0S",
    actualWork: "PT16H0M0S",
    remainingWork: "PT0H0M0S",
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    actualStart: "2026-01-05T08:00:00",
    actualFinish: "2026-01-05T16:00:00",
    stop: "2026-01-05T16:00:00",
    resume: "2026-01-05T16:00:00",
    actualOvertimeWork: null,
    remainingOvertimeWork: null,
    timephasedData: assignmentRows
  };
  return {
    project: { name: "Plan", guid: "GUID" },
    taskByUid: new Map([["43", taskValue]]),
    assignmentsByTaskUid: new Map([["43", [assignment]]]),
    timephasedData: [...taskRows, ...assignmentRows, ...resourceRows]
  };
}

test("timephased summary records parent and type distributions", () => {
  const summary = summarizeTimephasedRows([
    timephased("Task", 43, 11, "100"),
    timephased("Assignment", 91, 2, "PT16H0M0S"),
    timephased("Resource", 5, 0, "PT16H0M0S")
  ]);

  assert.match(summary, /3 rows/);
  assert.match(summary, /Assignment 1/);
  assert.match(summary, /Resource 1/);
  assert.match(summary, /Task 1/);
  assert.match(summary, /11=1/);
});

test("comparison exposes task Type 11 and broad timephased normalization", () => {
  const sourceAssignment = [timephased("Assignment", 91, 1, "PT16H0M0S")];
  const sourceResource = [timephased("Resource", 5, 0, "PT16H0M0S")];
  const resultTask = [timephased("Task", 43, 11, "100")];
  const resultAssignment = [timephased("Assignment", 91, 2, "PT16H0M0S")];

  const source = project([], sourceAssignment, sourceResource);
  const candidate = project([], sourceAssignment, sourceResource);
  const result = project(resultTask, resultAssignment, []);

  const rows = buildComparisonRows({ source, candidate, result, taskUids: ["43"] });
  const allRow = rows.find((row) => row.key === "project-timephased-all");
  const taskRow = rows.find((row) => row.key === "43-task-timephased");

  assert.ok(allRow);
  assert.notEqual(allRow.candidate, allRow.result);
  assert.ok(taskRow);
  assert.match(taskRow.result, /11=1/);
});

test("an unrelated task is selected when only its task timephasing changes", () => {
  const stable = task([], { uid: "43", id: "7", name: "Tracked", wbs: "1.1", outlineNumber: "1.1" });
  const unrelatedSource = task([], { uid: "44", id: "8", name: "Unrelated", wbs: "1.2", outlineNumber: "1.2" });
  const unrelatedResult = task([timephased("Task", 44, 11, "100")], {
    uid: "44",
    id: "8",
    name: "Unrelated",
    wbs: "1.2",
    outlineNumber: "1.2"
  });

  const source = {
    project: { name: "Plan" },
    taskByUid: new Map([["43", stable], ["44", unrelatedSource]]),
    assignmentsByTaskUid: new Map(),
    timephasedData: []
  };
  const candidate = {
    project: { name: "Plan" },
    taskByUid: new Map([["43", stable], ["44", unrelatedSource]]),
    assignmentsByTaskUid: new Map(),
    timephasedData: []
  };
  const result = {
    project: { name: "Plan" },
    taskByUid: new Map([["43", stable], ["44", unrelatedResult]]),
    assignmentsByTaskUid: new Map(),
    timephasedData: unrelatedResult.timephasedData
  };

  const rows = buildComparisonRows({ source, candidate, result, taskUids: ["43"] });
  assert.ok(rows.some((row) => row.key === "44-task-timephased"));
});
