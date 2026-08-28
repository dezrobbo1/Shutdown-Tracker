import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyKnownProjectDifference,
  normalizeProjectScalarForComparison,
  projectScalarValuesEqual
} from "../src/project-result-semantics.js";

test("signed zero compares numerically equal", () => {
  assert.equal(normalizeProjectScalarForComparison("-0.00"), 0);
  assert.equal(normalizeProjectScalarForComparison("0.00"), 0);
  assert.equal(projectScalarValuesEqual("-0.00", "0.00"), true);
});

test("Project save metadata is serialization normalization", () => {
  for (const field of ["Name", "GUID", "LastSaved", "CurrentDate"]) {
    assert.equal(
      classifyKnownProjectDifference({ scope: "project", field }),
      "serialization_normalization"
    );
  }
});

test("known summary and resource rollups are Project-calculated consequences", () => {
  assert.equal(
    classifyKnownProjectDifference({ scope: "task", field: "PercentComplete", summary: true }),
    "project_calculated_consequence"
  );
  assert.equal(
    classifyKnownProjectDifference({ scope: "resource", field: "ActualWork" }),
    "project_calculated_consequence"
  );
  assert.equal(
    classifyKnownProjectDifference({ scope: "task", field: "LateFinish" }),
    "project_calculated_consequence"
  );
});

test("unknown differences remain unexpected", () => {
  assert.equal(
    classifyKnownProjectDifference({ scope: "task", field: "ConstraintDate" }),
    "unexpected_difference"
  );
});
