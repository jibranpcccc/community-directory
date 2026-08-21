import { describe, it, expect } from "vitest";
import { ENABLED_COUNTRIES, TARGET_COUNTRIES } from "../src/config/countries";
import { platforms } from "../src/config/platforms";

describe("Public Route Scope Validation", () => {
  describe("Country Routes Scope", () => {
    it("enables all 14 major countries and GLOBAL for public routing", () => {
      const enabledCountryCodes = ENABLED_COUNTRIES.map((c) => c.code);
      expect(enabledCountryCodes).toEqual([
        "GLOBAL",
        "US",
        "GB",
        "CA",
        "AU",
        "IN",
        "DE",
        "NL",
        "SG",
        "AE",
        "PH",
        "NZ",
        "IE",
        "ZA",
      ]);
      expect(ENABLED_COUNTRIES).toHaveLength(14);
    });

    it("ensures all countries have valid slugs and flags", () => {
      const enabledSlugs = ENABLED_COUNTRIES.map((c) => c.slug);
      expect(enabledSlugs).toContain("global");
      expect(enabledSlugs).toContain("usa");
      expect(enabledSlugs).toContain("uk");
      expect(enabledSlugs).toContain("canada");
      expect(enabledSlugs).toContain("australia");
      expect(enabledSlugs).toContain("india");
      expect(enabledSlugs).toContain("germany");
      expect(enabledSlugs).toContain("netherlands");
      expect(enabledSlugs).toContain("singapore");
      expect(enabledSlugs).toContain("uae");
      expect(enabledSlugs).toContain("philippines");
      expect(enabledSlugs).toContain("new-zealand");
      expect(enabledSlugs).toContain("ireland");
      expect(enabledSlugs).toContain("south-africa");
    });
  });

  describe("Platform Routes Scope", () => {
    it("only includes configured platforms (discord, telegram, whatsapp) for public routing", () => {
      const configuredPlatforms = platforms.filter((p) => p.isConfigured);
      const configuredIds = configuredPlatforms.map((p) => p.id);

      expect(configuredIds.sort()).toEqual(["discord", "telegram", "whatsapp"].sort());
      expect(configuredPlatforms).toHaveLength(3);
    });

    it("ensures unconfigured future platforms (reddit, slack, skool, github) are excluded", () => {
      const configuredIds = platforms.filter((p) => p.isConfigured).map((p) => p.id);
      expect(configuredIds).not.toContain("reddit");
      expect(configuredIds).not.toContain("slack");
      expect(configuredIds).not.toContain("skool");
      expect(configuredIds).not.toContain("github");
    });
  });
});
