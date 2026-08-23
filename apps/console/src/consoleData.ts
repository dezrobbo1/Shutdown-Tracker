import type { LucideIcon } from "lucide-react";
import { CalendarClock, ListTree, Settings2, ShieldAlert, UploadCloud } from "lucide-react";
import type { ConsoleReviewData } from "./apiReviewClient";

export type ConsoleSection = "Today" | "Tasks" | "Critical" | "Import / Export" | "Project Settings";
export type ProjectStatus = "Active" | "Draft" | "Closed" | "Archived";
export type TaskState = "Not Started" | "In Progress" | "Paused" | "Completed";
export type StatusTone = "neutral" | "info" | "warning" | "danger" | "success";

export type ConsoleNavItem = { label: ConsoleSection; icon: LucideIcon };
export type ProjectSummary = {
  id: string;
  name: string;
  code: string;
  site: string;
  status: ProjectStatus;
  period: string;
  updated: string;
};
export type OperationalTask = {
  id: string;
  wbs: string;
  depth: number;
  summary: boolean;
  name: string;
  workPackage: string;
  tier2Owner: string;
  state: TaskState;
  stateEvidence: string;
  attention: string;
  planned: string;
  progress: number;
  lastUpdate: string;
};
export type CriticalItem = {
  id: string;
  sourceType: "Project-critical leaf" | "Critical Work Pack";
  name: string;
  scope: string;
  reportingOwner: string;
  policyTemplate: string;
  policyVersion: string;
  timing: string;
  triggers: string;
  requiredContent: string[];
  latestReport: string;
  nextDue: string;
  reportingState: string;
  condition: string;
  history: string;
};
export type ReviewRow = { item: string; source: string; state: string; context: string };

export const consoleNavItems: ConsoleNavItem[] = [
  { label: "Today", icon: CalendarClock },
  { label: "Tasks", icon: ListTree },
  { label: "Critical", icon: ShieldAlert },
  { label: "Import / Export", icon: UploadCloud },
  { label: "Project Settings", icon: Settings2 }
];

export const projects: ProjectSummary[] = [
  { id: "calciner-2026", name: "Calciner major shutdown", code: "CLN-26", site: "West processing plant", status: "Active", period: "24–31 August 2026", updated: "Operational review 07:40" },
  { id: "kiln-2026", name: "Kiln maintenance outage", code: "KLN-26", site: "North kiln line", status: "Draft", period: "14–20 September 2026", updated: "Import mapping incomplete" },
  { id: "boiler-2025", name: "Boiler annual shutdown", code: "BLR-25", site: "Utilities area", status: "Closed", period: "2–6 December 2025", updated: "Closed 12 December 2025" },
  { id: "calciner-2024", name: "Calciner campaign outage", code: "CLN-24", site: "West processing plant", status: "Archived", period: "18–24 August 2024", updated: "Archived; restore available" }
];

export const operationalTasks: OperationalTask[] = [
  { id: "1", wbs: "1", depth: 0, summary: true, name: "Calciner major shutdown", workPackage: "Shutdown programme", tier2Owner: "Multiple tracking owners", state: "In Progress", stateEvidence: "Accepted imported progress 34%", attention: "2 active delays", planned: "24 Aug 06:00 – 31 Aug 18:00", progress: 34, lastUpdate: "07:38" },
  { id: "1.1", wbs: "1.1", depth: 1, summary: true, name: "Cyclone access and inspection", workPackage: "CLW-001", tier2Owner: "Morgan Lee", state: "In Progress", stateEvidence: "Accepted imported progress 42%", attention: "Critical report due 10:00", planned: "24 Aug 06:00 – 25 Aug 20:00", progress: 42, lastUpdate: "07:32" },
  { id: "1.1.1", wbs: "1.1.1", depth: 2, summary: false, name: "Remove cyclone access cover", workPackage: "Mechanical access", tier2Owner: "Morgan Lee", state: "Completed", stateEvidence: "Tracker Finish event 07:05", attention: "None", planned: "24 Aug 06:00 – 24 Aug 07:15", progress: 100, lastUpdate: "07:05" },
  { id: "1.1.2", wbs: "1.1.2", depth: 2, summary: false, name: "Inspect refractory lining", workPackage: "Refractory inspection", tier2Owner: "Morgan Lee", state: "In Progress", stateEvidence: "Tracker Start event 07:12", attention: "No recent update · 26 min", planned: "24 Aug 07:00 – 24 Aug 09:30", progress: 25, lastUpdate: "07:12" },
  { id: "1.2.1", wbs: "1.2.1", depth: 2, summary: false, name: "Isolate feed transfer chute", workPackage: "Isolation and access", tier2Owner: "Avery Singh", state: "Not Started", stateEvidence: "No Tracker start; imported progress 0%", attention: "Late to Start · planned 06:30", planned: "24 Aug 06:30 – 24 Aug 08:00", progress: 0, lastUpdate: "No execution update" },
  { id: "1.3.2", wbs: "1.3.2", depth: 2, summary: false, name: "Replace expansion joint", workPackage: "Ducting repairs", tier2Owner: "Jordan Kim", state: "Paused", stateEvidence: "Tracker Pause event 07:20", attention: "Action due 08:15", planned: "24 Aug 06:45 – 24 Aug 10:30", progress: 18, lastUpdate: "07:20" },
  { id: "1.4.1", wbs: "1.4.1", depth: 2, summary: false, name: "Remove burner inspection hatch", workPackage: "Burner overhaul", tier2Owner: "Taylor Chen", state: "Paused", stateEvidence: "Tracker Pause event 07:31", attention: "Blocked · active access-permit delay", planned: "24 Aug 07:00 – 24 Aug 08:30", progress: 10, lastUpdate: "07:31" }
];

export const criticalItems: CriticalItem[] = [
  {
    id: "critical-1", sourceType: "Project-critical leaf", name: "Inspect refractory lining", scope: "Selected leaf task · Project Critical is imported context only", reportingOwner: "Morgan Lee · Tier 2",
    policyTemplate: "Two-hour critical-task", policyVersion: "Policy v3", timing: "Fixed interval · every 2 hours", triggers: "Start + pause/block + finish", requiredContent: ["Completion/progress", "Operational condition", "Main delay/constraint", "Forecast completion", "Next target"],
    latestReport: "On plan · 07:20", nextDue: "09:20", reportingState: "Due in 1h 40m", condition: "On plan", history: "v3 effective 06:00 · trigger set expanded"
  },
  {
    id: "critical-2", sourceType: "Critical Work Pack", name: "Cyclone access and inspection", scope: "Summary task 1.1 plus all descendants", reportingOwner: "Morgan Lee · Tier 2",
    policyTemplate: "Four-hour work-pack", policyVersion: "Policy v2", timing: "Fixed times + shift-based", triggers: "Requested + significant condition change", requiredContent: ["Completion/progress", "Current position/focus", "Main delay/constraint", "Action/recovery", "Next target", "Forecast completion"],
    latestReport: "At risk · 06:02", nextDue: "12:00", reportingState: "Current", condition: "At risk", history: "v2 effective at day shift · item override"
  },
  {
    id: "critical-3", sourceType: "Project-critical leaf", name: "Remove burner inspection hatch", scope: "Explicitly selected leaf task", reportingOwner: "Taylor Chen · Tier 2",
    policyTemplate: "Exception-only", policyVersion: "Policy v4", timing: "Ad hoc/requested + event/exception", triggers: "Pause/block + planned finish exceeded", requiredContent: ["Operational condition", "Main delay/constraint", "Action/recovery", "Evidence/photo requirement", "Comment/update text"],
    latestReport: "Blocked · 07:34", nextDue: "Now", reportingState: "Overdue · 4 min", condition: "Blocked", history: "v4 effective 07:00 · owner unchanged"
  }
];

export const criticalTimingMechanisms = ["No routine reporting", "Ad hoc / requested", "Fixed interval", "Fixed times", "Shift-based", "Event / exception triggered", "Supported combinations"] as const;
export const criticalTriggerExamples = ["Task or work pack starts", "Pause / block", "Resume", "Finish / completion", "Planned finish exceeded", "Significant condition change"] as const;
export const criticalSupportedFields = ["Completion / progress", "Operational condition", "Current position / focus", "Main delay / constraint", "Action / recovery", "Next target", "Forecast completion", "Resources / labour where configured", "Evidence / photo requirement", "Comment / update text"] as const;
export const criticalTemplates = ["Four-hour work-pack reporting", "Two-hour critical-task reporting", "Shift reporting", "Exception-only reporting"] as const;

export const recentActivity = [
  "07:38 · Morgan Lee updated inspection progress to 25%.",
  "07:34 · Taylor Chen superseded the previous Critical report: Blocked.",
  "07:31 · Burner hatch task recorded a Pause linked to an active delay.",
  "07:20 · Expansion joint task recorded a Tracker Pause event."
];

export const taskDashboardSections = ["Overview", "Execution", "People", "Discussion", "Delays / Problems", "Actions", "Evidence", "History", "Project / import / export context"] as const;
export const settingsSections = ["General", "Users", "Operational Mapping", "Project History", "Lifecycle"] as const;
export const importExportSections = ["Current Schedule", "Import", "Export", "History"] as const;

export const reviewRows: ReviewRow[] = [
  { item: "No configured project snapshot", source: "Static visual shell", state: "Not yet implemented", context: "Set a project ID for read-only API review" }
];

export function buildReviewRows(reviewData: ConsoleReviewData | null): ReviewRow[] {
  if (reviewData?.mode !== "live") return reviewRows;
  if (reviewData.snapshots.length === 0) return [{ item: "No imported snapshots", source: "Import review API", state: "No records returned", context: reviewData.projectId ?? "Project" }];
  const snapshots = reviewData.snapshots.map((snapshot) => ({
    item: snapshot.externalProjectName ?? `Snapshot ${snapshot.snapshotVersion}`,
    source: `Snapshot v${snapshot.snapshotVersion}`,
    state: `${snapshot.status} · ${snapshot.taskCount} tasks`,
    context: `Batch ${shortId(snapshot.importBatchId)}`
  }));
  const tasks = reviewData.snapshotDetail?.tasks.slice(0, 3).map((task) => ({
    item: task.name ?? task.externalId ?? "Unnamed imported task",
    source: task.summary ? "Summary task" : "Leaf task",
    state: "Imported task context",
    context: task.outlineNumber ?? task.wbs ?? "Imported task"
  })) ?? [];
  return [...snapshots, ...tasks];
}

export function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}
