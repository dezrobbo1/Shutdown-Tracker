type TrialConsoleEnv = Record<string, unknown>;

export type TrialConsoleRuntimeConfig = {
  enabled: boolean;
  tier1RoundTripEnabled: boolean;
  mobileTrialUrl: string;
};

export const trialConsoleRuntimeConfig = buildTrialConsoleConfig(import.meta.env);

export function buildTrialConsoleConfig(env: TrialConsoleEnv): TrialConsoleRuntimeConfig {
  return {
    enabled: env.VITE_SHUTDOWN_TRACKER_TRIAL_MODE === "true",
    tier1RoundTripEnabled: env.VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL === "true",
    mobileTrialUrl: cleanEnvValue(env.VITE_SHUTDOWN_TRACKER_MOBILE_TRIAL_URL)
  };
}

function cleanEnvValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
