import type {
  CriticalItem,
  CriticalObligation,
  CriticalPolicyVersion,
  CriticalReport,
  CriticalTemplate,
  ExecutionEvent,
  FieldAssignment,
  GuidedTrialStep,
  TrackingAssignment,
  TrialHistoryEvent,
  TrialProblem,
  TrialState,
  TrialTask,
  TrialUser
} from "./types";

export const TRIAL_START_MINUTE = 6 * 60;
export const TRIAL_DAY_END_MINUTE = 30 * 60;
export const TRIAL_SCENARIO_VERSION = "shutdown-trial-v1";

export const REPORTING_FIELD_LABELS = {
  progress: "Completion / progress",
  condition: "Operational condition",
  focus: "Current position / focus",
  constraint: "Main delay / constraint",
  recovery: "Action / recovery",
  "next-target": "Next target",
  "forecast-completion": "Forecast completion",
  resources: "Resources / labour where configured",
  evidence: "Evidence / photo requirement",
  "update-text": "Comment / update text"
} as const;

export const REPORTING_MECHANISM_LABELS = {
  none: "No routine reporting",
  requested: "Ad hoc / requested",
  interval: "Fixed interval",
  "fixed-time": "Fixed times",
  shift: "Shift-based",
  event: "Event / exception triggered"
} as const;

export const REPORTING_TRIGGER_LABELS = {
  "cant-start": "Can't Start / blocked before start",
  start: "Task or work pack starts",
  pause: "Pause / block",
  resume: "Resume",
  finish: "Finish / completion",
  "planned-finish-exceeded": "Planned finish exceeded",
  "condition-change": "Significant condition change"
} as const;

export const GUIDED_TRIAL_STEPS: GuidedTrialStep[] = [
  { minute: 360, label: "06:00", instruction: "Begin the operational day.", expected: "Today shows the fixed 24-hour window and baseline work." },
  { minute: 375, label: "06:15", instruction: "Advance past the scaffold-access planned start without executing it.", expected: "The task remains Not Started and becomes Late to Start." },
  { minute: 380, label: "06:20", instruction: "As Riley Jones, use Can't Start on scaffold access for access/scaffold release.", expected: "Execution stays Not Started and a blocked-before-start problem is linked." },
  { minute: 405, label: "06:45", instruction: "Review Today as Tier 1.", expected: "The issue, due action, late start, and reporting attention are visible." },
  { minute: 420, label: "07:00", instruction: "Resolve the access issue, then Start the task with late-start context.", expected: "A system-timestamped Start establishes In Progress." },
  { minute: 480, label: "08:00", instruction: "Open the Tier 2 Critical obligation and submit the required judgement fields.", expected: "The report is immutable and the obligation becomes Submitted." },
  { minute: 555, label: "09:15", instruction: "Pause for a material issue and classify it as an adverse delay.", expected: "Execution becomes Paused while the linked problem and any recovery action remain distinct records." },
  { minute: 600, label: "10:00", instruction: "Review Critical from the Console.", expected: "The material issue and due/overdue reporting state are visible." },
  { minute: 630, label: "10:30", instruction: "Resume while leaving the linked material issue open.", expected: "Execution returns to In Progress without silently resolving the problem." },
  { minute: 720, label: "12:00", instruction: "Resolve the remaining material problem.", expected: "Problem history records resolution separately from Resume." },
  { minute: 840, label: "14:00", instruction: "Finish the scaffold-access task.", expected: "The system-recorded Finish establishes Completed." },
  { minute: 1080, label: "18:00", instruction: "Open an unfinished assigned task and record end-of-shift progress.", expected: "The plain-language field observation records completion, remaining work, and next-shift issue." }
];

const users: TrialUser[] = [
  { id: "tier1-dana", name: "Dana Brooks", tier: "Tier 1" },
  { id: "tier2-morgan", name: "Morgan Lee", tier: "Tier 2" },
  { id: "tier2-avery", name: "Avery Singh", tier: "Tier 2" },
  { id: "tier3-riley", name: "Riley Jones", tier: "Tier 3", directReportTo: "tier2-morgan" },
  { id: "tier3-sam", name: "Sam Patel", tier: "Tier 3", directReportTo: "tier2-morgan" },
  { id: "tier3-jamie", name: "Jamie Chen", tier: "Tier 3", directReportTo: "tier2-morgan" },
  { id: "tier3-casey", name: "Casey Brown", tier: "Tier 3", directReportTo: "tier2-avery" },
  { id: "tier3-drew", name: "Drew Wilson", tier: "Tier 3", directReportTo: "tier2-avery" }
];

const tasks: TrialTask[] = [
  task("shutdown", null, "1", "Calciner trial shutdown", "Shutdown programme", true, 0, 360, 2160, 0, false),
  task("wp-cyclone", "shutdown", "1.1", "Cyclone access and refractory", "CLW-001", true, 1, 330, 1080, 0, false),
  task("task-access-cover", "wp-cyclone", "1.1.1", "C2 Cyclone — remove access cover", "Mechanical access", false, 2, 330, 370, 100, true, undefined, 355),
  task("task-scaffold-access", "wp-cyclone", "1.1.2", "D2 Stack — scaffold access release", "Access and scaffold", false, 2, 370, 840, 0, true),
  task("task-refractory-inspection", "wp-cyclone", "1.1.3", "C2 Cyclone — inspect refractory lining", "Refractory inspection", false, 2, 420, 720, 0, true, undefined, undefined, "Photo set required at completion"),
  task("task-dust-hood", "wp-cyclone", "1.1.4", "C2 Cyclone — remove dust hood", "Mechanical access", false, 2, 330, 480, 35, false, 330),

  task("wp-feed", "shutdown", "1.2", "Feed transfer isolation and clean", "FTW-014", true, 1, 345, 1140, 0, false),
  task("task-permit-release", "wp-feed", "1.2.1", "Permit isolation — await operations release", "Isolation and access", false, 2, 345, 480, 0, false),
  task("task-isolate-feed", "wp-feed", "1.2.2", "Feed transfer — isolate chute", "Isolation and access", false, 2, 390, 510, 0, false),
  task("task-chute-clean", "wp-feed", "1.2.3", "Feed transfer — vacuum clean-out", "Clean-out", false, 2, 510, 750, 0, false),
  task("task-night-handover", "wp-feed", "1.2.4", "Feed transfer — reinstate liners", "Night-shift handover", false, 2, 960, 1140, 0, false),

  task("wp-duct", "shutdown", "1.3", "Ducting inspection and repairs", "DTW-008", true, 1, 240, 1080, 0, false),
  task("task-duct-inspection", "wp-duct", "1.3.1", "Outlet duct — internal inspection", "Ducting inspection", false, 2, 240, 330, 100, false, undefined, 320),
  task("task-expansion-joint", "wp-duct", "1.3.2", "Outlet duct — replace expansion joint", "Ducting repairs", false, 2, 300, 630, 18, true),
  task("task-gasket", "wp-duct", "1.3.3", "Outlet duct — replace flange gasket", "Ducting repairs", false, 2, 630, 840, 0, false),
  task("task-leak-test", "wp-duct", "1.3.4", "Outlet duct — complete leak test", "Ducting close-out", false, 2, 840, 1080, 0, false),

  task("wp-burner", "shutdown", "1.4", "Burner inspection and reinstatement", "BRW-003", true, 1, 420, 1200, 0, false),
  task("task-burner-hatch", "wp-burner", "1.4.1", "Burner deck — remove inspection hatch", "Burner overhaul", false, 2, 420, 540, 0, false),
  task("task-burner-inspection", "wp-burner", "1.4.2", "Burner deck — inspect burner assembly", "Burner overhaul", false, 2, 540, 720, 0, true),
  task("task-burner-tips", "wp-burner", "1.4.3", "Burner deck — replace burner tips", "Burner overhaul", false, 2, 720, 960, 0, false),
  task("task-burner-reinstate", "wp-burner", "1.4.4", "Burner deck — reinstate and sign off", "Burner close-out", false, 2, 960, 1200, 0, false)
];

const trackingAssignments: TrackingAssignment[] = tasks
  .filter((item) => item.id !== "shutdown")
  .map((item, index) => ({
    id: `tracking-${index + 1}`,
    taskId: item.id,
    tier2UserId: ["wp-cyclone", "task-access-cover", "task-scaffold-access", "task-refractory-inspection", "task-dust-hood"].includes(item.id) ? "tier2-morgan" : "tier2-avery",
    assignedAt: 315,
    active: true
  }));

const fieldAssignments: FieldAssignment[] = [
  field("field-1", "task-access-cover", "tier2-morgan", "tier3-riley", "WORKING_ON"),
  field("field-2", "task-scaffold-access", "tier2-morgan", "tier3-riley", "FIELD_CONTROL"),
  field("field-3", "task-refractory-inspection", "tier2-morgan", "tier3-sam", "WORKING_ON"),
  field("field-4", "task-dust-hood", "tier2-morgan", "tier3-jamie", "WORKING_ON"),
  field("field-5", "task-permit-release", "tier2-avery", "tier3-casey", "FIELD_CONTROL"),
  field("field-6", "task-expansion-joint", "tier2-avery", "tier3-drew", "WORKING_ON"),
  field("field-7", "task-night-handover", "tier2-avery", "tier3-casey", "WORKING_ON")
];

const executionEvents: ExecutionEvent[] = [
  { id: "event-baseline-start", taskId: "task-expansion-joint", actorId: "tier3-drew", type: "start", at: 310, baseline: true },
  { id: "event-baseline-pause", taskId: "task-expansion-joint", actorId: "tier3-drew", type: "pause", at: 345, reason: "Await replacement material", whatIsNeeded: "Deliver verified expansion-joint material", adverseDelay: true, linkedProblemId: "problem-material", baseline: true },
  { id: "event-baseline-cant-start", taskId: "task-permit-release", actorId: "tier3-casey", type: "cant-start", at: 350, reason: "Operations release unavailable", whatIsNeeded: "Operations issue the isolation release", linkedProblemId: "problem-release", baseline: true }
];

const problems: TrialProblem[] = [
  { id: "problem-material", taskId: "task-expansion-joint", createdAt: 345, createdBy: "tier3-drew", reason: "Replacement material not at workfront", whatIsNeeded: "Deliver and verify the correct expansion joint", adverse: true, status: "open" },
  { id: "problem-release", taskId: "task-permit-release", createdAt: 350, createdBy: "tier3-casey", reason: "Operations release unavailable", whatIsNeeded: "Operations issue the isolation release", adverse: true, status: "open" }
];

const criticalTemplates: CriticalTemplate[] = [
  { id: "template-two-hour-task", name: "Two-hour critical-task reporting", mechanisms: ["interval", "event"], intervalMinutes: 120, triggers: ["start", "pause", "resume", "finish"], requiredFields: ["progress", "condition", "constraint", "recovery", "next-target", "forecast-completion"] },
  { id: "template-four-hour-pack", name: "Four-hour work-pack reporting", mechanisms: ["fixed-time", "shift"], fixedTimes: [600, 840], triggers: ["condition-change"], requiredFields: ["progress", "condition", "focus", "constraint", "recovery", "next-target", "forecast-completion"] },
  { id: "template-shift", name: "Shift reporting", mechanisms: ["shift"], triggers: [], requiredFields: ["progress", "condition", "focus", "constraint", "next-target", "forecast-completion", "resources"] },
  { id: "template-exception", name: "Exception-only reporting", mechanisms: ["requested", "event"], triggers: ["cant-start", "pause", "planned-finish-exceeded", "condition-change"], requiredFields: ["condition", "constraint", "recovery", "next-target", "update-text"] },
  { id: "template-none", name: "No routine reporting", mechanisms: ["none"], triggers: [], requiredFields: ["condition", "update-text"] }
];

const criticalItems: CriticalItem[] = [
  { id: "critical-scaffold", sourceType: "Project-critical leaf", sourceTaskId: "task-scaffold-access", createdAt: 330, active: true },
  { id: "critical-cyclone-pack", sourceType: "Critical Work Pack", sourceTaskId: "wp-cyclone", createdAt: 330, active: true },
  { id: "critical-expansion", sourceType: "Project-critical leaf", sourceTaskId: "task-expansion-joint", createdAt: 330, active: true },
  { id: "critical-feed-pack", sourceType: "Critical Work Pack", sourceTaskId: "wp-feed", createdAt: 330, active: true }
];

const criticalPolicies: CriticalPolicyVersion[] = [
  policy("policy-scaffold-v1", "critical-scaffold", 1, "tier2-morgan", "template-two-hour-task", ["interval", "event"], 120, [], ["start", "pause", "resume", "finish"], ["progress", "condition", "constraint", "recovery", "next-target", "forecast-completion"]),
  policy("policy-cyclone-v1", "critical-cyclone-pack", 1, "tier2-morgan", "template-four-hour-pack", ["fixed-time", "shift"], undefined, [600, 840], ["condition-change"], ["progress", "condition", "focus", "constraint", "recovery", "next-target", "forecast-completion"]),
  policy("policy-expansion-v1", "critical-expansion", 1, "tier2-avery", "template-exception", ["requested", "event"], undefined, [], ["cant-start", "pause", "planned-finish-exceeded", "condition-change"], ["condition", "constraint", "recovery", "next-target", "update-text"]),
  policy("policy-feed-v1", "critical-feed-pack", 1, "tier2-avery", "template-none", ["none"], undefined, [], [], ["condition", "update-text"])
];

const criticalObligations: CriticalObligation[] = [
  ...[480, 600, 720, 840, 960, 1080].map((dueAt, index) => obligation(`obligation-scaffold-${index + 1}`, "critical-scaffold", "policy-scaffold-v1", "tier2-morgan", 360, dueAt, "interval")),
  obligation("obligation-cyclone-10", "critical-cyclone-pack", "policy-cyclone-v1", "tier2-morgan", 360, 600, "fixed-time"),
  obligation("obligation-cyclone-14", "critical-cyclone-pack", "policy-cyclone-v1", "tier2-morgan", 360, 840, "fixed-time"),
  obligation("obligation-cyclone-shift", "critical-cyclone-pack", "policy-cyclone-v1", "tier2-morgan", 360, 1080, "shift"),
  { ...obligation("obligation-expansion-request", "critical-expansion", "policy-expansion-v1", "tier2-avery", 350, 390, "requested"), requestedReason: "Confirm material recovery position" },
  { ...obligation("obligation-baseline", "critical-cyclone-pack", "policy-cyclone-v1", "tier2-morgan", 330, 350, "requested"), requestedReason: "Operational-day opening report" }
];

const criticalReports: CriticalReport[] = [
  {
    id: "report-baseline",
    obligationId: "obligation-baseline",
    criticalItemId: "critical-cyclone-pack",
    policyVersionId: "policy-cyclone-v1",
    submittedAt: 350,
    submittedBy: "tier2-morgan",
    values: {
      progress: "Opening work fronts established",
      condition: "At risk",
      focus: "Access release and material staging",
      constraint: "Two pre-start constraints remain open",
      recovery: "Owners assigned to both constraints",
      "next-target": "Release scaffold access",
      "forecast-completion": "Under review"
    }
  }
];

const history: TrialHistoryEvent[] = [
  historyEvent("history-import", "import-activated", 300, "tier1-dana", "Accepted immutable synthetic snapshot v1 activated for the trial.", undefined, true),
  historyEvent("history-tracking", "assignment-tier2", 315, "tier1-dana", "Tier 2 tracking responsibility established for the synthetic task set.", undefined, true),
  historyEvent("history-start", "start", 310, "tier3-drew", "Drew Wilson started outlet-duct expansion-joint replacement.", "task-expansion-joint", true),
  historyEvent("history-material-problem", "problem-created", 345, "tier3-drew", "Material constraint recorded for the expansion joint.", "task-expansion-joint", true),
  historyEvent("history-pause", "pause", 345, "tier3-drew", "Expansion-joint work paused; the material constraint is adverse and remains open.", "task-expansion-joint", true),
  historyEvent("history-release-problem", "problem-created", 350, "tier3-casey", "Operations-release problem recorded before work started.", "task-permit-release", true),
  historyEvent("history-cant-start", "cant-start", 350, "tier3-casey", "Can't Start recorded; permit-release work remains Not Started.", "task-permit-release", true),
  historyEvent("history-report", "report-submitted", 350, "tier2-morgan", "Opening Critical Work Pack report submitted under Policy v1.", undefined, true, "critical-cyclone-pack", "obligation-baseline", "report-baseline"),
  historyEvent("history-requested-report", "report-obligation", 350, "tier1-dana", "Requested Critical recovery update created for the expansion-joint task.", "task-expansion-joint", true, "critical-expansion", "obligation-expansion-request")
];

export function createInitialTrialState(): TrialState {
  return structuredClone({
    scenarioVersion: TRIAL_SCENARIO_VERSION,
    now: TRIAL_START_MINUTE,
    nextSequence: 1000,
    project: {
      id: "trial-calciner-2026",
      name: "Calciner trial shutdown",
      code: "TRIAL-CLN-26",
      site: "Synthetic processing plant",
      timezone: "Australia/Perth",
      operationalDayStartMinute: 360,
      shiftBoundaryMinutes: [1080, 1800],
      importedSnapshot: "Synthetic snapshot v1"
    },
    users,
    tasks,
    trackingAssignments,
    fieldAssignments,
    executionEvents,
    pauseIntervals: [{ id: "pause-baseline", taskId: "task-expansion-joint", startedByEventId: "event-baseline-pause", startedAt: 345, reason: "Await replacement material", adverseDelay: true, problemId: "problem-material" }],
    progressObservations: [],
    problems,
    actions: [
      { id: "action-release", taskId: "task-permit-release", createdAt: 350, createdBy: "tier3-casey", description: "Obtain operations isolation release", ownerId: "tier2-avery", dueAt: 390, status: "open" },
      { id: "action-material", taskId: "task-expansion-joint", createdAt: 345, createdBy: "tier3-drew", description: "Deliver verified expansion-joint material", ownerId: "tier2-avery", dueAt: 420, status: "open" }
    ],
    criticalTemplates,
    criticalItems,
    criticalPolicies,
    criticalObligations,
    criticalReports,
    shiftProgressNeeds: [],
    history,
    processedClockEvents: []
  } satisfies TrialState);
}

function task(
  id: string,
  parentId: string | null,
  wbs: string,
  name: string,
  workPackage: string,
  summary: boolean,
  depth: number,
  plannedStart: number,
  plannedFinish: number,
  importedProgress: number,
  projectCritical: boolean,
  importedActualStart?: number,
  importedActualFinish?: number,
  evidenceRequirement?: string
): TrialTask {
  return { id, parentId, wbs, name, workPackage, summary, depth, plannedStart, plannedFinish, importedProgress, projectCritical, importedActualStart, importedActualFinish, evidenceRequirement };
}

function field(id: string, taskId: string, tier2UserId: string, tier3UserId: string, relationship: FieldAssignment["relationship"]): FieldAssignment {
  return { id, taskId, tier2UserId, tier3UserId, relationship, assignedAt: 320, active: true };
}

function policy(
  id: string,
  criticalItemId: string,
  version: number,
  ownerUserId: string,
  templateId: string,
  mechanisms: CriticalPolicyVersion["mechanisms"],
  intervalMinutes: number | undefined,
  fixedTimes: number[],
  triggers: CriticalPolicyVersion["triggers"],
  requiredFields: CriticalPolicyVersion["requiredFields"]
): CriticalPolicyVersion {
  return { id, criticalItemId, version, effectiveAt: 330, ownerUserId, templateId, mechanisms, intervalMinutes, fixedTimes, triggers, requiredFields, itemOverride: false };
}

function obligation(
  id: string,
  criticalItemId: string,
  policyVersionId: string,
  ownerUserId: string,
  createdAt: number,
  dueAt: number,
  mechanism: CriticalObligation["mechanism"]
): CriticalObligation {
  return { id, criticalItemId, policyVersionId, ownerUserId, createdAt, dueAt, mechanism };
}

function historyEvent(
  id: string,
  type: TrialHistoryEvent["type"],
  at: number,
  actorId: string,
  summary: string,
  taskId?: string,
  baseline = false,
  criticalItemId?: string,
  obligationId?: string,
  reportId?: string
): TrialHistoryEvent {
  return { id, type, at, actorId, summary, taskId, baseline, criticalItemId, obligationId, reportId };
}
