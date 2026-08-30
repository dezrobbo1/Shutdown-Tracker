import test from "node:test";
import assert from "node:assert/strict";
import {
  BULK_PLANNED_COMPLETION_PROFILE,
  analyzePlannedCompletionCut,
  buildBulkCompletionExecutionIntent,
  buildBulkCompletionIntentDocument,
  buildBulkCompletionResultEvidenceDocument,
  buildPartialProgressIntentDocument,
  generateBulkAssignedCompletionNativeV0,
  planMondayFiftyPercentSample
} from "../src/bulk-planned-completion.js";

function task(uid, id, name = `Task ${uid}`) {
  return {
    uid: String(uid),
    id: String(id),
    name,
    active: true,
    isNull: false,
    summary: false,
    wbs: `1.${id}`,
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
}

function assignment(taskValue) {
  return {
    uid: "91",
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
        uid: "91",
        type: "1",
        start: taskValue.start,
        finish: taskValue.finish,
        unit: "1",
        value: taskValue.work
      }
    ]
  };
}

function project(taskValue, assignmentValue) {
  return {
    leafTasks: [taskValue],
    taskByUid: new Map([[String(taskValue.uid), taskValue]]),
    assignmentsByTaskUid: new Map([[String(taskValue.uid), [assignmentValue]]])
  };
}

function xmlText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sourceXml(taskValue, assignmentValue, sourceName = taskValue.name) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Tasks>
    <Task>
      <UID>${taskValue.uid}</UID>
      <ID>${taskValue.id}</ID>
      <Name>${xmlText(sourceName)}</Name>
      <WBS>${taskValue.wbs}</WBS>
      <Start>${taskValue.start}</Start>
      <Finish>${taskValue.finish}</Finish>
      <Duration>${taskValue.duration}</Duration>
      <Work>${taskValue.work}</Work>
      <ResumeValid>0</ResumeValid>
      <Summary>0</Summary>
      <PercentComplete>0</PercentComplete>
      <PercentWorkComplete>0</PercentWorkComplete>
      <ActualDuration>PT0H0M0S</ActualDuration>
      <ActualCost>0</ActualCost>
      <ActualOvertimeCost>0</ActualOvertimeCost>
      <ActualWork>PT0H0M0S</ActualWork>
      <RemainingDuration>${taskValue.duration}</RemainingDuration>
      <RemainingWork>${taskValue.work}</RemainingWork>
    </Task>
  </Tasks>
  <Assignments>
    <Assignment>
      <UID>${assignmentValue.uid}</UID>
      <TaskUID>${assignmentValue.taskUid}</TaskUID>
      <ResourceUID>${assignmentValue.resourceUid}</ResourceUID>
      <PercentWorkComplete>0</PercentWorkComplete>
      <ActualCost>0</ActualCost>
      <ActualOvertimeCost>0</ActualOvertimeCost>
      <ActualWork>PT0H0M0S</ActualWork>
      <Finish>${assignmentValue.finish}</Finish>
      <RemainingWork>${assignmentValue.work}</RemainingWork>
      <Start>${assignmentValue.start}</Start>
      <StartVariance>0</StartVariance>
      <Work>${assignmentValue.work}</Work>
      <TimephasedData>
        <Type>1</Type>
        <UID>${assignmentValue.uid}</UID>
        <Start>${assignmentValue.start}</Start>
        <Finish>${assignmentValue.finish}</Finish>
        <Unit>1</Unit>
        <Value>${assignmentValue.work}</Value>
      </TimephasedData>
    </Assignment>
  </Assignments>
</Project>
`;
}

test("source task name is decoded and compared before patching", () => {
  const taskValue = task(319, 5, "Valve & pipe support");
  const assignmentValue = assignment(taskValue);
  const parsed = project(taskValue, assignmentValue);
  const analysis = analyzePlannedCompletionCut({
    project: parsed,
    cutoff: "2026-01-06T00:00:00"
  });

  const generated = generateBulkAssignedCompletionNativeV0({
    sourceXml: sourceXml(taskValue, assignmentValue),
    analysis
  });
  assert.match(generated.candidateText, /<Name>Valve &amp; pipe support<\/Name>/);

  assert.throws(
    () =>
      generateBulkAssignedCompletionNativeV0({
        sourceXml: sourceXml(taskValue, assignmentValue, "Different task name"),
        analysis
      }),
    /Name identity mismatch/
  );
});

test("bulk intent artifact retains the native-evidence-derived profile", () => {
  const document = buildBulkCompletionIntentDocument({
    source: { fileName: "source.xml", sha256: "source-hash" },
    candidate: {
      fileName: "candidate.xml",
      sha256: "candidate-hash",
      changedTaskUids: ["43"],
      executionIntent: [{ taskUid: "43" }]
    },
    analysis: {
      cutoffProjectLocal: "2026-01-05T17:00:00",
      unsupported: []
    },
    createdAt: new Date("2026-01-01T00:00:00Z")
  });

  assert.equal(document.profile.id, BULK_PLANNED_COMPLETION_PROFILE.id);
  assert.equal(document.profile.classification, "native-evidence-derived");
  assert.equal(document.candidate.profileId, BULK_PLANNED_COMPLETION_PROFILE.id);
});

test("partial intent serializes the cutoff stored in the plan", () => {
  const taskValue = task(43, 7);
  const parsed = {
    leafTasks: [taskValue],
    taskByUid: new Map([["43", taskValue]])
  };
  const plan = planMondayFiftyPercentSample({
    project: parsed,
    cutoff: "2026-01-05T12:00:00",
    fraction: 0.5
  });
  const document = buildPartialProgressIntentDocument({
    source: { fileName: "source.xml", sha256: "source-hash" },
    plan,
    createdAt: new Date("2026-01-01T00:00:00Z")
  });

  assert.equal(document.cutoff, "2026-01-05T12:00:00");
  assert.equal(document.exportable, false);
});

test("Monday sample excludes tasks with hidden imported progress", () => {
  const clean = task(43, 7);
  const percentWork = task(44, 8);
  percentWork.percentWorkComplete = "75";
  const actualWork = task(45, 9);
  actualWork.actualStart = actualWork.start;
  actualWork.actualWork = "PT8H0M0S";
  actualWork.remainingWork = "PT8H0M0S";
  const stopped = task(46, 10);
  stopped.stop = "2026-01-05T12:00:00";

  const parsed = {
    leafTasks: [clean, percentWork, actualWork, stopped],
    taskByUid: new Map(
      [clean, percentWork, actualWork, stopped].map((entry) => [String(entry.uid), entry])
    )
  };
  const plan = planMondayFiftyPercentSample({
    project: parsed,
    cutoff: "2026-01-05T12:00:00",
    fraction: 1
  });

  assert.equal(plan.activePoolCount, 1);
  assert.deepEqual(plan.selected.map((entry) => entry.taskUid), ["43"]);
});

test("result evidence binds source, candidate, Project result and validation", () => {
  const document = buildBulkCompletionResultEvidenceDocument({
    source: {
      fileName: "source.xml",
      sha256: "source-hash",
      project: { startDate: "2026-01-05T08:00:00" }
    },
    candidate: {
      fileName: "candidate.xml",
      sha256: "candidate-hash",
      changedTaskUids: ["43"],
      changedAssignmentUids: ["91"],
      project: { startDate: "2026-01-05T08:00:00" }
    },
    analysis: { cutoffProjectLocal: "2026-01-05T17:00:00" },
    result: {
      fileName: "project-result.xml",
      sha256: "result-hash",
      project: { startDate: "2026-01-05T08:00:00" },
      compatibility: {
        classification: "strict-result",
        label: "Strict candidate result",
        warnings: []
      },
      validation: {
        pass: true,
        strictResult: true,
        projectInvariantsPreserved: true,
        projectInvariantCount: 3,
        coherentTaskCount: 1,
        coherentAssignmentCount: 1,
        touchedTaskCount: 1,
        untouchedPreservedCount: 10,
        untouchedTaskCount: 10,
        failures: []
      }
    },
    createdAt: new Date("2026-01-01T00:00:00Z")
  });

  assert.equal(document.format, "shutdown-tracker-bulk-result-evidence/v0");
  assert.equal(document.candidate.sha256, "candidate-hash");
  assert.equal(document.result.sha256, "result-hash");
  assert.equal(document.result.compatibility.classification, "strict-result");
  assert.equal(document.result.validation.pass, true);
});

test("bulk generated result exposes explicit profile provenance", () => {
  const taskValue = task(43, 7);
  const assignmentValue = assignment(taskValue);
  const analysis = analyzePlannedCompletionCut({
    project: project(taskValue, assignmentValue),
    cutoff: "2026-01-06T00:00:00"
  });
  const generated = generateBulkAssignedCompletionNativeV0({
    sourceXml: sourceXml(taskValue, assignmentValue),
    analysis
  });
  const intent = buildBulkCompletionExecutionIntent({ analysis });

  assert.equal(generated.profile.id, "bulk-planned-completion-native-v0");
  assert.equal(generated.profile.baseProfileId, "assigned-completion-native-v0");
  assert.equal(intent.length, 2);
});
