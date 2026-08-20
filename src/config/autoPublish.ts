export interface AutoPublishConfig {
  enabled: boolean;
  dryRun: boolean;
  maxPerRun: number;
  maxValidationAgeHours: number;
  requireTargetCountry: boolean;
  requireStrongJobIntent: boolean;
  rejectSevereRisk: boolean;
  probationEnabled: boolean;
  probationMaxDays: number;
  tierBRequiredObservations: number;
  autoUnpublishUnknownAfter: number;
  platformWeights: {
    discord: number;
    telegram: number;
    whatsapp: number;
  };
  countryWeights: {
    US: number;
    GB: number;
    CA: number;
    AU: number;
    NZ: number;
    IE: number;
    SG: number;
    ZA: number;
  };
}

export const autoPublishConfig: AutoPublishConfig = {
  enabled: process.env.AUTO_PUBLISH_ENABLED === "true",
  dryRun: process.env.AUTO_PUBLISH_DRY_RUN === "true",
  maxPerRun: parseInt(process.env.AUTO_PUBLISH_MAX_PER_RUN || "50", 10),
  maxValidationAgeHours: parseInt(process.env.AUTO_PUBLISH_MAX_VALIDATION_AGE_HOURS || "24", 10),
  requireTargetCountry: true,
  requireStrongJobIntent: true,
  rejectSevereRisk: true,
  probationEnabled: true,
  probationMaxDays: parseInt(process.env.PROBATION_MAX_DAYS || "7", 10),
  tierBRequiredObservations: parseInt(process.env.TIER_B_REQUIRED_OBSERVATIONS || "2", 10),
  autoUnpublishUnknownAfter: parseInt(process.env.AUTO_UNPUBLISH_UNKNOWN_AFTER || "3", 10),
  platformWeights: {
    discord: 0.50,
    telegram: 0.35,
    whatsapp: 0.15,
  },
  countryWeights: {
    US: 0.30,
    GB: 0.20,
    CA: 0.15,
    AU: 0.10,
    NZ: 0.05,
    IE: 0.05,
    SG: 0.10,
    ZA: 0.05,
  },
};
