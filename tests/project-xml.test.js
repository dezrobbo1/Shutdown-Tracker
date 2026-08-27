import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTaskScalarDiagnostic,
  buildComparisonRows,
  decodeXmlBytes,
  encodeXmlText,
  sha256Hex
} from "../src/project-xml.js";

const source = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>Assigned Task Lab</Name>
  <Tasks>
    <Task>
      <UID>43</UID>
      <ID>7</ID>
      <Name>Assigned leaf</Name>
      <WBS>1.1</WBS>
      <Start>2026-01-05T08:00:00</Start>
      <Finish>2026-01-05T16:00:00</Finish>
      <Duration>PT8H0M0S</Duration>
      <Work>PT16H0M0S</Work>
      <Summary>0</Summary>
      <PercentComplete>0</PercentComplete>
      <ActualDuration>PT0H0M0S</ActualDuration>
      <RemainingDuration>PT8H0M0S</RemainingDuration>
    </Task>
    <Task>
      <UID>44</UID>
      <ID>8</ID>
      <Name>Unrelated leaf</Name>
      <WBS>1.2</WBS>
      <Summary>0</Summary>
    </Task>
  </Tasks>
  <Assignments>
    <Assignment>
      <UID>91</UID>
      <TaskUID>43</TaskUID>
      <ResourceUID>5</ResourceUID>
      <PercentWorkComplete>0</PercentWorkComplete>
      <ActualWork>PT0H0M0S</ActualWork>
      <RemainingWork>PT16H0M0S</RemainingWork>
      <TimephasedData><UID>1</UID><Type>1</Type><Value>PT16H0M0S</Value></TimephasedData>
    </Assignment>
  </Assignments>
</Project>`;

test("diagnostic patch changes only the intended task scalar fields", () => {
  const candidate = applyTaskScalarDiagnostic(source, [
    {
      taskUid: "43",
      expected: { id: "7", name: "Assigned leaf", wbs: "1.1" },
      fields: {
        PercentComplete: "100",
        ActualStart: "2026-01-05T08:00:00",
        ActualFinish: "2026-01-05T16:00:00"
      }
    }
  ]);

  assert.match(candidate, /<PercentComplete>100<\/PercentComplete>/);
  assert.match(candidate, /<ActualStart>2026-01-05T08:00:00<\/ActualStart>/);
  assert.match(candidate, /<ActualFinish>2026-01-05T16:00:00<\/ActualFinish>/);
  assert.match(candidate, /<ActualDuration>PT0H0M0S<\/ActualDuration>/);
  assert.match(candidate, /<RemainingDuration>PT8H0M0S<\/RemainingDuration>/);
  assert.match(candidate, /<PercentWorkComplete>0<\/PercentWorkComplete>/);
  assert.match(candidate, /<RemainingWork>PT16H0M0S<\/RemainingWork>/);

  const unrelatedSource = source.match(/<Task>\s*<UID>44<\/UID>[\s\S]*?<\/Task>/)[0];
  const unrelatedCandidate = candidate.match(/<Task>\s*<UID>44<\/UID>[\s\S]*?<\/Task>/)[0];
  assert.equal(unrelatedCandidate, unrelatedSource);
});

test("task identity mismatch fails closed", () => {
  assert.throws(
    () =>
      applyTaskScalarDiagnostic(source, [
        {
          taskUid: "43",
          expected: { id: "999", name: "Assigned leaf", wbs: "1.1" },
          fields: { PercentComplete: "50" }
        }
      ]),
    /identity mismatch/
  );
});

test("UTF-16LE source encoding and BOM can be retained", () => {
  const bytes = encodeXmlText(source, "utf-16le", true);
  const decoded = decodeXmlBytes(bytes);
  assert.equal(decoded.encoding, "utf-16le");
  assert.equal(decoded.hadBom, true);
  assert.equal(decoded.text, source);
});

test("SHA-256 hashing is deterministic", async () => {
  const bytes = new TextEncoder().encode("shutdown-tracker");
  assert.equal(await sha256Hex(bytes), await sha256Hex(bytes));
});

test("duplicate targeted task UIDs fail closed", () => {
  const duplicated = source.replace("  </Tasks>", `    <Task>
      <UID>43</UID>
      <ID>99</ID>
      <Name>Duplicate</Name>
      <WBS>9.9</WBS>
      <Summary>0</Summary>
    </Task>
  </Tasks>`);

  assert.throws(
    () =>
      applyTaskScalarDiagnostic(duplicated, [
        {
          taskUid: "43",
          expected: {},
          fields: { PercentComplete: "50" }
        }
      ]),
    /Duplicate task UID 43/
  );
});

test("comparison includes unrelated summary changes and timephased assignment changes", () => {
  const task = (uid, id, name, values = {}) => ({
    uid,
    id,
    name,
    wbs: String(id),
    outlineNumber: String(id),
    summary: Boolean(values.summary),
    start: values.start ?? "2026-01-05T08:00:00",
    finish: values.finish ?? "2026-01-05T16:00:00",
    duration: values.duration ?? "PT8H0M0S",
    percentComplete: values.percentComplete ?? "0",
    percentWorkComplete: values.percentWorkComplete ?? "0",
    actualStart: values.actualStart ?? null,
    actualFinish: values.actualFinish ?? null,
    actualDuration: values.actualDuration ?? "PT0H0M0S",
    remainingDuration: values.remainingDuration ?? "PT8H0M0S",
    work: values.work ?? "PT8H0M0S",
    actualWork: values.actualWork ?? "PT0H0M0S",
    remainingWork: values.remainingWork ?? "PT8H0M0S",
    critical: values.critical ?? "0",
    totalSlack: values.totalSlack ?? "0",
    freeSlack: values.freeSlack ?? "0"
  });
  const assignment = (value) => ({
    uid: "91",
    percentWorkComplete: value === "PT8H0M0S" ? "0" : "50",
    start: "2026-01-05T08:00:00",
    finish: "2026-01-05T16:00:00",
    actualStart: null,
    actualFinish: null,
    stop: null,
    resume: null,
    work: "PT8H0M0S",
    actualWork: value === "PT8H0M0S" ? "PT0H0M0S" : "PT4H0M0S",
    remainingWork: value,
    actualOvertimeWork: null,
    remainingOvertimeWork: null,
    timephasedData: [{ uid: "1", type: "1", start: null, finish: null, unit: null, value }]
  });
  const project = (summaryFinish, assignmentValue) => ({
    project: { startDate: "2026-01-05T08:00:00", finishDate: summaryFinish, currentDate: null, statusDate: null },
    taskByUid: new Map([
      ["1", task("1", "1", "Summary", { summary: true, finish: summaryFinish })],
      ["2", task("2", "2", "Tracked leaf")]
    ]),
    assignmentsByTaskUid: new Map([["2", [assignment(assignmentValue)]]])
  });

  const sourceProject = project("2026-01-05T16:00:00", "PT8H0M0S");
  const candidateProject = project("2026-01-05T16:00:00", "PT8H0M0S");
  const resultProject = project("2026-01-06T16:00:00", "PT4H0M0S");
  const rows = buildComparisonRows({
    source: sourceProject,
    candidate: candidateProject,
    result: resultProject,
    taskUids: ["2"]
  });

  assert.ok(rows.some((row) => row.label.includes("Summary · summary · Finish")));
  const assignmentRow = rows.find((row) => row.label.includes("Tracked leaf · leaf · Assignment progress"));
  assert.ok(assignmentRow);
  assert.notEqual(assignmentRow.source, assignmentRow.result);
});
