import test from "node:test";
import assert from "node:assert/strict";
import { EXECUTION_EVENT_TYPES } from "../src/execution.js";
import { generateAssignedCompletionNativeV0 } from "../src/native-completion-v0-guarded.js";

const sourceXml = `<Project xmlns="http://schemas.microsoft.com/project">
<Tasks>
<Task>
<UID>43</UID><ID>7</ID><Name>Assigned leaf</Name><Active>1</Active><WBS>1.1</WBS><Start>2026-01-05T08:00:00</Start><Finish>2026-01-05T16:00:00</Finish><Duration>PT8H0M0S</Duration><Work>PT16H0M0S</Work><ResumeValid>0</ResumeValid><Summary>0</Summary><PercentComplete>0</PercentComplete><PercentWorkComplete>0</PercentWorkComplete><OvertimeWork>PT0H0M0S</OvertimeWork><ActualDuration>PT0H0M0S</ActualDuration><ActualWork>PT0H0M0S</ActualWork><RemainingDuration>PT8H0M0S</RemainingDuration><RemainingWork>PT16H0M0S</RemainingWork>
</Task>
</Tasks>
<Assignments>
<Assignment>
<UID>91</UID><TaskUID>43</TaskUID><ResourceUID>5</ResourceUID><PercentWorkComplete>0</PercentWorkComplete><ActualCost>0</ActualCost><ActualOvertimeCost>0</ActualOvertimeCost><ActualOvertimeWork>PT0H0M0S</ActualOvertimeWork><ActualWork>PT0H0M0S</ActualWork><Finish>2026-01-05T16:00:00</Finish><RemainingWork>PT16H0M0S</RemainingWork><Start>2026-01-05T08:00:00</Start><StartVariance>0</StartVariance><Work>PT16H0M0S</Work>
<TimephasedData><Type>1</Type><UID>91</UID><Start>2026-01-05T08:00:00</Start><Finish>2026-01-05T16:00:00</Finish><Unit>1</Unit><Value>PT16H0M0S</Value></TimephasedData>
</Assignment>
</Assignments>
</Project>`;

function project({ resourceUid = "5", unit = "1" } = {}) {
  const task = {
    uid: "43", id: "7", name: "Assigned leaf", active: true, isNull: false, summary: false, wbs: "1.1",
    start: "2026-01-05T08:00:00", finish: "2026-01-05T16:00:00", duration: "PT8H0M0S", work: "PT16H0M0S",
    percentComplete: "0", percentWorkComplete: "0", actualStart: null, actualFinish: null,
    actualDuration: "PT0H0M0S", actualWork: "PT0H0M0S", remainingDuration: "PT8H0M0S", remainingWork: "PT16H0M0S",
    stop: null, resume: null, timephasedData: []
  };
  const assignment = {
    uid: "91", taskUid: "43", resourceUid, percentWorkComplete: "0",
    start: task.start, finish: task.finish, actualStart: null, actualFinish: null,
    work: task.work, actualWork: "PT0H0M0S", remainingWork: task.work, stop: null, resume: null,
    timephasedData: [{ uid: "91", type: "1", start: task.start, finish: task.finish, unit, value: task.work }]
  };
  return {
    taskByUid: new Map([["43", task]]),
    assignmentsByTaskUid: new Map([["43", [assignment]]])
  };
}

const events = [
  { id: "start", sequence: 1, taskUid: "43", type: EXECUTION_EVENT_TYPES.START, timestamp: "2026-01-05T08:00:00", effectiveProjectLocalTime: "2026-01-05T08:00:00" },
  { id: "finish", sequence: 2, taskUid: "43", type: EXECUTION_EVENT_TYPES.FINISH, timestamp: "2026-01-05T16:00:00", effectiveProjectLocalTime: "2026-01-05T16:00:00" }
];

test("guarded native v0 accepts the bounded evidence shape", () => {
  const result = generateAssignedCompletionNativeV0({ sourceXml, project: project(), events });
  assert.deepEqual(result.changedTaskUids, ["43"]);
  assert.deepEqual(result.changedAssignmentUids, ["91"]);
});

test("guarded native v0 rejects Resource UID 0", () => {
  assert.throws(
    () => generateAssignedCompletionNativeV0({ sourceXml, project: project({ resourceUid: "0" }), events }),
    /Resource UID 0/
  );
});

test("guarded native v0 rejects timephased Unit outside the evidence profile", () => {
  assert.throws(
    () => generateAssignedCompletionNativeV0({ sourceXml, project: project({ unit: "2" }), events }),
    /timephased Unit must be 1/
  );
});
