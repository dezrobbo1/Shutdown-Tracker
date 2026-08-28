import {
  applyAssignedCompletionNativeV0,
  buildAssignedCompletionNativeV0Transaction
} from "./native-completion-v0.js";

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readScalar(block, field) {
  const expression = new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${field}\\b[^>]*>\\s*([\\s\\S]*?)\\s*<\\/(?:[A-Za-z_][\\w.-]*:)?${field}>`
  );
  return expression.exec(block)?.[1]?.trim() ?? null;
}

function replaceUniqueBlockWithMarker(xml, elementName, identityField, identityValue, marker) {
  const expression = new RegExp(
    `<((?:[A-Za-z_][\\w.-]*:)?${elementName})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
    "g"
  );
  let count = 0;
  const normalized = xml.replace(expression, (block) => {
    if (String(readScalar(block, identityField)) !== String(identityValue)) {
      return block;
    }
    count += 1;
    return marker;
  });
  requireCondition(
    count === 1,
    `${elementName} ${identityField} ${identityValue} matched ${count} blocks while checking the mutation boundary.`
  );
  return normalized;
}

function assertMutationBoundary(sourceXml, candidateText, transaction) {
  const markers = {
    task: "<!-- SHUTDOWN_TRACKER_TARGET_TASK -->",
    assignment: "<!-- SHUTDOWN_TRACKER_TARGET_ASSIGNMENT -->"
  };
  const normalizedSource = replaceUniqueBlockWithMarker(
    replaceUniqueBlockWithMarker(
      sourceXml,
      "Task",
      "UID",
      transaction.taskUid,
      markers.task
    ),
    "Assignment",
    "UID",
    transaction.assignmentUid,
    markers.assignment
  );
  const normalizedCandidate = replaceUniqueBlockWithMarker(
    replaceUniqueBlockWithMarker(
      candidateText,
      "Task",
      "UID",
      transaction.taskUid,
      markers.task
    ),
    "Assignment",
    "UID",
    transaction.assignmentUid,
    markers.assignment
  );
  requireCondition(
    normalizedCandidate === normalizedSource,
    "Assigned completion v0 changed XML outside the selected task and assignment blocks."
  );
}

function assertEvidenceProfileIdentity(transaction) {
  requireCondition(
    transaction.taskId != null && transaction.taskId !== "",
    `Task UID ${transaction.taskUid} requires an ID.`
  );
  requireCondition(transaction.taskName, `Task UID ${transaction.taskUid} requires a Name.`);
  requireCondition(transaction.taskWbs, `Task UID ${transaction.taskUid} requires a WBS value.`);
  requireCondition(
    String(transaction.resourceUid) !== "0",
    `Assignment UID ${transaction.assignmentUid} uses Resource UID 0 and is not an assigned-task v0 case.`
  );
  requireCondition(
    String(transaction.assignmentTimephased.unit) === "1",
    `Assignment UID ${transaction.assignmentUid} timephased Unit must be 1 for native-evidence v0.`
  );
}

export function generateAssignedCompletionNativeV0(options) {
  const transaction = buildAssignedCompletionNativeV0Transaction(options.project, options.events);
  assertEvidenceProfileIdentity(transaction);
  const candidateText = applyAssignedCompletionNativeV0(options.sourceXml, transaction);
  assertMutationBoundary(options.sourceXml, candidateText, transaction);
  return {
    candidateText,
    transaction,
    patchEntries: [],
    changedTaskUids: [transaction.taskUid],
    changedAssignmentUids: [transaction.assignmentUid]
  };
}
