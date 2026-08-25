export const PROJECT_XML_NAMESPACE = "http://schemas.microsoft.com/project";

export const PROJECT_XML_MAPPING_FIELDS = [
  "ActualStart",
  "ActualFinish",
  "PercentComplete",
  "PhysicalPercentComplete"
] as const;

export type ProjectXmlMappingField = (typeof PROJECT_XML_MAPPING_FIELDS)[number];

export type ProjectXmlMapping = {
  taskUid: string;
  expectedTaskId?: string;
  expectedTaskName?: string;
  expectedTaskWbs?: string;
  expectedTaskSummary?: boolean;
  field: ProjectXmlMappingField;
  expectedSourceValue: string | null;
  proposedValue: string;
  included: boolean;
};

export type ProjectXmlCandidateChange = {
  taskUid: string;
  taskId: string | null;
  taskName: string | null;
  taskWbs: string | null;
  field: ProjectXmlMappingField;
  sourceValue: string | null;
  candidateValue: string;
  inserted: boolean;
};

export type ProjectXmlCandidateResult = {
  sourceXml: string;
  candidateXml: string;
  sourceSha256: string;
  candidateSha256: string;
  changes: ProjectXmlCandidateChange[];
};

export function createProjectXmlMapping(
  mapping: Omit<ProjectXmlMapping, "included"> & { included?: boolean }
): ProjectXmlMapping {
  return { ...mapping, included: mapping.included ?? false };
}

export async function generateProjectXmlCandidate(
  sourceXml: string,
  mappings: readonly ProjectXmlMapping[]
): Promise<ProjectXmlCandidateResult> {
  const selectedMappings = mappings.filter((mapping) => mapping.included);
  if (selectedMappings.length === 0) {
    throw new Error("Select at least one experimental Project field mapping before generating a candidate.");
  }
  if (/<!DOCTYPE\s|<!ENTITY\s/i.test(sourceXml)) {
    throw new Error("Project XML with document type or entity declarations is not supported for candidate generation.");
  }
  const declaredEncoding = /^\uFEFF?\s*<\?xml\b[^>]*\bencoding\s*=\s*(["'])(.*?)\1[^>]*\?>/iu.exec(sourceXml)?.[2];
  if (declaredEncoding && !/^utf-?8$/iu.test(declaredEncoding.trim())) {
    throw new Error("Only UTF-8 Microsoft Project XML can be patched from decoded browser text in this trial.");
  }

  const document = scanXml(sourceXml);
  assertMspdiProject(document, sourceXml);
  const root = document.roots[0];
  const taskContainers = directChildren(root, "Tasks");
  if (taskContainers.length !== 1) {
    throw new Error("The MSPDI Project root must contain exactly one direct Tasks element.");
  }
  const tasks = directChildren(taskContainers[0], "Task");
  const edits: TextEdit[] = [];
  const changes: ProjectXmlCandidateChange[] = [];
  const selectedKeys = new Set<string>();

  for (const mapping of selectedMappings) {
    if (!PROJECT_XML_MAPPING_FIELDS.includes(mapping.field)) {
      throw new Error(`Unsupported experimental Project field: ${String(mapping.field)}.`);
    }
    if (!mapping.taskUid.trim()) throw new Error("A Project Task UID is required for every selected mapping.");
    validateProposedValue(mapping);
    const key = `${mapping.taskUid}\u0000${mapping.field}`;
    if (selectedKeys.has(key)) {
      throw new Error(`Task UID ${mapping.taskUid} has more than one selected ${mapping.field} mapping.`);
    }
    selectedKeys.add(key);

    const matches = tasks.filter((task) => readRequiredDirectChild(task, "UID", sourceXml) === mapping.taskUid);
    if (matches.length === 0) throw new Error(`Project Task UID ${mapping.taskUid} was not found in the source XML.`);
    if (matches.length > 1) throw new Error(`Project Task UID ${mapping.taskUid} occurs more than once in the source XML.`);

    const task = matches[0];
    const identity = readTaskIdentity(task, sourceXml);
    assertTaskPreconditions(mapping, identity);
    if (identity.summary) {
      throw new Error(`Project Task UID ${mapping.taskUid} is a summary task; experimental execution/progress mappings require a leaf task.`);
    }

    const fields = directChildren(task, mapping.field);
    if (fields.length > 1) {
      throw new Error(`Project Task UID ${mapping.taskUid} contains more than one ${mapping.field} element.`);
    }

    if (fields.length === 1) {
      const field = fields[0];
      const current = readSimpleElementValue(field, sourceXml);
      assertSourceValue(mapping, current);
      assertChangedValue(mapping, current);
      const valueRange = simpleElementValueRange(field, sourceXml);
      const escapedValue = escapeProjectXmlText(mapping.proposedValue);
      const replacement = field.selfClosing
        ? `<${field.qualifiedName}>${escapedValue}</${field.qualifiedName}>`
        : escapedValue;
      edits.push({
        start: valueRange.start,
        end: valueRange.end,
        replacement,
        order: taskElementOrder(mapping.field)
      });
      changes.push(toChange(mapping, identity, current, false));
      continue;
    }

    assertSourceValue(mapping, null);
    assertChangedValue(mapping, null);
    const insertion = planSafeTaskFieldInsertion(task, mapping.field, mapping.proposedValue, sourceXml);
    edits.push(insertion);
    changes.push(toChange(mapping, identity, null, true));
  }

  const candidateXml = applyTextEdits(sourceXml, edits);
  assertMspdiProject(scanXml(candidateXml), candidateXml);
  return {
    sourceXml,
    candidateXml,
    sourceSha256: await sha256Hex(sourceXml),
    candidateSha256: await sha256Hex(candidateXml),
    changes
  };
}

export async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Browser SHA-256 is unavailable in this environment.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function escapeProjectXmlText(value: string): string {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x08 || codePoint === 0x0b || codePoint === 0x0c
      || (codePoint >= 0x0e && codePoint <= 0x1f) || codePoint === 0xfffe || codePoint === 0xffff) {
      throw new Error("The proposed Project field value contains a character XML cannot represent.");
    }
  }
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

type TaskIdentity = {
  uid: string;
  id: string | null;
  name: string | null;
  wbs: string | null;
  summary: boolean;
};

type XmlElementRange = {
  qualifiedName: string;
  localName: string;
  openStart: number;
  openEnd: number;
  contentStart: number;
  closeStart: number;
  end: number;
  selfClosing: boolean;
  parent: XmlElementRange | null;
  children: XmlElementRange[];
};

type ScannedXml = {
  elements: XmlElementRange[];
  roots: XmlElementRange[];
};

type TextEdit = {
  start: number;
  end: number;
  replacement: string;
  order: number;
};

// Direct Task children in the order documented by the Microsoft Project MSPDI
// Task schema. Manual and Active are later-version tail fields emitted by the
// repository's synthetic MSPDI fixture. Missing fields are inserted only at a
// boundary with immediately adjacent, recognised Task-order neighbours.
const MSPDI_TASK_ELEMENT_ORDER = [
  "UID", "ID", "Name", "Type", "IsNull", "CreateDate", "Contact", "WBS", "WBSLevel",
  "OutlineNumber", "OutlineLevel", "Priority", "Start", "Finish", "Duration", "DurationFormat",
  "Work", "Stop", "Resume", "ResumeValid", "EffortDriven", "Recurring", "OverAllocated", "Estimated",
  "Milestone", "Summary", "Critical", "IsSubproject", "IsSubprojectReadOnly", "SubprojectName",
  "ExternalTask", "ExternalTaskProject", "EarlyStart", "EarlyFinish", "LateStart", "LateFinish",
  "StartVariance", "FinishVariance", "WorkVariance", "FreeSlack", "TotalSlack", "FixedCost",
  "FixedCostAccrual", "PercentComplete", "PercentWorkComplete", "Cost", "OvertimeCost", "OvertimeWork",
  "ActualStart", "ActualFinish", "ActualDuration", "ActualCost", "ActualOvertimeCost", "ActualWork",
  "ActualOvertimeWork", "RegularWork", "RemainingDuration", "RemainingCost", "RemainingWork",
  "RemainingOvertimeCost", "RemainingOvertimeWork", "ACWP", "CV", "ConstraintType", "CalendarUID",
  "ConstraintDate", "Deadline", "LevelAssignments", "LevelingCanSplit", "LevelingDelay",
  "LevelingDelayFormat", "PreLeveledStart", "PreLeveledFinish", "Hyperlink", "HyperlinkAddress",
  "HyperlinkSubAddress", "IgnoreResourceCalendar", "Notes", "HideBar", "Rollup", "BCWS", "BCWP",
  "PhysicalPercentComplete", "EarnedValueMethod", "PredecessorLink", "ActualWorkProtected",
  "ActualOvertimeWorkProtected", "ExtendedAttribute", "Baseline", "IsPublished", "StatusManager",
  "CommitmentStart", "CommitmentFinish", "CommitmentType", "OutlineCode", "TimephasedData", "Manual", "Active"
] as const;

const TASK_ELEMENT_ORDER = new Map<string, number>(
  MSPDI_TASK_ELEMENT_ORDER.map((name, index) => [name, index])
);

function taskElementOrder(name: string): number {
  const order = TASK_ELEMENT_ORDER.get(name);
  if (order === undefined) throw new Error(`No documented MSPDI Task ordering is available for ${name}.`);
  return order;
}

function toChange(
  mapping: ProjectXmlMapping,
  identity: TaskIdentity,
  sourceValue: string | null,
  inserted: boolean
): ProjectXmlCandidateChange {
  return {
    taskUid: identity.uid,
    taskId: identity.id,
    taskName: identity.name,
    taskWbs: identity.wbs,
    field: mapping.field,
    sourceValue: normalizeSourceValue(mapping.field, sourceValue),
    candidateValue: mapping.proposedValue,
    inserted
  };
}

function readTaskIdentity(task: XmlElementRange, source: string): TaskIdentity {
  const summaryValue = readOptionalDirectChild(task, "Summary", source);
  return {
    uid: readRequiredDirectChild(task, "UID", source),
    id: readOptionalDirectChild(task, "ID", source),
    name: readOptionalDirectChild(task, "Name", source),
    wbs: readOptionalDirectChild(task, "WBS", source),
    summary: summaryValue === "1" || summaryValue?.toLowerCase() === "true"
  };
}

function assertTaskPreconditions(mapping: ProjectXmlMapping, identity: TaskIdentity) {
  assertOptionalPrecondition(mapping.taskUid, "ID", mapping.expectedTaskId, identity.id);
  assertOptionalPrecondition(mapping.taskUid, "Name", mapping.expectedTaskName, identity.name);
  assertOptionalPrecondition(mapping.taskUid, "WBS", mapping.expectedTaskWbs, identity.wbs);
  if (mapping.expectedTaskSummary !== undefined && mapping.expectedTaskSummary !== identity.summary) {
    throw new Error(
      `Stale source for Project Task UID ${mapping.taskUid}: expected Summary ${mapping.expectedTaskSummary}, found ${identity.summary}.`
    );
  }
}

function assertOptionalPrecondition(
  taskUid: string,
  label: string,
  expected: string | undefined,
  actual: string | null
) {
  if (expected !== undefined && expected !== actual) {
    throw new Error(`Stale source for Project Task UID ${taskUid}: expected ${label} ${quote(expected)}, found ${quote(actual)}.`);
  }
}

function assertSourceValue(mapping: ProjectXmlMapping, actual: string | null) {
  const expected = normalizeSourceValue(mapping.field, mapping.expectedSourceValue);
  const normalizedActual = normalizeSourceValue(mapping.field, actual);
  if (expected !== normalizedActual) {
    throw new Error(
      `Stale source for Project Task UID ${mapping.taskUid} ${mapping.field}: expected ${quote(expected)}, found ${quote(normalizedActual)}.`
    );
  }
}

function assertChangedValue(mapping: ProjectXmlMapping, actual: string | null) {
  if (normalizeSourceValue(mapping.field, actual) === normalizeSourceValue(mapping.field, mapping.proposedValue)) {
    throw new Error(
      `Project Task UID ${mapping.taskUid} ${mapping.field} already has the proposed value; no candidate change is required.`
    );
  }
}

function normalizeSourceValue(field: ProjectXmlMappingField, value: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (field === "PercentComplete" || field === "PhysicalPercentComplete") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? String(numeric) : trimmed;
  }
  return trimmed;
}

function validateProposedValue(mapping: ProjectXmlMapping) {
  if (mapping.field === "PercentComplete" || mapping.field === "PhysicalPercentComplete") {
    if (!/^\d{1,3}$/u.test(mapping.proposedValue)) {
      throw new Error(`${mapping.field} must be a whole percentage from 0 to 100 for this trial.`);
    }
    const value = Number(mapping.proposedValue);
    if (value < 0 || value > 100) {
      throw new Error(`${mapping.field} must be a whole percentage from 0 to 100 for this trial.`);
    }
    return;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):00$/u.exec(mapping.proposedValue);
  if (!match) {
    throw new Error(`${mapping.field} must be a whole-minute Microsoft Project date-time (YYYY-MM-DDTHH:mm:00).`);
  }
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const values = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const [year, month, day, hour, minute] = values;
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month
    || parsed.getUTCDate() !== day || parsed.getUTCHours() !== hour
    || parsed.getUTCMinutes() !== minute) {
    throw new Error(`${mapping.field} must contain a valid Microsoft Project date-time.`);
  }
}

function quote(value: string | null) {
  return value === null ? "an absent value" : JSON.stringify(value);
}

function planSafeTaskFieldInsertion(
  task: XmlElementRange,
  field: ProjectXmlMappingField,
  proposedValue: string,
  source: string
): TextEdit {
  const targetOrder = taskElementOrder(field);
  const children = task.children.filter((child) => sameElementPrefix(task, child));
  let insertionIndex = -1;

  for (let index = 0; index <= children.length; index += 1) {
    const left = index > 0 ? children[index - 1] : null;
    const right = index < children.length ? children[index] : null;
    const leftOrder = left ? TASK_ELEMENT_ORDER.get(left.localName) : -1;
    const rightOrder = right ? TASK_ELEMENT_ORDER.get(right.localName) : Number.POSITIVE_INFINITY;
    if (leftOrder === undefined || rightOrder === undefined) continue;
    if (leftOrder < targetOrder && targetOrder < rightOrder) {
      insertionIndex = index;
      break;
    }
  }

  if (insertionIndex < 0) {
    throw new Error(
      `Cannot safely insert ${field} for Project Task UID ${readRequiredDirectChild(task, "UID", source)}: no supported adjacent MSPDI Task-order anchor was found.`
    );
  }

  const right = children[insertionIndex] ?? null;
  const left = insertionIndex > 0 ? children[insertionIndex - 1] : null;
  const position = right?.openStart ?? task.closeStart;
  const indent = right ? indentationAt(source, right.openStart) : left ? indentationAt(source, left.openStart) : "";
  const lineBreak = detectLineBreak(source);
  const prefix = elementPrefix(task.qualifiedName);
  const tagName = `${prefix}${field}`;
  const markup = `<${tagName}>${escapeProjectXmlText(proposedValue)}</${tagName}>`;
  const replacement = right ? `${markup}${lineBreak}${indent}` : `${markup}${lineBreak}${indentationAt(source, task.closeStart)}`;

  return { start: position, end: position, replacement, order: targetOrder };
}

function applyTextEdits(source: string, edits: readonly TextEdit[]): string {
  const ordered = [...edits].sort((left, right) =>
    right.start - left.start || right.end - left.end || right.order - left.order
  );
  let candidate = source;
  let lastStart = source.length + 1;
  for (const edit of ordered) {
    if (edit.start < 0 || edit.end < edit.start || edit.end > source.length) throw new Error("Candidate text edit is outside the source XML.");
    if (edit.end > lastStart) throw new Error("Selected Project field edits overlap and cannot be applied safely.");
    candidate = `${candidate.slice(0, edit.start)}${edit.replacement}${candidate.slice(edit.end)}`;
    lastStart = edit.start;
  }
  return candidate;
}

function assertMspdiProject(document: ScannedXml, source: string) {
  if (document.roots.length !== 1 || document.roots[0].localName !== "Project") {
    throw new Error("The source XML must contain exactly one Microsoft Project <Project> root element.");
  }
  const root = document.roots[0];
  const prefix = elementPrefix(root.qualifiedName).replace(/:$/, "");
  const namespaceAttribute = prefix ? `xmlns:${prefix}` : "xmlns";
  const namespace = readAttribute(source.slice(root.openStart, root.openEnd), namespaceAttribute);
  if (namespace !== PROJECT_XML_NAMESPACE) throw new Error("The source XML is not Microsoft Project MSPDI content.");
  const projectPrefix = elementPrefix(root.qualifiedName);
  for (const element of document.elements) {
    if (elementPrefix(element.qualifiedName) !== projectPrefix) continue;
    if (resolveElementNamespace(element, source) !== PROJECT_XML_NAMESPACE) {
      throw new Error(
        `The source XML rebinds the Microsoft Project namespace at ${element.qualifiedName}; candidate generation stopped safely.`
      );
    }
  }
}

function directChildren(parent: XmlElementRange, localName: string) {
  return parent.children.filter((child) => child.localName === localName && sameElementPrefix(parent, child));
}

function readRequiredDirectChild(parent: XmlElementRange, localName: string, source: string) {
  const matches = directChildren(parent, localName);
  if (matches.length !== 1) {
    throw new Error(`${parent.localName} must contain exactly one direct ${localName} element.`);
  }
  return readSimpleElementValue(matches[0], source);
}

function readOptionalDirectChild(parent: XmlElementRange, localName: string, source: string) {
  const matches = directChildren(parent, localName);
  if (matches.length > 1) throw new Error(`${parent.localName} contains more than one direct ${localName} element.`);
  return matches.length === 0 ? null : readSimpleElementValue(matches[0], source);
}

function readSimpleElementValue(element: XmlElementRange, source: string): string {
  if (element.children.length > 0) throw new Error(`${element.localName} contains nested XML and cannot be patched safely.`);
  if (element.selfClosing) return "";
  const raw = source.slice(element.contentStart, element.closeStart).trim();
  if (raw.includes("<")) throw new Error(`${element.localName} contains unsupported XML content.`);
  return decodeXmlText(raw);
}

function simpleElementValueRange(element: XmlElementRange, source: string) {
  if (element.selfClosing) {
    return { start: element.openStart, end: element.end };
  }
  const raw = source.slice(element.contentStart, element.closeStart);
  const leading = raw.match(/^\s*/u)?.[0].length ?? 0;
  const trailing = raw.match(/\s*$/u)?.[0].length ?? 0;
  return {
    start: element.contentStart + leading,
    end: element.closeStart - trailing
  };
}

function decodeXmlText(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/gu, (entity, code: string) => {
    if (code === "amp") return "&";
    if (code === "lt") return "<";
    if (code === "gt") return ">";
    if (code === "quot") return '"';
    if (code === "apos") return "'";
    const numeric = code.startsWith("#x") ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    return String.fromCodePoint(numeric);
  });
}

function readAttribute(openTag: string, attributeName: string): string | null {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = openTag.match(new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(["'])(.*?)\\1`, "su"));
  return match ? decodeXmlText(match[2]) : null;
}

function resolveElementNamespace(element: XmlElementRange, source: string): string | null {
  const prefix = elementPrefix(element.qualifiedName).replace(/:$/u, "");
  const namespaceAttribute = prefix ? `xmlns:${prefix}` : "xmlns";
  for (let current: XmlElementRange | null = element; current; current = current.parent) {
    const namespace = readAttribute(source.slice(current.openStart, current.openEnd), namespaceAttribute);
    if (namespace !== null) return namespace;
  }
  return null;
}

function sameElementPrefix(parent: XmlElementRange, child: XmlElementRange) {
  return elementPrefix(parent.qualifiedName) === elementPrefix(child.qualifiedName);
}

function elementPrefix(qualifiedName: string) {
  const separator = qualifiedName.indexOf(":");
  return separator < 0 ? "" : `${qualifiedName.slice(0, separator)}:`;
}

function indentationAt(source: string, position: number) {
  const lineStart = Math.max(source.lastIndexOf("\n", position - 1), source.lastIndexOf("\r", position - 1)) + 1;
  const indentation = source.slice(lineStart, position);
  return /^[\t ]*$/u.test(indentation) ? indentation : "";
}

function detectLineBreak(source: string) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function scanXml(source: string): ScannedXml {
  const elements: XmlElementRange[] = [];
  const roots: XmlElementRange[] = [];
  const stack: XmlElementRange[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf("<", cursor);
    if (start < 0) break;
    if (source.startsWith("<!--", start)) {
      cursor = requireTerminator(source, start + 4, "-->", "XML comment");
      continue;
    }
    if (source.startsWith("<![CDATA[", start)) {
      cursor = requireTerminator(source, start + 9, "]]>", "CDATA section");
      continue;
    }
    if (source.startsWith("<?", start)) {
      cursor = requireTerminator(source, start + 2, "?>", "processing instruction");
      continue;
    }
    if (source.startsWith("<!", start)) {
      cursor = declarationEnd(source, start + 2);
      continue;
    }

    const end = tagEnd(source, start + 1);
    const raw = source.slice(start + 1, end);
    if (raw.startsWith("/")) {
      const qualifiedName = parseQualifiedName(raw.slice(1));
      const current = stack.pop();
      if (!current || current.qualifiedName !== qualifiedName) throw new Error(`Malformed XML near closing ${qualifiedName}.`);
      current.closeStart = start;
      current.end = end + 1;
      cursor = end + 1;
      continue;
    }

    const qualifiedName = parseQualifiedName(raw);
    const selfClosing = /\/\s*$/u.test(raw);
    const parent = stack.at(-1) ?? null;
    const element: XmlElementRange = {
      qualifiedName,
      localName: qualifiedName.includes(":") ? qualifiedName.slice(qualifiedName.indexOf(":") + 1) : qualifiedName,
      openStart: start,
      openEnd: end + 1,
      contentStart: end + 1,
      closeStart: selfClosing ? end : -1,
      end: selfClosing ? end + 1 : -1,
      selfClosing,
      parent,
      children: []
    };
    elements.push(element);
    if (parent) parent.children.push(element);
    else roots.push(element);
    if (!selfClosing) stack.push(element);
    cursor = end + 1;
  }

  if (stack.length > 0) throw new Error(`Malformed XML: ${stack.at(-1)?.qualifiedName} is not closed.`);
  if (source.slice(cursor).includes("<")) throw new Error("Malformed XML after the final parsed element.");
  return { elements, roots };
}

function requireTerminator(source: string, from: number, terminator: string, label: string) {
  const end = source.indexOf(terminator, from);
  if (end < 0) throw new Error(`Malformed XML: unclosed ${label}.`);
  return end + terminator.length;
}

function declarationEnd(source: string, from: number) {
  let quote = "";
  let bracketDepth = 0;
  for (let index = from; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "[") bracketDepth += 1;
    else if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (character === ">" && bracketDepth === 0) return index + 1;
  }
  throw new Error("Malformed XML: unclosed declaration.");
}

function tagEnd(source: string, from: number) {
  let quote = "";
  for (let index = from; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === ">") return index;
  }
  throw new Error("Malformed XML: unclosed tag.");
}

function parseQualifiedName(raw: string) {
  const match = raw.trimStart().match(/^([A-Za-z_][\w.:-]*)/u);
  if (!match) throw new Error("Malformed XML: tag name is missing or unsupported.");
  return match[1];
}
