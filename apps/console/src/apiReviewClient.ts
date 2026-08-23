import {
  createShutdownTrackerApiClient,
  shutdownTrackerReviewApiSurfaces
} from "@shutdown-tracker/api-client";
import type {
  ImportReviewSnapshotDetail,
  ImportReviewSnapshotSummary
} from "@shutdown-tracker/api-client";

type ConsoleReviewEnv = Record<string, unknown>;

export type ConsoleReviewRuntimeConfig = {
  baseUrl: string;
  projectId: string;
  importSnapshotId: string;
  liveEnabled: boolean;
};

export type ConsoleReviewData = {
  mode: "synthetic" | "live";
  projectId: string | null;
  snapshots: ImportReviewSnapshotSummary[];
  selectedSnapshotId: string | null;
  snapshotDetail: ImportReviewSnapshotDetail | null;
  message: string;
};

export type ConsoleReviewLoadState = {
  status: "synthetic" | "loading" | "loaded" | "error";
  message: string;
};

export type ShutdownTrackerReviewApiClient = ReturnType<typeof createShutdownTrackerApiClient>;

export const reviewApiRuntimeConfig = buildConsoleReviewConfig(import.meta.env);

export const reviewApiClient = createShutdownTrackerApiClient({
  baseUrl: reviewApiRuntimeConfig.baseUrl
});

const importReadSurfaces = shutdownTrackerReviewApiSurfaces.filter((surface) =>
  ["List import snapshots", "Read import snapshot"].includes(surface.label)
);

export const reviewApiConnection = {
  baseUrlLabel: reviewApiRuntimeConfig.baseUrl || "Relative API",
  projectIdLabel: reviewApiRuntimeConfig.projectId || "No project configured",
  modeLabel: reviewApiRuntimeConfig.liveEnabled ? "Live review data" : "Synthetic review data",
  operationCount: importReadSurfaces.length,
  highlightedSurfaces: importReadSurfaces,
  surfaces: importReadSurfaces
};

export function buildConsoleReviewConfig(env: ConsoleReviewEnv): ConsoleReviewRuntimeConfig {
  const baseUrl = cleanEnvValue(env.VITE_SHUTDOWN_TRACKER_API_BASE_URL);
  const projectId = cleanEnvValue(env.VITE_SHUTDOWN_TRACKER_PROJECT_ID);
  const importSnapshotId = cleanEnvValue(env.VITE_SHUTDOWN_TRACKER_IMPORT_SNAPSHOT_ID);

  return {
    baseUrl,
    projectId,
    importSnapshotId,
    liveEnabled: projectId.length > 0
  };
}

export function initialConsoleReviewLoadState(config = reviewApiRuntimeConfig): ConsoleReviewLoadState {
  if (config.liveEnabled) {
    return {
      status: "loading",
      message: "Fetching read-only import snapshot data."
    };
  }

  return {
    status: "synthetic",
    message: "Synthetic review data. Set a project id to fetch live review data."
  };
}

export async function loadConsoleReviewData(
  config = reviewApiRuntimeConfig,
  client: ShutdownTrackerReviewApiClient = reviewApiClient
): Promise<ConsoleReviewData> {
  if (!config.liveEnabled) {
    return {
      mode: "synthetic",
      projectId: null,
      snapshots: [],
      selectedSnapshotId: null,
      snapshotDetail: null,
      message: "Synthetic review data. Set VITE_SHUTDOWN_TRACKER_PROJECT_ID to fetch live review data."
    };
  }

  const snapshots = await client.importReview.listSnapshots(config.projectId);
  const selectedSnapshotId = selectSnapshotId(snapshots, config.importSnapshotId);

  const snapshotDetail = selectedSnapshotId === null
    ? null
    : await client.importReview.getSnapshot(config.projectId, selectedSnapshotId);

  return {
    mode: "live",
    projectId: config.projectId,
    snapshots,
    selectedSnapshotId,
    snapshotDetail,
    message: buildLoadedMessage(snapshots)
  };
}

export function formatConsoleReviewError(error: unknown) {
  if (error instanceof Error) {
    return `Review data could not be loaded: ${error.message}`;
  }

  return "Review data could not be loaded.";
}

function selectSnapshotId(snapshots: ImportReviewSnapshotSummary[], configuredSnapshotId: string) {
  if (configuredSnapshotId.length > 0) {
    return configuredSnapshotId;
  }

  return [...snapshots].sort((left, right) => right.snapshotVersion - left.snapshotVersion)[0]?.id ?? null;
}

function buildLoadedMessage(snapshots: ImportReviewSnapshotSummary[]) {
  const snapshotLabel = snapshots.length === 1 ? "snapshot" : "snapshots";
  return `${snapshots.length} import ${snapshotLabel} loaded read-only.`;
}

function cleanEnvValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
