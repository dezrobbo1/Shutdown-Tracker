import { buildTaskScalarDiagnosticPatch } from "./execution.js";
import { applyTaskScalarDiagnostic } from "./project-xml.js";

export const EXPORT_PROFILES = Object.freeze([
  {
    id: "intent-only",
    label: "Intent log only — unchanged XML baseline",
    classification: "baseline",
    warning:
      "The candidate XML is byte-for-byte identical to the imported source. Download the execution log JSON separately. Use this profile to measure Microsoft Project open/save normalization without progress edits."
  },
  {
    id: "task-scalar-diagnostic",
    label: "Task scalar diagnostic — known incomplete for assigned tasks",
    classification: "diagnostic",
    warning:
      "This profile writes only task PercentComplete, ActualStart and ActualFinish. The BOILER trial disproved it as a coherent assigned-task completion transaction. Use it only to reproduce and compare the failed mechanism."
  }
]);

export function getExportProfile(profileId) {
  const profile = EXPORT_PROFILES.find((entry) => entry.id === profileId);
  if (!profile) {
    throw new Error(`Unknown export profile: ${profileId}`);
  }
  return profile;
}

export function buildPatchEntries(project, events) {
  const touchedTaskUids = [...new Set(events.map((event) => String(event.taskUid)))];
  return touchedTaskUids
    .map((taskUid) => {
      const task = project.taskByUid.get(taskUid);
      if (!task) {
        throw new Error(`Execution event references unknown task UID ${taskUid}.`);
      }
      if (task.summary) {
        throw new Error(`Execution event references summary task UID ${taskUid}.`);
      }

      return {
        taskUid,
        expected: {
          id: task.id,
          name: task.name,
          wbs: task.wbs
        },
        fields: buildTaskScalarDiagnosticPatch(events, taskUid)
      };
    })
    .filter((entry) => Object.keys(entry.fields).length > 0);
}

export function generateCandidateText({ sourceXml, project, events, profileId }) {
  const profile = getExportProfile(profileId);
  if (profile.id === "intent-only") {
    return {
      profile,
      candidateText: sourceXml,
      patchEntries: [],
      changedTaskUids: [],
      changedAssignmentUids: []
    };
  }

  const patchEntries = buildPatchEntries(project, events);
  const candidateText = applyTaskScalarDiagnostic(sourceXml, patchEntries);
  return {
    profile,
    candidateText,
    patchEntries,
    changedTaskUids: patchEntries.map((entry) => entry.taskUid),
    changedAssignmentUids: []
  };
}
