import "../utilities/loadEnv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { discoveryConfig } from "../../src/config/discovery";
import { extractCandidateUrls } from "./parseCandidates";
import type { DiscoveryProvider, DiscoveryResult } from "./discoverySources";
import type { PlatformId } from "../../src/types/community";

export class GeminiGoogleSearchProvider implements DiscoveryProvider {
  name = "gemini-google-search";

  isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async search(
    query: string,
    context?: { platform: PlatformId; category: string; subcategory?: string }
  ): Promise<DiscoveryResult[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return [];
    }

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

      let retries = 2;
      while (retries >= 0) {
        try {
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
          if (e.message?.includes("429") && retries > 0) {
            console.log(`    ⏳ Gemini rate limit reached (Free tier). Pausing 15s before retry...`);
            await new Promise((r) => setTimeout(r, 15000));
            retries--;
            continue;
          }
          console.warn(`[gemini-search] Search query "${query}" failed: ${e.message}`);
          return [];
        }
      }
    } catch (outerErr: any) {
      console.warn(`[gemini-search] Initialization failed: ${outerErr.message}`);
    }

    return [];
  }
}
