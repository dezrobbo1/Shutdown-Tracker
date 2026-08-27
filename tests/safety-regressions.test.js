import test from "node:test";
import assert from "node:assert/strict";
import { applyTaskScalarDiagnostic, assertProjectIdentityCompatible } from "../src/project-xml.js";

test("diagnostic insertion fails closed when no verified anchor exists", () => {
  const xml = `<Project xmlns="http://schemas.microsoft.com/project"><Tasks><Task><UID>9</UID><ID>9</ID><Name>No anchors</Name><WBS>9</WBS><Summary>0</Summary></Task></Tasks></Project>`;
  assert.throws(() => applyTaskScalarDiagnostic(xml, [{ taskUid: "9", expected: { id: "9", name: "No anchors", wbs: "9" }, fields: { PercentComplete: "50" } }]), /no verified MSPDI ordering anchor/);
});

test("project identity compares like-for-like identifiers", () => {
  assert.deepEqual(assertProjectIdentityCompatible({ project: { uid: "1", guid: "ABC", name: "Plan" } }, { project: { guid: "ABC", name: "Plan" } }), { method: "GUID", value: "ABC" });
  assert.throws(() => assertProjectIdentityCompatible({ project: { uid: "1", guid: "ABC" } }, { project: { uid: "2", guid: "ABC" } }), /UID mismatch/);
  assert.throws(() => assertProjectIdentityCompatible({ project: { uid: "1", guid: "ABC" } }, { project: { uid: "1", guid: "XYZ" } }), /GUID mismatch/);
});
