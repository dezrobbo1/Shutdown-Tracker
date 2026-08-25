import { describe, expect, it } from "vitest";
import type {
  ProjectXmlPreview,
  ProjectXmlTaskPreview
} from "./projectXmlPreview";
import {
  ROUND_TRIP_DISPOSITIONS,
  assertCandidatePreviewPreserved,
  buildConservativeProjectDifferences,
  compareProjectRoundTrip,
  recordRoundTripDisposition,
  type CandidateSemanticChange,
  type StructuralDifference
} from "./projectRoundTripComparison";

describe("Tier 1 Project round-trip comparison", () => {
  it("validates exact selected input landing and classifies only that input as Tracker-selected", () => {
    const source = preview([task({ percentComplete: 0 })]);
    const candidate = preview([task({ percentComplete: 35 })]);
    const projectResult = preview([task({ percentComplete: 35 })]);

    const comparison = compareProjectRoundTrip({
      source,
      candidate,
      projectResult,
      selectedChanges: [percentChange()]
    });

    expect(comparison.projectIdentity).toEqual({
      status: "matched",
      projectUid: "project-guid-1",
      matchedBy: "project-uid",
      value: "project-guid-1"
    });
    expect(comparison.selectedInputs).toMatchObject([{
      classification: "Tracker-selected input",
      resultValue: 35,
      landed: true
    }]);
    expect(comparison.issues).toEqual([]);
  });

  it("checks each supported experimental task field against the Project result", () => {
    const sourceTask = task();
    const candidateTask = task({
      actualStart: "2026-08-24T06:15:00",
      actualFinish: "2026-08-24T09:45:00",
      percentComplete: 100,
      physicalPercentComplete: 80
    });
    const changes: CandidateSemanticChange[] = [
      semanticChange("actual-start", "ActualStart", null, "2026-08-24T06:15:00"),
      semanticChange("actual-finish", "ActualFinish", null, "2026-08-24T09:45:00"),
      semanticChange("percent", "PercentComplete", 0, 100),
      semanticChange("physical-percent", "PhysicalPercentComplete", null, 80)
    ];

    const comparison = compareProjectRoundTrip({
      source: preview([sourceTask]),
      candidate: preview([candidateTask]),
      projectResult: preview([candidateTask]),
      selectedChanges: changes
    });

    expect(comparison.selectedInputs).toHaveLength(4);
    expect(comparison.selectedInputs.every((input) => input.landed)).toBe(true);
    expect(comparison.issues).toEqual([]);
  });

  it("rejects a Project result with a different supplied project identity", () => {
    expect(() => compareProjectRoundTrip({
      source: preview([task()]),
      projectResult: preview([task()], "another-project-guid"),
      selectedChanges: [percentChange()]
    })).toThrow(/identity does not match/i);

    expect(() => compareProjectRoundTrip({
      source: preview([task()]),
      projectResult: preview([task()], null),
      selectedChanges: [percentChange()]
    })).toThrow(/identity does not match/i);
  });

  it("treats conventional Project GUID casing and braces as the same identity", () => {
    const comparison = compareProjectRoundTrip({
      source: preview([task()], "{ABCDEF00-1111-2222-3333-444444444444}"),
      projectResult: preview([task()], "abcdef00-1111-2222-3333-444444444444"),
      selectedChanges: []
    });

    expect(comparison.projectIdentity).toEqual({
      status: "matched",
      projectUid: "{ABCDEF00-1111-2222-3333-444444444444}",
      matchedBy: "project-uid",
      value: "{ABCDEF00-1111-2222-3333-444444444444}"
    });
  });

  it("uses the exact project name when the source does not supply a Project UID", () => {
    const source = preview([task()], null);
    const matched = compareProjectRoundTrip({
      source,
      projectResult: preview([task()], null),
      selectedChanges: []
    });
    expect(matched.projectIdentity).toEqual({
      status: "matched",
      projectUid: null,
      matchedBy: "project-name",
      value: "Synthetic Project round-trip"
    });

    const renamed = { ...preview([task()], null), projectName: "Another project" };
    expect(() => compareProjectRoundTrip({ source, projectResult: renamed, selectedChanges: [] }))
      .toThrow(/name does not match/i);
  });

  it("fails safely when task UID is missing, duplicated, or paired with another ID", () => {
    const source = preview([task()]);
    const selectedChanges = [percentChange()];

    expect(() => compareProjectRoundTrip({
      source,
      projectResult: preview([task({ uid: "other-uid" })]),
      selectedChanges
    })).toThrow(/exactly one task with UID task-uid-2; found 0/i);

    expect(() => compareProjectRoundTrip({
      source,
      projectResult: preview([task(), task({ name: "Duplicate task" })]),
      selectedChanges
    })).toThrow(/exactly one task with UID task-uid-2; found 2/i);

    expect(() => compareProjectRoundTrip({
      source,
      projectResult: preview([task({ id: "99" })]),
      selectedChanges
    })).toThrow(/has ID 99.*expected 2/i);
  });

  it("reports an intended selected input that did not land without inventing a consequence", () => {
    const comparison = compareProjectRoundTrip({
      source: preview([task({ percentComplete: 0 })]),
      candidate: preview([task({ percentComplete: 35 })]),
      projectResult: preview([task({ percentComplete: 30 })]),
      selectedChanges: [percentChange()],
      structuralDifferences: [{
        id: "difference-progress-normalized",
        path: "/Project/Tasks/Task[UID=task-uid-2]/PercentComplete",
        taskUid: "task-uid-2",
        taskId: "2",
        candidateValue: 35,
        resultValue: 30
      }]
    });

    expect(comparison.selectedInputs[0]).toMatchObject({ landed: false, resultValue: 30 });
    expect(comparison.issues).toEqual([
      "PercentComplete for task UID task-uid-2 did not land with the selected candidate value."
    ]);
    expect(comparison.differences[0].classification)
      .toBe("Unclassified difference — manual review required");
  });

  it("leaves every candidate-to-result difference unclassified until a reviewer annotates it", () => {
    const differences: StructuralDifference[] = [
      {
        id: "summary-finish",
        path: "/Project/Tasks/Task[UID=summary-uid]/Finish",
        taskUid: "summary-uid",
        taskId: "1",
        candidateValue: "2026-08-24T10:00:00",
        resultValue: "2026-08-24T10:30:00"
      },
      {
        id: "assignment-work",
        path: "/Project/Assignments/Assignment[UID=assignment-1]/Work",
        candidateValue: "PT4H0M0S",
        resultValue: "PT3H30M0S"
      }
    ];
    const comparison = compareProjectRoundTrip({
      source: preview([task({ percentComplete: 0 })]),
      candidate: preview([task({ percentComplete: 35 })]),
      projectResult: preview([task({ percentComplete: 35 })]),
      selectedChanges: [percentChange()],
      structuralDifferences: differences
    });

    expect(comparison.differences.map((difference) => difference.classification)).toEqual([
      "Unclassified difference — manual review required",
      "Unclassified difference — manual review required"
    ]);
    expect(comparison.differences).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ classification: "Microsoft Project-calculated consequence" })
    ]));
  });

  it("applies only explicit supported reviewer annotations with optional notes", () => {
    const structuralDifferences: StructuralDifference[] = [
      difference("calculated", "/Project/Tasks/Task[UID=summary-uid]/Finish"),
      difference("human", "/Project/Tasks/Task[UID=task-uid-2]/Name"),
      difference("unexplained", "/Project/Assignments/Assignment[UID=assignment-1]/Work")
    ];
    const comparison = compareProjectRoundTrip({
      source: preview([task({ percentComplete: 0 })]),
      candidate: preview([task({ percentComplete: 35 })]),
      projectResult: preview([task({ percentComplete: 35 })]),
      selectedChanges: [percentChange()],
      structuralDifferences,
      annotations: [
        {
          differenceId: "calculated",
          classification: "Microsoft Project-calculated consequence",
          note: "  Project recalculated the summary finish.  "
        },
        { differenceId: "human", classification: "Human Project edit" },
        { differenceId: "unexplained", classification: "Unexplained difference" }
      ]
    });

    expect(comparison.differences).toMatchObject([
      {
        id: "calculated",
        classification: "Microsoft Project-calculated consequence",
        note: "Project recalculated the summary finish."
      },
      { id: "human", classification: "Human Project edit" },
      { id: "unexplained", classification: "Unexplained difference" }
    ]);

    expect(() => compareProjectRoundTrip({
      source: preview([task()]),
      projectResult: preview([task()]),
      selectedChanges: [],
      structuralDifferences,
      annotations: [{ differenceId: "unknown", classification: "Human Project edit" }]
    })).toThrow(/no matching structural difference/i);
  });

  it("records only the controlled in-memory trial dispositions and trims optional notes", () => {
    expect(ROUND_TRIP_DISPOSITIONS).toEqual([
      "Works as expected",
      "Mapping needs revision",
      "Candidate generation problem",
      "Project compatibility problem",
      "Unexplained differences",
      "Not suitable"
    ]);
    expect(recordRoundTripDisposition(
      "Mapping needs revision",
      "  Review Physical % Complete instead.  "
    )).toEqual({
      disposition: "Mapping needs revision",
      notes: "Review Physical % Complete instead."
    });
    expect(recordRoundTripDisposition("Works as expected", "   "))
      .toEqual({ disposition: "Works as expected" });
    expect(() => recordRoundTripDisposition("Approved for production" as never))
      .toThrow(/supported round-trip trial disposition/i);
  });

  it("rejects stale source or candidate semantic changes", () => {
    expect(() => compareProjectRoundTrip({
      source: preview([task({ percentComplete: 5 })]),
      projectResult: preview([task({ percentComplete: 35 })]),
      selectedChanges: [percentChange()]
    })).toThrow(/no longer matches the imported source value/i);

    expect(() => compareProjectRoundTrip({
      source: preview([task({ percentComplete: 0 })]),
      candidate: preview([task({ percentComplete: 30 })]),
      projectResult: preview([task({ percentComplete: 35 })]),
      selectedChanges: [percentChange()]
    })).toThrow(/does not match the generated candidate value/i);
  });

  it("detects added and removed tasks conservatively", () => {
    const candidate = preview([
      task(),
      task({ uid: "removed-uid", id: "3", name: "Removed task" })
    ]);
    const projectResult = preview([
      task(),
      task({ uid: "added-uid", id: "4", name: "Added task" })
    ]);

    const differences = buildConservativeProjectDifferences({
      candidateXml: "<candidate />",
      resultXml: "<result />",
      selectedChanges: [],
      candidate,
      projectResult
    });

    expect(differences).toEqual(expect.arrayContaining([
      expect.objectContaining({ taskUid: "removed-uid", resultValue: "Task absent" }),
      expect.objectContaining({ taskUid: "added-uid", candidateValue: "Task absent" })
    ]));
  });

  it("surfaces interpreted task schedule consequences without classifying their cause", () => {
    const candidate = preview([task({ finish: "2026-08-24T10:00:00" })]);
    const projectResult = preview([task({ finish: "2026-08-24T10:30:00" })]);
    const differences = buildConservativeProjectDifferences({
      candidateXml: "<candidate />",
      resultXml: "<result />",
      selectedChanges: [],
      candidate,
      projectResult
    });

    expect(differences).toContainEqual(expect.objectContaining({
      path: "Task UID task-uid-2 / Finish",
      candidateValue: "2026-08-24T10:00:00",
      resultValue: "2026-08-24T10:30:00"
    }));
    expect(compareProjectRoundTrip({
      source: candidate,
      candidate,
      projectResult,
      selectedChanges: [],
      structuralDifferences: differences
    }).differences[0].classification).toBe("Unclassified difference — manual review required");
  });

  it("surfaces equal-length uninterpreted XML changes without creating an equal-value difference", () => {
    const samePreview = preview([task()]);
    const differences = buildConservativeProjectDifferences({
      candidateXml: "<Project><Title>A</Title></Project>",
      resultXml: "<Project><Title>B</Title></Project>",
      selectedChanges: [],
      candidate: samePreview,
      projectResult: samePreview
    });

    expect(differences).toHaveLength(1);
    expect(differences[0].path).toBe("Complete Project XML residual review");
    expect(differences[0].candidateValue).not.toBe(differences[0].resultValue);
    expect(() => compareProjectRoundTrip({
      source: samePreview,
      candidate: samePreview,
      projectResult: samePreview,
      selectedChanges: [],
      structuralDifferences: differences
    })).not.toThrow();
  });

  it("does not duplicate a selected input as an inferred structural difference", () => {
    const candidate = preview([task({ percentComplete: 35 })]);
    const result = preview([task({ percentComplete: 40 })]);
    const differences = buildConservativeProjectDifferences({
      candidateXml: "<candidate />",
      resultXml: "<result />",
      selectedChanges: [{ taskUid: "task-uid-2", field: "PercentComplete" }],
      candidate,
      projectResult: result
    });

    expect(differences).toHaveLength(1);
    expect(differences[0].path).toBe("Complete Project XML residual review");
  });

  it("keeps a residual manual-review row beside parsed schedule differences", () => {
    const candidate = preview([task({ finish: "2026-08-24T10:00:00" })]);
    const projectResult = preview([task({ finish: "2026-08-24T10:30:00" })]);
    const differences = buildConservativeProjectDifferences({
      candidateXml: "<Project><Tasks /><Resources><Name>A</Name></Resources></Project>",
      resultXml: "<Project><Tasks /><Resources><Name>B</Name></Resources></Project>",
      selectedChanges: [],
      candidate,
      projectResult
    });

    expect(differences).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "Task UID task-uid-2 / Finish" }),
      expect.objectContaining({ path: "Complete Project XML residual review" })
    ]));
  });

  it("verifies candidate parsing preserved imported identity, hierarchy, and planned context", () => {
    const source = preview([task()]);
    expect(() => assertCandidatePreviewPreserved(source, preview([task()])))
      .not.toThrow();
    expect(() => assertCandidatePreviewPreserved(source, preview([task({ wbs: "9.9" })])))
      .toThrow(/schedule context.*wbs/i);
    expect(() => assertCandidatePreviewPreserved(source, preview([])))
      .toThrow(/task structure/i);
  });
});

function preview(tasks: ProjectXmlTaskPreview[], projectUid: string | null = "project-guid-1"): ProjectXmlPreview {
  const summaryTaskCount = tasks.filter((candidate) => candidate.summary).length;
  return {
    projectName: "Synthetic Project round-trip",
    projectUid,
    statusDate: "2026-08-24T06:00:00",
    taskCount: tasks.length,
    summaryTaskCount,
    leafTaskCount: tasks.length - summaryTaskCount,
    tasks
  };
}

function task(overrides: Partial<ProjectXmlTaskPreview> = {}): ProjectXmlTaskPreview {
  return {
    uid: "task-uid-2",
    id: "2",
    name: "Synthetic leaf task",
    wbs: "1.1",
    outlineNumber: "1.1",
    outlineLevel: 2,
    summary: false,
    start: "2026-08-24T06:00:00",
    finish: "2026-08-24T10:00:00",
    duration: "PT4H0M0S",
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    physicalPercentComplete: null,
    critical: false,
    ...overrides
  };
}

function percentChange(): CandidateSemanticChange {
  return semanticChange("progress", "PercentComplete", 0, 35);
}

function semanticChange(
  id: string,
  field: CandidateSemanticChange["field"],
  sourceValue: CandidateSemanticChange["sourceValue"],
  candidateValue: CandidateSemanticChange["candidateValue"]
): CandidateSemanticChange {
  return {
    id: `change-${id}`,
    taskUid: "task-uid-2",
    expectedTaskId: "2",
    taskName: "Synthetic leaf task",
    wbs: "1.1",
    field,
    sourceValue,
    candidateValue
  };
}

function difference(id: string, path: string): StructuralDifference {
  return {
    id,
    path,
    candidateValue: "before",
    resultValue: "after"
  };
}
