import {
  analyzePlannedCompletionCut,
  buildBulkCompletionExecutionIntent,
  buildBulkCompletionIntentDocument,
  buildBulkCompletionResultEvidenceDocument,
  buildPartialProgressIntentDocument,
  generateBulkAssignedCompletionNativeV0,
  planMondayFiftyPercentSample
} from "./bulk-planned-completion.js";
import { validateBulkCompletionResult } from "./bulk-result-validation.js";
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
    "download-candidate-xml",
    "download-candidate-intent",
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
    "result-summary",
    "download-result-evidence"
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

function resetSundayDownloads() {
  elements["download-candidate-xml"].disabled = true;
  elements["download-candidate-intent"].disabled = true;
}

function resetResultState(message = "No Project result loaded.") {
  state.result = null;
  elements["result-file"].value = "";
  elements["result-summary"].hidden = true;
  elements["download-result-evidence"].disabled = true;
  setStatus(elements["result-status"], message);
}

function resetPartialPlan(message = "Partial assigned-task progress remains unproven. This section creates intent evidence only.") {
  state.partialPlan = null;
  elements["download-partial-plan"].disabled = true;
  elements["partial-summary"].hidden = true;
  elements["partial-list"].hidden = true;
  clear(elements["partial-list"]);
  setStatus(elements["partial-status"], message);
}

async function loadSource(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeXmlBytes(bytes);
  const parsed = parseProjectXml(decoded.text);
  const hash = await sha256Hex(bytes);
  state.source = { fileName: file.name, ...decoded, parsed, hash };
  state.completionAnalysis = null;
  state.candidate = null;
  elements.trial.hidden = false;
  elements["generate-candidate"].disabled = true;
  resetSundayDownloads();
  resetResultState();
  resetPartialPlan();
  elements["candidate-summary"].hidden = true;
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
  resetResultState("Reporting-cut analysis changed. No Project result is bound to the current experiment.");
  const cutoff = cutoffValue(elements["completion-cutoff"]);
  const analysis = analyzePlannedCompletionCut({
    project: state.source.parsed,
    cutoff,
    existingEvents: []
  });
  state.completionAnalysis = analysis;
  state.candidate = null;
  elements["candidate-summary"].hidden = true;
  resetSundayDownloads();
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
  resetResultState("Preparing a new candidate. No Project result is bound to it yet.");
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
  const cutoffStamp = state.completionAnalysis.cutoffProjectLocal.replaceAll(":", "-");
  const fileName = `${baseFilename(state.source.fileName)}.bulk-planned-completion-v0.${cutoffStamp}.xml`;
  const executionIntent = buildBulkCompletionExecutionIntent({ analysis: state.completionAnalysis });

  state.candidate = { ...generated, bytes, hash, parsed, fileName, executionIntent };
  elements["download-candidate-xml"].disabled = false;
  elements["download-candidate-intent"].disabled = false;
  summaryCards(elements["candidate-summary"], [
    ["Candidate file", fileName],
    ["Candidate SHA-256", hash],
    ["Profile", generated.profile.label],
    ["Profile classification", generated.profile.classification],
    ["Changed task blocks", generated.changedTaskUids.length],
    ["Changed assignment blocks", generated.changedAssignmentUids.length],
    ["Unsupported tasks left untouched", state.completionAnalysis.unsupported.length]
  ]);
  setStatus(
    elements["completion-status"],
    `Candidate prepared for ${generated.changedTaskUids.length} proven-shape completions. Download the XML and intent JSON with the separate buttons below the cutoff.`,
    "success"
  );
  setStatus(elements["result-status"], "Download the Sunday XML, open/recalculate/save it in Project, then import the Project-saved XML.");
}

function sundayIntentDocument() {
  if (!state.source || !state.completionAnalysis || !state.candidate) {
    throw new Error("Prepare the Sunday candidate first.");
  }
  return buildBulkCompletionIntentDocument({
    source: {
      fileName: state.source.fileName,
      sha256: state.source.hash,
      project: state.source.parsed.project
    },
    candidate: {
      fileName: state.candidate.fileName,
      sha256: state.candidate.hash,
      project: state.candidate.parsed.project,
      changedTaskUids: state.candidate.changedTaskUids,
      executionIntent: state.candidate.executionIntent
    },
    analysis: state.completionAnalysis
  });
}

function downloadSundayXml() {
  if (!state.candidate) throw new Error("Prepare the Sunday candidate first.");
  downloadBytes(state.candidate.bytes, state.candidate.fileName, "application/xml");
}

function downloadSundayIntent() {
  if (!state.source || !state.candidate) throw new Error("Prepare the Sunday candidate first.");
  downloadJson(
    sundayIntentDocument(),
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
    ["Unstarted planned active at cut", plan.activePoolCount],
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
    `${plan.selected.length} of ${plan.activePoolCount} unstarted planned-active work tasks selected deterministically for a 50% Monday report. No XML is generated because partial-progress semantics remain unproven.`,
    "warning"
  );
}

function downloadPartialPlan() {
  if (!state.source || !state.partialPlan) throw new Error("Preview the Monday partial-report plan first.");
  downloadJson(
    buildPartialProgressIntentDocument({
      source: { fileName: state.source.fileName, sha256: state.source.hash },
      plan: state.partialPlan
    }),
    `${baseFilename(state.source.fileName)}.monday-50-percent-intent.json`
  );
}

function resultEvidenceDocument() {
  if (!state.source || !state.candidate || !state.completionAnalysis || !state.result) {
    throw new Error("Import and validate a Project result first.");
  }
  return buildBulkCompletionResultEvidenceDocument({
    source: {
      fileName: state.source.fileName,
      sha256: state.source.hash,
      project: state.source.parsed.project
    },
    candidate: {
      fileName: state.candidate.fileName,
      sha256: state.candidate.hash,
      changedTaskUids: state.candidate.changedTaskUids,
      changedAssignmentUids: state.candidate.changedAssignmentUids,
      project: state.candidate.parsed.project
    },
    analysis: state.completionAnalysis,
    result: {
      fileName: state.result.fileName,
      sha256: state.result.hash,
      project: state.result.parsed.project,
      compatibility: state.result.compatibility,
      validation: state.result.validation
    }
  });
}

function downloadResultEvidence() {
  if (!state.source || !state.result) throw new Error("Import and validate a Project result first.");
  downloadJson(
    resultEvidenceDocument(),
    `${baseFilename(state.source.fileName)}.bulk-planned-completion-v0.result-evidence.json`
  );
}

async function loadResult(file) {
  if (!state.source || !state.candidate || !state.completionAnalysis) {
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
  const validation = validateBulkCompletionResult({
    candidate: state.candidate.parsed,
    result: parsed,
    transactions: state.candidate.transactions,
    compatibility
  });

  state.result = { fileName: file.name, ...decoded, parsed, hash, compatibility, validation };
  elements["download-result-evidence"].disabled = false;
  summaryCards(elements["result-summary"], [
    ["Result SHA-256", hash],
    ["Identity classification", compatibility.label],
    ["Project scheduling invariants", validation.projectInvariantsPreserved ? "preserved" : "changed"],
    ["Exact touched task transactions", `${validation.coherentTaskCount}/${validation.touchedTaskCount}`],
    ["Exact touched assignment transactions", `${validation.coherentAssignmentCount}/${validation.touchedTaskCount}`],
    ["Untouched task progress preserved", `${validation.untouchedPreservedCount}/${validation.untouchedTaskCount}`],
    ["Overall result", validation.pass ? "strict pass" : "review required"],
    ["Project Start", `${state.source.parsed.project.startDate} → ${parsed.project.startDate}`],
    ["Status Date", `${state.source.parsed.project.statusDate ?? "—"} → ${parsed.project.statusDate ?? "—"}`],
    ["Project Finish", `${state.source.parsed.project.finishDate} → ${parsed.project.finishDate}`],
    ["Task count", `${state.source.parsed.tasks.length} → ${parsed.tasks.length}`],
    ["Assignment count", `${state.source.parsed.assignments.length} → ${parsed.assignments.length}`]
  ]);

  const messages = [...validation.failures, ...(compatibility.warnings ?? [])];
  setStatus(
    elements["result-status"],
    validation.pass
      ? `${file.name} loaded as a strict candidate result. All ${validation.touchedTaskCount} touched task and assignment transactions match the bounded profile, Project Start/Finish/Status Date are preserved, and all ${validation.untouchedTaskCount} untouched non-summary tasks retained their candidate progress state.`
      : `${file.name} requires review. ${messages.slice(0, 6).join(" ")}${messages.length > 6 ? ` ${messages.length - 6} additional finding(s).` : ""}`,
    validation.pass ? "success" : "warning"
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
  resetSundayDownloads();
  resetResultState("Sunday cutoff changed. Analyse and prepare a new candidate before importing a Project result.");
  elements["candidate-summary"].hidden = true;
  setStatus(elements["completion-status"], "Cutoff changed. Analyse the schedule again before preparing a candidate.");
});

elements["generate-candidate"].addEventListener("click", async () => {
  try {
    await generateCandidate();
  } catch (error) {
    resetSundayDownloads();
    resetResultState("Candidate preparation failed. No Project result is bound to the current experiment.");
    setStatus(elements["completion-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["download-candidate-xml"].addEventListener("click", () => {
  try {
    downloadSundayXml();
  } catch (error) {
    setStatus(elements["completion-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["download-candidate-intent"].addEventListener("click", () => {
  try {
    downloadSundayIntent();
  } catch (error) {
    setStatus(elements["completion-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["partial-cutoff"].addEventListener("change", () => {
  resetPartialPlan("Monday cutoff changed. Preview the 50% intent plan again before downloading it.");
});

elements["analyze-partial"].addEventListener("click", () => {
  try {
    analysePartial();
  } catch (error) {
    resetPartialPlan();
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

elements["download-result-evidence"].addEventListener("click", () => {
  try {
    downloadResultEvidence();
  } catch (error) {
    setStatus(elements["result-status"], error instanceof Error ? error.message : String(error), "error");
  }
});

elements["result-file"].addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    elements["download-result-evidence"].disabled = true;
    setStatus(elements["result-status"], `Reading ${file.name}…`);
    await loadResult(file);
  } catch (error) {
    state.result = null;
    elements["result-summary"].hidden = true;
    elements["download-result-evidence"].disabled = true;
    setStatus(elements["result-status"], error instanceof Error ? error.message : String(error), "error");
  }
});
