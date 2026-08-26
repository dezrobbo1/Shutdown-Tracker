import type { LucideIcon } from "lucide-react";
import { CalendarClock, ListTree, Settings2, ShieldAlert, UploadCloud } from "lucide-react";
import type { ConsoleReviewData } from "./apiReviewClient";

export type ConsoleSection = "Today" | "Tasks" | "Critical" | "Import / Export" | "Project Settings";
export type StatusTone = "neutral" | "info" | "warning" | "danger" | "success";

export type ConsoleNavItem = { label: ConsoleSection; icon: LucideIcon };
export type ReviewRow = { item: string; source: string; state: string; context: string };

export const consoleNavItems: ConsoleNavItem[] = [
  { label: "Today", icon: CalendarClock },
  { label: "Tasks", icon: ListTree },
  { label: "Critical", icon: ShieldAlert },
  { label: "Import / Export", icon: UploadCloud },
  { label: "Project Settings", icon: Settings2 }
];

export const importExportSections = ["Current Schedule", "Import", "Export", "History"] as const;

export const reviewRows: ReviewRow[] = [
  { item: "No configured project snapshot", source: "Read-only import review", state: "Not configured", context: "Set a project ID to read existing snapshots" }
];

export function buildReviewRows(reviewData: ConsoleReviewData | null): ReviewRow[] {
  if (reviewData?.mode !== "live") return reviewRows;
  if (reviewData.snapshots.length === 0) return [{ item: "No imported snapshots", source: "Import review API", state: "No records returned", context: reviewData.projectId ?? "Project" }];
  const snapshots = reviewData.snapshots.map((snapshot) => ({
    item: snapshot.externalProjectName ?? `Snapshot ${snapshot.snapshotVersion}`,
    source: `Snapshot v${snapshot.snapshotVersion}`,
    state: `${snapshot.status} · ${snapshot.leafTaskCount} leaf tasks · ${snapshot.summaryTaskCount} summary rows`,
    context: `Batch ${shortId(snapshot.importBatchId)}`
  }));
  const tasks = reviewData.snapshotDetail?.tasks.slice(0, 3).map((task) => ({
    item: task.name ?? task.externalId ?? "Unnamed imported task",
    source: task.summary ? "Summary hierarchy row" : "Leaf task",
    state: task.summary ? "Imported hierarchy context" : "Imported leaf context",
    context: task.outlineNumber ?? task.wbs ?? "Imported task"
  })) ?? [];
  return [...snapshots, ...tasks];
}

export function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}
