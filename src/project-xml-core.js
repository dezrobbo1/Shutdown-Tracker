export const MSPDI_NAMESPACE = "http://schemas.microsoft.com/project";

const TASK_FIELD_INSERT_ANCHORS = Object.freeze({
  PercentComplete: [
    "PercentWorkComplete",
    "Cost",
    "OvertimeCost",
    "OvertimeWork",
    "ActualStart",
    "ActualFinish",
    "ActualDuration",
    "RemainingDuration"
  ],
  ActualStart: ["ActualFinish", "ActualDuration", "ActualCost", "ActualWork", "RemainingDuration"],
  ActualFinish: ["ActualDuration", "ActualCost", "ActualWork", "RemainingDuration"]
});

const COMPARISON_TASK_FIELDS = Object.freeze([
  ["Percent complete", "percentComplete"],
  ["Actual start", "actualStart"],
  ["Actual finish", "actualFinish"],
  ["Actual duration", "actualDuration"],
  ["Remaining duration", "remainingDuration"],
  ["Work", "work"],
  ["Actual work", "actualWork"],
  ["Remaining work", "remainingWork"],
  ["Start", "start"],
  ["Finish", "finish"]
]);

function asUint8Array(input) {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw new TypeError("Expected an ArrayBuffer or Uint8Array.");
}

export function decodeXmlBytes(input) {
  const bytes = asUint8Array(input);
  let encoding = "utf-8";
  let offset = 0;
  let hadBom = false;

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encoding = "utf-8";
    offset = 3;
    hadBom = true;
  } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = "utf-16le";
    offset = 2;
    hadBom = true;
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = "utf-16be";
    offset = 2;
    hadBom = true;
  } else if (bytes.length >= 2 && bytes[0] === 0x3c && bytes[1] === 0x00) {
    encoding = "utf-16le";
  } else if (bytes.length >= 2 && bytes[0] === 0x00 && bytes[1] === 0x3c) {
    encoding = "utf-16be";
  }

  const decoder = new TextDecoder(encoding, { fatal: true });
  const text = decoder.decode(bytes.subarray(offset));
  return {
    text,
    encoding,
    hadBom,
    bytes: bytes.slice()
  };
}

function utf16Bytes(text, littleEndian) {
  const output = new Uint8Array(text.length * 2);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (littleEndian) {
      output[index * 2] = code & 0xff;
      output[index * 2 + 1] = code >>> 8;
    } else {
      output[index * 2] = code >>> 8;
      output[index * 2 + 1] = code & 0xff;
    }
  }
  return output;
}

function withBom(bytes, bom) {
  const output = new Uint8Array(bom.length + bytes.length);
  output.set(bom, 0);
  output.set(bytes, bom.length);
  return output;
}

export function encodeXmlText(text, encoding = "utf-8", hadBom = false) {
  if (encoding === "utf-16le") {
    const bytes = utf16Bytes(text, true);
    return hadBom ? withBom(bytes, [0xff, 0xfe]) : bytes;
  }
  if (encoding === "utf-16be") {
    const bytes = utf16Bytes(text, false);
    return hadBom ? withBom(bytes, [0xfe, 0xff]) : bytes;
  }

  const bytes = new TextEncoder().encode(text);
  return hadBom ? withBom(bytes, [0xef, 0xbb, 0xbf]) : bytes;
}

export async function sha256Hex(input) {
  const bytes = asUint8Array(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function directChildText(element, localName) {
  for (const child of element.children) {
    if (child.localName === localName) {
      return child.textContent?.trim() ?? "";
    }
  }
  return null;
}

function directChildNumber(element, localName) {
  const value = directChildText(element, localName);
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimephasedData(assignmentElement) {
  return Array.from(assignmentElement.children)
    .filter((child) => child.localName === "TimephasedData")
    .map((element) => ({
      uid: directChildText(element, "UID"),
      type: directChildText(element, "Type"),
      start: directChildText(element, "Start"),
      finish: directChildText(element, "Finish"),
      unit: directChildText(element, "Unit"),
      value: directChildText(element, "Value")
    }));
}

export function parseProjectXml(xmlText) {
  if (typeof DOMParser === "undefined") {
    throw new Error("DOMParser is unavailable. Project XML parsing runs in a browser.");
  }

  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    throw new Error(`XML parse failed: ${parserError.textContent?.trim() ?? "unknown parser error"}`);
  }

  const root = document.documentElement;
  if (root.localName !== "Project" || root.namespaceURI !== MSPDI_NAMESPACE) {
    throw new Error(`Expected Microsoft Project MSPDI root namespace ${MSPDI_NAMESPACE}.`);
  }

  const tasks = Array.from(root.getElementsByTagNameNS(MSPDI_NAMESPACE, "Task")).map((element) => {
    const uid = directChildText(element, "UID");
    return {
      uid,
      id: directChildText(element, "ID"),
      guid: directChildText(element, "GUID"),
      name: directChildText(element, "Name") || `Task UID ${uid ?? "unknown"}`,
      wbs: directChildText(element, "WBS"),
      outlineNumber: directChildText(element, "OutlineNumber"),
      outlineLevel: directChildNumber(element, "OutlineLevel"),
      summary: directChildText(element, "Summary") === "1",
      active: directChildText(element, "Active") !== "0",
      start: directChildText(element, "Start"),
      finish: directChildText(element, "Finish"),
      duration: directChildText(element, "Duration"),
      durationFormat: directChildText(element, "DurationFormat"),
      work: directChildText(element, "Work"),
      percentComplete: directChildText(element, "PercentComplete"),
      percentWorkComplete: directChildText(element, "PercentWorkComplete"),
      actualStart: directChildText(element, "ActualStart"),
      actualFinish: directChildText(element, "ActualFinish"),
      actualDuration: directChildText(element, "ActualDuration"),
      remainingDuration: directChildText(element, "RemainingDuration"),
      actualWork: directChildText(element, "ActualWork"),
      remainingWork: directChildText(element, "RemainingWork")
    };
  });

  const assignments = Array.from(root.getElementsByTagNameNS(MSPDI_NAMESPACE, "Assignment")).map((element) => ({
    uid: directChildText(element, "UID"),
    taskUid: directChildText(element, "TaskUID"),
    resourceUid: directChildText(element, "ResourceUID"),
    percentWorkComplete: directChildText(element, "PercentWorkComplete"),
    start: directChildText(element, "Start"),
    finish: directChildText(element, "Finish"),
    actualStart: directChildText(element, "ActualStart"),
    actualFinish: directChildText(element, "ActualFinish"),
    work: directChildText(element, "Work"),
    actualWork: directChildText(element, "ActualWork"),
    remainingWork: directChildText(element, "RemainingWork"),
    timephasedData: parseTimephasedData(element)
  }));

  const taskByUid = new Map(tasks.filter((task) => task.uid != null).map((task) => [String(task.uid), task]));
  const assignmentsByTaskUid = new Map();
  for (const assignment of assignments) {
    const key = String(assignment.taskUid ?? "");
    const existing = assignmentsByTaskUid.get(key) ?? [];
    existing.push(assignment);
    assignmentsByTaskUid.set(key, existing);
  }

  return {
    document,
    project: {
      name: directChildText(root, "Name") || directChildText(root, "Title") || "Unnamed Project",
      title: directChildText(root, "Title"),
      uid: directChildText(root, "UID"),
      guid: directChildText(root, "GUID"),
      startDate: directChildText(root, "StartDate"),
      finishDate: directChildText(root, "FinishDate"),
      currentDate: directChildText(root, "CurrentDate"),
      statusDate: directChildText(root, "StatusDate"),
      minutesPerDay: directChildText(root, "MinutesPerDay"),
      durationFormat: directChildText(root, "DurationFormat")
    },
    tasks,
    taskByUid,
    assignments,
    assignmentsByTaskUid,
    leafTasks: tasks.filter((task) => !task.summary && task.active),
    summaryTasks: tasks.filter((task) => task.summary)
  };
}

function escapeXmlText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function prefixPattern(prefix) {
  return prefix ? `${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:` : "";
}

function readScalarFromBlock(block, field) {
  const expression = new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${field}\\b[^>]*>\\s*([\\s\\S]*?)\\s*<\\/(?:[A-Za-z_][\\w.-]*:)?${field}>`
  );
  const match = expression.exec(block);
  return match ? match[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim() : null;
}

function detectTaskPrefix(block) {
  const match = /<((?:[A-Za-z_][\w.-]*:)?UID)\b/.exec(block);
  if (!match || !match[1].includes(":")) {
    return "";
  }
  return match[1].slice(0, match[1].indexOf(":"));
}

function detectChildIndent(block) {
  const match = /\n([ \t]+)<(?:[A-Za-z_][\w.-]*:)?UID\b/.exec(block);
  if (match) {
    return match[1];
  }
  const closing = /\n([ \t]*)<\/(?:[A-Za-z_][\w.-]*:)?Task>/.exec(block);
  return `${closing?.[1] ?? ""}  `;
}

function replaceExistingScalar(block, prefix, field, value) {
  const qualified = `${prefixPattern(prefix)}${field}`;
  const expression = new RegExp(`(<${qualified}\\b[^>]*>)[\\s\\S]*?(<\\/${qualified}>)`);
  if (!expression.test(block)) {
    return null;
  }
  return block.replace(expression, `$1${escapeXmlText(value)}$2`);
}

function insertScalar(block, prefix, field, value) {
  const indent = detectChildIndent(block);
  const qualifiedField = prefix ? `${prefix}:${field}` : field;
  const line = `${indent}<${qualifiedField}>${escapeXmlText(value)}</${qualifiedField}>`;

  for (const anchor of TASK_FIELD_INSERT_ANCHORS[field] ?? []) {
    const qualifiedAnchor = prefix ? `${prefix}:${anchor}` : anchor;
    const expression = new RegExp(`(^|\\n)([ \\t]*)<${qualifiedAnchor}\\b`, "m");
    const match = expression.exec(block);
    if (match) {
      const insertionPoint = match.index + (match[1] ? 1 : 0);
      return `${block.slice(0, insertionPoint)}${line}\n${block.slice(insertionPoint)}`;
    }
  }

  const closingExpression = new RegExp(`\\n([ \\t]*)<\\/${prefix ? `${prefix}:` : ""}Task>\\s*$`);
  const closingMatch = closingExpression.exec(block);
  if (!closingMatch) {
    throw new Error(`Could not locate the closing Task element while inserting ${field}.`);
  }
  return `${block.slice(0, closingMatch.index)}\n${line}${block.slice(closingMatch.index)}`;
}

function setScalar(block, field, value) {
  const prefix = detectTaskPrefix(block);
  return replaceExistingScalar(block, prefix, field, value) ?? insertScalar(block, prefix, field, value);
}

function assertTaskIdentity(block, entry) {
  const actualUid = readScalarFromBlock(block, "UID");
  if (String(actualUid) !== String(entry.taskUid)) {
    throw new Error(`Task UID identity mismatch: expected ${entry.taskUid}, found ${actualUid ?? "missing"}.`);
  }
  if (readScalarFromBlock(block, "Summary") === "1") {
    throw new Error(`Task UID ${entry.taskUid} is a summary task and cannot be patched.`);
  }

  const expectations = entry.expected ?? {};
  for (const [field, expectedValue] of Object.entries({
    ID: expectations.id,
    Name: expectations.name,
    WBS: expectations.wbs
  })) {
    if (expectedValue == null || expectedValue === "") {
      continue;
    }
    const actualValue = readScalarFromBlock(block, field);
    if (String(actualValue) !== String(expectedValue)) {
      throw new Error(
        `Task UID ${entry.taskUid} ${field} identity mismatch: expected ${expectedValue}, found ${actualValue ?? "missing"}.`
      );
    }
  }
}

export function applyTaskScalarDiagnostic(sourceXml, patchEntries) {
  const entriesByUid = new Map(
    patchEntries
      .filter((entry) => entry && entry.taskUid && entry.fields && Object.keys(entry.fields).length > 0)
      .map((entry) => [String(entry.taskUid), entry])
  );

  if (entriesByUid.size === 0) {
    return sourceXml;
  }

  const found = new Set();
  const taskExpression = /<((?:[A-Za-z_][\w.-]*:)?Task)\b[^>]*>[\s\S]*?<\/\1>/g;
  const candidate = sourceXml.replace(taskExpression, (block) => {
    const uid = readScalarFromBlock(block, "UID");
    const entry = uid == null ? null : entriesByUid.get(String(uid));
    if (!entry) {
      return block;
    }

    assertTaskIdentity(block, entry);
    found.add(String(uid));
    let updated = block;
    for (const field of ["PercentComplete", "ActualStart", "ActualFinish"]) {
      if (entry.fields[field] != null) {
        updated = setScalar(updated, field, entry.fields[field]);
      }
    }
    return updated;
  });

  const missing = Array.from(entriesByUid.keys()).filter((uid) => !found.has(uid));
  if (missing.length > 0) {
    throw new Error(`Candidate generation could not find task UID(s): ${missing.join(", ")}.`);
  }
  return candidate;
}

function assignmentSummary(project, taskUid) {
  const assignments = project?.assignmentsByTaskUid?.get(String(taskUid)) ?? [];
  if (assignments.length === 0) {
    return "No assignments";
  }

  return assignments
    .map((assignment) => {
      const facts = [
        `UID ${assignment.uid ?? "—"}`,
        `%Work ${assignment.percentWorkComplete ?? "—"}`,
        `ActualWork ${assignment.actualWork ?? "—"}`,
        `RemainingWork ${assignment.remainingWork ?? "—"}`,
        `ActualStart ${assignment.actualStart ?? "—"}`,
        `ActualFinish ${assignment.actualFinish ?? "—"}`,
        `Timephased ${assignment.timephasedData.length}`
      ];
      return facts.join(" · ");
    })
    .join(" | ");
}

function displayValue(value) {
  return value == null || value === "" ? "—" : String(value);
}

export function buildComparisonRows({ source, candidate, result, taskUids }) {
  const rows = [
    {
      key: "project-finish",
      label: "Project · Finish date",
      source: displayValue(source?.project?.finishDate),
      candidate: displayValue(candidate?.project?.finishDate),
      result: displayValue(result?.project?.finishDate)
    },
    {
      key: "project-status-date",
      label: "Project · Status date",
      source: displayValue(source?.project?.statusDate),
      candidate: displayValue(candidate?.project?.statusDate),
      result: displayValue(result?.project?.statusDate)
    }
  ];

  for (const taskUid of taskUids) {
    const sourceTask = source?.taskByUid?.get(String(taskUid));
    const candidateTask = candidate?.taskByUid?.get(String(taskUid));
    const resultTask = result?.taskByUid?.get(String(taskUid));
    const taskName = sourceTask?.name ?? candidateTask?.name ?? resultTask?.name ?? `Task UID ${taskUid}`;

    for (const [label, property] of COMPARISON_TASK_FIELDS) {
      rows.push({
        key: `${taskUid}-${property}`,
        label: `${taskName} · ${label}`,
        source: displayValue(sourceTask?.[property]),
        candidate: displayValue(candidateTask?.[property]),
        result: displayValue(resultTask?.[property])
      });
    }

    rows.push({
      key: `${taskUid}-assignments`,
      label: `${taskName} · Assignment progress`,
      source: assignmentSummary(source, taskUid),
      candidate: assignmentSummary(candidate, taskUid),
      result: assignmentSummary(result, taskUid)
    });
  }

  return rows;
}

export function candidateFilename(originalFilename, profileId) {
  const base = String(originalFilename || "project.xml").replace(/\.mspdi\.xml$/i, "").replace(/\.xml$/i, "");
  return `${base}.shutdown-tracker-lab.${profileId}.xml`;
}
