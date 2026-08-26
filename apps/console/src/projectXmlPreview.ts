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
  durationFormat: number | null;
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
  defaultDurationFormat: number | null;
  minutesPerDay: number | null;
  minutesPerWeek: number | null;
  daysPerMonth: number | null;
  taskCount: number;
  summaryTaskCount: number;
  leafTaskCount: number;
  tasks: ProjectXmlTaskPreview[];
};

type ProjectDurationDisplaySettings = Pick<
  ProjectXmlPreview,
  "defaultDurationFormat" | "minutesPerDay" | "minutesPerWeek" | "daysPerMonth"
>;

const PROJECT_DURATION_UNITS: Readonly<Record<number, string>> = {
  3: "m", 4: "em", 5: "h", 6: "eh", 7: "d", 8: "ed",
  9: "w", 10: "ew", 11: "mo", 12: "emo"
};

export function formatImportedProjectDuration(
  value: string | null,
  taskDurationFormat: number | null = null,
  settings?: ProjectDurationDisplaySettings
): string {
  if (value === null) return "Not supplied";
  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/u.exec(value);
  if (!match || match.slice(1).every((part) => part === undefined)) return value;

  const [days = "0", hours = "0", minutes = "0", seconds = "0"] = match.slice(1);
  const totalMinutes = Number(days) * 1440 + Number(hours) * 60 + Number(minutes) + Number(seconds) / 60;
  const estimatedDefault = taskDurationFormat === 53;
  const requestedFormat = taskDurationFormat === 21 || estimatedDefault || taskDurationFormat === null
    ? settings?.defaultDurationFormat ?? null
    : taskDurationFormat;
  const estimatedFormat = requestedFormat !== null && requestedFormat >= 35 && requestedFormat <= 44;
  const estimated = estimatedDefault || estimatedFormat;
  const durationFormat = estimatedFormat ? requestedFormat - 32 : requestedFormat;
  const unit = durationUnit(durationFormat);
  const divisor = durationDivisor(durationFormat, settings);
  if (unit !== null && divisor !== null) {
    return `${formatDurationNumber(totalMinutes / divisor)}${unit}${estimated ? "?" : ""}`;
  }
  // Preserve the source interval when Project's display unit cannot be interpreted safely.
  return value;
}

function durationUnit(format: number | null) {
  return format === null ? null : PROJECT_DURATION_UNITS[format] ?? null;
}

function durationDivisor(format: number | null, settings?: ProjectDurationDisplaySettings) {
  if (format === 3 || format === 4) return 1;
  if (format === 5 || format === 6) return 60;
  if (format === 7) return positiveSetting(settings?.minutesPerDay);
  if (format === 8) return 1440;
  if (format === 9) return positiveSetting(settings?.minutesPerWeek);
  if (format === 10) return 10_080;
  if (format === 11) {
    const minutesPerDay = positiveSetting(settings?.minutesPerDay);
    const daysPerMonth = positiveSetting(settings?.daysPerMonth);
    return minutesPerDay !== null && daysPerMonth !== null ? minutesPerDay * daysPerMonth : null;
  }
  if (format === 12) {
    const daysPerMonth = positiveSetting(settings?.daysPerMonth);
    return daysPerMonth === null ? null : 1440 * daysPerMonth;
  }
  return null;
}

function positiveSetting(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function formatDurationNumber(value: number) {
  return Number(value.toFixed(4)).toString();
}

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
    defaultDurationFormat: integerNumberValue(childText(project, "DurationFormat"), "Project DurationFormat"),
    minutesPerDay: integerNumberValue(childText(project, "MinutesPerDay"), "Project MinutesPerDay"),
    minutesPerWeek: integerNumberValue(childText(project, "MinutesPerWeek"), "Project MinutesPerWeek"),
    daysPerMonth: integerNumberValue(childText(project, "DaysPerMonth"), "Project DaysPerMonth"),
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
    durationFormat: integerNumberValue(childText(task, "DurationFormat"), "Task DurationFormat"),
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

function integerNumberValue(value: string | null, field: string) {
  const parsed = numberValue(value, field);
  if (parsed !== null && !Number.isInteger(parsed)) throw new Error(`${field} must be an integer in Microsoft Project XML.`);
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
