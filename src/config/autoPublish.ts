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
    GLOBAL: number;
    US: number;
    GB: number;
    CA: number;
    AU: number;
    IN: number;
    DE: number;
    NL: number;
    SG: number;
    AE: number;
    PH: number;
    NZ: number;
    IE: number;
    ZA: number;
  };
}

export const autoPublishConfig: AutoPublishConfig = {
  enabled: process.env.AUTO_PUBLISH_ENABLED === "true",
  dryRun: process.env.AUTO_PUBLISH_DRY_RUN === "true",
  maxPerRun: parseInt(process.env.AUTO_PUBLISH_MAX_PER_RUN || "100", 10),
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
    GLOBAL: 0.20,
    US: 0.20,
    GB: 0.15,
    CA: 0.10,
    AU: 0.05,
    IN: 0.10,
    DE: 0.04,
    NL: 0.04,
    SG: 0.04,
    AE: 0.02,
    PH: 0.02,
    NZ: 0.015,
    IE: 0.015,
    ZA: 0.01,
  },
};
