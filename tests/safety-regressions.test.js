import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTaskScalarDiagnostic,
  classifyProjectResultCompatibility
} from "../src/project-xml.js";

function task(uid, overrides = {}) {
  return {
    uid: String(uid),
    id: String(overrides.id ?? uid),
    name: overrides.name ?? `Task ${uid}`,
    wbs: overrides.wbs ?? String(uid),
    summary: Boolean(overrides.summary),
    ...overrides
  };
}

function project({ guid, uid = null, name = "Plan", tasks }) {
  return {
    project: { guid, uid, name },
    taskByUid: new Map(tasks.map((entry) => [String(entry.uid), entry]))
  };
}

test("diagnostic insertion fails closed when no verified anchor exists", () => {
  const xml = `<Project xmlns="http://schemas.microsoft.com/project"><Tasks><Task><UID>9</UID><ID>9</ID><Name>No anchors</Name><WBS>9</WBS><Summary>0</Summary></Task></Tasks></Project>`;
  assert.throws(
    () =>
      applyTaskScalarDiagnostic(xml, [
        {
          taskUid: "9",
          expected: { id: "9", name: "No anchors", wbs: "9" },
          fields: { PercentComplete: "50" }
        }
      ]),
    /no verified MSPDI ordering anchor/
  );
});

test("changed Project GUID remains a strict result when task fingerprints are unchanged", () => {
  const candidate = project({ guid: "SOURCE-GUID", tasks: [task(43), task(44)] });
  const result = project({ guid: "RESULT-GUID", tasks: [task(43), task(44)] });

  const classification = classifyProjectResultCompatibility({
    candidate,
    result,
    touchedTaskUids: ["43"]
  });

  assert.equal(classification.classification, "strict-result");
  assert.equal(classification.taskSet.candidateCount, 2);
  assert.equal(classification.taskSet.resultCount, 2);
  assert.ok(classification.warnings.some((warning) => warning.includes("Project GUID changed")));
});

test("task population changes classify the file as a reference schedule", () => {
  const candidate = project({ guid: "A", tasks: [task(43), task(44)] });
  const result = project({ guid: "B", tasks: [task(43), task(44), task(45)] });

  const classification = classifyProjectResultCompatibility({
    candidate,
    result,
    touchedTaskUids: ["43"]
  });

  assert.equal(classification.classification, "reference");
  assert.deepEqual(classification.taskSet.addedInResult, ["45"]);
  assert.deepEqual(classification.taskSet.missingFromResult, []);
});

test("touched task identity mismatch fails closed", () => {
  const candidate = project({ guid: "A", tasks: [task(43, { name: "Expected task" })] });
  const result = project({ guid: "B", tasks: [task(43, { name: "Different task" })] });

  assert.throws(
    () =>
      classifyProjectResultCompatibility({
        candidate,
        result,
        touchedTaskUids: ["43"]
      }),
    /Touched task UID 43 identity mismatch/
  );
});
