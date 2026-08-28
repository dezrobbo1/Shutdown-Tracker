import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXECUTION_EVENT_TYPES } from "../src/execution.js";
import {
  buildAssignedCompletionNativeV0Transaction,
  generateAssignedCompletionNativeV0
} from "../src/native-completion-v0.js";

const sourceXml = readFileSync(new URL("./fixtures/assigned-task.xml", import.meta.url), "utf8");

function task(overrides = {}) {
  return {
    uid: "43",
    id: "7",
    guid: "SOURCE-TASK-GUID",
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
    timephasedData: [],
    ...overrides
  };
}

function assignment(overrides = {}) {
  return {
    uid: "91",
    taskUid: "43",
    resourceUid: "5",
    percentWorkComplete: "0",
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    actualStart: null,
    actualFinish: null,
    work: "PT16H0M0S",
    actualWork: "PT0H0M0S",
    remainingWork: "PT16H0M0S",
    stop: null,
    resume: null,
    timephasedData: [
      {
        uid: "91",
        type: "1",
        start: "2026-01-05T08:00:00",
        finish: "2026-01-05T16:00:00",
        unit: "1",
        value: "PT16H0M0S"
      }
    ],
    ...overrides
  };
}

function project(taskValue = task(), assignmentValues = [assignment()]) {
  return {
    taskByUid: new Map([[String(taskValue.uid), taskValue]]),
    assignmentsByTaskUid: new Map([[String(taskValue.uid), assignmentValues]])
  };
}

function event(type, effectiveProjectLocalTime, taskUid = "43", sequence = 1) {
  return {
    id: `${taskUid}-${type}-${sequence}`,
    sequence,
    taskUid: String(taskUid),
    type,
    timestamp: effectiveProjectLocalTime,
    effectiveProjectLocalTime
  };
}

function completionEvents(options = {}) {
  return [
    event(
      EXECUTION_EVENT_TYPES.START,
      options.start ?? "2026-01-05T08:00:00",
      options.taskUid ?? "43",
      1
    ),
    event(
      options.completionType ?? EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH,
      options.finish ?? "2026-01-05T16:00:00",
      options.taskUid ?? "43",
      2
    )
  ];
}

function blockFor(xml, elementName, identityField, identityValue) {
  const blocks = [...xml.matchAll(new RegExp(`<${elementName}>[\\s\\S]*?<\\/${elementName}>`, "g"))].map(
    (match) => match[0]
  );
  const identity = new RegExp(
    `<${identityField}>\\s*${String(identityValue).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*<\\/${identityField}>`
  );
  const block = blocks.find((candidate) => identity.test(candidate));
  assert.ok(block, `${elementName} ${identityField} ${identityValue} was not found`);
  return block;
}

test("native-evidence v0 writes the Project-proven complete task and assignment transaction", () => {
  const result = generateAssignedCompletionNativeV0({
    sourceXml,
    project: project(),
    events: completionEvents()
  });

  assert.deepEqual(result.changedTaskUids, ["43"]);
  assert.deepEqual(result.changedAssignmentUids, ["91"]);
  assert.equal(result.transaction.resourceUid, "5");

  const taskBlock = blockFor(result.candidateText, "Task", "UID", "43");
  const assignmentBlock = blockFor(result.candidateText, "Assignment", "UID", "91");

  assert.match(taskBlock, /<GUID>SOURCE-TASK-GUID<\/GUID>/);
  assert.match(taskBlock, /<Stop>2026-01-05T16:00:00<\/Stop>/);
  assert.match(taskBlock, /<Resume>2026-01-05T16:00:00<\/Resume>/);
  assert.match(taskBlock, /<PercentComplete>100<\/PercentComplete>/);
  assert.match(taskBlock, /<PercentWorkComplete>100<\/PercentWorkComplete>/);
  assert.match(taskBlock, /<ActualStart>2026-01-05T08:00:00<\/ActualStart>/);
  assert.match(taskBlock, /<ActualFinish>2026-01-05T16:00:00<\/ActualFinish>/);
  assert.match(taskBlock, /<ActualDuration>PT8H0M0S<\/ActualDuration>/);
  assert.match(taskBlock, /<ActualWork>PT16H0M0S<\/ActualWork>/);
  assert.match(taskBlock, /<RemainingDuration>PT0H0M0S<\/RemainingDuration>/);
  assert.match(taskBlock, /<RemainingWork>PT0H0M0S<\/RemainingWork>/);
  assert.doesNotMatch(taskBlock, /<TimephasedData>/);

  assert.ok(taskBlock.indexOf("<Stop>") < taskBlock.indexOf("<Resume>"));
  assert.ok(taskBlock.indexOf("<Resume>") < taskBlock.indexOf("<ResumeValid>"));
  assert.ok(taskBlock.indexOf("<ActualStart>") < taskBlock.indexOf("<ActualFinish>"));
  assert.ok(taskBlock.indexOf("<ActualFinish>") < taskBlock.indexOf("<ActualDuration>"));

  assert.match(assignmentBlock, /<UID>91<\/UID>/);
  assert.match(assignmentBlock, /<ResourceUID>5<\/ResourceUID>/);
  assert.match(assignmentBlock, /<PercentWorkComplete>100<\/PercentWorkComplete>/);
  assert.match(assignmentBlock, /<ActualStart>2026-01-05T08:00:00<\/ActualStart>/);
  assert.match(assignmentBlock, /<ActualFinish>2026-01-05T16:00:00<\/ActualFinish>/);
  assert.match(assignmentBlock, /<ActualWork>PT16H0M0S<\/ActualWork>/);
  assert.match(assignmentBlock, /<RemainingWork>PT0H0M0S<\/RemainingWork>/);
  assert.match(assignmentBlock, /<Stop>2026-01-05T16:00:00<\/Stop>/);
  assert.match(assignmentBlock, /<Resume>2026-01-05T16:00:00<\/Resume>/);
  assert.match(assignmentBlock, /<TimephasedData>[\s\S]*?<Type>2<\/Type>[\s\S]*?<UID>91<\/UID>[\s\S]*?<Unit>1<\/Unit>[\s\S]*?<Value>PT16H0M0S<\/Value>[\s\S]*?<\/TimephasedData>/);

  assert.ok(assignmentBlock.indexOf("<ActualFinish>") < assignmentBlock.indexOf("<ActualOvertimeCost>"));
  assert.ok(assignmentBlock.indexOf("<ActualStart>") < assignmentBlock.indexOf("<ActualWork>"));
  assert.ok(assignmentBlock.indexOf("<Start>") < assignmentBlock.indexOf("<Stop>"));
  assert.ok(assignmentBlock.indexOf("<Stop>") < assignmentBlock.indexOf("<Resume>"));
  assert.ok(assignmentBlock.indexOf("<Resume>") < assignmentBlock.indexOf("<StartVariance>"));

  const unrelatedSource = blockFor(sourceXml, "Task", "UID", "44");
  const unrelatedCandidate = blockFor(result.candidateText, "Task", "UID", "44");
  assert.equal(unrelatedCandidate, unrelatedSource);
});

test("native-evidence v0 accepts Finish at the planned finish", () => {
  const transaction = buildAssignedCompletionNativeV0Transaction(
    project(),
    completionEvents({ completionType: EXECUTION_EVENT_TYPES.FINISH })
  );
  assert.equal(transaction.completionEventType, EXECUTION_EVENT_TYPES.FINISH);
  assert.equal(transaction.actualFinish, "2026-01-05T16:00:00");
});

test("native-evidence v0 rejects off-plan actual dates", () => {
  assert.throws(
    () =>
      buildAssignedCompletionNativeV0Transaction(
        project(),
        completionEvents({ finish: "2026-01-05T15:59:00" })
      ),
    /Actual Finish equal to planned Finish/
  );
});

test("native-evidence v0 rejects unsupported execution history", () => {
  const events = completionEvents();
  events.splice(1, 0, event(EXECUTION_EVENT_TYPES.PAUSE, "2026-01-05T12:00:00", "43", 2));
  events[2].sequence = 3;
  assert.throws(
    () => buildAssignedCompletionNativeV0Transaction(project(), events),
    /does not support event type\(s\): PAUSE/
  );
});

test("native-evidence v0 rejects multiple assignments", () => {
  assert.throws(
    () =>
      buildAssignedCompletionNativeV0Transaction(
        project(task(), [assignment(), assignment({ uid: "92" })]),
        completionEvents()
      ),
    /requires exactly one assignment; found 2/
  );
});

test("native-evidence v0 rejects unsupported assignment timephasing", () => {
  assert.throws(
    () =>
      buildAssignedCompletionNativeV0Transaction(
        project(task(), [assignment({ timephasedData: [{ ...assignment().timephasedData[0], type: "2" }] })]),
        completionEvents()
      ),
    /timephased Type must be 1/
  );
});

test("native-evidence v0 rejects pre-existing actuals", () => {
  assert.throws(
    () =>
      buildAssignedCompletionNativeV0Transaction(
        project(task({ actualStart: "2026-01-05T08:00:00" })),
        completionEvents()
      ),
    /already contains actual dates/
  );
});

test("native-evidence v0 rejects more than one touched task", () => {
  const events = [
    ...completionEvents(),
    event(EXECUTION_EVENT_TYPES.START, "2026-01-05T08:00:00", "44", 3)
  ];
  assert.throws(
    () => buildAssignedCompletionNativeV0Transaction(project(), events),
    /requires exactly one touched task; found 2/
  );
});
