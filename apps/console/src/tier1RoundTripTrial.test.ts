import { selectExecutionState, selectTaskProgress } from "@shutdown-tracker/trial-model";
import { describe, expect, it } from "vitest";
import type { ProjectXmlPreview, ProjectXmlTaskPreview } from "./projectXmlPreview";
import {
  ROUNDTRIP_FALLBACK_INITIAL_TIME,
  TIER1_ROUNDTRIP_ACTOR_ID,
  advanceTier1RoundTripClock,
  applyTier1RoundTripExecutionAction,
  applyTier1RoundTripRecordAction,
  chooseTier1RoundTripInitialClock,
  createTier1RoundTripSession,
  deriveTier1RoundTripMappingProposals,
  formatRoundTripMinute,
  jumpTier1RoundTripClockToTaskStart,
  mergeTier1RoundTripMappingSelections,
  parseProjectIsoMinute,
  recordTier1RoundTripProgress,
  resetTier1RoundTripSession,
  updateTier1RoundTripMappingSelection,
  type Tier1RoundTripSession
} from "./tier1RoundTripTrial";

const SOURCE_XML = "<?xml version=\"1.0\"?><Project xmlns=\"http://schemas.microsoft.com/project\"><Name>Test imported schedule</Name><Tasks /></Project>";

describe("Tier 1 imported Project round-trip session", () => {
  it("retains the exact source and adapts identity, hierarchy, planned facts, and Critical context", () => {
    const session = createSession();

    expect(session.source.xml).toBe(SOURCE_XML);
    expect(session.source.fileName).toBe("test-source.xml");
    expect(session.source.hash).toBe("source-sha256");
    expect(session.initialTimeSource).toBe("Project StatusDate");
    expect(formatRoundTripMinute(session.trialState.now)).toBe("2026-01-05T06:00:00");
    expect(session.trialState.users).toEqual([{
      id: TIER1_ROUNDTRIP_ACTOR_ID,
      name: "Tier 1 round-trip reviewer",
      tier: "Tier 1"
    }]);
    const summary = session.trialState.tasks[0];
    const leaf = session.trialState.tasks[1];
    expect(summary).toMatchObject({ id: "project-task-uid:10", parentId: null, summary: true, depth: 0 });
    expect(leaf).toMatchObject({
      id: "project-task-uid:11",
      parentId: "project-task-uid:10",
      wbs: "1.1",
      summary: false,
      depth: 1,
      importedProgress: 0,
      projectCritical: true
    });
    expect(session.sourceTasks[1]).toMatchObject({
      projectTaskUid: "11",
      projectTaskId: "2",
      critical: true,
      sourceValues: {
        start: "2026-01-05T07:00:00",
        finish: "2026-01-05T12:00:00",
        percentComplete: 0,
        physicalPercentComplete: 15
      }
    });
  });

  it("retains losslessly decoded source bytes, including a UTF-8 BOM", () => {
    const xml = `\uFEFF${SOURCE_XML}`;
    const bytes = new TextEncoder().encode(xml);
    const session = createTier1RoundTripSession({
      fileName: "bom-source.xml",
      sourceXml: xml,
      sourceBytes: bytes,
      preview: preview()
    });
    expect(session.source.xml).toBe(xml);
    expect([...session.source.bytes]).toEqual([...bytes]);
    expect([...resetTier1RoundTripSession(session).source.bytes]).toEqual([...bytes]);
    expect(() => createTier1RoundTripSession({
      fileName: "mismatch.xml",
      sourceXml: SOURCE_XML,
      sourceBytes: new TextEncoder().encode(`${SOURCE_XML} `),
      preview: preview()
    })).toThrow("do not match the inspected XML text");
  });

  it("uses StatusDate, then earliest planned start, then the explicit fixed fallback", () => {
    expect(createSession().initialTimeSource).toBe("Project StatusDate");

    const earliest = createTier1RoundTripSession({
      fileName: "earliest.xml",
      sourceXml: SOURCE_XML,
      preview: preview({ statusDate: null })
    });
    expect(earliest.initialTimeSource).toBe("Earliest task planned start");
    expect(formatRoundTripMinute(earliest.trialState.now)).toBe("2026-01-05T06:00:00");

    expect(formatRoundTripMinute(parseProjectIsoMinute(ROUNDTRIP_FALLBACK_INITIAL_TIME, "fallback")))
      .toBe("2026-01-01T06:00:00");
    const fallback = chooseTier1RoundTripInitialClock(preview({
      statusDate: null,
      tasks: [task({ start: null, finish: null })]
    }));
    expect(fallback.source).toBe("Fixed fallback");
    expect(formatRoundTripMinute(fallback.minute)).toBe("2026-01-01T06:00:00");

    const fallbackSession = createTier1RoundTripSession({
      fileName: "unscheduled.xml",
      sourceXml: SOURCE_XML,
      preview: preview({ statusDate: null, tasks: [task({ start: null, finish: null })] })
    });
    expect(fallbackSession.initialTimeSource).toBe("Fixed fallback");
    expect(fallbackSession.trialState.tasks[0]).toMatchObject({ plannedStart: null, plannedFinish: null });
    expect(() => jumpTier1RoundTripClockToTaskStart(fallbackSession, "project-task-uid:1"))
      .toThrow("has no imported planned Start");
  });

  it("keeps imported Actual Start, Actual Finish, and PercentComplete as execution evidence", () => {
    const imported = preview({
      tasks: [
        task({ uid: "21", id: "1", name: "Imported start", actualStart: "2026-01-05T07:00:00" }),
        task({ uid: "22", id: "2", name: "Imported finish", actualFinish: "2026-01-05T08:00:00" }),
        task({ uid: "23", id: "3", name: "Imported progress", percentComplete: 35 })
      ]
    });
    const session = createTier1RoundTripSession({ fileName: "evidence.xml", sourceXml: SOURCE_XML, preview: imported });

    expect(selectExecutionState(session.trialState, "project-task-uid:21")).toBe("In Progress");
    expect(selectExecutionState(session.trialState, "project-task-uid:22")).toBe("Completed");
    expect(selectExecutionState(session.trialState, "project-task-uid:23")).toBe("In Progress");
  });

  it("moves only through the explicit round-trip clock and planned passage never establishes In Progress", () => {
    let session = createSession();
    const leafId = "project-task-uid:11";
    expect(selectExecutionState(session.trialState, leafId)).toBe("Not Started");

    session = advanceTier1RoundTripClock(session, 60);
    expect(formatRoundTripMinute(session.trialState.now)).toBe("2026-01-05T07:00:00");
    expect(selectExecutionState(session.trialState, leafId)).toBe("Not Started");

    session = advanceTier1RoundTripClock(session, 15);
    expect(selectExecutionState(session.trialState, leafId)).toBe("Not Started");
    expect(() => jumpTier1RoundTripClockToTaskStart(session, leafId)).toThrow("only forward");
  });

  it("lets the browser-local Tier 1 identity execute any imported leaf without an assignment", () => {
    let session = createSession();
    const taskId = "project-task-uid:11";
    session = jumpTier1RoundTripClockToTaskStart(session, taskId);
    session = applyTier1RoundTripExecutionAction(session, {
      type: "cant-start",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      reason: "Access unavailable",
      whatIsNeeded: "Release the access point",
      createProblem: true,
      createAction: true
    });
    expect(selectExecutionState(session.trialState, taskId)).toBe("Not Started");

    session = advanceTier1RoundTripClock(session, 15);
    session = applyTier1RoundTripExecutionAction(session, {
      type: "start",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      lateCause: "Access was released after planned start",
      actionStillNeeded: "None"
    });
    expect(selectExecutionState(session.trialState, taskId)).toBe("In Progress");

    session = applyTier1RoundTripExecutionAction(session, {
      type: "pause",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      reason: "Planned break",
      adverseDelay: false,
      whatIsNeeded: "Return after the break",
      createAction: false
    });
    expect(selectExecutionState(session.trialState, taskId)).toBe("Paused");

    session = applyTier1RoundTripExecutionAction(session, {
      type: "resume",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      issueResolution: "not-applicable"
    });
    expect(selectExecutionState(session.trialState, taskId)).toBe("In Progress");

    session = applyTier1RoundTripExecutionAction(session, {
      type: "finish",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });
    expect(selectExecutionState(session.trialState, taskId)).toBe("Completed");
    expect(session.trialState.executionEvents.map((event) => event.type))
      .toEqual(["cant-start", "start", "pause", "resume", "finish"]);
  });

  it("keeps an imported adverse-pause problem open when Tier 1 resumes without resolving it", () => {
    const taskId = "project-task-uid:11";
    let session = jumpTier1RoundTripClockToTaskStart(createSession(), taskId);
    session = applyTier1RoundTripExecutionAction(session, {
      type: "start",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });
    session = applyTier1RoundTripExecutionAction(session, {
      type: "pause",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      reason: "Material constraint",
      adverseDelay: true,
      whatIsNeeded: "Deliver replacement material",
      createAction: true
    });
    const problemId = session.trialState.pauseIntervals.at(-1)?.problemId;
    expect(problemId).toBeTruthy();
    expect(session.trialState.problems.find((problem) => problem.id === problemId)?.status).toBe("open");
    expect(session.trialState.actions.some((action) => action.taskId === taskId && action.status === "open")).toBe(true);

    session = applyTier1RoundTripExecutionAction(session, {
      type: "resume",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      issueResolution: "remains-open"
    });
    expect(selectExecutionState(session.trialState, taskId)).toBe("In Progress");
    expect(session.trialState.problems.find((problem) => problem.id === problemId)?.status).toBe("open");
  });

  it("lets Tier 1 resolve linked problems and complete linked actions locally", () => {
    const taskId = "project-task-uid:11";
    let session = applyTier1RoundTripExecutionAction(createSession(), {
      type: "cant-start",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      reason: "Access unavailable",
      whatIsNeeded: "Release access",
      createProblem: true,
      createAction: true
    });
    const problemId = session.trialState.problems[0].id;
    const actionId = session.trialState.actions[0].id;
    session = applyTier1RoundTripRecordAction(session, {
      type: "resolve-problem",
      problemId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });
    session = applyTier1RoundTripRecordAction(session, {
      type: "complete-action",
      actionId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });
    expect(session.trialState.problems[0].status).toBe("resolved");
    expect(session.trialState.actions[0].status).toBe("completed");
    expect(() => applyTier1RoundTripRecordAction(session, {
      type: "complete-action",
      actionId,
      actorId: "tier2-not-allowed"
    })).toThrow("browser-local Tier 1 trial identity");
  });

  it("rejects summary execution and any non-Tier-1 trial actor", () => {
    const session = createSession();
    expect(() => applyTier1RoundTripExecutionAction(session, {
      type: "start",
      taskId: "project-task-uid:10",
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    })).toThrow("executable leaf tasks");
    expect(() => applyTier1RoundTripExecutionAction(session, {
      type: "start",
      taskId: "project-task-uid:11",
      actorId: "tier2-not-allowed"
    })).toThrow("browser-local Tier 1 trial identity");
  });

  it("records validated Tier 1 progress without silently establishing Start", () => {
    const taskId = "project-task-uid:11";
    let session = createSession();
    session = recordTier1RoundTripProgress(session, {
      taskId,
      completionPercent: 45,
      remainingWork: "Complete the remaining inspection",
      nextIssue: "None",
      note: "Local trial observation"
    });

    expect(selectExecutionState(session.trialState, taskId)).toBe("Not Started");
    expect(selectTaskProgress(session.trialState, taskId)).toBe(45);
    expect(session.trialState.progressObservations[0]).toMatchObject({
      actorId: TIER1_ROUNDTRIP_ACTOR_ID,
      completionPercent: 45,
      remainingWork: "Complete the remaining inspection",
      nextShiftIssue: "None"
    });
    expect(session.history.at(-1)).toMatchObject({ type: "progress-observation", taskId });
    expect(() => recordTier1RoundTripProgress(session, {
      taskId,
      completionPercent: 101,
      remainingWork: "Invalid",
      nextIssue: "None"
    })).toThrow("between 0 and 100");
    expect(() => recordTier1RoundTripProgress(session, {
      taskId,
      completionPercent: 50,
      remainingWork: " ",
      nextIssue: "None"
    })).toThrow("What remains is required");
    expect(() => recordTier1RoundTripProgress(session, {
      taskId,
      completionPercent: 50,
      remainingWork: "Continue",
      nextIssue: " "
    })).toThrow("Next issue is required");
  });

  it("rejects contradictory unfinished-progress observations after completion", () => {
    const taskId = "project-task-uid:11";
    let session = jumpTier1RoundTripClockToTaskStart(createSession(), taskId);
    session = applyTier1RoundTripExecutionAction(session, {
      type: "start",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });
    session = applyTier1RoundTripExecutionAction(session, {
      type: "finish",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });

    expect(() => recordTier1RoundTripProgress(session, {
      taskId,
      completionPercent: 40,
      remainingWork: "Contradictory remaining work",
      nextIssue: "None"
    })).toThrow("Completed tasks cannot receive an unfinished-progress observation");
  });

  it("derives unresolved experimental mappings excluded by default and preserves explicit reviewer choices", () => {
    const taskId = "project-task-uid:11";
    let session = jumpTier1RoundTripClockToTaskStart(createSession(), taskId);
    session = applyTier1RoundTripExecutionAction(session, {
      type: "start",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });
    session = recordTier1RoundTripProgress(session, {
      taskId,
      completionPercent: 45,
      remainingWork: "Complete inspection",
      nextIssue: "None"
    });
    session = applyTier1RoundTripExecutionAction(session, {
      type: "finish",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });

    const proposals = deriveTier1RoundTripMappingProposals(session);
    const start = proposals.find((mapping) => mapping.trackerFact === "start");
    const finish = proposals.find((mapping) => mapping.trackerFact === "finish");
    const progress = proposals.find((mapping) => mapping.trackerFact === "progress");
    expect(start).toMatchObject({
      projectTaskUid: "11",
      projectField: "ActualStart",
      sourceValue: null,
      included: false
    });
    expect(finish).toMatchObject({
      projectTaskUid: "11",
      projectField: "ActualFinish",
      sourceValue: null,
      included: false
    });
    expect(progress).toMatchObject({
      projectTaskUid: "11",
      projectField: null,
      sourceValue: null,
      proposedValue: 45,
      included: false
    });

    let selected = updateTier1RoundTripMappingSelection(
      session,
      proposals,
      progress!.id,
      { projectField: "PercentComplete", included: true }
    );
    expect(selected.find((mapping) => mapping.id === progress!.id)).toMatchObject({
      projectField: "PercentComplete",
      sourceValue: 0,
      included: false
    });
    selected = updateTier1RoundTripMappingSelection(
      session,
      selected,
      progress!.id,
      { projectField: "PhysicalPercentComplete", included: true }
    );
    expect(selected.find((mapping) => mapping.id === progress!.id)).toMatchObject({
      projectField: "PhysicalPercentComplete",
      sourceValue: 15,
      included: false
    });
    selected = updateTier1RoundTripMappingSelection(
      session,
      selected,
      progress!.id,
      { included: true }
    );
    expect(mergeTier1RoundTripMappingSelections(proposals, selected)
      .find((mapping) => mapping.id === progress!.id)).toMatchObject({
        projectField: "PhysicalPercentComplete",
        sourceValue: 15,
        included: true
      });
    expect(() => updateTier1RoundTripMappingSelection(session, proposals, "missing", { included: true }))
      .toThrow("Unknown experimental mapping");
  });

  it("resets repeatably without changing the imported source", () => {
    const taskId = "project-task-uid:11";
    let session = createSession();
    session = jumpTier1RoundTripClockToTaskStart(session, taskId);
    session = applyTier1RoundTripExecutionAction(session, {
      type: "start",
      taskId,
      actorId: TIER1_ROUNDTRIP_ACTOR_ID
    });
    session = recordTier1RoundTripProgress(session, {
      taskId,
      completionPercent: 20,
      remainingWork: "Continue",
      nextIssue: "None"
    });
    session = {
      ...session,
      mappings: [{
        id: "mapping-1",
        trackerFactId: "event-1",
        trialTaskId: taskId,
        projectTaskUid: "11",
        trackerFact: "start",
        projectField: "ActualStart",
        sourceValue: null,
        proposedValue: "2026-01-05T07:00:00",
        included: true
      }],
      candidate: { xml: "candidate", sourceHash: "source", candidateHash: "candidate" },
      result: { fileName: "result.xml", xml: "result", hash: "result" },
      disposition: { value: "Works as expected", notes: "Trial only" }
    };

    const reset = resetTier1RoundTripSession(session);
    expect(reset.source.xml).toBe(SOURCE_XML);
    expect(reset.source.hash).toBe("source-sha256");
    expect(reset.trialState).toEqual(reset.initialTrialState);
    expect(reset.trialState.executionEvents).toEqual([]);
    expect(reset.trialState.progressObservations).toEqual([]);
    expect(reset.mappings).toEqual([]);
    expect(reset.candidate).toBeNull();
    expect(reset.result).toBeNull();
    expect(reset.disposition).toBeNull();
    expect(reset.history).toHaveLength(1);
    expect(resetTier1RoundTripSession(reset)).toEqual(reset);
  });

  it("fails safely for missing or duplicate Project task identity and invalid source facts", () => {
    expect(() => createTier1RoundTripSession({
      fileName: "missing-uid.xml",
      sourceXml: SOURCE_XML,
      preview: preview({ tasks: [task({ uid: null })] })
    })).toThrow("no Project task UID");
    expect(() => createTier1RoundTripSession({
      fileName: "duplicate-uid.xml",
      sourceXml: SOURCE_XML,
      preview: preview({ tasks: [task({ uid: "1" }), task({ uid: "1", id: "2" })] })
    })).toThrow("occurs more than once");
    expect(() => createTier1RoundTripSession({
      fileName: "contradictory-dates.xml",
      sourceXml: SOURCE_XML,
      preview: preview({ tasks: [task({ start: "2026-01-05T12:00:00", finish: "2026-01-05T06:00:00" })] })
    })).toThrow("planned Finish precedes planned Start");
    expect(() => parseProjectIsoMinute("2026-02-30T06:00:00", "Invalid date"))
      .toThrow("not a valid Microsoft Project date-time");
    expect(() => parseProjectIsoMinute("2026-01-01T06:00:01", "Seconds"))
      .toThrow("whole minute");
  });

  it("builds deeper imported hierarchy and rejects gaps or non-summary parents", () => {
    const deep = createTier1RoundTripSession({
      fileName: "deep.xml",
      sourceXml: SOURCE_XML,
      preview: preview({
        tasks: [
          task({ uid: "30", id: "1", name: "Top summary", outlineLevel: 1, summary: true }),
          task({ uid: "31", id: "2", name: "Nested summary", outlineLevel: 2, summary: true }),
          task({ uid: "32", id: "3", name: "Nested leaf", outlineLevel: 3, summary: false }),
          task({ uid: "33", id: "4", name: "Sibling leaf", outlineLevel: 2, summary: false })
        ]
      })
    });
    expect(deep.trialState.tasks.map((item) => [item.id, item.parentId, item.depth])).toEqual([
      ["project-task-uid:30", null, 0],
      ["project-task-uid:31", "project-task-uid:30", 1],
      ["project-task-uid:32", "project-task-uid:31", 2],
      ["project-task-uid:33", "project-task-uid:30", 1]
    ]);

    expect(() => createTier1RoundTripSession({
      fileName: "gap.xml",
      sourceXml: SOURCE_XML,
      preview: preview({ tasks: [
        task({ uid: "40", outlineLevel: 1, summary: true }),
        task({ uid: "41", id: "2", outlineLevel: 3, summary: false })
      ] })
    })).toThrow("has no imported parent");

    expect(() => createTier1RoundTripSession({
      fileName: "non-summary-parent.xml",
      sourceXml: SOURCE_XML,
      preview: preview({ tasks: [
        task({ uid: "50", outlineLevel: 1, summary: false }),
        task({ uid: "51", id: "2", outlineLevel: 2, summary: false })
      ] })
    })).toThrow("has a non-summary imported parent");
  });
});

function createSession(): Tier1RoundTripSession {
  return createTier1RoundTripSession({
    fileName: "test-source.xml",
    sourceXml: SOURCE_XML,
    sourceHash: "source-sha256",
    preview: preview()
  });
}

function preview(overrides: Partial<ProjectXmlPreview> = {}): ProjectXmlPreview {
  return {
    projectName: "Test imported schedule",
    projectUid: "11111111-1111-1111-1111-111111111111",
    statusDate: "2026-01-05T06:00:00",
    taskCount: 2,
    summaryTaskCount: 1,
    leafTaskCount: 1,
    tasks: [
      task({ uid: "10", id: "1", name: "Summary", wbs: "1", outlineNumber: "1", outlineLevel: 1, summary: true, start: "2026-01-05T06:00:00", finish: "2026-01-05T17:00:00" }),
      task({ uid: "11", id: "2", name: "Executable leaf", wbs: "1.1", outlineNumber: "1.1", outlineLevel: 2, summary: false, start: "2026-01-05T07:00:00", finish: "2026-01-05T12:00:00", critical: true, physicalPercentComplete: 15 })
    ],
    ...overrides
  };
}

function task(overrides: Partial<ProjectXmlTaskPreview & { critical: boolean }> = {}): ProjectXmlTaskPreview & { critical: boolean } {
  return {
    uid: "1",
    id: "1",
    name: "Imported leaf",
    wbs: "1",
    outlineNumber: "1",
    outlineLevel: 1,
    summary: false,
    start: "2026-01-05T06:00:00",
    finish: "2026-01-05T12:00:00",
    duration: "PT6H0M0S",
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    physicalPercentComplete: null,
    critical: false,
    ...overrides
  };
}
