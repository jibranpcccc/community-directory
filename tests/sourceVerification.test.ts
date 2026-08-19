import { describe, it, expect, vi } from "vitest";
import { verifySourceMentionsInvite } from "../scripts/validate/verifySource";

describe("Source Page Verification Engine", () => {
  it("rejects search engines, Google domains, and Vertex redirects", async () => {
    const res1 = await verifySourceMentionsInvite(
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/xyz123",
      "https://discord.gg/astro"
    );
    expect(res1.isConfirmed).toBe(false);

    const res2 = await verifySourceMentionsInvite(
      "https://www.google.com/search?q=discord",
      "https://discord.gg/astro"
    );
    expect(res2.isConfirmed).toBe(false);
  });

  it("rejects when source is the same as the invite URL or another chat platform", async () => {
    const res = await verifySourceMentionsInvite(
      "https://discord.gg/astro",
      "https://discord.gg/astro"
    );
    expect(res.isConfirmed).toBe(false);
  });

  it("confirms source when source page HTML actually contains the invite URL", async () => {
    // Mock global fetch for this test
    const mockHtml = `
      <html>
        <body>
          <h1>Official Astro Project</h1>
          <p>Join our community on Discord: <a href="https://discord.gg/astro">discord.gg/astro</a></p>
        </body>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const res = await verifySourceMentionsInvite(
      "https://astro.build",
      "https://discord.gg/astro"
    );

    expect(res.isConfirmed).toBe(true);
    expect(res.sourceUrl).toBe("https://astro.build");

    global.fetch = originalFetch;
  });

  it("strictly rejects when plain text keyword appears in HTML but NO outbound link exists", async () => {
    const mockHtml = `
      <html>
        <body>
          <h1>Welcome to the astro documentation</h1>
          <p>We love astro and everything built with astro.</p>
          <a href="https://github.com/withastro/astro">GitHub Repository</a>
        </body>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const res = await verifySourceMentionsInvite(
      "https://astro.build/docs",
      "https://discord.gg/astro"
    );

    // Plain text occurrence of "astro" MUST NOT confirm source!
    expect(res.isConfirmed).toBe(false);

    global.fetch = originalFetch;
  });

  it("strictly rejects when plain text URL appears in HTML with no <a href> link", async () => {
    const mockHtml = `
      <html>
        <body>
          <h1>Astro Documentation</h1>
          <p>You can join our chat at https://discord.gg/astro in your browser.</p>
        </body>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const res = await verifySourceMentionsInvite(
      "https://astro.build/docs",
      "https://discord.gg/astro"
    );

    // Plain text URL without an <a href="..."> link MUST NOT confirm source!
    expect(res.isConfirmed).toBe(false);

    global.fetch = originalFetch;
  });

  it("strictly rejects when source page HTML does not mention the invite token", async () => {
    const mockHtml = `
      <html>
        <body>
          <h1>Unrelated Blog Article</h1>
          <p>This article does not link to any community.</p>
        </body>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const res = await verifySourceMentionsInvite(
      "https://unrelated-blog.com/post",
      "https://discord.gg/astro"
    );

    expect(res.isConfirmed).toBe(false);

    global.fetch = originalFetch;
  });
});

describe("Classifier Zero-Fabrication Defaults", () => {
  it("defaults unknown metadata fields to null and unknown without guessing", async () => {
    const { fallbackHeuristicClassification } = await import("../scripts/classify/classifyCommunity");

    const result = fallbackHeuristicClassification({
      inviteUrl: "https://discord.gg/custom-code",
      platform: "discord",
      suggestedCategory: "ai-tech",
    });

    expect(result.language).toBeNull();
    expect(result.country).toBeNull();
    expect(result.accessType).toBe("unknown");
    expect(result.communityType).toBe("unknown");
    expect(result.description).toBeNull();
  });
});

describe("Gemini Key Pool Exhaustion Guard", () => {
  it("returns null gracefully when all keys in pool are throttled", async () => {
    const { geminiKeyPool } = await import("../scripts/utilities/geminiPool");

    // Temporarily rate limit all keys
    const poolSize = geminiKeyPool.getPoolSize();
    for (let i = 0; i < poolSize; i++) {
      const key = geminiKeyPool.getKey();
      if (key) {
        geminiKeyPool.markRateLimited(key, 999999);
      }
    }

    // Attempt to get key when all are throttled
    const exhaustedKey = geminiKeyPool.getKey();
    expect(exhaustedKey).toBeNull();
  });
});
