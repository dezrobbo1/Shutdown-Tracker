import test from "node:test";
import assert from "node:assert/strict";
import { validateBulkCompletionResult } from "../src/bulk-result-validation.js";

function task(overrides = {}) {
  return {
    uid: "43",
    id: "7",
    name: "Assigned leaf",
    wbs: "1.1",
    summary: false,
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    duration: "PT8H0M0S",
    work: "PT16H0M0S",
    percentComplete: "100",
    percentWorkComplete: "100",
    actualStart: "2026-01-05T08:00:00",
    actualFinish: "2026-01-05T16:00:00",
    actualDuration: "PT8H0M0S",
    remainingDuration: "PT0H0M0S",
    actualWork: "PT16H0M0S",
    remainingWork: "PT0H0M0S",
    stop: "2026-01-05T16:00:00",
    resume: "2026-01-05T16:00:00",
    ...overrides
  };
}

function assignment(overrides = {}) {
  return {
    uid: "91",
    taskUid: "43",
    resourceUid: "5",
    percentWorkComplete: "100",
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    actualStart: "2026-01-05T08:00:00",
    actualFinish: "2026-01-05T16:00:00",
    work: "PT16H0M0S",
    actualWork: "PT16H0M0S",
    remainingWork: "PT0H0M0S",
    stop: "2026-01-05T16:00:00",
    resume: "2026-01-05T16:00:00",
    timephasedData: [
      {
        uid: "91",
        type: "2",
        start: "2026-01-05T08:00:00",
        finish: "2026-01-05T16:00:00",
        unit: "1",
        value: "PT16H0M0S"
      }
    ],
    ...overrides
  };
}

function unprogressedTask(uid = "44", overrides = {}) {
  return task({
    uid,
    id: uid,
    name: `Task ${uid}`,
    wbs: `1.${uid}`,
    percentComplete: "0",
    percentWorkComplete: "0",
    actualStart: null,
    actualFinish: null,
    actualDuration: "PT0H0M0S",
    remainingDuration: "PT8H0M0S",
    actualWork: "PT0H0M0S",
    remainingWork: "PT16H0M0S",
    stop: null,
    resume: null,
    ...overrides
  });
}

function unprogressedAssignment(taskUid = "44", overrides = {}) {
  return assignment({
    uid: "92",
    taskUid,
    percentWorkComplete: "0",
    actualStart: null,
    actualFinish: null,
    actualWork: "PT0H0M0S",
    remainingWork: "PT16H0M0S",
    stop: null,
    resume: null,
    timephasedData: [
      {
        uid: "92",
        type: "1",
        start: "2026-01-05T08:00:00",
        finish: "2026-01-05T16:00:00",
        unit: "1",
        value: "PT16H0M0S"
      }
    ],
    ...overrides
  });
}

function project(tasks, assignmentsByTaskUid) {
  return {
    taskByUid: new Map(tasks.map((entry) => [String(entry.uid), entry])),
    assignmentsByTaskUid: new Map(
      Object.entries(assignmentsByTaskUid).map(([uid, assignments]) => [String(uid), assignments])
    )
  };
}

const transaction = Object.freeze({
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

function validFixture() {
  const unsupportedTask = unprogressedTask();
  const unsupportedAssignment = unprogressedAssignment();
  const candidate = project(
    [task(), unsupportedTask],
    { "43": [assignment()], "44": [unsupportedAssignment] }
  );
  const result = project(
    [task(), { ...unsupportedTask }],
    { "43": [assignment()], "44": [{ ...unsupportedAssignment }] }
  );
  return { candidate, result };
}

test("strict exact bulk result passes", () => {
  const { candidate, result } = validFixture();
  const validation = validateBulkCompletionResult({
    candidate,
    result,
    transactions: [transaction],
    unsupported: [{ taskUid: "44" }],
    compatibility: { classification: "strict-result" }
  });

  assert.equal(validation.pass, true);
  assert.equal(validation.coherentTaskCount, 1);
  assert.equal(validation.coherentAssignmentCount, 1);
  assert.equal(validation.unsupportedPreservedCount, 1);
  assert.deepEqual(validation.failures, []);
});

test("reference schedule cannot receive a successful result state", () => {
  const { candidate, result } = validFixture();
  const validation = validateBulkCompletionResult({
    candidate,
    result,
    transactions: [transaction],
    unsupported: [{ taskUid: "44" }],
    compatibility: { classification: "reference" }
  });

  assert.equal(validation.pass, false);
  assert.match(validation.failures[0], /strict-result is required/);
});

test("exact assignment validation rejects replacement or incomplete transaction", () => {
  const { candidate, result } = validFixture();
  result.assignmentsByTaskUid.set("43", [
    assignment({
      uid: "999",
      resourceUid: "8",
      actualWork: "PT8H0M0S",
      timephasedData: []
    })
  ]);

  const validation = validateBulkCompletionResult({
    candidate,
    result,
    transactions: [transaction],
    unsupported: [{ taskUid: "44" }],
    compatibility: { classification: "strict-result" }
  });

  assert.equal(validation.pass, false);
  assert.equal(validation.coherentAssignmentCount, 0);
  assert.ok(validation.failures.some((failure) => failure.includes("UID mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Resource UID mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Actual Work mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("timephased row count mismatch")));
});

test("unsupported task progress changes prevent a successful result", () => {
  const { candidate, result } = validFixture();
  result.taskByUid.set(
    "44",
    unprogressedTask("44", {
      percentComplete: "50",
      actualStart: "2026-01-05T08:00:00",
      actualDuration: "PT4H0M0S",
      remainingDuration: "PT4H0M0S"
    })
  );

  const validation = validateBulkCompletionResult({
    candidate,
    result,
    transactions: [transaction],
    unsupported: [{ taskUid: "44" }],
    compatibility: { classification: "strict-result" }
  });

  assert.equal(validation.pass, false);
  assert.equal(validation.unsupportedPreservedCount, 0);
  assert.ok(validation.failures.some((failure) => failure.includes("Unsupported task UID 44 Percent Complete mismatch")));
});

test("unsupported assignment progress or identity changes prevent a successful result", () => {
  const { candidate, result } = validFixture();
  result.assignmentsByTaskUid.set("44", [
    unprogressedAssignment("44", {
      resourceUid: "9",
      percentWorkComplete: "50",
      actualWork: "PT8H0M0S",
      remainingWork: "PT8H0M0S"
    })
  ]);

  const validation = validateBulkCompletionResult({
    candidate,
    result,
    transactions: [transaction],
    unsupported: [{ taskUid: "44" }],
    compatibility: { classification: "strict-result" }
  });

  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Resource UID mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Percent Work Complete mismatch")));
});
