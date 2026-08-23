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

export function parseProjectXmlPreview(xml: string): ProjectXmlPreview {
  if (!xml.trim()) {
    throw new Error("The selected XML file is empty.");
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
    projectUid: childText(project, "ProjectGUID") ?? childText(project, "GUID") ?? null,
    statusDate: childText(project, "StatusDate"),
    taskCount: tasks.length,
    summaryTaskCount,
    leafTaskCount: tasks.length - summaryTaskCount,
    tasks
  };
}

function parseTask(task: Element): ProjectXmlTaskPreview {
  return {
    uid: childText(task, "UID"),
    id: childText(task, "ID"),
    name: childText(task, "Name") ?? "Unnamed task",
    wbs: childText(task, "WBS"),
    outlineNumber: childText(task, "OutlineNumber"),
    outlineLevel: numberValue(childText(task, "OutlineLevel")),
    summary: booleanValue(childText(task, "Summary")),
    start: childText(task, "Start"),
    finish: childText(task, "Finish"),
    duration: childText(task, "Duration"),
    actualStart: childText(task, "ActualStart"),
    actualFinish: childText(task, "ActualFinish"),
    percentComplete: numberValue(childText(task, "PercentComplete")),
    physicalPercentComplete: numberValue(childText(task, "PhysicalPercentComplete"))
  };
}

function directChild(parent: Element, localName: string) {
  return directChildren(parent, localName)[0] ?? null;
}

function directChildren(parent: Element, localName: string) {
  const matches: Element[] = [];
  for (const node of Array.from(parent.children)) {
    if (node.localName === localName) {
      matches.push(node);
    }
  }
  return matches;
}

function childText(parent: Element, localName: string) {
  const value = directChild(parent, localName)?.textContent?.trim();
  return value ? value : null;
}

function numberValue(value: string | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: string | null) {
  return value === "1" || value?.toLowerCase() === "true";
}
