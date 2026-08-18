import { describe, it, expect } from "vitest";
import {
  platforms,
  getPlatformById,
  getActivePlatforms,
  detectPlatformFromUrl,
} from "../src/config/platforms";
import {
  normalizeInviteUrl,
  extractCommunityIdentifier,
  generateSlug,
} from "../src/lib/urls";

describe("Platform Configuration & Registry", () => {
  it("contains complete platform definitions for all supported and planned platforms", () => {
    const expectedPlatformIds = [
      "telegram",
      "discord",
      "whatsapp",
      "reddit",
      "slack",
      "skool",
      "github",
    ];

    const definedIds = platforms.map((p) => p.id);
    for (const expectedId of expectedPlatformIds) {
      expect(definedIds).toContain(expectedId);
    }
  });

  it("retrieves platform config by valid ID and returns undefined for unknown ID", () => {
    const tg = getPlatformById("telegram");
    expect(tg).toBeDefined();
    expect(tg?.name).toBe("Telegram");

    const discord = getPlatformById("discord");
    expect(discord).toBeDefined();
    expect(discord?.name).toBe("Discord");

    const whatsapp = getPlatformById("whatsapp");
    expect(whatsapp).toBeDefined();
    expect(whatsapp?.name).toBe("WhatsApp");

    expect(getPlatformById("matrix")).toBeUndefined();
    expect(getPlatformById("irc")).toBeUndefined();
    expect(getPlatformById("")).toBeUndefined();
  });

  it("filters only active (configured) platforms for directory discovery and display", () => {
    const active = getActivePlatforms();
    const activeIds = active.map((p) => p.id);

    expect(activeIds).toEqual(["telegram", "discord", "whatsapp"]);
    expect(active.every((p) => p.isConfigured)).toBe(true);

    const inactivePlatforms = platforms.filter((p) => !p.isConfigured);
    expect(inactivePlatforms.map((p) => p.id)).toEqual(["reddit", "slack", "skool", "github"]);
  });

  it("detects platform type from various URL structures and domain aliases", () => {
    // Telegram
    expect(detectPlatformFromUrl("https://t.me/python_devs")).toBe("telegram");
    expect(detectPlatformFromUrl("http://telegram.me/crypto_hub")).toBe("telegram");
    expect(detectPlatformFromUrl("https://telegram.dog/joinchat/xyz")).toBe("telegram");
    expect(detectPlatformFromUrl("t.me/rust_lang")).toBe("telegram");

    // Discord
    expect(detectPlatformFromUrl("https://discord.gg/reactiflux")).toBe("discord");
    expect(detectPlatformFromUrl("https://discord.com/invite/astro")).toBe("discord");
    expect(detectPlatformFromUrl("https://discordapp.com/invite/vue")).toBe("discord");
    expect(detectPlatformFromUrl("discord.gg/openai")).toBe("discord");

    // WhatsApp
    expect(detectPlatformFromUrl("https://chat.whatsapp.com/Kp78XyzDEMO")).toBe("whatsapp");
    expect(detectPlatformFromUrl("https://whatsapp.com/chat/Kp78XyzDEMO")).toBe("whatsapp");
    expect(detectPlatformFromUrl("chat.whatsapp.com/AbCdEf123")).toBe("whatsapp");

    // Planned platforms
    expect(detectPlatformFromUrl("https://reddit.com/r/programming")).toBe("reddit");
    expect(detectPlatformFromUrl("https://www.reddit.com/r/webdev")).toBe("reddit");
    expect(detectPlatformFromUrl("https://join.slack.com/t/tech-group/shared_invite/zt-123")).toBe("slack");
    expect(detectPlatformFromUrl("https://skool.com/ai-builders")).toBe("skool");
    expect(detectPlatformFromUrl("https://github.com/facebook/react/discussions")).toBe("github");

    // Unrecognized or invalid
    expect(detectPlatformFromUrl("https://google.com")).toBeNull();
    expect(detectPlatformFromUrl("https://example.com/some/path")).toBeNull();
    expect(detectPlatformFromUrl("not-a-valid-url")).toBeNull();
  });
});

describe("Platform Badge Design & Color Tokens", () => {
  it("defines distinctive, high-contrast Neo-Brutalist color tokens for every platform", () => {
    for (const p of platforms) {
      expect(p.badgeBg).toBeDefined();
      expect(p.badgeBg).toContain("border-2 border-black");
      expect(p.badgeBg).toContain("shadow-[1.5px_1.5px_0px_0px_#000]");
      expect(p.badgeText).toBe("text-black");
      expect(p.icon).toBeTruthy();
    }

    // Specific color validations
    expect(getPlatformById("telegram")?.badgeBg).toContain("bg-[#BAE6FD]");
    expect(getPlatformById("discord")?.badgeBg).toContain("bg-[#DDD6FE]");
    expect(getPlatformById("whatsapp")?.badgeBg).toContain("bg-[#A7F3D0]");
    expect(getPlatformById("reddit")?.badgeBg).toContain("bg-[#FED7AA]");
    expect(getPlatformById("slack")?.badgeBg).toContain("bg-[#FBCFE8]");
    expect(getPlatformById("skool")?.badgeBg).toContain("bg-[#FEF08A]");
    expect(getPlatformById("github")?.badgeBg).toContain("bg-[#E2E8F0]");
  });
});

describe("URL Normalization Across Complex Edge Cases", () => {
  describe("Telegram Normalization", () => {
    it("converts telegram.me and telegram.dog to canonical t.me", () => {
      expect(normalizeInviteUrl("https://telegram.me/react_chat")).toBe("https://t.me/react_chat");
      expect(normalizeInviteUrl("http://telegram.dog/vue_chat")).toBe("https://t.me/vue_chat");
    });

    it("strips tracking parameters while preserving channel/group identifier", () => {
      expect(
        normalizeInviteUrl("https://t.me/python_devs?start=ref123&utm_source=twitter")
      ).toBe("https://t.me/python_devs");
    });

    it("handles multiple trailing slashes cleanly", () => {
      expect(normalizeInviteUrl("https://t.me/community_hub///")).toBe("https://t.me/community_hub");
      expect(normalizeInviteUrl("http://t.me/group/")).toBe("https://t.me/group");
    });

    it("handles Telegram private invite link formats (+hash and joinchat)", () => {
      expect(normalizeInviteUrl("https://t.me/+AbCdEfGhIjKlMnOp")).toBe(
        "https://t.me/+AbCdEfGhIjKlMnOp"
      );
      expect(normalizeInviteUrl("https://telegram.me/joinchat/AAAAAFxyz123")).toBe(
        "https://t.me/joinchat/AAAAAFxyz123"
      );
    });

    it("handles URLs without protocol", () => {
      expect(normalizeInviteUrl("t.me/my_cool_channel")).toBe("https://t.me/my_cool_channel");
      expect(normalizeInviteUrl("telegram.me/joinchat/12345")).toBe(
        "https://t.me/joinchat/12345"
      );
    });
  });

  describe("Discord Normalization", () => {
    it("rewrites discord.com/invite and discordapp.com/invite to discord.gg", () => {
      expect(normalizeInviteUrl("https://discord.com/invite/astro-hub")).toBe(
        "https://discord.gg/astro-hub"
      );
      expect(normalizeInviteUrl("http://discordapp.com/invite/astro-hub")).toBe(
        "https://discord.gg/astro-hub"
      );
      expect(
        normalizeInviteUrl("https://discord.com/invite/reactiflux?utm_source=twitter&ref=blog")
      ).toBe("https://discord.gg/reactiflux");
    });

    it("preserves exact case-sensitive invite codes", () => {
      expect(normalizeInviteUrl("https://discord.com/invite/AbCd123XyZ")).toBe(
        "https://discord.gg/AbCd123XyZ"
      );
      expect(normalizeInviteUrl("discord.gg/7kLpQm9")).toBe("https://discord.gg/7kLpQm9");
    });

    it("strips trailing slashes from discord URLs", () => {
      expect(normalizeInviteUrl("https://discord.gg/astro-hub///")).toBe(
        "https://discord.gg/astro-hub"
      );
      expect(normalizeInviteUrl("https://discord.com/invite/astro-hub/")).toBe(
        "https://discord.gg/astro-hub"
      );
    });
  });

  describe("WhatsApp Normalization", () => {
    it("rewrites whatsapp.com/chat to chat.whatsapp.com", () => {
      expect(normalizeInviteUrl("https://whatsapp.com/chat/Kp78XyzDEMO")).toBe(
        "https://chat.whatsapp.com/Kp78XyzDEMO"
      );
      expect(normalizeInviteUrl("http://whatsapp.com/chat/AbCdEf123/")).toBe(
        "https://chat.whatsapp.com/AbCdEf123"
      );
    });

    it("strictly preserves case sensitivity of WhatsApp invite tokens", () => {
      const inviteToken = "aBcDeFgHiJkLmNoP12345";
      expect(normalizeInviteUrl(`https://chat.whatsapp.com/${inviteToken}`)).toBe(
        `https://chat.whatsapp.com/${inviteToken}`
      );
    });

    it("strips tracking and referrer query strings from WhatsApp links", () => {
      expect(
        normalizeInviteUrl("https://chat.whatsapp.com/AbCdEf12345?fbclid=xyz&utm_medium=social")
      ).toBe("https://chat.whatsapp.com/AbCdEf12345");
    });

    it("handles multiple trailing slashes", () => {
      expect(normalizeInviteUrl("https://chat.whatsapp.com/Kp78XyzDEMO///")).toBe(
        "https://chat.whatsapp.com/Kp78XyzDEMO"
      );
    });
  });

  describe("Generic Platforms & Resilient Fallbacks", () => {
    it("normalizes generic URLs by adding https and removing trailing slashes", () => {
      expect(normalizeInviteUrl("reddit.com/r/programming/")).toBe(
        "https://reddit.com/r/programming"
      );
      expect(normalizeInviteUrl("github.com/facebook/react/")).toBe(
        "https://github.com/facebook/react"
      );
    });

    it("trims external whitespace around URLs", () => {
      expect(normalizeInviteUrl("   https://t.me/clean_link   ")).toBe("https://t.me/clean_link");
    });

    it("returns empty string for invalid or non-string inputs", () => {
      expect(normalizeInviteUrl("")).toBe("");
      expect(normalizeInviteUrl(null as any)).toBe("");
      expect(normalizeInviteUrl(undefined as any)).toBe("");
    });
  });
});

describe("Community Identifier Extraction", () => {
  it("extracts unique platform identifiers accurately", () => {
    expect(extractCommunityIdentifier("https://t.me/python_devs")).toBe("python_devs");
    expect(extractCommunityIdentifier("https://telegram.me/joinchat/AAAAAFxyz")).toBe(
      "AAAAAFxyz"
    );
    expect(extractCommunityIdentifier("https://discord.gg/reactiflux")).toBe("reactiflux");
    expect(extractCommunityIdentifier("https://discord.com/invite/astro-hub?ref=123")).toBe(
      "astro-hub"
    );
    expect(extractCommunityIdentifier("https://chat.whatsapp.com/Kp78XyzDEMO")).toBe(
      "Kp78XyzDEMO"
    );
  });

  it("handles URLs with trailing slashes gracefully during extraction", () => {
    expect(extractCommunityIdentifier("https://t.me/python_devs///")).toBe("python_devs");
    expect(extractCommunityIdentifier("https://discord.gg/astro-hub/")).toBe("astro-hub");
    expect(extractCommunityIdentifier("https://chat.whatsapp.com/Kp78XyzDEMO///")).toBe(
      "Kp78XyzDEMO"
    );
  });
});

describe("Slug Generator & Collision Handling", () => {
  it("generates clean, URL-safe slugs with platform suffix", () => {
    expect(generateSlug("Astro Lounge", "discord")).toBe("astro-lounge-discord");
    expect(generateSlug("Python Developers Global", "telegram")).toBe(
      "python-developers-global-telegram"
    );
    expect(generateSlug("DeFi Traders WhatsApp", "whatsapp")).toBe(
      "defi-traders-whatsapp-whatsapp"
    );
  });

  it("strips special characters, symbols, and punctuation", () => {
    expect(generateSlug("🔥 React & Next.js [Pro] (Official) #1", "discord")).toBe(
      "react-nextjs-pro-official-1-discord"
    );
  });

  it("resolves slug collisions progressively", () => {
    const existing = ["python-hub-discord", "python-hub-discord-2"];
    const newSlug = generateSlug("Python Hub", "discord", existing);
    expect(newSlug).toBe("python-hub-discord-3");
  });
});
