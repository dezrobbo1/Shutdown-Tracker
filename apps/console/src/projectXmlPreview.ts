export type ProjectXmlTaskPreview = {
  uid: string | null;
  id: string | null;
  name: string;
  wbs: string | null;
  outlineNumber: string | null;
  outlineLevel: number | null;
  summary: boolean;
  start: string | null;
  finish: string | null;
  duration: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  percentComplete: number | null;
  physicalPercentComplete: number | null;
  critical: boolean | null;
};

export type ProjectXmlPreview = {
  projectName: string;
  projectUid: string | null;
  statusDate: string | null;
  taskCount: number;
  summaryTaskCount: number;
  leafTaskCount: number;
  tasks: ProjectXmlTaskPreview[];
};

const PROJECT_NAMESPACE = "http://schemas.microsoft.com/project";

export async function readUtf8ProjectXml(blob: Pick<Blob, "arrayBuffer">): Promise<{
  bytes: Uint8Array;
  xml: string;
}> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  try {
    const xml = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    return { bytes: Uint8Array.from(bytes), xml };
  } catch {
    throw new Error("Only valid UTF-8 Microsoft Project XML is supported in this browser trial.");
  }
}

export function parseProjectXmlPreview(xml: string): ProjectXmlPreview {
  if (!xml.trim()) {
    throw new Error("The selected XML file is empty.");
  }
  if (/<!DOCTYPE\s|<!ENTITY\s/i.test(xml)) {
    throw new Error("Project XML with document type or entity declarations is not supported in the browser trial.");
  }
  const declaredEncoding = /^\uFEFF?\s*<\?xml\b[^>]*\bencoding\s*=\s*(["'])(.*?)\1[^>]*\?>/iu.exec(xml)?.[2];
  if (declaredEncoding && !/^utf-?8$/iu.test(declaredEncoding.trim())) {
    throw new Error("Only UTF-8 Microsoft Project XML can be inspected from decoded browser text in this trial.");
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = Array.from(document.getElementsByTagName("*")).find(
    (element) => element.localName.toLowerCase() === "parsererror"
  );
  if (parserError) {
    throw new Error("The selected file is not valid XML.");
  }

  const project = document.documentElement;
  if (!project || project.localName !== "Project") {
    throw new Error("The XML root is not a Microsoft Project <Project> document.");
  }

  const namespace = project.namespaceURI ?? project.getAttribute("xmlns") ?? "";
  if (namespace !== PROJECT_NAMESPACE) {
    throw new Error("The XML is not Microsoft Project MSPDI content.");
  }

  const taskContainer = directChild(project, "Tasks");
  const taskElements = taskContainer ? directChildren(taskContainer, "Task") : [];
  const tasks = taskElements.map(parseTask);
  const summaryTaskCount = tasks.filter((task) => task.summary).length;

  return {
    projectName: childText(project, "Name") ?? childText(project, "Title") ?? "Unnamed Project schedule",
    projectUid: childText(project, "UID") ?? childText(project, "ProjectGUID") ?? childText(project, "GUID") ?? null,
    statusDate: childText(project, "StatusDate"),
    taskCount: tasks.length,
    summaryTaskCount,
    leafTaskCount: tasks.length - summaryTaskCount,
    tasks
  };
}

function parseTask(task: Element): ProjectXmlTaskPreview {
  return {
    uid: integerText(childText(task, "UID"), "Task UID"),
    id: integerText(childText(task, "ID"), "Task ID"),
    name: childText(task, "Name") ?? "Unnamed task",
    wbs: childText(task, "WBS"),
    outlineNumber: childText(task, "OutlineNumber"),
    outlineLevel: numberValue(childText(task, "OutlineLevel"), "Task OutlineLevel"),
    summary: booleanValue(childText(task, "Summary"), "Task Summary"),
    start: childText(task, "Start"),
    finish: childText(task, "Finish"),
    duration: childText(task, "Duration"),
    actualStart: childText(task, "ActualStart"),
    actualFinish: childText(task, "ActualFinish"),
    percentComplete: numberValue(childText(task, "PercentComplete"), "Task PercentComplete"),
    physicalPercentComplete: numberValue(childText(task, "PhysicalPercentComplete"), "Task PhysicalPercentComplete"),
    critical: optionalBooleanValue(childText(task, "Critical"), "Task Critical")
  };
}

function directChild(parent: Element, localName: string) {
  const matches = directChildren(parent, localName);
  if (matches.length > 1) {
    throw new Error(`${parent.localName} contains more than one direct ${localName} element.`);
  }
  return matches[0] ?? null;
}

function directChildren(parent: Element, localName: string) {
  const matches: Element[] = [];
  for (const node of Array.from(parent.children)) {
    if (node.localName === localName && node.namespaceURI === parent.namespaceURI) {
      matches.push(node);
    }
  }
  return matches;
}

function childText(parent: Element, localName: string) {
  const matches = directChildren(parent, localName);
  if (matches.length > 1) {
    throw new Error(`${parent.localName} contains more than one direct ${localName} element.`);
  }
  const value = matches[0]?.textContent?.trim();
  return value ? value : null;
}

function integerText(value: string | null, field: string) {
  if (value === null) return null;
  if (!/^-?\d+$/u.test(value)) throw new Error(`${field} must be an integer in Microsoft Project XML.`);
  return value;
}

function numberValue(value: string | null, field: string) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be numeric in Microsoft Project XML.`);
  return parsed;
}

function booleanValue(value: string | null, field: string) {
  if (value !== null && !/^(?:0|1|true|false)$/iu.test(value)) {
    throw new Error(`${field} must be 0, 1, true, or false in Microsoft Project XML.`);
  }
  return value === "1" || value?.toLowerCase() === "true";
}

function optionalBooleanValue(value: string | null, field: string) {
  return value === null ? null : booleanValue(value, field);
}
