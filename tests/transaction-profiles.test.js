import test from "node:test";
import assert from "node:assert/strict";
import { EXECUTION_EVENT_TYPES, createExecutionEvent } from "../src/execution.js";
import { generateCandidateText } from "../src/transaction-profiles.js";

const sourceXml = `<Project xmlns="http://schemas.microsoft.com/project">
<Tasks>
<Task>
<UID>2</UID>
<ID>2</ID>
<Name>Leaf</Name>
<WBS>1.1</WBS>
<Summary>0</Summary>
<ActualDuration>PT0H0M0S</ActualDuration>
<RemainingDuration>PT8H0M0S</RemainingDuration>
</Task>
</Tasks>
</Project>`;

const project = {
  taskByUid: new Map([
    [
      "2",
      {
        uid: "2",
        id: "2",
        name: "Leaf",
        wbs: "1.1",
        summary: false
      }
    ]
  ])
};

const events = [
  createExecutionEvent({ taskUid: "2", type: EXECUTION_EVENT_TYPES.START, timestamp: new Date(2026, 0, 5, 8, 0) }),
  createExecutionEvent({ taskUid: "2", type: EXECUTION_EVENT_TYPES.FINISH, timestamp: new Date(2026, 0, 5, 16, 0) })
];

test("intent-only profile leaves XML text unchanged", () => {
  const result = generateCandidateText({ sourceXml, project, events, profileId: "intent-only" });
  assert.equal(result.candidateText, sourceXml);
  assert.deepEqual(result.changedTaskUids, []);
});

test("task scalar diagnostic is explicit and bounded", () => {
  const result = generateCandidateText({ sourceXml, project, events, profileId: "task-scalar-diagnostic" });
  assert.match(result.candidateText, /<PercentComplete>100<\/PercentComplete>/);
  assert.match(result.candidateText, /<ActualStart>2026-01-05T08:00:00<\/ActualStart>/);
  assert.match(result.candidateText, /<ActualFinish>2026-01-05T16:00:00<\/ActualFinish>/);
  assert.deepEqual(result.changedTaskUids, ["2"]);
});
