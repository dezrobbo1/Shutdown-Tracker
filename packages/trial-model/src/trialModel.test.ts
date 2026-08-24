import { describe, expect, it } from "vitest";
import {
  applyTrialAction,
  createInitialTrialState,
  isTrialBridgeMessage,
  TRIAL_SYSTEM_ACTOR_ID,
  selectCriticalObligationProjections,
  selectExecutionState,
  selectShiftProgressNeedsForUser,
  selectTaskHistory,
  selectTaskProjection,
  selectTasksForUser,
  selectTodayProjection
} from "./index";

describe("deterministic operational trial model", () => {
  it("accepts only the versioned trial bridge envelope", () => {
    expect(isTrialBridgeMessage({ channel: "shutdown-tracker-deterministic-trial-v1", kind: "mobile-ready", sessionId: "session-test", requestId: "ready-1" })).toBe(true);
    expect(isTrialBridgeMessage({ channel: "another-channel", kind: "mobile-ready", sessionId: "session-test", requestId: "ready-1" })).toBe(false);
  });

  it("replays the exact initial state after reset", () => {
    const initial = createInitialTrialState();
    const changed = applyTrialAction(
      applyTrialAction(initial, { type: "advance-minutes", minutes: 60 }),
      {
        type: "cant-start",
        taskId: "task-scaffold-access",
        actorId: "tier3-riley",
        reason: "Access not released",
        whatIsNeeded: "Release the scaffold tag",
        createProblem: true,
        createAction: true
      }
    );

    expect(applyTrialAction(changed, { type: "reset" })).toEqual(createInitialTrialState());
  });

  it("starts from a compact scenario with unique record identifiers", () => {
    const state = createInitialTrialState();
    const collections = [
      state.users,
      state.tasks,
      state.trackingAssignments,
      state.fieldAssignments,
      state.executionEvents,
      state.pauseIntervals,
      state.progressObservations,
      state.problems,
      state.actions,
      state.criticalTemplates,
      state.criticalItems,
      state.criticalPolicies,
      state.criticalObligations,
      state.criticalReports,
      state.shiftProgressNeeds,
      state.history
    ];

    for (const collection of collections) {
      const ids = collection.map((record) => record.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(state.tasks.filter((task) => task.summary && task.id !== "shutdown")).toHaveLength(4);
    expect(state.tasks.filter((task) => !task.summary)).toHaveLength(16);
  });

  it("keeps summary progress as imported Project context and reports descendant execution without inventing a percentage", () => {
    const state = createInitialTrialState();
    const summary = selectTaskProjection(state, "wp-cyclone");
    const criticalWorkPack = selectCriticalObligationProjections(state).find((projection) => projection.item.id === "critical-cyclone-pack")!;

    expect(summary.progressPercent).toBe(summary.task.importedProgress);
    expect(summary.progressPercent).toBe(0);
    expect(summary.progressBasis).toMatch(/Imported Microsoft Project summary progress/i);
    expect(summary.progressBasis).toMatch(/does not calculate/i);
    expect(criticalWorkPack.prepopulatedFacts.progress).toContain("Known Tracker descendant execution");
    expect(criticalWorkPack.prepopulatedFacts.progress).toContain("no work-pack percentage calculated");
    expect(criticalWorkPack.prepopulatedFacts.progress).toContain("1 completed · 1 in progress · 0 paused · 2 not started");
  });

  it("does not infer In Progress from planned time passage", () => {
    const state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 375 });

    expect(selectExecutionState(state, "task-scaffold-access")).toBe("Not Started");
    expect(selectTaskProjection(state, "task-scaffold-access").attention).toContain("Late to Start");
  });

  it("keeps Can't Start distinct from execution start", () => {
    const state = applyTrialAction(createInitialTrialState(), {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Scaffold access unavailable",
      whatIsNeeded: "Access team to release the scaffold",
      createProblem: true,
      createAction: true
    });

    expect(selectExecutionState(state, "task-scaffold-access")).toBe("Not Started");
    expect(selectTaskProjection(state, "task-scaffold-access").activeProblems).toHaveLength(1);
    expect(state.executionEvents.at(-1)).toMatchObject({ type: "cant-start", at: 360 });
  });

  it("enforces task-update authority in the shared reducer instead of relying on hidden Mobile controls", () => {
    const initial = createInitialTrialState();
    const reportingOnlyAttempt = {
      type: "cant-start" as const,
      taskId: "task-scaffold-access",
      actorId: "tier2-avery",
      reason: "Attempted reporting-only update",
      whatIsNeeded: "No task authority should be granted",
      createProblem: false,
      createAction: false
    };

    expect(() => applyTrialAction(initial, reportingOnlyAttempt)).toThrow(/does not have task-update authority/i);
    expect(() => applyTrialAction(initial, { ...reportingOnlyAttempt, actorId: "unknown-user" })).toThrow(/Unknown trial user/i);
    expect(() => applyTrialAction(initial, { ...reportingOnlyAttempt, actorId: "tier1-dana" })).not.toThrow();
    expect(() => applyTrialAction(initial, { ...reportingOnlyAttempt, actorId: "tier3-riley" })).not.toThrow();
  });

  it("prevents reporting-only users from mutating task-owned problems or actions", () => {
    const initial = createInitialTrialState();

    expect(() => applyTrialAction(initial, {
      type: "resolve-problem",
      problemId: "problem-material",
      actorId: "tier2-avery"
    })).toThrow(/does not have task-update authority/i);
    expect(() => applyTrialAction(initial, {
      type: "complete-action",
      actionId: "action-material",
      actorId: "tier2-avery"
    })).toThrow(/does not have task-update authority/i);
  });

  it("keeps Can't Start visible as blocked-before-start without requiring a linked problem", () => {
    const initial = createInitialTrialState();
    const blockedBefore = selectTodayProjection(initial).blocked;
    const blocked = applyTrialAction(initial, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Scaffold access unavailable",
      whatIsNeeded: "Access team to release the scaffold",
      createProblem: false,
      createAction: false
    });

    expect(selectTaskProjection(blocked, "task-scaffold-access").attention).toContain("Delayed / blocked before start");
    expect(selectTodayProjection(blocked).blocked).toBe(blockedBefore + 1);

    const started = applyTrialAction(applyTrialAction(blocked, { type: "advance-to", minute: 420 }), {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Scaffold access was released late",
      actionStillNeeded: "None"
    });
    expect(selectTaskProjection(started, "task-scaffold-access").attention).not.toContain("Delayed / blocked before start");
  });

  it("keeps a Can't Start Critical obligation actionable until actual facts cover every required field", () => {
    const configure = (state: ReturnType<typeof createInitialTrialState>) => applyTrialAction(state, {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-exception",
        mechanisms: ["event"],
        fixedTimes: [],
        triggers: ["cant-start"],
        requiredFields: ["progress", "condition", "constraint", "recovery"]
      }
    });
    const recordCantStart = (state: ReturnType<typeof createInitialTrialState>, createLinkedRecords: boolean) => applyTrialAction(state, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Scaffold access unavailable",
      whatIsNeeded: "Access team to release the scaffold",
      createProblem: createLinkedRecords,
      createAction: createLinkedRecords
    });

    const withoutLinkedRecords = recordCantStart(configure(createInitialTrialState()), false);
    const eventId = withoutLinkedRecords.executionEvents.at(-1)!.id;
    const actionable = selectCriticalObligationProjections(withoutLinkedRecords)
      .find((projection) => projection.obligation.triggerEventId === eventId)!;

    expect(actionable.obligation.satisfiedByEventId).toBeUndefined();
    expect(actionable.prepopulatedFacts).toMatchObject({ progress: "0% · Not Started", condition: "Not Started" });
    expect(actionable.requiredInputFields).toEqual(["constraint", "recovery"]);
    expect(actionable.state).toBe("upcoming");

    const withLinkedRecords = recordCantStart(configure(createInitialTrialState()), true);
    const linkedEventId = withLinkedRecords.executionEvents.at(-1)!.id;
    const satisfied = selectCriticalObligationProjections(withLinkedRecords)
      .find((projection) => projection.obligation.triggerEventId === linkedEventId)!;

    expect(satisfied.obligation.satisfiedByEventId).toBe(linkedEventId);
    expect(satisfied.requiredInputFields).toEqual([]);
    expect(satisfied.prepopulatedFacts.constraint).toContain("Scaffold access unavailable");
    expect(satisfied.prepopulatedFacts.recovery).toContain("Access team to release the scaffold");
    expect(() => applyTrialAction(withLinkedRecords, {
      type: "submit-critical-report",
      obligationId: satisfied.obligation.id,
      actorId: "tier2-morgan",
      values: {}
    })).toThrow(/already satisfied/i);
  });

  it("prevents an accidental same-minute Can't Start repeat but permits a later observation", () => {
    const action = {
      type: "cant-start" as const,
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Scaffold access unavailable",
      whatIsNeeded: "Access team to release the scaffold",
      createProblem: false,
      createAction: false
    };
    const recorded = applyTrialAction(createInitialTrialState(), action);

    expect(() => applyTrialAction(recorded, action)).toThrow(/already been recorded.*current simulated time/i);
    expect(recorded.executionEvents.filter((event) => event.taskId === action.taskId && event.type === "cant-start")).toHaveLength(1);

    const later = applyTrialAction(applyTrialAction(recorded, { type: "advance-minutes", minutes: 15 }), action);
    expect(later.executionEvents.filter((event) => event.taskId === action.taskId && event.type === "cant-start")).toHaveLength(2);
    expect(later.executionEvents.at(-1)?.at).toBe(375);
  });

  it("uses a system-timestamped Start and requires late-start context", () => {
    const late = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 420 });

    expect(() => applyTrialAction(late, { type: "start", taskId: "task-scaffold-access", actorId: "tier3-riley" })).toThrow(/Late-start cause/);

    const started = applyTrialAction(late, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access release completed late",
      actionStillNeeded: "Monitor scaffold clearance"
    });
    expect(selectExecutionState(started, "task-scaffold-access")).toBe("In Progress");
    expect(started.executionEvents.at(-1)).toMatchObject({ type: "start", at: 420, lateCause: "Access release completed late" });
  });

  it("allows a non-adverse Pause without creating a structured problem", () => {
    const initial = createInitialTrialState();
    const problemsBefore = initial.problems.length;
    const paused = applyTrialAction(initial, {
      type: "pause",
      taskId: "task-dust-hood",
      actorId: "tier3-jamie",
      reason: "Planned break",
      adverseDelay: false,
      whatIsNeeded: "Crew returns after break",
      createAction: false
    });

    expect(selectExecutionState(paused, "task-dust-hood")).toBe("Paused");
    expect(paused.problems).toHaveLength(problemsBefore);
    expect(paused.pauseIntervals.at(-1)?.adverseDelay).toBe(false);
  });

  it("keeps a Pause Critical obligation actionable when no linked problem or action supplies required facts", () => {
    let state = applyTrialAction(createInitialTrialState(), {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-exception",
        mechanisms: ["event"],
        fixedTimes: [],
        triggers: ["pause"],
        requiredFields: ["progress", "condition", "constraint", "recovery"]
      }
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 420 });
    state = applyTrialAction(state, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access release completed late",
      actionStillNeeded: "None"
    });
    state = applyTrialAction(state, {
      type: "pause",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Planned break",
      adverseDelay: false,
      whatIsNeeded: "Crew returns after break",
      createAction: false
    });
    const eventId = state.executionEvents.at(-1)!.id;
    const obligation = selectCriticalObligationProjections(state)
      .find((projection) => projection.obligation.triggerEventId === eventId)!;

    expect(obligation.obligation.satisfiedByEventId).toBeUndefined();
    expect(obligation.prepopulatedFacts).toMatchObject({ progress: "0% · Paused", condition: "Paused" });
    expect(obligation.requiredInputFields).toEqual(["constraint", "recovery"]);
  });

  it("resumes execution without silently resolving a linked problem", () => {
    const resumed = applyTrialAction(createInitialTrialState(), {
      type: "resume",
      taskId: "task-expansion-joint",
      actorId: "tier3-drew",
      issueResolution: "remains-open"
    });

    expect(selectExecutionState(resumed, "task-expansion-joint")).toBe("In Progress");
    expect(resumed.problems.find((problem) => problem.id === "problem-material")?.status).toBe("open");
    expect(resumed.pauseIntervals.find((pause) => pause.id === "pause-baseline")?.endedAt).toBe(360);
  });

  it("records Finish with simulated time and establishes completion", () => {
    const resumed = applyTrialAction(createInitialTrialState(), {
      type: "resume",
      taskId: "task-expansion-joint",
      actorId: "tier3-drew",
      issueResolution: "remains-open"
    });
    const finished = applyTrialAction(resumed, { type: "finish", taskId: "task-expansion-joint", actorId: "tier3-drew" });

    expect(selectExecutionState(finished, "task-expansion-joint")).toBe("Completed");
    expect(finished.executionEvents.at(-1)).toMatchObject({ type: "finish", at: 360 });
  });

  it("projects completion as 100 after Finish while retaining an earlier field observation", () => {
    const atShift = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 1080 });
    const need = selectShiftProgressNeedsForUser(atShift, "tier3-riley").find((candidate) => candidate.taskId === "task-scaffold-access")!;
    const observed = applyTrialAction(atShift, {
      type: "end-shift-progress",
      needId: need.id,
      actorId: "tier3-riley",
      completionPercent: 45,
      remainingWork: "Complete scaffold release",
      nextShiftIssue: "Await access release"
    });
    const observationId = observed.progressObservations.at(-1)!.id;
    const started = applyTrialAction(observed, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Scaffold access was released after the planned start",
      actionStillNeeded: "None"
    });
    const finished = applyTrialAction(started, { type: "finish", taskId: "task-scaffold-access", actorId: "tier3-riley" });
    const projection = selectTaskProjection(finished, "task-scaffold-access");
    const criticalProjection = selectCriticalObligationProjections(finished).find((item) => item.item.id === "critical-scaffold")!;

    expect(projection.executionState).toBe("Completed");
    expect(projection.progressPercent).toBe(100);
    expect(projection.latestFieldProgressObservation?.completionPercent).toBe(45);
    expect(criticalProjection.prepopulatedFacts.progress).toContain("100% · Completed execution");
    expect(criticalProjection.prepopulatedFacts.progress).toContain("earlier 45% field observation remains in history");
    expect(finished.progressObservations.some((observation) => observation.id === observationId)).toBe(true);
  });

  it("creates plain-language unfinished-work needs at the shift boundary", () => {
    const atShift = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 1080 });
    const needs = selectShiftProgressNeedsForUser(atShift, "tier3-casey");

    expect(needs.some((need) => need.taskId === "task-night-handover")).toBe(true);
    const need = needs.find((candidate) => candidate.taskId === "task-night-handover");
    const updated = applyTrialAction(atShift, {
      type: "end-shift-progress",
      needId: need!.id,
      actorId: "tier3-casey",
      completionPercent: 45,
      remainingWork: "Complete liner reinstatement and inspection",
      nextShiftIssue: "Await final liner set"
    });
    expect(selectShiftProgressNeedsForUser(updated, "tier3-casey").some((candidate) => candidate.id === need!.id)).toBe(false);
    expect(updated.progressObservations.at(-1)).toMatchObject({ completionPercent: 45, shiftBoundary: 1080 });
    expect(selectTaskProjection(updated, "task-night-handover")).toMatchObject({
      executionState: "Not Started",
      progressPercent: 45,
      latestFieldProgressObservation: { completionPercent: 45, remainingWork: "Complete liner reinstatement and inspection" }
    });
  });

  it("updates Tier 2 projections when Tier 1 changes tracking responsibility", () => {
    const changed = applyTrialAction(createInitialTrialState(), {
      type: "assign-tier2",
      taskId: "task-scaffold-access",
      tier2UserId: "tier2-avery",
      actorId: "tier1-dana"
    });

    expect(selectTasksForUser(changed, "tier2-morgan").some((item) => item.task.id === "task-scaffold-access")).toBe(false);
    expect(selectTasksForUser(changed, "tier2-avery").some((item) => item.task.id === "task-scaffold-access")).toBe(true);
  });

  it("updates only eligible Tier 3 projections when Tier 2 delegates work", () => {
    const changed = applyTrialAction(createInitialTrialState(), {
      type: "assign-tier3",
      taskId: "task-scaffold-access",
      tier2UserId: "tier2-morgan",
      tier3UserId: "tier3-sam",
      relationship: "WORKING_ON"
    });

    expect(selectTasksForUser(changed, "tier3-sam").some((item) => item.task.id === "task-scaffold-access")).toBe(true);
    expect(selectTasksForUser(changed, "tier3-drew").some((item) => item.task.id === "task-scaffold-access")).toBe(false);
  });

  it("rejects an identical active Tier 3 assignment while allowing a relationship update", () => {
    const initial = createInitialTrialState();
    const noOp = {
      type: "assign-tier3" as const,
      taskId: "task-access-cover",
      tier2UserId: "tier2-morgan",
      tier3UserId: "tier3-riley",
      relationship: "WORKING_ON" as const
    };

    expect(() => applyTrialAction(initial, noOp)).toThrow(/already active/i);
    expect(initial.fieldAssignments.filter((assignment) => assignment.taskId === noOp.taskId && assignment.active)).toHaveLength(1);

    const updated = applyTrialAction(initial, { ...noOp, relationship: "FIELD_CONTROL" });
    expect(updated.fieldAssignments.filter((assignment) => assignment.taskId === noOp.taskId && assignment.active)).toEqual([
      expect.objectContaining({ tier3UserId: "tier3-riley", relationship: "FIELD_CONTROL" })
    ]);
    expect(updated.history.at(-1)?.type).toBe("assignment-tier3");
  });

  it("creates future Critical obligations without flooding activity history", () => {
    const initial = createInitialTrialState();
    const configured = applyTrialAction(initial, {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-two-hour-task",
        mechanisms: ["interval", "fixed-time"],
        intervalMinutes: 120,
        fixedTimes: [600],
        triggers: [],
        requiredFields: ["progress", "condition"]
      }
    });
    const addedHistory = configured.history.slice(initial.history.length);
    const currentPolicy = configured.criticalPolicies.find((policy) => policy.criticalItemId === "critical-scaffold" && policy.version === 2)!;

    expect(configured.criticalObligations.some((obligation) => obligation.policyVersionId === currentPolicy.id)).toBe(true);
    expect(addedHistory.map((event) => event.type)).toEqual(["critical-configured"]);

    const due = applyTrialAction(configured, { type: "advance-to", minute: 480 });
    expect(due.history.some((event) => event.type === "report-due" && event.at === 480)).toBe(true);
  });

  it("supersedes only future unreported prior-policy obligations and coalesces coincident mechanisms", () => {
    const initial = createInitialTrialState();
    const reported = applyTrialAction(initial, {
      type: "submit-critical-report",
      obligationId: "obligation-scaffold-1",
      actorId: "tier2-morgan",
      values: {
        constraint: "No active constraint",
        recovery: "No recovery required",
        "next-target": "Begin scaffold removal",
        "forecast-completion": "14:00"
      }
    });
    const configured = applyTrialAction(reported, {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-avery",
        templateId: "template-two-hour-task",
        mechanisms: ["interval", "fixed-time"],
        intervalMinutes: 120,
        fixedTimes: [600],
        triggers: [],
        requiredFields: ["progress", "condition"]
      }
    });
    const policy = configured.criticalPolicies.find((candidate) => candidate.criticalItemId === "critical-scaffold" && candidate.version === 2)!;
    const reportedPrior = configured.criticalObligations.find((obligation) => obligation.id === "obligation-scaffold-1")!;
    const supersededPrior = configured.criticalObligations.filter((obligation) => obligation.criticalItemId === "critical-scaffold" && obligation.policyVersionId === "policy-scaffold-v1" && obligation.id !== reportedPrior.id);
    const coincident = configured.criticalObligations.filter((obligation) => obligation.policyVersionId === policy.id && obligation.dueAt === 600);

    expect(reportedPrior.supersededByPolicyVersionId).toBeUndefined();
    expect(configured.criticalReports.some((report) => report.obligationId === reportedPrior.id)).toBe(true);
    expect(supersededPrior.length).toBeGreaterThan(0);
    expect(supersededPrior.every((obligation) => obligation.supersededAt === configured.now && obligation.supersededByPolicyVersionId === policy.id)).toBe(true);
    expect(selectCriticalObligationProjections(configured).filter((projection) => supersededPrior.some((obligation) => obligation.id === projection.obligation.id)).every((projection) => projection.state === "superseded")).toBe(true);
    expect(coincident).toHaveLength(1);
    expect(coincident[0]).toMatchObject({ mechanism: "interval", mechanisms: ["interval", "fixed-time"] });
    expect(() => applyTrialAction(configured, {
      type: "submit-critical-report",
      obligationId: supersededPrior[0]!.id,
      actorId: "tier2-morgan",
      values: {}
    })).toThrow(/superseded/i);

    const atTen = applyTrialAction(configured, { type: "advance-to", minute: 600 });
    const supersededIds = new Set(supersededPrior.map((obligation) => obligation.id));
    const scaffoldDueHistoryAtTen = atTen.history.filter((event) => event.type === "report-due" && event.criticalItemId === "critical-scaffold" && event.at === 600);
    expect(scaffoldDueHistoryAtTen).toHaveLength(1);
    expect(scaffoldDueHistoryAtTen[0]?.obligationId).toBe(coincident[0]?.id);
    expect(atTen.history.some((event) => event.type === "report-due" && event.obligationId !== undefined && supersededIds.has(event.obligationId))).toBe(false);
    expect(supersededPrior.every((obligation) => atTen.processedClockEvents.includes(`report-due:${obligation.id}`) || obligation.dueAt > atTen.now)).toBe(true);
  });

  it("coalesces an event trigger with a scheduled obligation at the same due minute", () => {
    let state = applyTrialAction(createInitialTrialState(), {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-two-hour-task",
        mechanisms: ["fixed-time", "event"],
        fixedTimes: [480],
        triggers: ["cant-start"],
        requiredFields: ["progress", "condition", "constraint", "recovery"]
      }
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 465 });
    state = applyTrialAction(state, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Access remains unavailable",
      whatIsNeeded: "Release scaffold access",
      createProblem: false,
      createAction: false
    });
    const policy = state.criticalPolicies.find((candidate) => candidate.criticalItemId === "critical-scaffold" && candidate.version === 2)!;
    const atEight = state.criticalObligations.filter((obligation) => obligation.policyVersionId === policy.id && obligation.dueAt === 480);

    expect(atEight).toHaveLength(1);
    expect(atEight[0]?.mechanisms).toEqual(["fixed-time", "event"]);
    expect(atEight[0]?.triggerEventId).toBe(state.executionEvents.at(-1)?.id);
    expect(selectCriticalObligationProjections(state).find((projection) => projection.obligation.id === atEight[0]?.id)?.requiredInputFields).toEqual(["constraint", "recovery"]);
  });

  it("rejects a fixed-time policy that has no reporting times", () => {
    expect(() => applyTrialAction(createInitialTrialState(), {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-two-hour-task",
        mechanisms: ["fixed-time"],
        fixedTimes: [],
        triggers: [],
        requiredFields: ["progress", "condition"]
      }
    })).toThrow(/at least one fixed reporting time/i);
  });

  it("normalizes post-midnight fixed reporting times into the active operational day", () => {
    const configured = applyTrialAction(createInitialTrialState(), {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-two-hour-task",
        mechanisms: ["fixed-time"],
        fixedTimes: [120],
        triggers: [],
        requiredFields: ["progress", "condition"]
      }
    });
    const policy = configured.criticalPolicies.find((candidate) => candidate.criticalItemId === "critical-scaffold" && candidate.version === 2)!;
    const fixedObligations = configured.criticalObligations.filter((obligation) => obligation.policyVersionId === policy.id && obligation.mechanism === "fixed-time");

    expect(fixedObligations.map((obligation) => obligation.dueAt)).toEqual([26 * 60]);
    expect(fixedObligations.some((obligation) => obligation.dueAt === 120)).toBe(false);
  });

  it("marks reported and event-satisfied due events processed without adding false due history", () => {
    let reported = applyTrialAction(createInitialTrialState(), {
      type: "submit-critical-report",
      obligationId: "obligation-scaffold-1",
      actorId: "tier2-morgan",
      values: {
        constraint: "No active constraint",
        recovery: "No recovery required",
        "next-target": "Begin scaffold removal",
        "forecast-completion": "14:00"
      }
    });
    reported = applyTrialAction(reported, { type: "advance-to", minute: 480 });
    expect(reported.processedClockEvents).toContain("report-due:obligation-scaffold-1");
    expect(reported.history.some((event) => event.type === "report-due" && event.obligationId === "obligation-scaffold-1")).toBe(false);

    let satisfied = applyTrialAction(createInitialTrialState(), {
      type: "configure-critical",
      criticalItemId: "critical-scaffold",
      actorId: "tier1-dana",
      policy: {
        ownerUserId: "tier2-morgan",
        templateId: "template-two-hour-task",
        mechanisms: ["event"],
        fixedTimes: [],
        triggers: ["start"],
        requiredFields: ["progress", "condition"]
      }
    });
    const satisfiedPolicyId = satisfied.criticalPolicies.find((policy) => policy.criticalItemId === "critical-scaffold" && policy.version === 2)!.id;
    satisfied = applyTrialAction(applyTrialAction(satisfied, { type: "advance-to", minute: 420 }), {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access released late",
      actionStillNeeded: "None"
    });
    const satisfiedObligation = satisfied.criticalObligations.find((obligation) => obligation.policyVersionId === satisfiedPolicyId && obligation.satisfiedByEventId && obligation.triggerEventId === satisfied.executionEvents.at(-1)?.id)!;
    satisfied = applyTrialAction(satisfied, { type: "advance-to", minute: satisfiedObligation.dueAt });
    expect(satisfied.processedClockEvents).toContain(`report-due:${satisfiedObligation.id}`);
    expect(satisfied.history.some((event) => event.type === "report-due" && event.obligationId === satisfiedObligation.id)).toBe(false);
  });

  it("attributes clock-generated requests and obligations to the simulation system", () => {
    let state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 420 });
    state = applyTrialAction(state, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access released late",
      actionStillNeeded: "None"
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 1080 });
    const generatedTypes = new Set(["report-obligation", "report-due", "end-shift-progress-due"]);
    const generatedHistory = state.history.filter((event) => !event.baseline && generatedTypes.has(event.type));

    expect(generatedHistory.length).toBeGreaterThan(0);
    expect(generatedHistory.every((event) => event.actorId === TRIAL_SYSTEM_ACTOR_ID)).toBe(true);
    expect(state.users.some((user) => user.id === TRIAL_SYSTEM_ACTOR_ID)).toBe(false);
  });

  it("derives interval, fixed-time, shift and event reporting obligations", () => {
    const initial = createInitialTrialState();
    const scheduled = selectCriticalObligationProjections(initial);
    expect(scheduled.some((item) => item.obligation.mechanism === "interval" && item.obligation.dueAt === 480)).toBe(true);
    expect(scheduled.some((item) => item.obligation.mechanism === "fixed-time" && item.obligation.dueAt === 600)).toBe(true);
    expect(scheduled.some((item) => item.obligation.mechanism === "shift" && item.obligation.dueAt === 1080)).toBe(true);

    const started = applyTrialAction(applyTrialAction(initial, { type: "advance-to", minute: 420 }), {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Late access release",
      actionStillNeeded: "None"
    });
    expect(selectCriticalObligationProjections(started).some((item) => item.obligation.mechanism === "event" && item.obligation.triggerEventId?.startsWith("event-"))).toBe(true);
  });

  it("keeps submitted reports immutable and corrects by supersession", () => {
    const due = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 480 });
    const obligation = selectCriticalObligationProjections(due).find((item) => item.obligation.id === "obligation-scaffold-1")!;
    const submitted = applyTrialAction(due, {
      type: "submit-critical-report",
      obligationId: obligation.obligation.id,
      actorId: "tier2-morgan",
      values: {
        constraint: "Access release under observation",
        recovery: "Access team monitoring",
        "next-target": "Begin scaffold removal",
        "forecast-completion": "14:00"
      }
    });
    const original = submitted.criticalReports.at(-1)!;
    const corrected = applyTrialAction(submitted, {
      type: "correct-critical-report",
      reportId: original.id,
      actorId: "tier2-morgan",
      values: { "forecast-completion": "14:30" }
    });

    expect(corrected.criticalReports.find((report) => report.id === original.id)).toEqual(original);
    expect(corrected.criticalReports.at(-1)).toMatchObject({ supersedesReportId: original.id, values: { "forecast-completion": "14:30" } });
    const correctedProjection = selectCriticalObligationProjections(corrected).find((item) => item.obligation.id === obligation.obligation.id);
    expect(correctedProjection?.state).toBe("submitted");
    expect(correctedProjection?.reportHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ report: expect.objectContaining({ id: original.id }), state: "superseded" }),
      expect.objectContaining({ report: expect.objectContaining({ supersedesReportId: original.id }), state: "submitted" })
    ]));
  });

  it("derives Today and Task Dashboard history from the shared history", () => {
    const state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 405 });
    const today = selectTodayProjection(state);
    const history = selectTaskHistory(state, "task-permit-release");

    expect(today.counts["In Progress"]).toBeGreaterThan(0);
    expect(today.counts.Paused).toBeGreaterThan(0);
    expect(today.lateStarts).toBeGreaterThan(0);
    expect(today.activeProblems).toBeGreaterThan(0);
    expect(today.recentActivity.length).toBeLessThanOrEqual(6);
    expect(history.map((item) => item.type)).toEqual(expect.arrayContaining(["cant-start", "problem-created"]));
  });

  it("keeps system history visible without treating it as a task operational update", () => {
    let state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 420 });
    state = applyTrialAction(state, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access release completed late",
      actionStillNeeded: "None"
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 500 });
    const projection = selectTaskProjection(state, "task-scaffold-access");
    const history = selectTaskHistory(state, "task-scaffold-access");

    expect(history.some((event) => event.type === "report-due" && event.actorId === TRIAL_SYSTEM_ACTOR_ID && event.at === 480)).toBe(true);
    expect(projection.lastActivityAt).toBe(420);
    expect(projection.attention).toContain("No recent update");
  });

  it("replays the documented guided execution and reporting path end to end", () => {
    let state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 380 });
    state = applyTrialAction(state, {
      type: "cant-start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Access or scaffold unavailable",
      whatIsNeeded: "Release the scaffold tag",
      createProblem: true,
      createAction: true
    });
    const accessProblemId = state.problems.find((problem) => problem.taskId === "task-scaffold-access" && problem.status === "open")!.id;
    state = applyTrialAction(state, { type: "advance-to", minute: 420 });
    state = applyTrialAction(state, { type: "resolve-problem", problemId: accessProblemId, actorId: "tier3-riley" });
    state = applyTrialAction(state, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Scaffold release completed after the planned start",
      actionStillNeeded: "Monitor access controls"
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 480 });
    state = applyTrialAction(state, {
      type: "submit-critical-report",
      obligationId: "obligation-scaffold-1",
      actorId: "tier2-morgan",
      values: { constraint: "Access released; no active constraint", "next-target": "Begin scaffold removal", "forecast-completion": "14:00" }
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 555 });
    state = applyTrialAction(state, {
      type: "pause",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      reason: "Material unavailable",
      adverseDelay: true,
      whatIsNeeded: "Deliver the verified replacement material",
      createAction: true
    });
    const materialProblemId = state.problems.find((problem) => problem.taskId === "task-scaffold-access" && problem.status === "open")!.id;
    state = applyTrialAction(state, { type: "advance-to", minute: 630 });
    state = applyTrialAction(state, {
      type: "resume",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      issueResolution: "remains-open"
    });
    state = applyTrialAction(state, { type: "advance-to", minute: 720 });
    state = applyTrialAction(state, { type: "resolve-problem", problemId: materialProblemId, actorId: "tier3-riley" });
    state = applyTrialAction(state, { type: "advance-to", minute: 840 });
    state = applyTrialAction(state, { type: "finish", taskId: "task-scaffold-access", actorId: "tier3-riley" });
    state = applyTrialAction(state, { type: "advance-to", minute: 1080 });
    const shiftNeed = selectShiftProgressNeedsForUser(state, "tier3-casey").find((need) => need.taskId === "task-night-handover")!;
    state = applyTrialAction(state, {
      type: "end-shift-progress",
      needId: shiftNeed.id,
      actorId: "tier3-casey",
      completionPercent: 45,
      remainingWork: "Complete liner reinstatement and inspection",
      nextShiftIssue: "Await final liner set"
    });

    expect(selectExecutionState(state, "task-scaffold-access")).toBe("Completed");
    expect(state.criticalReports.some((report) => report.obligationId === "obligation-scaffold-1")).toBe(true);
    expect(state.problems.find((problem) => problem.id === materialProblemId)?.status).toBe("resolved");
    expect(selectShiftProgressNeedsForUser(state, "tier3-casey").some((need) => need.id === shiftNeed.id)).toBe(false);
    expect(applyTrialAction(state, { type: "reset" })).toEqual(createInitialTrialState());
  });

  it("removes every generated event and report on reset", () => {
    let state = applyTrialAction(createInitialTrialState(), { type: "advance-to", minute: 420 });
    state = applyTrialAction(state, {
      type: "start",
      taskId: "task-scaffold-access",
      actorId: "tier3-riley",
      lateCause: "Access release completed late",
      actionStillNeeded: "None"
    });
    const reset = applyTrialAction(state, { type: "reset" });

    expect(reset.executionEvents.every((event) => event.baseline)).toBe(true);
    expect(reset.history.every((event) => event.baseline)).toBe(true);
    expect(reset.criticalReports).toEqual(createInitialTrialState().criticalReports);
    expect(reset.nextSequence).toBe(1000);
  });
});
