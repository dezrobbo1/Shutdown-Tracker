import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTaskScalarDiagnostic,
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
