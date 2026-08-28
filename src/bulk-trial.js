import {
  analyzePlannedCompletionCut,
  buildBulkCompletionExecutionIntent,
  generateBulkAssignedCompletionNativeV0,
  planMondayFiftyPercentSample
} from "./bulk-planned-completion.js";
import {
  classifyProjectResultCompatibility,
  decodeXmlBytes,
  encodeXmlText,
  parseProjectXml,
  sha256Hex
} from "./project-xml.js";

const elements = Object.fromEntries(
  [
    "source-file",
    "source-status",
    "source-summary",
    "trial",
    "completion-cutoff",
    "analyze-completion",
    "generate-candidate",
    "completion-status",
    "completion-summary",
    "unsupported-wrap",
    "unsupported-reasons",
    "candidate-summary",
    "partial-cutoff",
    "analyze-partial",
    "download-partial-plan",
    "partial-status",
    "partial-summary",
    "partial-list",
    "result-file",
    "result-status",
    "result-summary"
  ].map((id) => [id, document.getElementById(id)])
);

const state = {
  source: null,
  completionAnalysis: null,
  candidate: null,
  partialPlan: null,
  result: null
};

function setStatus(element, message, kind = "neutral") {
  element.textContent = message;
  element.className = "status-message";
  if (kind !== "neutral") element.classList.add(kind);
}

function clear(element) {
  while (element.firstChild) element.firstChild.remove();
}

function summaryCards(element, facts) {
  clear(element);
  for (const [label, value] of facts) {
    const card = document.createElement("div");
    const small = document.createElement("span");
    const strong = document.createElement("strong");
    small.textContent = label;
    strong.textContent = value == null || value === "" ? "—" : String(value);
    card.append(small, strong);
    element.append(card);
  }
  element.hidden = false;
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

function downloadJson(value, filename) {
  downloadBytes(
    new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`),
    filename,
    "application/json"
  );
}

function baseFilename(fileName) {
  return fileName.replace(/\.mspdi\.xml$/i, "").replace(/\.xml$/i, "");
}

function cutoffValue(input) {
  const value = input.value.trim();
  if (!value) throw new Error("Choose a reporting cutoff first.");
  return value.length === 16 ? `${value}:00` : value;
}

function renderUnsupported(analysis) {
  clear(elements["unsupported-reasons"]);
  elements["unsupported-wrap"].hidden = analysis.unsupported.length === 0;
  for (const item of analysis.reasonCounts) {
    const li = document.createElement("li");
    li.textContent = `${item.category}: ${item.count}`;
    elements["unsupported-reasons"].append(li);
  }
}

async function loadSource(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeXmlBytes(bytes);
  const parsed = parseProjectXml(decoded.text);
  const hash = await sha256Hex(bytes);
  state.source = { fileName: file.name, ...decoded, parsed, hash };
  state.completionAnalysis = null;
  state.candidate = null;
  state.partialPlan = null;
  state.result = null;
  elements.trial.hidden = false;
  elements["generate-candidate"].disabled = true;
  elements["download-partial-plan"].disabled = true;
  elements["candidate-summary"].hidden = true;
  elements["result-summary"].hidden = true;
  setStatus(elements["result-status"], "No Project result loaded.");
  summaryCards(elements["source-summary"], [
    ["Project", parsed.project.name],
    ["Source SHA-256", hash],
    ["Tasks", parsed.tasks.length],
    ["Executable leaves", parsed.leafTasks.length],
    ["Assignments", parsed.assignments.length],
    ["Project Start", parsed.project.startDate],
    ["Project Finish", parsed.project.finishDate],
    ["Status Date", parsed.project.statusDate]
  ]);
  setStatus(
    elements["source-status"],
    `${file.name} loaded. Choose the exact Sunday end-of-shift reporting cutoff.`,
    "success"
  );
}

function analyseCompletion() {
  if (!state.source) throw new Error("Import a source XML first.");
  const cutoff = cutoffValue(elements["completion-cutoff"]);
  const analysis = analyzePlannedCompletionCut({
    project: state.source.parsed,
    cutoff,
    existingEvents: []
  });
  state.completionAnalysis = analysis;
  state.candidate = null;
  state.result = null;
  elements["result-file"].value = "";
  elements["candidate-summary"].hidden = true;
  elements["result-summary"].hidden = true;
  elements["generate-candidate"].disabled = analysis.eligible.length === 0;
  summaryCards(elements["completion-summary"], [
    ["Planned finished by cut", analysis.plannedFinishedCount],
    ["Supported by proven v0 shape", analysis.eligible.length],
    ["Left unchanged", analysis.unsupported.length],
    ["Candidate completion transactions", analysis.eligible.length]
  ]);
  renderUnsupported(analysis);
  setStatus(
    elements["completion-status"],
    `${analysis.eligible.length} of ${analysis.plannedFinishedCount} planned-finished leaf tasks match the proven completion shape. ${analysis.unsupported.length} will remain untouched.`,
    analysis.eligible.length > 0 ? "success" : "warning"
  );
}

async function generateCandidate() {
  if (!state.source || !state.completionAnalysis) throw new Error("Analyse the Sunday reporting cutoff first.");
  const generated = generateBulkAssignedCompletionNativeV0({
    sourceXml: state.source.text,
    analysis: state.completionAnalysis
  });
  const bytes = encodeXmlText(
    generated.candidateText,
    state.source.encoding,
    state.source.hadBom
  );
  const hash = await sha256Hex(bytes);
  const parsed = parseProjectXml(generated.candidateText);
  const cutoffStamp = cutoffValue(elements["completion-cutoff"]).replaceAll(":", "-");
  const fileName = `${baseFilename(state.source.fileName)}.bulk-planned-completion-v0.${cutoffStamp}.xml`;
  const executionIntent = buildBulkCompletionExecutionIntent({ analysis: state.completionAnalysis });

  state.candidate = { ...generated, bytes, hash, parsed, fileName, executionIntent };
  state.result = null;
  elements["result-file"].value = "";
  summaryCards(elements["candidate-summary"], [
    ["Candidate file", fileName],
    ["Candidate SHA-256", hash],
    ["Changed task blocks", generated.changedTaskUids.length],
    ["Changed assignment blocks", generated.changedAssignmentUids.length],
    ["Unsupported tasks left untouched", state.completionAnalysis.unsupported.length]
  ]);
  setStatus(
    elements["completion-status"],
    `Candidate generated for ${generated.changedTaskUids.length} proven-shape completions. This multi-task composition still requires Microsoft Project verification.`,
    "success"
  );
  setStatus(elements["result-status"], "Open/recalculate/save this candidate in Project, then import the Project-saved XML.");
  downloadBytes(bytes, fileName, "application/xml");
  downloadJson(
    {
      format: "shutdown-tracker-bulk-planned-completion/v0",
      createdAt: new Date().toISOString(),
      source: { fileName: state.source.fileName, sha256: state.source.hash },
      candidate: { fileName, sha256: hash },
      cutoff: cutoffValue(elements["completion-cutoff"]),
      supportedTaskUids: generated.changedTaskUids,
      unsupported: state.completionAnalysis.unsupported,
      executionIntent
    },
    `${baseFilename(state.source.fileName)}.bulk-planned-completion-v0.intent.json`
  );
}

function analysePartial() {
  if (!state.source) throw new Error("Import a source XML first.");
  const cutoff = cutoffValue(elements["partial-cutoff"]);
  const plan = planMondayFiftyPercentSample({
    project: state.source.parsed,
    cutoff,
    fraction: 0.5
  });
  state.partialPlan = plan;
  elements["download-partial-plan"].disabled = plan.selected.length === 0;
  summaryCards(elements["partial-summary"], [
    ["Planned active at cut", plan.activePoolCount],
    ["Selected for 50% report", plan.selected.length],
    ["XML writes", 0],
    ["Status", "intent only"]
  ]);
  clear(elements["partial-list"]);
  const fragment = document.createDocumentFragment();
  for (const item of plan.selected) {
    const line = document.createElement("div");
    line.textContent = `UID ${item.taskUid} · ${item.taskName} · planned ${item.start.replace("T", " ")} → ${item.finish.replace("T", " ")} · report 50%`;
    fragment.append(line);
  }
  elements["partial-list"].append(fragment);
  elements["partial-list"].hidden = false;
  setStatus(
    elements["partial-status"],
    `${plan.selected.length} of ${plan.activePoolCount} planned-active work tasks selected deterministically for a 50% Monday report. No XML is generated because partial-progress semantics remain unproven.`,
    "warning"
  );
}

function downloadPartialPlan() {
  if (!state.source || !state.partialPlan) throw new Error("Preview the Monday partial-report plan first.");
  downloadJson(
    {
      format: "shutdown-tracker-partial-progress-intent/v0",
      createdAt: new Date().toISOString(),
      source: { fileName: state.source.fileName, sha256: state.source.hash },
      cutoff: cutoffValue(elements["partial-cutoff"]),
      fraction: state.partialPlan.fraction,
      reportedPercent: 50,
      selected: state.partialPlan.selected,
      exportable: false,
      note: state.partialPlan.note
    },
    `${baseFilename(state.source.fileName)}.monday-50-percent-intent.json`
  );
}

function zeroDuration(value) {
  return value === "PT0H0M0S" || value === "PT0S";
}

async function loadResult(file) {
  if (!state.source || !state.candidate) {
    throw new Error("Generate the Sunday candidate before importing its Project result.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeXmlBytes(bytes);
  const parsed = parseProjectXml(decoded.text);
  const hash = await sha256Hex(bytes);
  const compatibility = classifyProjectResultCompatibility({
    candidate: state.candidate.parsed,
    result: parsed,
    touchedTaskUids: state.candidate.changedTaskUids
  });

  let coherentTaskCount = 0;
  let coherentAssignmentCount = 0;
  for (const uid of state.candidate.changedTaskUids) {
    const task = parsed.taskByUid.get(String(uid));
    if (task?.percentComplete === "100" && zeroDuration(task.remainingDuration) && zeroDuration(task.remainingWork)) {
      coherentTaskCount += 1;
    }
    const assignments = parsed.assignmentsByTaskUid.get(String(uid)) ?? [];
    if (assignments.some((assignment) => assignment.percentWorkComplete === "100" && zeroDuration(assignment.remainingWork))) {
      coherentAssignmentCount += 1;
    }
  }

  state.result = { fileName: file.name, ...decoded, parsed, hash, compatibility };
  summaryCards(elements["result-summary"], [
    ["Result SHA-256", hash],
    ["Identity classification", compatibility.label],
    ["Touched tasks coherent", `${coherentTaskCount}/${state.candidate.changedTaskUids.length}`],
    ["Touched assignments coherent", `${coherentAssignmentCount}/${state.candidate.changedTaskUids.length}`],
    ["Project Start", `${state.source.parsed.project.startDate} → ${parsed.project.startDate}`],
    ["Status Date", `${state.source.parsed.project.statusDate ?? "—"} → ${parsed.project.statusDate ?? "—"}`],
    ["Project Finish", `${state.source.parsed.project.finishDate} → ${parsed.project.finishDate}`],
    ["Task count", `${state.source.parsed.tasks.length} → ${parsed.tasks.length}`],
    ["Assignment count", `${state.source.parsed.assignments.length} → ${parsed.assignments.length}`]
  ]);

  const allCoherent = coherentTaskCount === state.candidate.changedTaskUids.length && coherentAssignmentCount === state.candidate.changedTaskUids.length;
  setStatus(
    elements["result-status"],
    `${file.name} loaded. ${coherentTaskCount}/${state.candidate.changedTaskUids.length} touched tasks and ${coherentAssignmentCount}/${state.candidate.changedTaskUids.length} touched assignment sets remain coherently complete. ${compatibility.warnings.join(" ")}`,
    allCoherent ? "success" : "warning"
  );
}

elements["source-file"].addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    setStatus(elements["source-status"], `Reading ${file.name}…`);
    await loadSource(file);
  } catch (error) {
    state.source = null;
    elements.trial.hidden = true;
    setStatus(elements["source-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["analyze-completion"].addEventListener("click", () => {
  try {
    analyseCompletion();
  } catch (error) {
    setStatus(elements["completion-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["completion-cutoff"].addEventListener("change", () => {
  state.completionAnalysis = null;
  state.candidate = null;
  elements["generate-candidate"].disabled = true;
  elements["candidate-summary"].hidden = true;
  setStatus(elements["completion-status"], "Cutoff changed. Analyse the schedule again before generating a candidate.");
});

elements["generate-candidate"].addEventListener("click", async () => {
  try {
    await generateCandidate();
  } catch (error) {
    setStatus(elements["completion-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["analyze-partial"].addEventListener("click", () => {
  try {
    analysePartial();
  } catch (error) {
    setStatus(elements["partial-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["download-partial-plan"].addEventListener("click", () => {
  try {
    downloadPartialPlan();
  } catch (error) {
    setStatus(elements["partial-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["result-file"].addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    setStatus(elements["result-status"], `Reading ${file.name}…`);
    await loadResult(file);
  } catch (error) {
    state.result = null;
    elements["result-summary"].hidden = true;
    setStatus(elements["result-status"], error instanceof Error ? error.message : String(error), "error");
  }
});
