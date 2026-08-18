import "../utilities/loadEnv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { discoveryConfig } from "../../src/config/discovery";
import { extractCandidateUrls } from "./parseCandidates";
import { geminiKeyPool } from "../utilities/geminiPool";
import type { DiscoveryProvider, DiscoveryResult } from "./discoverySources";
import type { PlatformId } from "../../src/types/community";

export class GeminiGoogleSearchProvider implements DiscoveryProvider {
  name = "gemini-google-search";

  isAvailable(): boolean {
    return geminiKeyPool.hasKeys();
  }

  async search(
    query: string,
    context?: { platform: PlatformId; category: string; subcategory?: string }
  ): Promise<DiscoveryResult[]> {
    let retries = Math.min(geminiKeyPool.getPoolSize(), 5);

    while (retries > 0) {
      const apiKey = geminiKeyPool.getKey();
      if (!apiKey) break;

      try {
        const genAI = new GoogleGenerativeAI(apiKey);

        const modelOptions: any = {
          model: discoveryConfig.geminiModel,
          generationConfig: {
            temperature: 0.2,
          },
        };

        if (discoveryConfig.geminiSearchEnabled) {
          modelOptions.tools = [{ googleSearch: {} } as any];
        }

        const model = genAI.getGenerativeModel(modelOptions);

        const prompt = `Search the public web for real, active public community invite links matching this query: "${query}".
Platform focus: ${context?.platform || "telegram, discord, or whatsapp"}.
Topic: ${context?.category || "general"}.

STRICT INSTRUCTIONS:
- Identify and list ONLY real, verifiable public invite URLs found in search results (e.g. https://t.me/..., https://discord.gg/..., https://chat.whatsapp.com/...).
- Do NOT generate synthetic, invented, or demo links.
- Include a brief quote or snippet from the search grounding source next to each URL.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract candidate URLs from response text
        const candidates = extractCandidateUrls(responseText, "gemini-search-grounding");

        return candidates.map((cand) => ({
          url: cand.normalizedUrl,
          sourceUrl: "https://google.com/search",
          platform: cand.platform,
          snippet: cand.evidenceText || responseText.slice(0, 200),
          category: context?.category,
          subcategory: context?.subcategory,
        }));
      } catch (e: any) {
        if (e.message?.includes("429") || e.message?.includes("Quota exceeded") || e.message?.includes("RESOURCE_EXHAUSTED")) {
          geminiKeyPool.markRateLimited(apiKey);
          retries--;
          continue;
        }
        console.warn(`[gemini-search] Search query "${query}" failed: ${e.message}`);
        retries--;
      }
    }

    return [];
  }
}
