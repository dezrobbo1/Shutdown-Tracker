import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXECUTION_EVENT_TYPES } from "../src/execution.js";
import { generateAssignedCompletionNativeV0 } from "../src/native-completion-v0-guarded.js";

const sourceXml = readFileSync(new URL("./fixtures/assigned-task.xml", import.meta.url), "utf8");

function project({ resourceUid = "5", unit = "1" } = {}) {
  const task = {
    uid: "43",
    id: "7",
    name: "Assigned leaf",
    active: true,
    isNull: false,
    summary: false,
    wbs: "1.1",
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    duration: "PT8H0M0S",
    work: "PT16H0M0S",
    percentComplete: "0",
    percentWorkComplete: "0",
    actualStart: null,
    actualFinish: null,
    actualDuration: "PT0H0M0S",
    actualWork: "PT0H0M0S",
    remainingDuration: "PT8H0M0S",
    remainingWork: "PT16H0M0S",
    stop: null,
    resume: null,
    timephasedData: []
  };
  const assignment = {
    uid: "91",
    taskUid: "43",
    resourceUid,
    percentWorkComplete: "0",
    start: task.start,
    finish: task.finish,
    actualStart: null,
    actualFinish: null,
    work: task.work,
    actualWork: "PT0H0M0S",
    remainingWork: task.work,
    stop: null,
    resume: null,
    timephasedData: [
      {
        uid: "91",
        type: "1",
        start: task.start,
        finish: task.finish,
        unit,
        value: task.work
      }
    ]
  };
  return {
    taskByUid: new Map([["43", task]]),
    assignmentsByTaskUid: new Map([["43", [assignment]]])
  };
}

const events = [
  {
    id: "start",
    sequence: 1,
    taskUid: "43",
    type: EXECUTION_EVENT_TYPES.START,
    timestamp: "2026-01-05T08:00:00",
    effectiveProjectLocalTime: "2026-01-05T08:00:00"
  },
  {
    id: "finish",
    sequence: 2,
    taskUid: "43",
    type: EXECUTION_EVENT_TYPES.FINISH,
    timestamp: "2026-01-05T16:00:00",
    effectiveProjectLocalTime: "2026-01-05T16:00:00"
  }
];

test("guarded native v0 accepts the bounded evidence shape", () => {
  const result = generateAssignedCompletionNativeV0({ sourceXml, project: project(), events });
  assert.deepEqual(result.changedTaskUids, ["43"]);
  assert.deepEqual(result.changedAssignmentUids, ["91"]);
});

test("guarded native v0 rejects Resource UID 0 before XML mutation", () => {
  assert.throws(
    () => generateAssignedCompletionNativeV0({ sourceXml, project: project({ resourceUid: "0" }), events }),
    /Resource UID 0/
  );
});

test("guarded native v0 rejects timephased Unit outside the evidence profile before XML mutation", () => {
  assert.throws(
    () => generateAssignedCompletionNativeV0({ sourceXml, project: project({ unit: "2" }), events }),
    /timephased Unit must be 1/
  );
});
