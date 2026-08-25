import { describe, expect, it } from "vitest";
import {
  createProjectXmlMapping,
  escapeProjectXmlText,
  generateProjectXmlCandidate,
  sha256Hex,
  type ProjectXmlMapping
} from "./projectXmlCandidate";

describe("complete-source browser Project XML candidate", () => {
  it("keeps every proposed Project mapping excluded by default", () => {
    const proposal = createProjectXmlMapping({
      taskUid: "2",
      field: "ActualStart",
      expectedSourceValue: "2026-08-24T07:00:00",
      proposedValue: "2026-08-24T07:15:00"
    });

    expect(proposal.included).toBe(false);
  });

  it("changes only explicitly selected fields on the exact Task UID and leaves the source string unchanged", async () => {
    const source = projectSource();
    const sourceBefore = source;
    const selected = mapping({
      field: "ActualStart",
      expectedSourceValue: "2026-08-24T07:00:00",
      proposedValue: "2026-08-24T07:15:00"
    });
    const excluded = createProjectXmlMapping({
      taskUid: "2",
      expectedTaskId: "2",
      expectedTaskName: "Inspect synthetic equipment",
      expectedTaskWbs: "1.1",
      expectedTaskSummary: false,
      field: "PercentComplete",
      expectedSourceValue: "25",
      proposedValue: "60"
    });

    const result = await generateProjectXmlCandidate(source, [selected, excluded]);
    const expectedCandidate = source.replace(
      "<ActualStart>2026-08-24T07:00:00</ActualStart>",
      "<ActualStart>2026-08-24T07:15:00</ActualStart>"
    );

    expect(source).toBe(sourceBefore);
    expect(result.sourceXml).toBe(sourceBefore);
    expect(result.candidateXml).toBe(expectedCandidate);
    expect(result.candidateXml).toContain("<PercentComplete>25</PercentComplete>");
    expect(result.candidateXml).toContain("<UID>3</UID>");
    expect(result.candidateXml).toContain("<ActualStart>2026-08-24T09:00:00</ActualStart>");
    expect(result.candidateXml).toContain("<!-- unrelated source content must remain byte-for-byte -->");
    expect(result.changes).toEqual([{
      taskUid: "2",
      taskId: "2",
      taskName: "Inspect synthetic equipment",
      taskWbs: "1.1",
      field: "ActualStart",
      sourceValue: "2026-08-24T07:00:00",
      candidateValue: "2026-08-24T07:15:00",
      inserted: false
    }]);
    expect(result.sourceSha256).toHaveLength(64);
    expect(result.candidateSha256).toHaveLength(64);
    expect(result.candidateSha256).not.toBe(result.sourceSha256);
  });

  it("inserts absent supported fields only at documented adjacent Task-order anchors", async () => {
    const source = projectSource()
      .replace("      <PercentComplete>25</PercentComplete>\n", "")
      .replace("      <ActualFinish>2026-08-24T08:00:00</ActualFinish>\n", "")
      .replace("      <PhysicalPercentComplete>10</PhysicalPercentComplete>\n", "");

    const result = await generateProjectXmlCandidate(source, [
      mapping({ field: "PercentComplete", expectedSourceValue: null, proposedValue: "55" }),
      mapping({ field: "ActualFinish", expectedSourceValue: null, proposedValue: "2026-08-24T08:10:00" }),
      mapping({ field: "PhysicalPercentComplete", expectedSourceValue: null, proposedValue: "45" })
    ]);

    expect(result.candidateXml).toContain([
      "<FixedCostAccrual>3</FixedCostAccrual>",
      "      <PercentComplete>55</PercentComplete>",
      "      <PercentWorkComplete>25</PercentWorkComplete>"
    ].join("\n      ").replaceAll("\n            ", "\n      "));
    expect(result.candidateXml).toContain([
      "<ActualStart>2026-08-24T07:00:00</ActualStart>",
      "      <ActualFinish>2026-08-24T08:10:00</ActualFinish>",
      "      <ActualDuration>PT1H0M0S</ActualDuration>"
    ].join("\n      ").replaceAll("\n            ", "\n      "));
    expect(result.candidateXml).toContain([
      "<BCWP>0</BCWP>",
      "      <PhysicalPercentComplete>45</PhysicalPercentComplete>",
      "      <EarnedValueMethod>0</EarnedValueMethod>"
    ].join("\n      ").replaceAll("\n            ", "\n      "));
    expect(result.changes.map((change) => [change.field, change.inserted])).toEqual([
      ["PercentComplete", true],
      ["ActualFinish", true],
      ["PhysicalPercentComplete", true]
    ]);
  });

  it("uses the current Project GUID, Active, Manual ordering without inserting execution fields near Name", async () => {
    const source = projectSource()
      .replace("      <ActualStart>2026-08-24T07:00:00</ActualStart>\n", "")
      .replace("      <UID>2</UID>\n", "      <UID>2</UID>\n      <GUID>22222222-2222-2222-2222-222222222222</GUID>\n")
      .replace("      <Name>Inspect synthetic equipment</Name>\n", "      <Name>Inspect synthetic equipment</Name>\n      <Active>1</Active>\n      <Manual>0</Manual>\n      <Type>0</Type>\n")
      .replaceAll("      <Manual>0</Manual>\n      <Active>1</Active>\n", "");

    const result = await generateProjectXmlCandidate(source, [
      mapping({ field: "ActualStart", expectedSourceValue: null, proposedValue: "2026-08-24T07:15:00" })
    ]);

    expect(result.candidateXml).toContain([
      "<OvertimeWork>PT0H0M0S</OvertimeWork>",
      "      <ActualStart>2026-08-24T07:15:00</ActualStart>",
      "      <ActualFinish>2026-08-24T08:00:00</ActualFinish>"
    ].join("\n      ").replaceAll("\n            ", "\n      "));
    expect(result.candidateXml.indexOf("<ActualStart>")).toBeGreaterThan(result.candidateXml.indexOf("<OvertimeWork>"));
  });

  it("replaces a self-closing supported field without altering its surrounding Task content", async () => {
    const source = projectSource().replace(
      "<PercentComplete>25</PercentComplete>",
      "<PercentComplete />"
    );
    const result = await generateProjectXmlCandidate(source, [
      mapping({ field: "PercentComplete", expectedSourceValue: null, proposedValue: "35" })
    ]);

    expect(result.candidateXml).toBe(source.replace(
      "<PercentComplete />",
      "<PercentComplete>35</PercentComplete>"
    ));

    const attributed = projectSource().replace(
      "<PercentComplete>25</PercentComplete>",
      '<PercentComplete data-origin="retained" />'
    );
    const attributedResult = await generateProjectXmlCandidate(attributed, [
      mapping({ field: "PercentComplete", expectedSourceValue: null, proposedValue: "35" })
    ]);
    expect(attributedResult.candidateXml).toBe(attributed.replace(
      '<PercentComplete data-origin="retained" />',
      '<PercentComplete data-origin="retained">35</PercentComplete>'
    ));
  });

  it("escapes XML text and calculates browser SHA-256 deterministically", async () => {
    expect(escapeProjectXmlText(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
    await expect(sha256Hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    await expect(sha256Hex(new TextEncoder().encode("abc"))).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("fails safely when the selected Task UID is missing or duplicated", async () => {
    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ taskUid: "99", field: "PercentComplete", expectedSourceValue: null, proposedValue: "10" })
    ])).rejects.toThrow("Task UID 99 was not found");

    const duplicateTask = leafTask("2", "99", "Duplicate synthetic task", "9.9", "0", "");
    const duplicateSource = projectSource().replace("  </Tasks>", `${duplicateTask}  </Tasks>`);
    await expect(generateProjectXmlCandidate(duplicateSource, [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" })
    ])).rejects.toThrow("Task UID 2 occurs more than once");
  });

  it("scopes target identity to the direct MSPDI Project Tasks collection", async () => {
    const nestedDuplicate = [
      `  <ExtendedAttribute>`,
      `    <Tasks><Task><UID>2</UID><ID>999</ID><Name>Extension task</Name></Task></Tasks>`,
      `  </ExtendedAttribute>`
    ].join("\n");
    const source = projectSource().replace("  <Tasks>", `${nestedDuplicate}\n  <Tasks>`);

    const result = await generateProjectXmlCandidate(source, [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" })
    ]);

    expect(result.changes).toHaveLength(1);
    expect(result.candidateXml).toContain(nestedDuplicate);
    expect(result.candidateXml).toContain("<PercentComplete>50</PercentComplete>");
  });

  it("rejects summary tasks, stale identity, and stale source-field values", async () => {
    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({
        taskUid: "1",
        expectedTaskId: "1",
        expectedTaskName: "Synthetic summary",
        expectedTaskWbs: "1",
        expectedTaskSummary: true,
        field: "ActualStart",
        expectedSourceValue: null,
        proposedValue: "2026-08-24T06:00:00"
      })
    ])).rejects.toThrow("is a summary task");

    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ expectedTaskWbs: "changed-wbs", field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" })
    ])).rejects.toThrow("Stale source for Project Task UID 2");

    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ field: "PercentComplete", expectedSourceValue: "20", proposedValue: "50" })
    ])).rejects.toThrow("expected \"20\", found \"25\"");

    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "25" })
    ])).rejects.toThrow("already has the proposed value");
  });

  it("rejects an absent field when no adjacent documented Task-order anchor exists", async () => {
    const source = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<Project xmlns="http://schemas.microsoft.com/project">`,
      `  <Tasks>`,
      `    <Task>`,
      `      <UID>2</UID>`,
      `      <ID>2</ID>`,
      `      <Name>Unsupported extension layout</Name>`,
      `      <Summary>0</Summary>`,
      `      <UnknownTail />`,
      `    </Task>`,
      `  </Tasks>`,
      `</Project>`
    ].join("\n");

    await expect(generateProjectXmlCandidate(source, [
      mapping({
        expectedTaskName: "Unsupported extension layout",
        expectedTaskWbs: undefined,
        field: "ActualStart",
        expectedSourceValue: null,
        proposedValue: "2026-08-24T07:00:00"
      })
    ])).rejects.toThrow("no supported adjacent MSPDI Task-order anchor");
  });

  it("requires at least one explicit selection and rejects duplicate selected task-field mappings", async () => {
    const excluded = createProjectXmlMapping({
      taskUid: "2",
      field: "PercentComplete",
      expectedSourceValue: "25",
      proposedValue: "50"
    });
    await expect(generateProjectXmlCandidate(projectSource(), [excluded])).rejects.toThrow("Select at least one");

    const selected = mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" });
    await expect(generateProjectXmlCandidate(projectSource(), [selected, selected])).rejects.toThrow(
      "more than one selected PercentComplete mapping"
    );
  });

  it("rejects document type and entity declarations instead of interpreting them", async () => {
    const source = projectSource().replace(
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE Project [<!ENTITY site "synthetic">]>`
    );

    await expect(generateProjectXmlCandidate(source, [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" })
    ])).rejects.toThrow("document type or entity declarations");
  });

  it("rejects unsupported decoded encodings and Project-namespace rebinding", async () => {
    const utf16 = projectSource().replace('encoding="UTF-8"', 'encoding="UTF-16"');
    await expect(generateProjectXmlCandidate(utf16, [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" })
    ])).rejects.toThrow("Only UTF-8 Microsoft Project XML");

    const rebound = projectSource().replace(
      "  <Tasks>",
      '  <Tasks xmlns="urn:foreign">'
    );
    await expect(generateProjectXmlCandidate(rebound, [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" })
    ])).rejects.toThrow("rebinds the Microsoft Project namespace");
  });

  it("normalizes empty and numeric source values while validating proposed field values", async () => {
    const decimalSource = projectSource().replace(
      "<PercentComplete>25</PercentComplete>",
      "<PercentComplete>25.0</PercentComplete>"
    );
    await expect(generateProjectXmlCandidate(decimalSource, [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "50" })
    ])).resolves.toMatchObject({ changes: [{ sourceValue: "25", candidateValue: "50" }] });

    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "101" })
    ])).rejects.toThrow("whole percentage from 0 to 100");
    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ field: "PercentComplete", expectedSourceValue: "25", proposedValue: "25.5" })
    ])).rejects.toThrow("whole percentage from 0 to 100");
    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ field: "ActualStart", expectedSourceValue: "2026-08-24T07:00:00", proposedValue: "2026-02-30T07:00:00" })
    ])).rejects.toThrow("valid Microsoft Project date-time");
    await expect(generateProjectXmlCandidate(projectSource(), [
      mapping({ field: "ActualStart", expectedSourceValue: "2026-08-24T07:00:00", proposedValue: "2026-08-24T07:00:30" })
    ])).rejects.toThrow("whole-minute Microsoft Project date-time");
  });
});

function mapping(overrides: Partial<ProjectXmlMapping>): ProjectXmlMapping {
  return {
    taskUid: "2",
    expectedTaskId: "2",
    expectedTaskName: "Inspect synthetic equipment",
    expectedTaskWbs: "1.1",
    expectedTaskSummary: false,
    field: "ActualStart",
    expectedSourceValue: "2026-08-24T07:00:00",
    proposedValue: "2026-08-24T07:15:00",
    included: true,
    ...overrides
  };
}

function projectSource() {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Project xmlns="http://schemas.microsoft.com/project">`,
    `  <Name>Synthetic round-trip source</Name>`,
    `  <!-- unrelated source content must remain byte-for-byte -->`,
    `  <Tasks>`,
    `    <Task>`,
    `      <UID>1</UID>`,
    `      <ID>1</ID>`,
    `      <Name>Synthetic summary</Name>`,
    `      <WBS>1</WBS>`,
    `      <OutlineNumber>1</OutlineNumber>`,
    `      <OutlineLevel>1</OutlineLevel>`,
    `      <Summary>1</Summary>`,
    `      <Manual>0</Manual>`,
    `      <Active>1</Active>`,
    `    </Task>`,
    leafTask("2", "2", "Inspect synthetic equipment", "1.1", "25", "2026-08-24T07:00:00"),
    leafTask("3", "3", "Repair synthetic equipment", "1.2", "40", "2026-08-24T09:00:00"),
    `  </Tasks>`,
    `  <Resources><Resource><UID>1</UID><Name>Synthetic resource</Name></Resource></Resources>`,
    `</Project>`
  ].join("\n");
}

function leafTask(uid: string, id: string, name: string, wbs: string, progress: string, actualStart: string) {
  return [
    `    <Task>`,
    `      <UID>${uid}</UID>`,
    `      <ID>${id}</ID>`,
    `      <Name>${name}</Name>`,
    `      <WBS>${wbs}</WBS>`,
    `      <OutlineNumber>${wbs}</OutlineNumber>`,
    `      <OutlineLevel>2</OutlineLevel>`,
    `      <Start>2026-08-24T07:00:00</Start>`,
    `      <Finish>2026-08-24T08:00:00</Finish>`,
    `      <Summary>0</Summary>`,
    `      <FixedCostAccrual>3</FixedCostAccrual>`,
    `      <PercentComplete>${progress}</PercentComplete>`,
    `      <PercentWorkComplete>${progress}</PercentWorkComplete>`,
    `      <OvertimeWork>PT0H0M0S</OvertimeWork>`,
    `      <ActualStart>${actualStart}</ActualStart>`,
    `      <ActualFinish>2026-08-24T08:00:00</ActualFinish>`,
    `      <ActualDuration>PT1H0M0S</ActualDuration>`,
    `      <BCWP>0</BCWP>`,
    `      <PhysicalPercentComplete>10</PhysicalPercentComplete>`,
    `      <EarnedValueMethod>0</EarnedValueMethod>`,
    `      <Manual>0</Manual>`,
    `      <Active>1</Active>`,
    `    </Task>`,
  ].join("\n") + "\n";
}
