import { describe, it, expect } from "vitest";
import { isDuplicateListing } from "../scripts/data/deduplicate";
import type { Community } from "../src/types/community";

const mockDatabase: Community[] = [
  {
    id: "python-telegram",
    slug: "python-telegram",
    title: "Python Developers Hub",
    platform: "telegram",
    category: "ai-tech",
    tags: ["python"],
    inviteUrl: "https://t.me/python_hub",
    verificationStatus: "source-confirmed",
    linkStatus: "active",
    sourceUrls: ["https://python.org"],
    discoveryMethod: "manual",
    discoveredAt: "2026-08-18T10:00:00.000Z",
    published: true,
  },
  {
    id: "astro-discord",
    slug: "astro-discord",
    title: "Astro Community",
    platform: "discord",
    category: "ai-tech",
    tags: ["astro"],
    inviteUrl: "https://discord.gg/astro",
    verificationStatus: "source-confirmed",
    linkStatus: "active",
    sourceUrls: ["https://astro.build"],
    discoveryMethod: "manual",
    discoveredAt: "2026-08-18T10:00:00.000Z",
    published: true,
  },
];

describe("Duplicate Detection Engine", () => {
  it("detects exact normalized invite URL match", () => {
    const candidate = {
      inviteUrl: "https://telegram.me/python_hub?start=abc",
      platform: "telegram",
      title: "Some Other Name",
    };
    const res = isDuplicateListing(candidate, mockDatabase);
    expect(res.isDuplicate).toBe(true);
    expect(res.matchedCommunity?.id).toBe("python-telegram");
  });

  it("detects same platform and identifier match", () => {
    const candidate = {
      inviteUrl: "https://discord.com/invite/astro",
      platform: "discord",
      title: "Astro Server",
    };
    const res = isDuplicateListing(candidate, mockDatabase);
    expect(res.isDuplicate).toBe(true);
    expect(res.matchedCommunity?.id).toBe("astro-discord");
  });

  it("detects identical title on the same platform", () => {
    const candidate = {
      inviteUrl: "https://t.me/another_link",
      platform: "telegram",
      title: "Python Developers Hub",
    };
    const res = isDuplicateListing(candidate, mockDatabase);
    expect(res.isDuplicate).toBe(true);
  });

  it("allows distinct non-duplicate communities", () => {
    const candidate = {
      inviteUrl: "https://t.me/rust_lang_global",
      platform: "telegram",
      title: "Rust Language Global",
      slug: "rust-lang-global-telegram",
    };
    const res = isDuplicateListing(candidate, mockDatabase);
    expect(res.isDuplicate).toBe(false);
  });
});
