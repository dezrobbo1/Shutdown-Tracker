import test from "node:test";
import assert from "node:assert/strict";
import { validateBulkCompletionResult } from "../src/bulk-result-validation.js";

const PROJECT = Object.freeze({
  startDate: "2026-01-05T08:00:00",
  finishDate: "2026-01-12T16:00:00",
  statusDate: "2026-01-04T17:00:00"
});

const SCHEDULING_STRUCTURE = Object.freeze({
  calendarUid: "1",
  predecessorLinks: [],
  calendars: ["1|Standard|base|-1|weekday-definition"]
});

const TRANSACTION = Object.freeze({
  taskUid: "43",
  taskId: "7",
  taskName: "Assigned leaf",
  taskWbs: "1.1",
  assignmentUid: "91",
  resourceUid: "5",
  actualStart: "2026-01-05T08:00:00",
  actualFinish: "2026-01-05T16:00:00",
  duration: "PT8H0M0S",
  work: "PT16H0M0S",
  assignmentTimephased: {
    uid: "91",
    type: "1",
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    unit: "1",
    value: "PT16H0M0S"
  }
});

function completedTask(overrides = {}) {
  return {
    uid: "43",
    id: "7",
    name: "Assigned leaf",
    wbs: "1.1",
    summary: false,
    isNull: false,
    active: true,
    start: TRANSACTION.actualStart,
    finish: TRANSACTION.actualFinish,
    duration: TRANSACTION.duration,
    work: TRANSACTION.work,
    percentComplete: "100",
    percentWorkComplete: "100",
    actualStart: TRANSACTION.actualStart,
    actualFinish: TRANSACTION.actualFinish,
    actualDuration: TRANSACTION.duration,
    remainingDuration: "PT0H0M0S",
    actualWork: TRANSACTION.work,
    remainingWork: "PT0H0M0S",
    stop: TRANSACTION.actualFinish,
    resume: TRANSACTION.actualFinish,
    timephasedData: [],
    ...overrides
  };
}

function completedAssignment(overrides = {}) {
  return {
    uid: "91",
    taskUid: "43",
    resourceUid: "5",
    percentWorkComplete: "100",
    start: TRANSACTION.actualStart,
    finish: TRANSACTION.actualFinish,
    actualStart: TRANSACTION.actualStart,
    actualFinish: TRANSACTION.actualFinish,
    work: TRANSACTION.work,
    actualWork: TRANSACTION.work,
    remainingWork: "PT0H0M0S",
    actualOvertimeWork: "PT0H0M0S",
    remainingOvertimeWork: "PT0H0M0S",
    stop: TRANSACTION.actualFinish,
    resume: TRANSACTION.actualFinish,
    timephasedData: [
      {
        uid: "91",
        type: "2",
        start: TRANSACTION.actualStart,
        finish: TRANSACTION.actualFinish,
        unit: "1",
        value: TRANSACTION.work
      }
    ],
    ...overrides
  };
}

function typeElevenWholeWindow() {
  return [
    {
      uid: "43",
      type: "11",
      start: TRANSACTION.actualStart,
      finish: TRANSACTION.actualFinish,
      unit: "2",
      value: "100"
    }
  ];
}

function resources(overrides = {}) {
  return new Map([
    [
      "5",
      {
        uid: "5",
        name: "WC-VIBE",
        type: "1",
        initials: "W",
        group: "WCG-ALS",
        ...overrides
      }
    ]
  ]);
}

function project({ task = completedTask(), assignment = completedAssignment(), resourceByUid = resources(), extraAssignments = [] } = {}) {
  const assignmentsByTaskUid = new Map([["43", [assignment]]]);
  for (const extra of extraAssignments) {
    const key = String(extra.taskUid ?? "");
    const existing = assignmentsByTaskUid.get(key) ?? [];
    existing.push(extra);
    assignmentsByTaskUid.set(key, existing);
  }
  return {
    project: { ...PROJECT },
    schedulingStructure: {
      calendarUid: SCHEDULING_STRUCTURE.calendarUid,
      predecessorLinks: [...SCHEDULING_STRUCTURE.predecessorLinks],
      calendars: [...SCHEDULING_STRUCTURE.calendars]
    },
    taskByUid: new Map([["43", task]]),
    assignmentsByTaskUid,
    resourceByUid
  };
}

function validPair() {
  return {
    candidate: project(),
    result: project({ task: completedTask({ timephasedData: typeElevenWholeWindow() }) })
  };
}

function validate(candidate, result) {
  return validateBulkCompletionResult({
    candidate,
    result,
    transactions: [TRANSACTION],
    compatibility: { classification: "strict-result" }
  });
}

test("bounded P1 baseline remains a strict pass", () => {
  const { candidate, result } = validPair();
  const validation = validate(candidate, result);
  assert.equal(validation.pass, true);
  assert.equal(validation.assignmentClosurePreserved, true);
  assert.equal(validation.referencedResourcesPreserved, true);
  assert.equal(validation.referencedResourceCount, 1);
});

test("touched assignment overtime changes prevent success", () => {
  const { candidate, result } = validPair();
  result.assignmentsByTaskUid.set("43", [
    completedAssignment({ actualOvertimeWork: "PT1H0M0S", remainingOvertimeWork: "PT2H0M0S" })
  ]);
  const validation = validate(candidate, result);
  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Actual Overtime Work mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Remaining Overtime Work mismatch")));
});

test("an inactive touched task prevents strict success", () => {
  const { candidate, result } = validPair();
  result.taskByUid.set("43", completedTask({ active: false, timephasedData: typeElevenWholeWindow() }));
  const validation = validate(candidate, result);
  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("became inactive")));
});

test("a missing referenced resource prevents strict success", () => {
  const { candidate, result } = validPair();
  result.resourceByUid = new Map();
  const validation = validate(candidate, result);
  assert.equal(validation.pass, false);
  assert.equal(validation.referencedResourcesPreserved, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Referenced Resource UID 5 is missing")));
});

test("reusing a resource UID for a different semantic identity prevents strict success", () => {
  const { candidate, result } = validPair();
  result.resourceByUid = resources({ name: "DIFFERENT-RESOURCE" });
  const validation = validate(candidate, result);
  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Referenced Resource UID 5 identity mismatch")));
});

test("empty Unit 1 Type 11 values fail before numeric coercion", () => {
  const { candidate, result } = validPair();
  result.taskByUid.set(
    "43",
    completedTask({
      timephasedData: [
        {
          uid: "43",
          type: "11",
          start: "2026-01-05T08:00:00",
          finish: "2026-01-05T12:00:00",
          unit: "1",
          value: ""
        },
        {
          uid: "43",
          type: "11",
          start: "2026-01-05T12:00:00",
          finish: "2026-01-05T16:00:00",
          unit: "1",
          value: "100"
        }
      ]
    })
  );
  const validation = validate(candidate, result);
  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("missing or empty Value")));
});

test("global assignment closure rejects an assignment on an unknown task", () => {
  const { candidate, result } = validPair();
  result.assignmentsByTaskUid.set("999", [
    {
      ...completedAssignment(),
      uid: "999",
      taskUid: "999",
      resourceUid: "5"
    }
  ]);
  const validation = validate(candidate, result);
  assert.equal(validation.pass, false);
  assert.equal(validation.assignmentClosurePreserved, false);
  assert.ok(
    validation.failures.some((failure) =>
      failure.includes("Project assignment UID/TaskUID/ResourceUID closure mismatch")
    )
  );
});

test("untouched assignment overtime is part of preservation", () => {
  const untouchedTask = {
    ...completedTask({
      uid: "44",
      id: "8",
      name: "Untouched",
      wbs: "1.2",
      percentComplete: "0",
      percentWorkComplete: "0",
      actualStart: null,
      actualFinish: null,
      actualDuration: "PT0H0M0S",
      remainingDuration: TRANSACTION.duration,
      actualWork: "PT0H0M0S",
      remainingWork: TRANSACTION.work,
      stop: null,
      resume: null,
      timephasedData: []
    })
  };
  const untouchedAssignment = {
    ...completedAssignment({
      uid: "92",
      taskUid: "44",
      percentWorkComplete: "0",
      actualStart: null,
      actualFinish: null,
      actualWork: "PT0H0M0S",
      remainingWork: TRANSACTION.work,
      actualOvertimeWork: "PT0H0M0S",
      remainingOvertimeWork: "PT0H0M0S",
      stop: null,
      resume: null,
      timephasedData: [
        {
          uid: "92",
          type: "1",
          start: TRANSACTION.actualStart,
          finish: TRANSACTION.actualFinish,
          unit: "1",
          value: TRANSACTION.work
        }
      ]
    })
  };

  const { candidate, result } = validPair();
  candidate.taskByUid.set("44", untouchedTask);
  result.taskByUid.set("44", { ...untouchedTask });
  candidate.assignmentsByTaskUid.set("44", [untouchedAssignment]);
  result.assignmentsByTaskUid.set("44", [
    { ...untouchedAssignment, actualOvertimeWork: "PT1H0M0S" }
  ]);

  const validation = validate(candidate, result);
  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Actual Overtime Work mismatch")));
});
