export type TrialUserTier = "Tier 1" | "Tier 2" | "Tier 3";
export type Tier3Relationship = "WORKING_ON" | "FIELD_CONTROL";
export type ExecutionState = "Not Started" | "In Progress" | "Paused" | "Completed";
export type CriticalSourceType = "Project-critical leaf" | "Critical Work Pack";
export type ReportingMechanism = "none" | "requested" | "interval" | "fixed-time" | "shift" | "event";
export type ReportingTrigger = "cant-start" | "start" | "pause" | "resume" | "finish" | "planned-finish-exceeded" | "condition-change";
export type ReportingField =
  | "progress"
  | "condition"
  | "focus"
  | "constraint"
  | "recovery"
  | "next-target"
  | "forecast-completion"
  | "resources"
  | "evidence"
  | "update-text";

export type TrialProject = {
  id: string;
  name: string;
  code: string;
  site: string;
  timezone: string;
  operationalDayStartMinute: number;
  shiftBoundaryMinutes: number[];
  importedSnapshot: string;
};

export type TrialUser = {
  id: string;
  name: string;
  tier: TrialUserTier;
  directReportTo?: string;
};

export type TrialTask = {
  id: string;
  parentId: string | null;
  wbs: string;
  name: string;
  workPackage: string;
  summary: boolean;
  depth: number;
  plannedStart: number;
  plannedFinish: number;
  importedActualStart?: number;
  importedActualFinish?: number;
  importedProgress: number;
  projectCritical: boolean;
  evidenceRequirement?: string;
};

export type TrackingAssignment = {
  id: string;
  taskId: string;
  tier2UserId: string;
  assignedAt: number;
  active: boolean;
};

export type FieldAssignment = {
  id: string;
  taskId: string;
  tier2UserId: string;
  tier3UserId: string;
  relationship: Tier3Relationship;
  assignedAt: number;
  active: boolean;
};

export type ExecutionEventType = "cant-start" | "start" | "pause" | "resume" | "finish";

export type ExecutionEvent = {
  id: string;
  taskId: string;
  actorId: string;
  type: ExecutionEventType;
  at: number;
  reason?: string;
  whatIsNeeded?: string;
  lateCause?: string;
  actionStillNeeded?: string;
  adverseDelay?: boolean;
  linkedProblemId?: string;
  linkedActionId?: string;
  resumeResolution?: "resolved" | "remains-open" | "not-applicable";
  baseline?: boolean;
};

export type PauseInterval = {
  id: string;
  taskId: string;
  startedByEventId: string;
  startedAt: number;
  endedByEventId?: string;
  endedAt?: number;
  reason: string;
  adverseDelay: boolean;
  problemId?: string;
};

export type FieldProgressObservation = {
  id: string;
  taskId: string;
  actorId: string;
  at: number;
  completionPercent: number;
  remainingWork: string;
  nextShiftIssue: string;
  noteEvidence?: string;
  shiftBoundary?: number;
};

export type TrialProblem = {
  id: string;
  taskId: string;
  createdAt: number;
  createdBy: string;
  reason: string;
  whatIsNeeded: string;
  adverse: boolean;
  status: "open" | "resolved";
  resolvedAt?: number;
  resolvedBy?: string;
};

export type TrialActionRecord = {
  id: string;
  taskId: string;
  createdAt: number;
  createdBy: string;
  description: string;
  ownerId?: string;
  dueAt?: number;
  status: "open" | "completed";
  completedAt?: number;
};

export type CriticalTemplate = {
  id: string;
  name: string;
  mechanisms: ReportingMechanism[];
  intervalMinutes?: number;
  fixedTimes?: number[];
  triggers: ReportingTrigger[];
  requiredFields: ReportingField[];
};

export type CriticalItem = {
  id: string;
  sourceType: CriticalSourceType;
  sourceTaskId: string;
  createdAt: number;
  active: boolean;
};

export type CriticalPolicyVersion = {
  id: string;
  criticalItemId: string;
  version: number;
  effectiveAt: number;
  ownerUserId: string;
  templateId: string;
  mechanisms: ReportingMechanism[];
  intervalMinutes?: number;
  fixedTimes: number[];
  triggers: ReportingTrigger[];
  requiredFields: ReportingField[];
  itemOverride: boolean;
};

export type CriticalObligation = {
  id: string;
  criticalItemId: string;
  policyVersionId: string;
  ownerUserId: string;
  createdAt: number;
  dueAt: number;
  mechanism: Exclude<ReportingMechanism, "none">;
  triggerEventId?: string;
  requestedReason?: string;
  satisfiedByEventId?: string;
};

export type CriticalReport = {
  id: string;
  obligationId: string;
  criticalItemId: string;
  policyVersionId: string;
  submittedAt: number;
  submittedBy: string;
  values: Partial<Record<ReportingField, string>>;
  supersedesReportId?: string;
};

export type ShiftProgressNeed = {
  id: string;
  taskId: string;
  userId: string;
  shiftBoundary: number;
  createdAt: number;
  satisfiedByObservationId?: string;
};

export type TrialHistoryType =
  | "import-activated"
  | "assignment-tier2"
  | "assignment-tier3"
  | "cant-start"
  | "start"
  | "pause"
  | "resume"
  | "finish"
  | "end-shift-progress-due"
  | "end-shift-progress"
  | "problem-created"
  | "problem-resolved"
  | "action-created"
  | "action-completed"
  | "critical-configured"
  | "report-obligation"
  | "report-due"
  | "report-submitted"
  | "report-corrected";

export type TrialHistoryEvent = {
  id: string;
  type: TrialHistoryType;
  at: number;
  actorId: string;
  summary: string;
  taskId?: string;
  criticalItemId?: string;
  obligationId?: string;
  reportId?: string;
  baseline?: boolean;
};

export type TrialState = {
  scenarioVersion: string;
  now: number;
  nextSequence: number;
  project: TrialProject;
  users: TrialUser[];
  tasks: TrialTask[];
  trackingAssignments: TrackingAssignment[];
  fieldAssignments: FieldAssignment[];
  executionEvents: ExecutionEvent[];
  pauseIntervals: PauseInterval[];
  progressObservations: FieldProgressObservation[];
  problems: TrialProblem[];
  actions: TrialActionRecord[];
  criticalTemplates: CriticalTemplate[];
  criticalItems: CriticalItem[];
  criticalPolicies: CriticalPolicyVersion[];
  criticalObligations: CriticalObligation[];
  criticalReports: CriticalReport[];
  shiftProgressNeeds: ShiftProgressNeed[];
  history: TrialHistoryEvent[];
  processedClockEvents: string[];
};

export type CriticalPolicyInput = {
  ownerUserId: string;
  templateId: string;
  mechanisms: ReportingMechanism[];
  intervalMinutes?: number;
  fixedTimes: number[];
  triggers: ReportingTrigger[];
  requiredFields: ReportingField[];
};

export type TrialAction =
  | { type: "advance-minutes"; minutes: number }
  | { type: "advance-to"; minute: number }
  | { type: "reset" }
  | { type: "assign-tier2"; taskId: string; tier2UserId: string; actorId: string }
  | { type: "assign-tier3"; taskId: string; tier2UserId: string; tier3UserId: string; relationship: Tier3Relationship }
  | { type: "cant-start"; taskId: string; actorId: string; reason: string; whatIsNeeded: string; createProblem: boolean; createAction: boolean }
  | { type: "start"; taskId: string; actorId: string; lateCause?: string; actionStillNeeded?: string }
  | { type: "pause"; taskId: string; actorId: string; reason: string; adverseDelay: boolean; whatIsNeeded: string; createAction: boolean }
  | { type: "resume"; taskId: string; actorId: string; issueResolution: "resolved" | "remains-open" | "not-applicable" }
  | { type: "finish"; taskId: string; actorId: string }
  | { type: "end-shift-progress"; needId: string; actorId: string; completionPercent: number; remainingWork: string; nextShiftIssue: string; noteEvidence?: string }
  | { type: "resolve-problem"; problemId: string; actorId: string }
  | { type: "complete-action"; actionId: string; actorId: string }
  | { type: "configure-critical"; criticalItemId: string; actorId: string; policy: CriticalPolicyInput }
  | { type: "add-critical"; sourceTaskId: string; sourceType: CriticalSourceType; actorId: string; policy: CriticalPolicyInput }
  | { type: "submit-critical-report"; obligationId: string; actorId: string; values: Partial<Record<ReportingField, string>> }
  | { type: "correct-critical-report"; reportId: string; actorId: string; values: Partial<Record<ReportingField, string>> };

export type ObligationState = "upcoming" | "due" | "overdue" | "submitted" | "superseded";

export type TaskProjection = {
  task: TrialTask;
  executionState: ExecutionState;
  stateBasis: string;
  progressPercent: number;
  latestFieldProgressObservation: FieldProgressObservation | null;
  trackingOwner: TrialUser | null;
  fieldAssignments: Array<FieldAssignment & { user: TrialUser }>;
  attention: string[];
  activeProblems: TrialProblem[];
  openActions: TrialActionRecord[];
  criticalItems: CriticalItem[];
  lastActivityAt: number | null;
};

export type TodayProjection = {
  windowStart: number;
  windowEnd: number;
  tasks: TaskProjection[];
  counts: Record<ExecutionState, number>;
  lateStarts: number;
  blocked: number;
  runningBeyondFinish: number;
  noRecentUpdate: number;
  criticalDue: number;
  criticalOverdue: number;
  activeProblems: number;
  dueActions: number;
  recentActivity: TrialHistoryEvent[];
};

export type CriticalObligationProjection = {
  obligation: CriticalObligation;
  item: CriticalItem;
  policy: CriticalPolicyVersion;
  sourceTask: TrialTask;
  owner: TrialUser;
  state: ObligationState;
  currentReport: CriticalReport | null;
  reportHistory: Array<{ report: CriticalReport; state: "submitted" | "superseded" }>;
  prepopulatedFacts: Partial<Record<ReportingField, string>>;
  requiredInputFields: ReportingField[];
};

export type GuidedTrialStep = {
  minute: number;
  label: string;
  instruction: string;
  expected: string;
};
