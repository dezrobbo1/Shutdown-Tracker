import test from "node:test";
import assert from "node:assert/strict";
import { validateBulkCompletionResult } from "../src/bulk-result-validation.js";

const PROJECT = Object.freeze({
  startDate: "2026-01-05T08:00:00",
  finishDate: "2026-01-12T16:00:00",
  statusDate: "2026-01-04T17:00:00"
});

function task(overrides = {}) {
  return {
    uid: "43",
    id: "7",
    name: "Assigned leaf",
    wbs: "1.1",
    summary: false,
    isNull: false,
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
    timephasedData: [],
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
    timephasedData: [],
    ...overrides
  });
}

function unprogressedAssignment(taskUid = "44", uid = "92", overrides = {}) {
  return assignment({
    uid,
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
        uid,
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

function project(tasks, assignmentsByTaskUid, projectOverrides = {}) {
  return {
    project: { ...PROJECT, ...projectOverrides },
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
  const untouchedTask = unprogressedTask();
  const untouchedAssignment = unprogressedAssignment();
  const candidate = project(
    [task(), untouchedTask],
    { "43": [assignment()], "44": [untouchedAssignment] }
  );
  const result = project(
    [task(), { ...untouchedTask }],
    { "43": [assignment()], "44": [{ ...untouchedAssignment }] }
  );
  return { candidate, result };
}

function validate(candidate, result, compatibility = { classification: "strict-result" }) {
  return validateBulkCompletionResult({
    candidate,
    result,
    transactions: [transaction],
    compatibility
  });
}

test("strict exact bulk result passes and preserves every untouched leaf", () => {
  const { candidate, result } = validFixture();
  const validation = validate(candidate, result);

  assert.equal(validation.pass, true);
  assert.equal(validation.projectInvariantsPreserved, true);
  assert.equal(validation.coherentTaskCount, 1);
  assert.equal(validation.coherentAssignmentCount, 1);
  assert.equal(validation.untouchedPreservedCount, 1);
  assert.equal(validation.untouchedTaskCount, 1);
  assert.deepEqual(validation.failures, []);
});

test("reference schedule cannot receive a successful result state", () => {
  const { candidate, result } = validFixture();
  const validation = validate(candidate, result, { classification: "reference" });

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

  const validation = validate(candidate, result);

  assert.equal(validation.pass, false);
  assert.equal(validation.coherentAssignmentCount, 0);
  assert.ok(validation.failures.some((failure) => failure.includes("UID mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Resource UID mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Actual Work mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("timephased row count mismatch")));
});

test("a future untouched task is validated even when it was never in the unsupported cutoff set", () => {
  const { candidate, result } = validFixture();
  const futureTask = unprogressedTask("45", {
    start: "2026-01-10T08:00:00",
    finish: "2026-01-10T16:00:00"
  });
  const futureAssignment = unprogressedAssignment("45", "93", {
    start: futureTask.start,
    finish: futureTask.finish,
    timephasedData: [
      {
        uid: "93",
        type: "1",
        start: futureTask.start,
        finish: futureTask.finish,
        unit: "1",
        value: "PT16H0M0S"
      }
    ]
  });
  candidate.taskByUid.set("45", futureTask);
  candidate.assignmentsByTaskUid.set("45", [futureAssignment]);
  result.taskByUid.set(
    "45",
    { ...futureTask, percentComplete: "50", actualStart: futureTask.start, actualWork: "PT8H0M0S" }
  );
  result.assignmentsByTaskUid.set("45", [{ ...futureAssignment }]);

  const validation = validate(candidate, result);

  assert.equal(validation.pass, false);
  assert.equal(validation.untouchedTaskCount, 2);
  assert.ok(validation.failures.some((failure) => failure.includes("Untouched task UID 45 Percent Complete mismatch")));
});

test("untouched assignment scalar or identity changes prevent a successful result", () => {
  const { candidate, result } = validFixture();
  result.assignmentsByTaskUid.set("44", [
    unprogressedAssignment("44", "92", {
      resourceUid: "9",
      percentWorkComplete: "50",
      actualWork: "PT8H0M0S",
      remainingWork: "PT8H0M0S"
    })
  ]);

  const validation = validate(candidate, result);

  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Resource UID mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Percent Work Complete mismatch")));
});

test("untouched assignment Type 2 or added timephasing prevents success", () => {
  const { candidate, result } = validFixture();
  result.assignmentsByTaskUid.set("44", [
    unprogressedAssignment("44", "92", {
      timephasedData: [
        {
          uid: "92",
          type: "2",
          start: "2026-01-05T08:00:00",
          finish: "2026-01-05T16:00:00",
          unit: "1",
          value: "PT16H0M0S"
        }
      ]
    })
  ]);

  const validation = validate(candidate, result);

  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("assignment timephased progress mismatch")));
});

test("new Type 11 task progress on an untouched task prevents success", () => {
  const { candidate, result } = validFixture();
  result.taskByUid.set(
    "44",
    unprogressedTask("44", {
      timephasedData: [
        {
          uid: "44",
          type: "11",
          start: "2026-01-05T08:00:00",
          finish: "2026-01-05T16:00:00",
          unit: "2",
          value: "100"
        }
      ]
    })
  );

  const validation = validate(candidate, result);

  assert.equal(validation.pass, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Type 11 task progress mismatch")));
});

test("Project Start, Finish and Status Date are strict pass invariants", () => {
  const { candidate, result } = validFixture();
  result.project = {
    ...result.project,
    startDate: "2026-01-06T08:00:00",
    finishDate: "2026-01-13T16:00:00",
    statusDate: "2026-01-05T17:00:00"
  };

  const validation = validate(candidate, result);

  assert.equal(validation.pass, false);
  assert.equal(validation.projectInvariantsPreserved, false);
  assert.ok(validation.failures.some((failure) => failure.includes("Project Project Start mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Project Project Finish mismatch")));
  assert.ok(validation.failures.some((failure) => failure.includes("Project Status Date mismatch")));
});
