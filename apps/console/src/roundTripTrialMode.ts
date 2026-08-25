type RoundTripTrialEnv = Record<string, unknown>;

export type Tier1RoundTripRuntimeConfig = {
  enabled: boolean;
};

export const tier1RoundTripRuntimeConfig = buildTier1RoundTripConfig(import.meta.env);

export function buildTier1RoundTripConfig(env: RoundTripTrialEnv): Tier1RoundTripRuntimeConfig {
  return {
    enabled: env.VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL === "true"
  };
}
