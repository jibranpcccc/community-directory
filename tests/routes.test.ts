import { describe, it, expect } from "vitest";
import { ENABLED_COUNTRIES, TARGET_COUNTRIES } from "../src/config/countries";
import { platforms } from "../src/config/platforms";

describe("Public Route Scope Validation", () => {
  describe("Country Routes Scope", () => {
    it("only enables US, GB, CA, and AU for Phase 1 public routing", () => {
      const enabledCountryCodes = ENABLED_COUNTRIES.map((c) => c.code);
      expect(enabledCountryCodes).toEqual(["US", "GB", "CA", "AU"]);
      expect(ENABLED_COUNTRIES).toHaveLength(4);
    });

    it("ensures disabled future countries (NZ, IE) are excluded from ENABLED_COUNTRIES", () => {
      const enabledSlugs = ENABLED_COUNTRIES.map((c) => c.slug);
      expect(enabledSlugs).not.toContain("new-zealand");
      expect(enabledSlugs).not.toContain("ireland");

      // Verify they still exist in TARGET_COUNTRIES as disabled
      expect(TARGET_COUNTRIES.NZ.enabled).toBe(false);
      expect(TARGET_COUNTRIES.IE.enabled).toBe(false);
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
