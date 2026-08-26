import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatImportedProjectDuration,
  parseProjectXmlPreview,
  readUtf8ProjectXml
} from "./projectXmlPreview";

const PROJECT_NAMESPACE = "http://schemas.microsoft.com/project";

describe("browser MSPDI inspection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("extracts schedule identity, hierarchy, and task counts from a browser-parsed MSPDI document", () => {
    installDomParser(projectDocument());

    const preview = parseProjectXmlPreview("<Project />");

    expect(preview.projectName).toBe("Synthetic Trial Schedule");
    expect(preview.projectUid).toBe("11111111-1111-1111-1111-111111111111");
    expect(preview.statusDate).toBe("2026-08-24T06:00:00");
    expect(preview).toMatchObject({
      defaultDurationFormat: 5,
      minutesPerDay: 480,
      minutesPerWeek: 2400,
      daysPerMonth: 20
    });
    expect(preview.taskCount).toBe(2);
    expect(preview.summaryTaskCount).toBe(1);
    expect(preview.leafTaskCount).toBe(1);
    expect(preview.tasks[1]).toMatchObject({
      uid: "2",
      id: "2",
      wbs: "1.1",
      outlineLevel: 2,
      summary: false,
      duration: "PT1H30M0S",
      durationFormat: 5,
      actualStart: "2026-08-24T07:15:00",
      actualFinish: null,
      percentComplete: 25,
      physicalPercentComplete: 20,
      critical: true
    });
  });

  it("renders imported durations using task units and the Project default without deriving from dates", () => {
    const settings = { defaultDurationFormat: 5, minutesPerDay: 480, minutesPerWeek: 2400, daysPerMonth: 20 };

    expect(formatImportedProjectDuration("PT1H30M0S", 5, settings)).toBe("1.5h");
    expect(formatImportedProjectDuration("PT96H0M0S", 8, settings)).toBe("4ed");
    expect(formatImportedProjectDuration("PT240H0M0S", 6, settings)).toBe("240eh");
    expect(formatImportedProjectDuration("PT30M0S", 3, settings)).toBe("30m");
    expect(formatImportedProjectDuration("PT30M0S", 4, settings)).toBe("30em");
    expect(formatImportedProjectDuration("PT8H0M0S", 7, settings)).toBe("1d");
    expect(formatImportedProjectDuration("PT40H0M0S", 9, settings)).toBe("1w");
    expect(formatImportedProjectDuration("P7D", 10, settings)).toBe("1ew");
    expect(formatImportedProjectDuration("PT160H0M0S", 11, settings)).toBe("1mo");
    expect(formatImportedProjectDuration("P20D", 12, settings)).toBe("1emo");
    expect(formatImportedProjectDuration("PT8H0M0S", 21, settings)).toBe("8h");
    expect(formatImportedProjectDuration("PT8H0M0S", 37, settings)).toBe("8h?");
    expect(formatImportedProjectDuration("PT8H0M0S", 53, settings)).toBe("8h?");
    expect(formatImportedProjectDuration("PT8H0M0S", 999, settings)).toBe("PT8H0M0S");
    expect(formatImportedProjectDuration("PT8H0M0S", 7, { ...settings, minutesPerDay: null })).toBe("PT8H0M0S");
    expect(formatImportedProjectDuration(null, 5, settings)).toBe("Not supplied");
  });

  it("rejects malformed or non-MSPDI browser parse results", () => {
    installDomParser(documentResult(element("parsererror"), true));
    expect(() => parseProjectXmlPreview("<Project>")).toThrow("not valid XML");

    installDomParser(documentResult(element("Project")));
    expect(() => parseProjectXmlPreview("<Project />"))
      .toThrow("not Microsoft Project MSPDI content");
  });

  it("rejects document type and entity declarations", () => {
    expect(() => parseProjectXmlPreview(
      `<!DOCTYPE Project [<!ENTITY site "synthetic">]><Project xmlns="${PROJECT_NAMESPACE}"><Name>&site;</Name></Project>`
    )).toThrow("document type or entity declarations");
  });

  it("rejects a non-UTF-8 declaration before treating browser-decoded text as source", () => {
    expect(() => parseProjectXmlPreview(
      `<?xml version="1.0" encoding="UTF-16"?><Project xmlns="${PROJECT_NAMESPACE}" />`
    )).toThrow("Only UTF-8 Microsoft Project XML");
  });

  it("retains a UTF-8 BOM and rejects lossy invalid UTF-8 decoding", async () => {
    const xml = `\uFEFF<?xml version="1.0" encoding="UTF-8"?><Project xmlns="${PROJECT_NAMESPACE}" />`;
    const originalBytes = new TextEncoder().encode(xml);
    const retained = await readUtf8ProjectXml(new Blob([originalBytes]));
    expect(retained.xml).toBe(xml);
    expect([...retained.bytes]).toEqual([...originalBytes]);

    await expect(readUtf8ProjectXml(new Blob([new Uint8Array([0xc3, 0x28])])))
      .rejects.toThrow("valid UTF-8 Microsoft Project XML");
  });

  it("rejects duplicate and invalid comparison-critical Task fields", () => {
    const duplicateContainers = element("Project", null, [
      element("Tasks", null, [task([["UID", "1"], ["ID", "1"]])], PROJECT_NAMESPACE),
      element("Tasks", null, [task([["UID", "2"], ["ID", "2"]])], PROJECT_NAMESPACE)
    ], PROJECT_NAMESPACE);
    installDomParser(documentResult(duplicateContainers));
    expect(() => parseProjectXmlPreview("<Project />")).toThrow("more than one direct Tasks");

    const duplicateUid = element("Project", null, [
      element("Tasks", null, [task([["UID", "1"], ["UID", "2"], ["ID", "1"]])], PROJECT_NAMESPACE)
    ], PROJECT_NAMESPACE);
    installDomParser(documentResult(duplicateUid));
    expect(() => parseProjectXmlPreview("<Project />")).toThrow("more than one direct UID");

    const invalidProgress = element("Project", null, [
      element("Tasks", null, [task([["UID", "1"], ["ID", "1"], ["PercentComplete", "not-a-number"]])], PROJECT_NAMESPACE)
    ], PROJECT_NAMESPACE);
    installDomParser(documentResult(invalidProgress));
    expect(() => parseProjectXmlPreview("<Project />")).toThrow("PercentComplete must be numeric");

    const invalidDurationFormat = element("Project", null, [
      element("Tasks", null, [task([["UID", "1"], ["ID", "1"], ["DurationFormat", "5.5"]])], PROJECT_NAMESPACE)
    ], PROJECT_NAMESPACE);
    installDomParser(documentResult(invalidDurationFormat));
    expect(() => parseProjectXmlPreview("<Project />")).toThrow("DurationFormat must be an integer");
  });

  it("ignores direct children that rebind away from the Project namespace", () => {
    const root = element("Project", null, [
      field("Name", "Namespace safety"),
      element("Tasks", null, [
        task([["UID", "1"], ["ID", "1"], ["Name", "Real Project task"]]),
        task([["UID", "2"], ["ID", "2"], ["Name", "Foreign task"]], "urn:foreign")
      ], PROJECT_NAMESPACE)
    ], PROJECT_NAMESPACE);
    installDomParser(documentResult(root));

    const preview = parseProjectXmlPreview("<Project />");

    expect(preview.tasks.map((item) => item.uid)).toEqual(["1"]);
  });
});

type FakeElement = {
  localName: string;
  namespaceURI: string | null;
  textContent: string | null;
  children: FakeElement[];
  getAttribute: (name: string) => string | null;
};

function element(localName: string, textContent: string | null = null, children: FakeElement[] = [], namespaceURI: string | null = null): FakeElement {
  return {
    localName,
    namespaceURI,
    textContent,
    children,
    getAttribute: (name) => name === "xmlns" ? namespaceURI : null
  };
}

function field(localName: string, value: string) {
  return element(localName, value, [], PROJECT_NAMESPACE);
}

function task(values: Array<[string, string]>, namespaceURI = PROJECT_NAMESPACE) {
  return element(
    "Task",
    null,
    values.map(([name, value]) => element(name, value, [], namespaceURI)),
    namespaceURI
  );
}

function projectDocument() {
  const root = element("Project", null, [
    field("Name", "Synthetic Trial Schedule"),
    field("GUID", "11111111-1111-1111-1111-111111111111"),
    field("StatusDate", "2026-08-24T06:00:00"),
    field("DurationFormat", "5"),
    field("MinutesPerDay", "480"),
    field("MinutesPerWeek", "2400"),
    field("DaysPerMonth", "20"),
    element("Tasks", null, [
      task([["UID", "1"], ["ID", "1"], ["Name", "Summary work pack"], ["WBS", "1"], ["OutlineNumber", "1"], ["OutlineLevel", "1"], ["Summary", "1"]]),
      task([["UID", "2"], ["ID", "2"], ["Name", "Inspect synthetic equipment"], ["WBS", "1.1"], ["OutlineNumber", "1.1"], ["OutlineLevel", "2"], ["Summary", "0"], ["Start", "2026-08-24T07:00:00"], ["Finish", "2026-08-24T08:00:00"], ["Duration", "PT1H30M0S"], ["DurationFormat", "5"], ["ActualStart", "2026-08-24T07:15:00"], ["PercentComplete", "25"], ["PhysicalPercentComplete", "20"], ["Critical", "1"]])
    ], PROJECT_NAMESPACE)
  ], PROJECT_NAMESPACE);
  return documentResult(root);
}

function documentResult(documentElement: FakeElement, parserError = false) {
  return {
    documentElement,
    getElementsByTagName: () => parserError ? [element("parsererror")] : flatten(documentElement)
  } as unknown as Document;
}

function flatten(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(flatten)];
}

function installDomParser(result: Document) {
  vi.stubGlobal("DOMParser", class {
    parseFromString() {
      return result;
    }
  });
}
