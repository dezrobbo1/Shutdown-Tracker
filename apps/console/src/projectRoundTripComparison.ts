import type {
  ProjectXmlPreview,
  ProjectXmlTaskPreview
} from "./projectXmlPreview";

export const ROUND_TRIP_DISPOSITIONS = [
  "Works as expected",
  "Mapping needs revision",
  "Candidate generation problem",
  "Project compatibility problem",
  "Unexplained differences",
  "Not suitable"
] as const;

export type RoundTripDisposition = (typeof ROUND_TRIP_DISPOSITIONS)[number];

export type SupportedProjectTaskField =
  | "ActualStart"
  | "ActualFinish"
  | "PercentComplete"
  | "PhysicalPercentComplete";

export type CandidateSemanticChange = {
  id: string;
  taskUid: string;
  expectedTaskId: string | null;
  taskName: string;
  wbs: string | null;
  field: SupportedProjectTaskField;
  sourceValue: string | number | null;
  candidateValue: string | number | null;
};

export type StructuralDifference = {
  id: string;
  path: string;
  candidateValue: string | number | boolean | null;
  resultValue: string | number | boolean | null;
  taskUid?: string;
  taskId?: string;
};

export type ManualDifferenceClassification =
  | "Microsoft Project-calculated consequence"
  | "Human Project edit"
  | "Unexplained difference";

export type DifferenceClassification =
  | "Tracker-selected input"
  | ManualDifferenceClassification
  | "Unclassified difference — manual review required";

export type DifferenceAnnotation = {
  differenceId: string;
  classification: ManualDifferenceClassification;
  note?: string;
};

export type SelectedInputComparison = {
  change: CandidateSemanticChange;
  classification: "Tracker-selected input";
  resultValue: string | number | null;
  landed: boolean;
};

export type ClassifiedStructuralDifference = StructuralDifference & {
  classification: DifferenceClassification;
  note?: string;
};

export type ProjectIdentityComparison = {
  status: "matched" | "not-comparable";
  projectUid: string | null;
};

export type ProjectRoundTripComparison = {
  projectIdentity: ProjectIdentityComparison;
  selectedInputs: SelectedInputComparison[];
  differences: ClassifiedStructuralDifference[];
  issues: string[];
};

export type CompareProjectRoundTripInput = {
  source: ProjectXmlPreview;
  candidate?: ProjectXmlPreview;
  projectResult: ProjectXmlPreview;
  selectedChanges: CandidateSemanticChange[];
  structuralDifferences?: StructuralDifference[];
  annotations?: DifferenceAnnotation[];
};

export type RoundTripDispositionRecord = {
  disposition: RoundTripDisposition;
  notes?: string;
};

export type SelectedProjectField = {
  taskUid: string;
  field: SupportedProjectTaskField;
};

const UNCLASSIFIED = "Unclassified difference — manual review required" as const;
const MANUAL_CLASSIFICATIONS = new Set<ManualDifferenceClassification>([
  "Microsoft Project-calculated consequence",
  "Human Project edit",
  "Unexplained difference"
]);

export function compareProjectRoundTrip({
  source,
  candidate,
  projectResult,
  selectedChanges,
  structuralDifferences = [],
  annotations = []
}: CompareProjectRoundTripInput): ProjectRoundTripComparison {
  const projectIdentity = compareProjectIdentity(source, candidate, projectResult);
  requireUniqueIds(selectedChanges, "selected candidate change");
  requireUniqueIds(structuralDifferences, "structural difference");

  const annotationByDifferenceId = indexAnnotations(annotations, structuralDifferences);
  const issues: string[] = [];
  const selectedInputs = selectedChanges.map((change) => {
    const sourceTask = requireExactTask(source, change, "source");
    const sourceValue = fieldValue(sourceTask, change.field);
    if (!sameValue(sourceValue, change.sourceValue)) {
      throw new Error(
        `Selected change ${change.id} no longer matches the imported source value for task UID ${change.taskUid}.`
      );
    }

    if (candidate) {
      const candidateTask = requireExactTask(candidate, change, "candidate");
      const candidateValue = fieldValue(candidateTask, change.field);
      if (!sameValue(candidateValue, change.candidateValue)) {
        throw new Error(
          `Selected change ${change.id} does not match the generated candidate value for task UID ${change.taskUid}.`
        );
      }
    }

    const resultTask = requireExactTask(projectResult, change, "Project result");
    const resultValue = fieldValue(resultTask, change.field);
    const landed = sameValue(resultValue, change.candidateValue);
    if (!landed) {
      issues.push(
        `${change.field} for task UID ${change.taskUid} did not land with the selected candidate value.`
      );
    }
    return {
      change,
      classification: "Tracker-selected input" as const,
      resultValue,
      landed
    };
  });

  const differences = structuralDifferences.map((difference) => {
    if (sameValue(difference.candidateValue, difference.resultValue)) {
      throw new Error(`Structural difference ${difference.id} does not contain a changed value.`);
    }
    const annotation = annotationByDifferenceId.get(difference.id);
    return {
      ...difference,
      classification: annotation?.classification ?? UNCLASSIFIED,
      ...(annotation?.note ? { note: annotation.note } : {})
    };
  });

  return { projectIdentity, selectedInputs, differences, issues };
}

export function recordRoundTripDisposition(
  disposition: RoundTripDisposition,
  notes?: string
): RoundTripDispositionRecord {
  if (!(ROUND_TRIP_DISPOSITIONS as readonly string[]).includes(disposition)) {
    throw new Error("Choose a supported round-trip trial disposition.");
  }
  const cleanedNotes = notes?.trim();
  return {
    disposition,
    ...(cleanedNotes ? { notes: cleanedNotes } : {})
  };
}

export function assertCandidatePreviewPreserved(
  source: ProjectXmlPreview,
  candidate: ProjectXmlPreview
) {
  if (source.taskCount !== candidate.taskCount
    || source.summaryTaskCount !== candidate.summaryTaskCount
    || source.leafTaskCount !== candidate.leafTaskCount) {
    throw new Error("The generated candidate did not preserve the imported Project task structure.");
  }
  if ((source.projectUid === null) !== (candidate.projectUid === null)
    || (source.projectUid !== null && candidate.projectUid !== null
      && normalizeProjectUid(source.projectUid) !== normalizeProjectUid(candidate.projectUid))) {
    throw new Error("The generated candidate did not preserve the imported Project identity.");
  }
  if (source.projectName !== candidate.projectName || source.statusDate !== candidate.statusDate) {
    throw new Error("The generated candidate did not preserve the imported Project name or StatusDate context.");
  }

  for (const sourceTask of source.tasks) {
    const matches = sourceTask.uid !== null
      ? candidate.tasks.filter((task) => task.uid === sourceTask.uid)
      : candidate.tasks.filter((task) => task.uid === null && task.id === sourceTask.id);
    if (matches.length !== 1) {
      throw new Error(
        `The generated candidate must preserve exactly one task with ${sourceTask.uid !== null ? `UID ${sourceTask.uid}` : `ID ${sourceTask.id ?? "not supplied"}`}.`
      );
    }
    const candidateTask = matches[0];
    const identityFields: Array<keyof ProjectXmlTaskPreview> = [
      "id", "name", "wbs", "outlineNumber", "outlineLevel", "summary", "start", "finish"
    ];
    for (const field of identityFields) {
      if (!sameValue(sourceTask[field] as ComparablePreviewValue, candidateTask[field] as ComparablePreviewValue)) {
        throw new Error(
          `The generated candidate changed imported task identity or schedule context (${String(field)}) for UID ${sourceTask.uid ?? "not supplied"}.`
        );
      }
    }
  }
}

export function buildConservativeProjectDifferences(input: {
  candidateXml: string;
  resultXml: string;
  selectedChanges: readonly SelectedProjectField[];
  candidate: ProjectXmlPreview;
  projectResult: ProjectXmlPreview;
}): StructuralDifference[] {
  const { candidateXml, resultXml, selectedChanges, candidate, projectResult } = input;
  if (candidateXml === resultXml) return [];

  const selectedKeys = new Set(selectedChanges.map((change) => `${change.taskUid}:${change.field}`));
  const candidateTasks = groupTasksByStableIdentity(candidate.tasks);
  const resultTasks = groupTasksByStableIdentity(projectResult.tasks);
  const keys = new Set([...candidateTasks.keys(), ...resultTasks.keys()]);
  const fields: Array<[string, keyof ProjectXmlTaskPreview]> = [
    ["ID", "id"],
    ["Name", "name"],
    ["WBS", "wbs"],
    ["OutlineNumber", "outlineNumber"],
    ["OutlineLevel", "outlineLevel"],
    ["Summary", "summary"],
    ["Start", "start"],
    ["Finish", "finish"],
    ["Duration", "duration"],
    ["ActualStart", "actualStart"],
    ["ActualFinish", "actualFinish"],
    ["PercentComplete", "percentComplete"],
    ["PhysicalPercentComplete", "physicalPercentComplete"],
    ["Critical", "critical"]
  ];
  const differences: StructuralDifference[] = [];

  const projectFields: Array<[string, "projectName" | "statusDate"]> = [
    ["Name", "projectName"],
    ["StatusDate", "statusDate"]
  ];
  for (const [label, field] of projectFields) {
    if (!sameValue(candidate[field], projectResult[field])) {
      differences.push({
        id: `result-project-${label}`,
        path: `Project / ${label}`,
        candidateValue: candidate[field],
        resultValue: projectResult[field]
      });
    }
  }

  for (const key of [...keys].sort()) {
    const beforeMatches = candidateTasks.get(key) ?? [];
    const afterMatches = resultTasks.get(key) ?? [];
    const representative = afterMatches[0] ?? beforeMatches[0];
    if (beforeMatches.length !== 1 || afterMatches.length !== 1) {
      if (beforeMatches.length !== afterMatches.length) {
        differences.push({
          id: `result-${safeDifferenceId(key)}-task-presence`,
          path: `Task ${displayTaskIdentity(representative)}`,
          candidateValue: beforeMatches.length === 0 ? "Task absent" : `${beforeMatches.length} matching task row${beforeMatches.length === 1 ? "" : "s"}`,
          resultValue: afterMatches.length === 0 ? "Task absent" : `${afterMatches.length} matching task row${afterMatches.length === 1 ? "" : "s"}`,
          ...(representative?.uid ? { taskUid: representative.uid } : {}),
          ...(representative?.id ? { taskId: representative.id } : {})
        });
      }
      continue;
    }

    const before = beforeMatches[0];
    const after = afterMatches[0];
    for (const [field, previewField] of fields) {
      if (before.uid !== null && selectedKeys.has(`${before.uid}:${field}`)) continue;
      const candidateValue = before[previewField] as ComparablePreviewValue;
      const resultValue = after[previewField] as ComparablePreviewValue;
      if (sameValue(candidateValue, resultValue)) continue;
      differences.push({
        id: `result-${safeDifferenceId(key)}-${field}`,
        path: `Task ${displayTaskIdentity(after)} / ${field}`,
        candidateValue,
        resultValue,
        ...(after.uid ? { taskUid: after.uid } : {}),
        ...(after.id ? { taskId: after.id } : {})
      });
    }
  }

  // The bounded preview does not parse every MSPDI field. Always retain one
  // residual raw-document review row when the XML strings differ; known rows
  // above cannot prove that every resource, assignment, timephased, extension,
  // or formatting delta has been explained.
  const index = firstDifferentCodeUnit(candidateXml, resultXml);
  differences.push({
    id: "result-document-change",
    path: "Complete Project XML residual review",
    candidateValue: documentDifferenceDescription(candidateXml, index),
    resultValue: documentDifferenceDescription(resultXml, index)
  });
  return differences;
}

function compareProjectIdentity(
  source: ProjectXmlPreview,
  candidate: ProjectXmlPreview | undefined,
  projectResult: ProjectXmlPreview
): ProjectIdentityComparison {
  const supplied = [source.projectUid, candidate?.projectUid ?? null, projectResult.projectUid]
    .filter((value): value is string => value !== null);
  if (new Set(supplied.map(normalizeProjectUid)).size > 1) {
    throw new Error("Project-result identity does not match the imported source project identity.");
  }
  const comparable = source.projectUid !== null && projectResult.projectUid !== null;
  return {
    status: comparable ? "matched" : "not-comparable",
    projectUid: comparable ? source.projectUid : null
  };
}

function normalizeProjectUid(value: string) {
  return value.trim().replace(/^\{(.+)\}$/, "$1").toLowerCase();
}

function groupTasksByStableIdentity(tasks: ProjectXmlTaskPreview[]) {
  const grouped = new Map<string, ProjectXmlTaskPreview[]>();
  tasks.forEach((task, index) => {
    const key = task.uid !== null ? `uid:${task.uid}` : task.id !== null ? `id:${task.id}` : `position:${index}`;
    grouped.set(key, [...(grouped.get(key) ?? []), task]);
  });
  return grouped;
}

function displayTaskIdentity(task: ProjectXmlTaskPreview | undefined) {
  if (!task) return "with unavailable identity";
  if (task.uid !== null) return `UID ${task.uid}`;
  if (task.id !== null) return `ID ${task.id}`;
  return "with unavailable identity";
}

function safeDifferenceId(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]+/gu, "-");
}

function firstDifferentCodeUnit(left: string, right: string) {
  const comparedLength = Math.min(left.length, right.length);
  for (let index = 0; index < comparedLength; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return comparedLength;
}

function documentDifferenceDescription(value: string, index: number) {
  if (index >= value.length) return `length ${value.length}; document ended at differing position ${index}`;
  const codePoint = value.codePointAt(index) ?? 0;
  return `length ${value.length}; code point at differing position ${index} is U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function requireExactTask(
  preview: ProjectXmlPreview,
  change: CandidateSemanticChange,
  sourceLabel: string
) {
  const matches = preview.tasks.filter((task) => task.uid === change.taskUid);
  if (matches.length !== 1) {
    throw new Error(
      `The ${sourceLabel} must contain exactly one task with UID ${change.taskUid}; found ${matches.length}.`
    );
  }
  const task = matches[0];
  if (change.expectedTaskId !== null && task.id !== change.expectedTaskId) {
    throw new Error(
      `Task UID ${change.taskUid} has ID ${task.id ?? "not supplied"} in the ${sourceLabel}; expected ${change.expectedTaskId}.`
    );
  }
  return task;
}

function fieldValue(task: ProjectXmlTaskPreview, field: SupportedProjectTaskField) {
  if (field === "ActualStart") return task.actualStart;
  if (field === "ActualFinish") return task.actualFinish;
  if (field === "PercentComplete") return task.percentComplete;
  return task.physicalPercentComplete;
}

type ComparablePreviewValue = string | number | boolean | null;

function sameValue(left: ComparablePreviewValue, right: ComparablePreviewValue) {
  if (left === null || right === null) return left === right;
  if (typeof left === "boolean" || typeof right === "boolean") return left === right;
  if (typeof left === "number" || typeof right === "number") {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    return Number.isFinite(leftNumber)
      && Number.isFinite(rightNumber)
      && leftNumber === rightNumber;
  }
  return left.trim() === right.trim();
}

function indexAnnotations(
  annotations: DifferenceAnnotation[],
  differences: StructuralDifference[]
) {
  const differenceIds = new Set(differences.map((difference) => difference.id));
  const indexed = new Map<string, DifferenceAnnotation>();
  for (const annotation of annotations) {
    if (!differenceIds.has(annotation.differenceId)) {
      throw new Error(`Difference annotation ${annotation.differenceId} has no matching structural difference.`);
    }
    if (indexed.has(annotation.differenceId)) {
      throw new Error(`Structural difference ${annotation.differenceId} has more than one annotation.`);
    }
    if (!MANUAL_CLASSIFICATIONS.has(annotation.classification)) {
      throw new Error(`Difference annotation ${annotation.differenceId} has an unsupported classification.`);
    }
    const note = annotation.note?.trim();
    indexed.set(annotation.differenceId, {
      ...annotation,
      ...(note ? { note } : { note: undefined })
    });
  }
  return indexed;
}

function requireUniqueIds(records: Array<{ id: string }>, label: string) {
  const seen = new Set<string>();
  for (const record of records) {
    if (!record.id.trim()) throw new Error(`Every ${label} requires an identifier.`);
    if (seen.has(record.id)) throw new Error(`Duplicate ${label} identifier ${record.id}.`);
    seen.add(record.id);
  }
}
