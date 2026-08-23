import type { LucideIcon } from "lucide-react";
import { CalendarClock, ListTree, Settings2, ShieldAlert, UploadCloud } from "lucide-react";
import type { ConsoleReviewData } from "./apiReviewClient";

export type ConsoleSection = "Today" | "Tasks" | "Critical" | "Import / Export" | "Project Settings";
export type ProjectStatus = "Active" | "Draft" | "Closed" | "Archived";
export type TaskState = "Not Started" | "In Progress" | "Paused" | "Blocked" | "Completed";
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
  reportingMode: string;
  latestReport: string;
  nextDue: string;
  reportingState: string;
  condition: string;
};
export type ReviewRow = { item: string; source: string; state: string; context: string };
export type ExportPreviewRow = { field: string; candidate: string; eligibility: string };

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
  { id: "1.1.1", wbs: "1.1.1", depth: 2, summary: false, name: "Remove cyclone access cover", workPackage: "Mechanical access", tier2Owner: "Morgan Lee", state: "Completed", stateEvidence: "Tracker Complete event 07:05", attention: "None", planned: "24 Aug 06:00 – 24 Aug 07:15", progress: 100, lastUpdate: "07:05" },
  { id: "1.1.2", wbs: "1.1.2", depth: 2, summary: false, name: "Inspect refractory lining", workPackage: "Refractory inspection", tier2Owner: "Morgan Lee", state: "In Progress", stateEvidence: "Tracker Start event 07:12", attention: "No recent update · 26 min", planned: "24 Aug 07:00 – 24 Aug 09:30", progress: 25, lastUpdate: "07:12" },
  { id: "1.2.1", wbs: "1.2.1", depth: 2, summary: false, name: "Isolate feed transfer chute", workPackage: "Isolation and access", tier2Owner: "Avery Singh", state: "Not Started", stateEvidence: "No Tracker start; imported progress 0%", attention: "Late to Start · planned 06:30", planned: "24 Aug 06:30 – 24 Aug 08:00", progress: 0, lastUpdate: "No execution update" },
  { id: "1.3.2", wbs: "1.3.2", depth: 2, summary: false, name: "Replace expansion joint", workPackage: "Ducting repairs", tier2Owner: "Jordan Kim", state: "Paused", stateEvidence: "Tracker Pause event 07:20", attention: "Action due 08:15", planned: "24 Aug 06:45 – 24 Aug 10:30", progress: 18, lastUpdate: "07:20" },
  { id: "1.4.1", wbs: "1.4.1", depth: 2, summary: false, name: "Remove burner inspection hatch", workPackage: "Burner overhaul", tier2Owner: "Taylor Chen", state: "Blocked", stateEvidence: "Tracker Block event 07:31", attention: "Active delay · access permit", planned: "24 Aug 07:00 – 24 Aug 08:30", progress: 10, lastUpdate: "07:31" }
];

export const criticalItems: CriticalItem[] = [
  { id: "critical-1", sourceType: "Project-critical leaf", name: "Inspect refractory lining", scope: "Selected leaf task · Project Critical is imported context only", reportingOwner: "Morgan Lee · Tier 2", reportingMode: "Fixed interval · 2 hours", latestReport: "On plan · 07:20", nextDue: "09:20", reportingState: "Due in 1h 40m", condition: "On plan" },
  { id: "critical-2", sourceType: "Critical Work Pack", name: "Cyclone access and inspection", scope: "Summary task 1.1 plus all descendants", reportingOwner: "Morgan Lee · Tier 2", reportingMode: "Fixed times · 06:00 / 12:00 / 18:00", latestReport: "At risk · 06:02", nextDue: "12:00", reportingState: "Current", condition: "At risk" },
  { id: "critical-3", sourceType: "Project-critical leaf", name: "Remove burner inspection hatch", scope: "Explicitly selected leaf task", reportingOwner: "Taylor Chen · Tier 2", reportingMode: "Ad hoc", latestReport: "Blocked · 07:34", nextDue: "Now", reportingState: "Overdue · 4 min", condition: "Blocked" }
];

export const recentActivity = [
  "07:38 · Morgan Lee updated inspection progress to 25%.",
  "07:34 · Taylor Chen superseded the previous Critical report: Blocked.",
  "07:31 · Burner hatch task recorded a Tracker Block event.",
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
    state: task.summary ? "Read-only context" : "Candidate context",
    context: task.outlineNumber ?? task.wbs ?? "Imported task"
  })) ?? [];
  return [...snapshots, ...tasks];
}

export const exportPreviewRows: ExportPreviewRow[] = [
  { field: "Candidate preview", candidate: "No configured export batch", eligibility: "Review workspace available when enabled" }
];

export function buildExportPreviewRows(reviewData: ConsoleReviewData | null): ExportPreviewRow[] {
  if (reviewData?.mode !== "live") return exportPreviewRows;
  if (reviewData.exportPreview === null) return [{ field: "Candidate preview", candidate: "No export batch configured", eligibility: "Set the export batch ID to load read-only data" }];
  if (reviewData.exportPreview.lines.length === 0) return [{ field: "Candidate preview", candidate: "No preview lines", eligibility: "No candidates returned" }];
  return reviewData.exportPreview.lines.slice(0, 5).map((line) => ({
    field: line.fieldName,
    candidate: line.importedTaskName ?? line.importedTaskExternalId ?? line.importedTaskId,
    eligibility: line.exportEligible ? "Eligible leaf update" : "Held from candidate"
  }));
}

export function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}
