import test from "node:test";
import assert from "node:assert/strict";
import { EXECUTION_EVENT_TYPES } from "../src/execution.js";
import {
  analyzePlannedCompletionCut,
  buildBulkCompletionExecutionIntent,
  generateBulkAssignedCompletionNativeV0,
  planMondayFiftyPercentSample
} from "../src/bulk-planned-completion.js";

function task(uid, id, start, finish, hours, workHours = hours) {
  return {
    uid: String(uid),
    id: String(id),
    name: `Task ${uid}`,
    active: true,
    isNull: false,
    summary: false,
    wbs: `1.${id}`,
    start,
    finish,
    duration: `PT${hours}H0M0S`,
    work: `PT${workHours}H0M0S`,
    percentComplete: "0",
    percentWorkComplete: "0",
    actualStart: null,
    actualFinish: null,
    actualDuration: "PT0H0M0S",
    actualWork: "PT0H0M0S",
    remainingDuration: `PT${hours}H0M0S`,
    remainingWork: `PT${workHours}H0M0S`,
    stop: null,
    resume: null,
    timephasedData: []
  };
}

function assignment(uid, taskValue) {
  return {
    uid: String(uid),
    taskUid: String(taskValue.uid),
    resourceUid: "5",
    percentWorkComplete: "0",
    start: taskValue.start,
    finish: taskValue.finish,
    actualStart: null,
    actualFinish: null,
    work: taskValue.work,
    actualWork: "PT0H0M0S",
    remainingWork: taskValue.work,
    stop: null,
    resume: null,
    timephasedData: [
      {
        uid: String(uid),
        type: "1",
        start: taskValue.start,
        finish: taskValue.finish,
        unit: "1",
        value: taskValue.work
      }
    ]
  };
}

function project(tasks, assignmentMap) {
  return {
    leafTasks: tasks,
    taskByUid: new Map(tasks.map((entry) => [String(entry.uid), entry])),
    assignmentsByTaskUid: new Map(
      tasks.map((entry) => [String(entry.uid), assignmentMap.get(String(entry.uid)) ?? []])
    )
  };
}

function taskXml(taskValue) {
  return `    <Task>\n      <UID>${taskValue.uid}</UID>\n      <ID>${taskValue.id}</ID>\n      <Name>${taskValue.name}</Name>\n      <Active>1</Active>\n      <WBS>${taskValue.wbs}</WBS>\n      <Start>${taskValue.start}</Start>\n      <Finish>${taskValue.finish}</Finish>\n      <Duration>${taskValue.duration}</Duration>\n      <Work>${taskValue.work}</Work>\n      <ResumeValid>0</ResumeValid>\n      <Summary>0</Summary>\n      <PercentComplete>0</PercentComplete>\n      <PercentWorkComplete>0</PercentWorkComplete>\n      <ActualDuration>PT0H0M0S</ActualDuration>\n      <ActualCost>0</ActualCost>\n      <ActualOvertimeCost>0</ActualOvertimeCost>\n      <ActualWork>PT0H0M0S</ActualWork>\n      <RemainingDuration>${taskValue.duration}</RemainingDuration>\n      <RemainingWork>${taskValue.work}</RemainingWork>\n    </Task>`;
}

function assignmentXml(assignmentValue) {
  return `    <Assignment>\n      <UID>${assignmentValue.uid}</UID>\n      <TaskUID>${assignmentValue.taskUid}</TaskUID>\n      <ResourceUID>${assignmentValue.resourceUid}</ResourceUID>\n      <PercentWorkComplete>0</PercentWorkComplete>\n      <ActualCost>0</ActualCost>\n      <ActualOvertimeCost>0</ActualOvertimeCost>\n      <ActualWork>PT0H0M0S</ActualWork>\n      <Finish>${assignmentValue.finish}</Finish>\n      <RemainingWork>${assignmentValue.work}</RemainingWork>\n      <Start>${assignmentValue.start}</Start>\n      <StartVariance>0</StartVariance>\n      <Work>${assignmentValue.work}</Work>\n      <TimephasedData>\n        <Type>1</Type>\n        <UID>${assignmentValue.uid}</UID>\n        <Start>${assignmentValue.start}</Start>\n        <Finish>${assignmentValue.finish}</Finish>\n        <Unit>1</Unit>\n        <Value>${assignmentValue.work}</Value>\n      </TimephasedData>\n    </Assignment>`;
}

function sourceXml(tasks, assignments) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Project xmlns="http://schemas.microsoft.com/project">\n  <Name>Bulk lab</Name>\n  <Tasks>\n${tasks.map(taskXml).join("\n")}\n  </Tasks>\n  <Assignments>\n${assignments.map(assignmentXml).join("\n")}\n  </Assignments>\n  <ExtendedAttributes><Sentinel>unchanged</Sentinel></ExtendedAttributes>\n</Project>\n`;
}

test("reporting-cut analysis completes only proven-shape tasks planned finished by the cut", () => {
  const t1 = task(43, 7, "2026-09-13T19:00:00", "2026-09-13T20:00:00", 1);
  const t2 = task(44, 8, "2026-09-13T20:00:00", "2026-09-13T22:00:00", 2);
  const t3 = task(45, 9, "2026-09-13T22:00:00", "2026-09-14T02:00:00", 4);
  const a1 = assignment(91, t1);
  const a2 = assignment(92, t2);
  const a3 = assignment(93, t3);
  const parsed = project([t1, t2, t3], new Map([["43", [a1]], ["44", [a2]], ["45", [a3]]]));

  const analysis = analyzePlannedCompletionCut({
    project: parsed,
    cutoff: "2026-09-13T23:00:00"
  });

  assert.equal(analysis.plannedFinishedCount, 2);
  assert.deepEqual(analysis.eligible.map((item) => item.taskUid), ["43", "44"]);
  assert.equal(analysis.unsupported.length, 0);
});

test("bulk generator composes the proven transaction across multiple eligible tasks and preserves all other XML", () => {
  const t1 = task(43, 7, "2026-09-13T19:00:00", "2026-09-13T20:00:00", 1);
  const t2 = task(44, 8, "2026-09-13T20:00:00", "2026-09-13T22:00:00", 2);
  const a1 = assignment(91, t1);
  const a2 = assignment(92, t2);
  const parsed = project([t1, t2], new Map([["43", [a1]], ["44", [a2]]]));
  const xml = sourceXml([t1, t2], [a1, a2]);
  const analysis = analyzePlannedCompletionCut({ project: parsed, cutoff: "2026-09-13T23:00:00" });

  const generated = generateBulkAssignedCompletionNativeV0({ sourceXml: xml, analysis });

  assert.deepEqual(generated.changedTaskUids, ["43", "44"]);
  assert.deepEqual(generated.changedAssignmentUids, ["91", "92"]);
  assert.equal((generated.candidateText.match(/<PercentComplete>100<\/PercentComplete>/g) ?? []).length, 2);
  assert.equal((generated.candidateText.match(/<PercentWorkComplete>100<\/PercentWorkComplete>/g) ?? []).length, 4);
  assert.equal((generated.candidateText.match(/<Type>2<\/Type>/g) ?? []).length, 2);
  assert.match(generated.candidateText, /<ExtendedAttributes><Sentinel>unchanged<\/Sentinel><\/ExtendedAttributes>/);
  assert.doesNotMatch(generated.candidateText, /<Type>11<\/Type>/);
});

test("unsupported tasks are reported rather than patched", () => {
  const t1 = task(43, 7, "2026-09-13T19:00:00", "2026-09-13T20:00:00", 1);
  const t2 = task(44, 8, "2026-09-13T20:00:00", "2026-09-13T22:00:00", 2);
  const a1 = assignment(91, t1);
  const a2 = assignment(92, t2);
  const a3 = assignment(93, t2);
  const parsed = project([t1, t2], new Map([["43", [a1]], ["44", [a2, a3]]]));

  const analysis = analyzePlannedCompletionCut({ project: parsed, cutoff: "2026-09-13T23:00:00" });

  assert.deepEqual(analysis.eligible.map((item) => item.taskUid), ["43"]);
  assert.equal(analysis.unsupported.length, 1);
  assert.equal(analysis.unsupported[0].category, "Assignment count outside proven shape");
});

test("bulk intent log contains Start and planned-finish completion for every eligible task", () => {
  const t1 = task(43, 7, "2026-09-13T19:00:00", "2026-09-13T20:00:00", 1);
  const a1 = assignment(91, t1);
  const parsed = project([t1], new Map([["43", [a1]]]));
  const analysis = analyzePlannedCompletionCut({ project: parsed, cutoff: "2026-09-13T23:00:00" });
  const events = buildBulkCompletionExecutionIntent({ analysis, recordedAt: new Date("2026-08-28T08:00:00Z") });

  assert.equal(events.length, 2);
  assert.equal(events[0].type, EXECUTION_EVENT_TYPES.START);
  assert.equal(events[1].type, EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH);
  assert.equal(events[0].effectiveProjectLocalTime, t1.start);
  assert.equal(events[1].effectiveProjectLocalTime, t1.finish);
});

test("Monday 50 percent preview selects half of active planned work and remains non-exportable", () => {
  const tasks = [
    task(43, 7, "2026-09-14T08:00:00", "2026-09-14T16:00:00", 8),
    task(44, 8, "2026-09-14T09:00:00", "2026-09-14T17:00:00", 8),
    task(45, 9, "2026-09-14T10:00:00", "2026-09-14T18:00:00", 8),
    task(46, 10, "2026-09-14T11:00:00", "2026-09-14T19:00:00", 8)
  ];
  const parsed = project(tasks, new Map());

  const plan = planMondayFiftyPercentSample({
    project: parsed,
    cutoff: "2026-09-14T12:00:00",
    fraction: 0.5
  });

  assert.equal(plan.activePoolCount, 4);
  assert.equal(plan.selected.length, 2);
  assert.deepEqual(plan.selected.map((item) => item.taskUid), ["43", "45"]);
  assert.ok(plan.selected.every((item) => item.reportedPercent === 50));
  assert.equal(plan.exportable, false);
});
