export type TrialUserTier = "Tier 1" | "Tier 2" | "Tier 3";
export type ExecutionState = "Not Started" | "In Progress" | "Paused" | "Completed";

export type TrialProject = {
  id: string;
  name: string;
  code: string;
  site: string;
  timezone: string;
  operationalDayStartMinute: number;
  importedSnapshot: string;
};

export type TrialUser = {
  id: string;
  name: string;
  tier: TrialUserTier;
};

export type TrialTask = {
  id: string;
  parentId: string | null;
  wbs: string;
  name: string;
  workPackage: string;
  summary: boolean;
  depth: number;
  plannedStart: number | null;
  plannedFinish: number | null;
  importedActualStart?: number;
  importedActualFinish?: number;
  importedProgress: number;
  projectCritical: boolean;
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
  status: "open" | "completed";
  completedAt?: number;
};

export type TrialHistoryType =
  | "import-activated"
  | "cant-start"
  | "start"
  | "pause"
  | "resume"
  | "finish"
  | "problem-created"
  | "problem-resolved"
  | "action-created"
  | "action-completed";

export type TrialHistoryEvent = {
  id: string;
  type: TrialHistoryType;
  at: number;
  actorId: string;
  summary: string;
  taskId?: string;
  baseline?: boolean;
};

export type TrialState = {
  modelVersion: string;
  now: number;
  nextSequence: number;
  project: TrialProject;
  users: TrialUser[];
  tasks: TrialTask[];
  executionEvents: ExecutionEvent[];
  pauseIntervals: PauseInterval[];
  progressObservations: FieldProgressObservation[];
  problems: TrialProblem[];
  actions: TrialActionRecord[];
  history: TrialHistoryEvent[];
};

export type TrialAction =
  | { type: "cant-start"; taskId: string; actorId: string; reason: string; whatIsNeeded: string; createProblem: boolean; createAction: boolean }
  | { type: "start"; taskId: string; actorId: string; lateCause?: string; actionStillNeeded?: string }
  | { type: "pause"; taskId: string; actorId: string; reason: string; adverseDelay: boolean; whatIsNeeded: string; createAction: boolean }
  | { type: "resume"; taskId: string; actorId: string; issueResolution: "resolved" | "remains-open" | "not-applicable" }
  | { type: "finish"; taskId: string; actorId: string }
  | { type: "resolve-problem"; problemId: string; actorId: string }
  | { type: "complete-action"; actionId: string; actorId: string };

export type TaskProjection = {
  task: TrialTask;
  executionState: ExecutionState;
  stateBasis: string;
  progressPercent: number;
  progressBasis: string;
  latestFieldProgressObservation: FieldProgressObservation | null;
  attention: string[];
  activeProblems: TrialProblem[];
  openActions: TrialActionRecord[];
  lastActivityAt: number | null;
};
