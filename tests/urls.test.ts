import { describe, it, expect } from "vitest";
import { normalizeInviteUrl, extractCommunityIdentifier, generateSlug } from "../src/lib/urls";

describe("URL Normalization & Utilities", () => {
  it("normalizes Telegram URLs properly", () => {
    expect(normalizeInviteUrl("https://telegram.me/react_chat?start=123")).toBe("https://t.me/react_chat");
    expect(normalizeInviteUrl("http://t.me/vue_community/")).toBe("https://t.me/vue_community");
    expect(normalizeInviteUrl("t.me/my_group")).toBe("https://t.me/my_group");
  });

  it("normalizes Discord URLs properly", () => {
    expect(normalizeInviteUrl("https://discord.com/invite/astro-hub?utm_source=twitter")).toBe(
      "https://discord.gg/astro-hub"
    );
    expect(normalizeInviteUrl("https://discord.gg/astro-hub/")).toBe("https://discord.gg/astro-hub");
    expect(normalizeInviteUrl("discord.gg/my-server")).toBe("https://discord.gg/my-server");
  });

  it("normalizes WhatsApp URLs preserving case-sensitive invite code", () => {
    expect(normalizeInviteUrl("https://chat.whatsapp.com/AbCdEf12345?fbclid=xyz")).toBe(
      "https://chat.whatsapp.com/AbCdEf12345"
    );
    expect(normalizeInviteUrl("whatsapp.com/chat/AbCdEf12345")).toBe(
      "https://chat.whatsapp.com/AbCdEf12345"
    );
  });

  it("extracts unique platform community identifiers", () => {
    expect(extractCommunityIdentifier("https://t.me/python_devs")).toBe("python_devs");
    expect(extractCommunityIdentifier("https://discord.gg/reactiflux")).toBe("reactiflux");
    expect(extractCommunityIdentifier("https://chat.whatsapp.com/Kp78XyzDEMO")).toBe("Kp78XyzDEMO");
  });

  it("generates stable, URL-safe slugs with collision resolution", () => {
    const slug1 = generateSlug("Python Developers Global", "telegram");
    expect(slug1).toBe("python-developers-global-telegram");

    const slug2 = generateSlug("Python Developers Global", "telegram", ["python-developers-global-telegram"]);
    expect(slug2).toBe("python-developers-global-telegram-2");
  });

  it("identifies search engine and Vertex AI grounding redirect URLs", async () => {
    const { isSearchEngineOrRedirectUrl } = await import("../scripts/discover/geminiSearch");

    expect(isSearchEngineOrRedirectUrl("https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc123")).toBe(true);
    expect(isSearchEngineOrRedirectUrl("https://www.google.com/search?q=discord")).toBe(true);
    expect(isSearchEngineOrRedirectUrl("https://google.com/search")).toBe(true);
    expect(isSearchEngineOrRedirectUrl("https://duckduckgo.com/?q=telegram")).toBe(true);
    expect(isSearchEngineOrRedirectUrl("https://bing.com/search?q=whatsapp")).toBe(true);
    expect(isSearchEngineOrRedirectUrl("https://reproml.org")).toBe(false);
    expect(isSearchEngineOrRedirectUrl("https://react.dev")).toBe(false);
    expect(isSearchEngineOrRedirectUrl("https://github.com/astral-sh/uv")).toBe(false);
  });
});
