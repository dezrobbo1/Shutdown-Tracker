const SAVE_METADATA_FIELDS = new Set(["Name", "GUID", "LastSaved", "CurrentDate"]);
const TASK_RECALC_FIELDS = new Set([
  "StartSlack",
  "FinishSlack",
  "TotalSlack",
  "FreeSlack",
  "LateStart",
  "LateFinish",
  "Critical"
]);
const SUMMARY_ROLLUP_FIELDS = new Set([
  "PercentComplete",
  "PercentWorkComplete",
  "ActualStart",
  "ActualDuration",
  "ActualWork",
  "RemainingDuration",
  "RemainingWork",
  "Stop",
  "Resume"
]);
const RESOURCE_ROLLUP_FIELDS = new Set([
  "PercentWorkComplete",
  "ActualWork",
  "RemainingWork"
]);

export function normalizeProjectScalarForComparison(value) {
  if (value == null) {
    return value;
  }
  const text = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
    return text;
  }
  const number = Number(text);
  if (!Number.isFinite(number)) {
    return text;
  }
  if (number === 0) {
    return 0;
  }
  return number;
}

export function projectScalarValuesEqual(left, right) {
  return Object.is(
    normalizeProjectScalarForComparison(left),
    normalizeProjectScalarForComparison(right)
  );
}

export function classifyKnownProjectDifference({ scope, field, summary = false }) {
  if (scope === "project" && SAVE_METADATA_FIELDS.has(field)) {
    return "serialization_normalization";
  }
  if (scope === "task" && summary && SUMMARY_ROLLUP_FIELDS.has(field)) {
    return "project_calculated_consequence";
  }
  if (scope === "task" && TASK_RECALC_FIELDS.has(field)) {
    return "project_calculated_consequence";
  }
  if (scope === "resource" && RESOURCE_ROLLUP_FIELDS.has(field)) {
    return "project_calculated_consequence";
  }
  return "unexpected_difference";
}

export const PROJECT_RESULT_SEMANTICS = Object.freeze({
  saveMetadataFields: Object.freeze([...SAVE_METADATA_FIELDS]),
  taskRecalculationFields: Object.freeze([...TASK_RECALC_FIELDS]),
  summaryRollupFields: Object.freeze([...SUMMARY_ROLLUP_FIELDS]),
  resourceRollupFields: Object.freeze([...RESOURCE_ROLLUP_FIELDS])
});
