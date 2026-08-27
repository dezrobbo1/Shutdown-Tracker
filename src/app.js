import {
  EXECUTION_EVENT_TYPES,
  EVENT_LABELS,
  allowedExecutionActions,
  calculateExpectedPercent,
  createExecutionEvent,
  deriveExecutionState,
  eventsForTask,
  parseProjectTimestamp,
  resolveShiftEndInstant,
  toDateTimeLocalValue
} from "./execution.js";
import {
  buildComparisonRows,
  candidateFilename,
  decodeXmlBytes,
  encodeXmlText,
  parseProjectXml,
  sha256Hex
} from "./project-xml.js";
import { EXPORT_PROFILES, generateCandidateText, getExportProfile } from "./transaction-profiles.js";

const elements = Object.fromEntries(
  [
    "source-file",
    "import-status",
    "project-summary",
    "workspace",
    "trial-time",
    "use-device-time",
    "shift-end",
    "task-search",
    "task-rows",
    "task-empty",
    "task-content",
    "selected-task-name",
    "selected-task-facts",
    "start-task",
    "pause-task",
    "resume-task",
    "finish-task",
    "observed-percent",
    "record-progress",
    "mark-on-track",
    "progress-shift-end",
    "skip-finish",
    "clear-task-events",
    "expected-now",
    "expected-shift",
    "clear-all-events",
    "event-rows",
    "event-empty",
    "export-profile",
    "profile-warning",
    "download-candidate",
    "download-log",
    "candidate-summary",
    "result-file",
    "result-status",
    "comparison",
    "comparison-rows"
  ].map((id) => [id, document.getElementById(id)])
);

const state = {
  source: null,
  events: [],
  selectedTaskUid: null,
  candidate: null,
  result: null
};

function setStatus(element, message, kind = "neutral") {
  element.textContent = message;
  element.className = "status-message";
  if (kind !== "neutral") {
    element.classList.add(kind);
  }
}

function clearElement(element) {
  while (element.firstChild) {
    element.firstChild.remove();
  }
}

function appendDefinitionList(list, facts) {
  clearElement(list);
  for (const [label, value] of facts) {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value == null || value === "" ? "—" : String(value);
    wrapper.append(term, description);
    list.append(wrapper);
  }
}

function formatPercent(value) {
  return value == null || !Number.isFinite(value) ? "—" : `${Math.round(value)}%`;
}

function formatPlan(task) {
  const start = task.start?.replace("T", " ") ?? "—";
  const finish = task.finish?.replace("T", " ") ?? "—";
  return `${start} → ${finish}`;
}

function selectedTask() {
  return state.source?.parsed.taskByUid.get(String(state.selectedTaskUid)) ?? null;
}

function trialInstant() {
  const value = elements["trial-time"].value;
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error("Trial date and time is invalid.");
  }
  return date;
}

function invalidateCandidate() {
  state.candidate = null;
  state.result = null;
  elements["candidate-summary"].hidden = true;
  elements.comparison.hidden = true;
  setStatus(elements["result-status"], "No Project result loaded.");
  elements["result-file"].value = "";
}

function projectSeedTime(parsed) {
  const candidates = [parsed.project.currentDate, parsed.project.statusDate, parsed.leafTasks[0]?.start];
  for (const value of candidates) {
    const date = parseProjectTimestamp(value);
    if (date) {
      return date;
    }
  }
  return new Date();
}

function renderProjectSummary() {
  const source = state.source;
  if (!source) {
    elements["project-summary"].hidden = true;
    return;
  }

  appendDefinitionList(elements["project-summary"], [
    ["Project", source.parsed.project.name],
    ["Source file", source.fileName],
    ["SHA-256", source.hash],
    ["Encoding", `${source.encoding}${source.hadBom ? " with BOM" : ""}`],
    ["Tasks", source.parsed.tasks.length],
    ["Executable leaves", source.parsed.leafTasks.length],
    ["Summary tasks", source.parsed.summaryTasks.length],
    ["Assignments", source.parsed.assignments.length]
  ]);
  elements["project-summary"].hidden = false;
}

function renderTaskRows() {
  const body = elements["task-rows"];
  clearElement(body);
  if (!state.source) {
    return;
  }

  const search = elements["task-search"].value.trim().toLowerCase();
  const tasks = state.source.parsed.leafTasks.filter((task) => {
    if (!search) {
      return true;
    }
    return [task.name, task.uid, task.id, task.wbs, task.outlineNumber]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  const fragment = document.createDocumentFragment();
  for (const task of tasks) {
    const row = document.createElement("tr");
    row.className = "task-row";
    row.tabIndex = 0;
    row.dataset.uid = task.uid;
    if (String(task.uid) === String(state.selectedTaskUid)) {
      row.classList.add("selected");
    }

    const wbs = document.createElement("td");
    wbs.textContent = task.wbs ?? task.outlineNumber ?? "—";

    const name = document.createElement("td");
    name.className = "task-name";
    name.textContent = task.name;
    name.style.paddingLeft = `${Math.max(0, (task.outlineLevel ?? 1) - 1) * 0.7 + 0.65}rem`;

    const uid = document.createElement("td");
    uid.textContent = task.uid ?? "—";

    const plan = document.createElement("td");
    plan.textContent = formatPlan(task);

    const executionState = document.createElement("td");
    executionState.className = "state-label";
    executionState.textContent = deriveExecutionState(state.events, task.uid);

    row.append(wbs, name, uid, plan, executionState);
    const chooseTask = () => {
      state.selectedTaskUid = task.uid;
      render();
    };
    row.addEventListener("click", chooseTask);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        chooseTask();
      }
    });
    fragment.append(row);
  }
  body.append(fragment);
}

function renderTaskDetail() {
  const task = selectedTask();
  elements["task-empty"].hidden = Boolean(task);
  elements["task-content"].hidden = !task;
  if (!task) {
    return;
  }

  elements["selected-task-name"].textContent = task.name;
  const assignments = state.source.parsed.assignmentsByTaskUid.get(String(task.uid)) ?? [];
  appendDefinitionList(elements["selected-task-facts"], [
    ["UID / ID", `${task.uid ?? "—"} / ${task.id ?? "—"}`],
    ["WBS", task.wbs ?? task.outlineNumber],
    ["Planned window", formatPlan(task)],
    ["Duration", task.duration],
    ["Work", task.work],
    ["Imported % complete", task.percentComplete],
    ["Imported actual start", task.actualStart],
    ["Imported actual finish", task.actualFinish],
    ["Assignments", assignments.length],
    ["Tracker state", deriveExecutionState(state.events, task.uid)]
  ]);

  const actions = allowedExecutionActions(state.events, task.uid);
  elements["start-task"].disabled = !actions.start;
  elements["pause-task"].disabled = !actions.pause;
  elements["resume-task"].disabled = !actions.resume;
  elements["finish-task"].disabled = !actions.finish;

  const now = trialInstant();
  const expectedNow = calculateExpectedPercent(task, now);
  const shiftEnd = resolveShiftEndInstant(now, elements["shift-end"].value);
  const expectedShift = shiftEnd ? calculateExpectedPercent(task, shiftEnd) : null;
  elements["expected-now"].textContent = formatPercent(expectedNow);
  elements["expected-shift"].textContent = formatPercent(expectedShift);

  const latestProgress = eventsForTask(state.events, task.uid)
    .filter((event) => event.observedPercent != null || event.expectedPercent != null)
    .at(-1);
  elements["observed-percent"].value = latestProgress?.observedPercent ?? "";
}

function renderEvents() {
  clearElement(elements["event-rows"]);
  const events = state.events.slice().sort((left, right) => {
    const difference = new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    return difference || String(right.id).localeCompare(String(left.id));
  });

  elements["event-empty"].hidden = events.length > 0;
  const fragment = document.createDocumentFragment();
  for (const event of events) {
    const task = state.source?.parsed.taskByUid.get(String(event.taskUid));
    const row = document.createElement("tr");
    const time = document.createElement("td");
    time.textContent = event.timestamp.replace("T", " ");
    const taskCell = document.createElement("td");
    taskCell.textContent = task?.name ?? `UID ${event.taskUid}`;
    const eventCell = document.createElement("td");
    eventCell.textContent = EVENT_LABELS[event.type] ?? event.type;
    const progress = document.createElement("td");
    progress.textContent =
      event.observedPercent != null
        ? `${event.observedPercent}% observed`
        : event.expectedPercent != null
          ? `${event.expectedPercent}% expected`
          : "—";
    row.append(time, taskCell, eventCell, progress);
    fragment.append(row);
  }
  elements["event-rows"].append(fragment);
}

function renderProfile() {
  const profile = getExportProfile(elements["export-profile"].value);
  elements["profile-warning"].textContent = profile.warning;
  elements["profile-warning"].className = `callout ${profile.classification === "diagnostic" ? "danger" : "info"}`;
}

function renderCandidateSummary() {
  const candidate = state.candidate;
  if (!candidate) {
    elements["candidate-summary"].hidden = true;
    return;
  }

  appendDefinitionList(elements["candidate-summary"], [
    ["Profile", candidate.profile.label],
    ["Output file", candidate.fileName],
    ["SHA-256", candidate.hash],
    ["Changed tasks", candidate.changedTaskUids.length],
    ["Source preserved", candidate.profile.id === "intent-only" ? "Byte-for-byte" : "Complete source with bounded task scalar edits"]
  ]);
  elements["candidate-summary"].hidden = false;
}

function renderComparison() {
  if (!state.source || !state.candidate || !state.result) {
    elements.comparison.hidden = true;
    return;
  }

  const taskUids = [...new Set(state.events.map((event) => String(event.taskUid)))];
  const rows = buildComparisonRows({
    source: state.source.parsed,
    candidate: state.candidate.parsed,
    result: state.result.parsed,
    taskUids
  });

  clearElement(elements["comparison-rows"]);
  const fragment = document.createDocumentFragment();
  for (const rowData of rows) {
    const row = document.createElement("tr");
    const label = document.createElement("td");
    label.textContent = rowData.label;
    const source = document.createElement("td");
    source.textContent = rowData.source;
    const candidate = document.createElement("td");
    candidate.textContent = rowData.candidate;
    if (rowData.candidate !== rowData.source) {
      candidate.classList.add("changed-value");
    }
    const result = document.createElement("td");
    result.textContent = rowData.result;
    if (rowData.result !== rowData.candidate) {
      result.classList.add("changed-value");
    }
    row.append(label, source, candidate, result);
    fragment.append(row);
  }
  elements["comparison-rows"].append(fragment);
  elements.comparison.hidden = false;
}

function render() {
  const hasSource = Boolean(state.source);
  elements.workspace.hidden = !hasSource;
  renderProjectSummary();
  renderTaskRows();
  renderTaskDetail();
  renderEvents();
  renderProfile();
  renderCandidateSummary();
  renderComparison();
}

function addEvent(type, options = {}) {
  const task = selectedTask();
  if (!task) {
    throw new Error("Select a task first.");
  }
  const timestamp = options.timestamp ?? trialInstant();
  state.events.push(
    createExecutionEvent({
      taskUid: task.uid,
      type,
      timestamp,
      expectedPercent: options.expectedPercent ?? null,
      observedPercent: options.observedPercent ?? null
    })
  );
  invalidateCandidate();
  render();
}

function downloadBytes(bytes, filename, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadText(text, filename, type) {
  downloadBytes(new TextEncoder().encode(text), filename, type);
}

async function loadSource(file) {
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeXmlBytes(rawBytes);
  const parsed = parseProjectXml(decoded.text);
  const hash = await sha256Hex(rawBytes);

  state.source = {
    fileName: file.name,
    ...decoded,
    parsed,
    hash
  };
  state.events = [];
  state.candidate = null;
  state.result = null;
  state.selectedTaskUid = parsed.leafTasks[0]?.uid ?? null;
  elements["task-search"].value = "";
  elements["trial-time"].value = toDateTimeLocalValue(projectSeedTime(parsed));
  elements["result-file"].value = "";
  setStatus(
    elements["import-status"],
    `${parsed.project.name}: ${parsed.tasks.length} tasks, ${parsed.leafTasks.length} executable leaves and ${parsed.assignments.length} assignments loaded.`,
    "success"
  );
  setStatus(elements["result-status"], "No Project result loaded.");
  render();
}

async function generateAndDownloadCandidate() {
  if (!state.source) {
    throw new Error("Import a source XML file first.");
  }

  const profileId = elements["export-profile"].value;
  const generated = generateCandidateText({
    sourceXml: state.source.text,
    project: state.source.parsed,
    events: state.events,
    profileId
  });
  const bytes =
    profileId === "intent-only"
      ? state.source.bytes.slice()
      : encodeXmlText(generated.candidateText, state.source.encoding, state.source.hadBom);
  const hash = await sha256Hex(bytes);
  const parsed = parseProjectXml(generated.candidateText);
  const fileName = candidateFilename(state.source.fileName, profileId);

  state.candidate = {
    ...generated,
    bytes,
    hash,
    parsed,
    fileName
  };
  state.result = null;
  elements["result-file"].value = "";
  setStatus(elements["result-status"], "No Project result loaded.");
  render();
  downloadBytes(bytes, fileName, "application/xml");
}

function executionLogDocument() {
  if (!state.source) {
    throw new Error("Import a source XML file first.");
  }
  const profile = getExportProfile(elements["export-profile"].value);
  const touchedTaskUids = [...new Set(state.events.map((event) => String(event.taskUid)))];
  return {
    format: "shutdown-tracker-xml-roundtrip-lab/v1",
    createdAt: new Date().toISOString(),
    source: {
      fileName: state.source.fileName,
      sha256: state.source.hash,
      encoding: state.source.encoding,
      hadBom: state.source.hadBom,
      projectName: state.source.parsed.project.name,
      projectUid: state.source.parsed.project.uid,
      projectGuid: state.source.parsed.project.guid
    },
    profile: {
      id: profile.id,
      label: profile.label,
      classification: profile.classification,
      warning: profile.warning
    },
    candidate: state.candidate
      ? {
          fileName: state.candidate.fileName,
          sha256: state.candidate.hash,
          changedTaskUids: state.candidate.changedTaskUids
        }
      : null,
    tasks: touchedTaskUids.map((uid) => {
      const task = state.source.parsed.taskByUid.get(uid);
      return {
        uid,
        id: task?.id,
        name: task?.name,
        wbs: task?.wbs,
        assignments: state.source.parsed.assignmentsByTaskUid.get(uid)?.length ?? 0
      };
    }),
    events: state.events
  };
}

async function loadResult(file) {
  if (!state.candidate) {
    throw new Error("Generate the candidate used in Microsoft Project before importing its result.");
  }
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeXmlBytes(rawBytes);
  const parsed = parseProjectXml(decoded.text);
  const hash = await sha256Hex(rawBytes);

  const sourceIdentity = state.source.parsed.project.uid || state.source.parsed.project.guid || state.source.parsed.project.name;
  const resultIdentity = parsed.project.uid || parsed.project.guid || parsed.project.name;
  if (sourceIdentity && resultIdentity && sourceIdentity !== resultIdentity) {
    throw new Error(`Project identity mismatch: source ${sourceIdentity}, result ${resultIdentity}.`);
  }

  state.result = {
    fileName: file.name,
    ...decoded,
    parsed,
    hash
  };
  setStatus(elements["result-status"], `${file.name} loaded. SHA-256 ${hash}.`, "success");
  renderComparison();
}

for (const profile of EXPORT_PROFILES) {
  const option = document.createElement("option");
  option.value = profile.id;
  option.textContent = profile.label;
  elements["export-profile"].append(option);
}

elements["source-file"].addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  setStatus(elements["import-status"], `Reading ${file.name}…`);
  try {
    await loadSource(file);
  } catch (error) {
    state.source = null;
    setStatus(elements["import-status"], error instanceof Error ? error.message : String(error), "error");
    render();
  }
});

elements["result-file"].addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  setStatus(elements["result-status"], `Reading ${file.name}…`);
  try {
    await loadResult(file);
  } catch (error) {
    state.result = null;
    setStatus(elements["result-status"], error instanceof Error ? error.message : String(error), "error");
    renderComparison();
  }
});

elements["use-device-time"].addEventListener("click", () => {
  elements["trial-time"].value = toDateTimeLocalValue(new Date());
  renderTaskDetail();
});

elements["trial-time"].addEventListener("change", renderTaskDetail);
elements["shift-end"].addEventListener("change", renderTaskDetail);
elements["task-search"].addEventListener("input", renderTaskRows);
elements["export-profile"].addEventListener("change", () => {
  invalidateCandidate();
  render();
});

elements["start-task"].addEventListener("click", () => addEvent(EXECUTION_EVENT_TYPES.START));
elements["pause-task"].addEventListener("click", () => addEvent(EXECUTION_EVENT_TYPES.PAUSE));
elements["resume-task"].addEventListener("click", () => addEvent(EXECUTION_EVENT_TYPES.RESUME));
elements["finish-task"].addEventListener("click", () => addEvent(EXECUTION_EVENT_TYPES.FINISH));

elements["record-progress"].addEventListener("click", () => {
  const value = Number(elements["observed-percent"].value);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    window.alert("Enter an observed percentage from 0 to 100.");
    return;
  }
  addEvent(EXECUTION_EVENT_TYPES.OBSERVED_PROGRESS, { observedPercent: value });
});

elements["mark-on-track"].addEventListener("click", () => {
  const task = selectedTask();
  const instant = trialInstant();
  const expectedPercent = calculateExpectedPercent(task, instant);
  if (expectedPercent == null) {
    window.alert("This task does not have a usable planned Start and Finish for the helper calculation.");
    return;
  }
  addEvent(EXECUTION_EVENT_TYPES.MARK_ON_TRACK, { timestamp: instant, expectedPercent });
});

elements["progress-shift-end"].addEventListener("click", () => {
  const task = selectedTask();
  const instant = trialInstant();
  const shiftEnd = resolveShiftEndInstant(instant, elements["shift-end"].value);
  const expectedPercent = shiftEnd ? calculateExpectedPercent(task, shiftEnd) : null;
  if (!shiftEnd || expectedPercent == null) {
    window.alert("A valid shift end and usable planned task window are required.");
    return;
  }
  addEvent(EXECUTION_EVENT_TYPES.PROGRESS_TO_SHIFT_END, { timestamp: shiftEnd, expectedPercent });
});

elements["skip-finish"].addEventListener("click", () => {
  const task = selectedTask();
  const plannedFinish = parseProjectTimestamp(task?.finish);
  if (!plannedFinish) {
    window.alert("This task has no usable planned finish.");
    return;
  }
  elements["trial-time"].value = toDateTimeLocalValue(plannedFinish);
  addEvent(EXECUTION_EVENT_TYPES.SKIP_TO_PLANNED_FINISH, {
    timestamp: plannedFinish,
    expectedPercent: 100
  });
});

elements["clear-task-events"].addEventListener("click", () => {
  const task = selectedTask();
  if (!task) {
    return;
  }
  state.events = state.events.filter((event) => String(event.taskUid) !== String(task.uid));
  invalidateCandidate();
  render();
});

elements["clear-all-events"].addEventListener("click", () => {
  state.events = [];
  invalidateCandidate();
  render();
});

elements["download-candidate"].addEventListener("click", async () => {
  try {
    await generateAndDownloadCandidate();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error));
  }
});

elements["download-log"].addEventListener("click", () => {
  try {
    const log = executionLogDocument();
    const base = state.source.fileName.replace(/\.mspdi\.xml$/i, "").replace(/\.xml$/i, "");
    downloadText(`${JSON.stringify(log, null, 2)}\n`, `${base}.execution-log.json`, "application/json");
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error));
  }
});

render();
