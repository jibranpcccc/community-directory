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

  it("rejects when source page HTML does not mention the invite token", async () => {
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
