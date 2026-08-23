export type ReviewPersona = "tier2" | "tier3";

export type StatusTone =
  | "neutral"
  | "info"
  | "warning"
  | "critical"
  | "success"
  | "restricted";

export type StatusLabel = {
  label: string;
  tone: StatusTone;
};

export type SyncState = StatusLabel & {
  detail: string;
};

export type CriticalReportObligation = {
  source: string;
  reportingOwner: string;
  policyTemplate: string;
  policyVersion: string;
  timingMechanisms: string;
  triggers: string;
  requiredFields: string[];
  prepopulatedFacts: string[];
  judgementInputs: string[];
  latestReport: string;
  nextReportDue: string;
  dueState: StatusLabel;
  operationalCondition: string;
  history: string;
};

export type FieldProgressObservation = {
  completion: string;
  remainingWork: string;
  nextShiftIssue: string;
  noteEvidence: string;
};

export type MobileTask = {
  id: string;
  persona: ReviewPersona;
  taskCode: string;
  title: string;
  workPackage: string;
  plannedWindow: string;
  executionState: StatusLabel;
  stateBasis: string;
  attentionCondition?: StatusLabel;
  percentComplete: string;
  assignmentRelationship: string;
  assignmentDetail: string;
  tier3Assignments?: string[];
  taskIndicator: StatusLabel;
  syncState: SyncState;
  recordedEventFacts: string[];
  endOfShiftObservation: FieldProgressObservation;
  discussionSummary: string;
  problemSummary: string;
  actionSummary: string;
  evidenceSummary: string;
  history: string[];
  criticalReport?: CriticalReportObligation;
  criticalContext?: string;
};

export const mobileTasks: MobileTask[] = [
  {
    id: "c2-access-cover",
    persona: "tier2",
    taskCode: "C2-RF-014",
    title: "C2 Cyclone — remove access cover",
    workPackage: "Calciner C2 refractory outage",
    plannedWindow: "07:00–15:00",
    executionState: { label: "In Progress", tone: "info" },
    stateBasis: "Tracker Start event recorded at 07:12.",
    percentComplete: "75%",
    assignmentRelationship: "Tracking responsibility",
    assignmentDetail: "Assigned by Tier 1. Tier 2 retains tracking responsibility.",
    tier3Assignments: ["Tier 3 user B · WORKING_ON"],
    taskIndicator: { label: "Evidence ready", tone: "success" },
    syncState: {
      label: "Server received",
      detail: "Last synced at 13:15.",
      tone: "success"
    },
    recordedEventFacts: [
      "Start · 07:12 · event time recorded automatically.",
      "Field progress observation · 13:15 · server received."
    ],
    endOfShiftObservation: {
      completion: "75%",
      remainingWork: "Complete inspection handoff and refit the cover.",
      nextShiftIssue: "No known issue affecting the next shift.",
      noteEvidence: "Two existing photo records can be linked; no new evidence required."
    },
    discussionSummary: "Tier 3 user B added a field handoff note at 12:48.",
    problemSummary: "No active delay or problem.",
    actionSummary: "Confirm inspection access before 14:00.",
    evidenceSummary: "Two photo records are attached to this visual example.",
    history: [
      "13:15 · Progress example shown as server received.",
      "12:48 · Field handoff comment added.",
      "07:12 · Tracker Start event established In Progress."
    ],
    criticalReport: {
      source: "Critical Work Pack · C2 refractory outage",
      reportingOwner: "Tier 2 user A",
      policyTemplate: "Four-hour work-pack reporting",
      policyVersion: "Policy v2",
      timingMechanisms: "Fixed times + shift-based",
      triggers: "Requested update + significant condition change",
      requiredFields: ["Completion / progress", "Operational condition", "Main delay / constraint", "Action / recovery", "Next target", "Forecast completion"],
      prepopulatedFacts: ["Progress 75% from the latest field observation", "Execution In Progress from Start at 07:12"],
      judgementInputs: ["Current position / focus", "Forecast completion", "Next target"],
      latestReport: "10:00 · On plan",
      nextReportDue: "14:00",
      dueState: { label: "Due in 45 min", tone: "warning" },
      operationalCondition: "On plan",
      history: "Policy v2 created this obligation; earlier reports retain their original policy version."
    }
  },
  {
    id: "d2-scaffold-inspection",
    persona: "tier2",
    taskCode: "D2-SC-021",
    title: "D2 Stack — scaffold inspection",
    workPackage: "D2 stack access workfront",
    plannedWindow: "11:00–13:00",
    executionState: { label: "Not Started", tone: "neutral" },
    stateBasis: "No Tracker Start/Resume event. Imported Actual Start is empty and imported progress is 0%.",
    attentionCondition: { label: "Late to Start", tone: "warning" },
    percentComplete: "0%",
    assignmentRelationship: "Tracking responsibility",
    assignmentDetail: "Assigned by Tier 1. No Tier 3 field assignment has been recorded.",
    tier3Assignments: [],
    taskIndicator: { label: "Access pending", tone: "warning" },
    syncState: {
      label: "Queued on device",
      detail: "Queued on this device. Not yet sent.",
      tone: "warning"
    },
    recordedEventFacts: [
      "Can't Start · 13:15 · event time recorded automatically; execution remains Not Started."
    ],
    endOfShiftObservation: {
      completion: "0%",
      remainingWork: "Scaffold release, inspection, and task execution.",
      nextShiftIssue: "Access release remains outstanding for the next shift.",
      noteEvidence: "Optional release note; no evidence required before start."
    },
    discussionSummary: "No discussion entries in this visual example.",
    problemSummary: "Access release is late; no Tracker Start event exists.",
    actionSummary: "Follow up scaffold inspection release at 13:30.",
    evidenceSummary: "No evidence required before start.",
    history: [
      "13:15 · Can't Start event recorded automatically; execution remained Not Started.",
      "13:15 · Late-to-start attention condition shown separately.",
      "11:00 · Planned start passed without execution evidence."
    ]
  },
  {
    id: "hv-inlet-cleanout",
    persona: "tier3",
    taskCode: "HV-CL-008",
    title: "HV inlet — vacuum clean-out",
    workPackage: "HV inlet access workfront",
    plannedWindow: "12:00–16:00",
    executionState: { label: "In Progress", tone: "info" },
    stateBasis: "Tracker Start event recorded at 12:06.",
    percentComplete: "30%",
    assignmentRelationship: "WORKING_ON",
    assignmentDetail: "Assigned by Tier 2 user A, who retains tracking responsibility.",
    taskIndicator: { label: "No blocker", tone: "neutral" },
    syncState: {
      label: "Local draft",
      detail: "Saved locally.",
      tone: "neutral"
    },
    recordedEventFacts: [
      "Start · 12:06 · event time recorded automatically.",
      "Field progress observation · 13:12 · saved locally."
    ],
    endOfShiftObservation: {
      completion: "30%",
      remainingWork: "Continue vacuum clean-out and final inspection.",
      nextShiftIssue: "Confirm vacuum availability at shift handover.",
      noteEvidence: "One photo record is saved locally."
    },
    discussionSummary: "Tier 2 user A requested an update before 15:00.",
    problemSummary: "No active delay or problem.",
    actionSummary: "Provide progress update before 15:00.",
    evidenceSummary: "One photo record is saved locally in this visual example.",
    history: [
      "13:12 · Local progress draft shown.",
      "12:06 · Tracker Start event established In Progress."
    ]
  },
  {
    id: "permit-isolation-release",
    persona: "tier3",
    taskCode: "ISO-044",
    title: "Permit isolation — await operations release",
    workPackage: "Calciner isolation workfront",
    plannedWindow: "10:00–14:00",
    executionState: { label: "Paused", tone: "warning" },
    stateBasis: "Tracker Pause event recorded at 11:20. The linked operations-release problem remains open.",
    attentionCondition: { label: "Blocked · operations release", tone: "critical" },
    percentComplete: "20%",
    assignmentRelationship: "FIELD_CONTROL",
    assignmentDetail: "Assigned by Tier 2 user A, who retains tracking responsibility.",
    taskIndicator: { label: "Release blocked", tone: "critical" },
    syncState: {
      label: "Failed",
      detail: "Could not send. Still saved on this device.",
      tone: "critical"
    },
    recordedEventFacts: [
      "Start · 10:18 · event time recorded automatically.",
      "Pause · 11:20 · event time recorded automatically; linked adverse problem remains open."
    ],
    endOfShiftObservation: {
      completion: "20%",
      remainingWork: "Obtain operations release and resume field control.",
      nextShiftIssue: "Open operations-release problem requires next-shift follow-up.",
      noteEvidence: "Permit reference is available as optional context."
    },
    discussionSummary: "Tier 2 user A acknowledged the blocked-state example.",
    problemSummary: "Operations release is outstanding.",
    actionSummary: "Confirm isolation release owner and recovery time.",
    evidenceSummary: "Permit reference is shown as context only.",
    history: [
      "14:05 · Failed sync example remains saved on this device.",
      "11:20 · Tracker Pause event linked to the open operations-release problem.",
      "10:18 · Tracker Start event recorded."
    ],
    criticalContext: "Critical Work Pack context is visible. Reporting remains assigned to Tier 2."
  }
];

export const syncSummary: SyncState = {
  label: "Server received",
  detail: "Last synced at 13:15.",
  tone: "success"
};

export const syncRecoveryExamples: SyncState[] = [
  { label: "Local draft", detail: "Saved locally.", tone: "neutral" },
  {
    label: "Queued on device",
    detail: "Queued on this device. Not yet sent.",
    tone: "warning"
  },
  { label: "Sending", detail: "Sending.", tone: "info" },
  { label: "Server received", detail: "Server received.", tone: "success" },
  {
    label: "Failed",
    detail: "Could not send. Still saved on this device.",
    tone: "critical"
  },
  { label: "Conflict", detail: "Conflict needs review.", tone: "critical" }
];
