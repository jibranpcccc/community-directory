import "../utilities/loadEnv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { discoveryConfig } from "../../src/config/discovery";
import { extractCandidateUrls } from "./parseCandidates";
import { geminiKeyPool } from "../utilities/geminiPool";
import type { DiscoveryProvider, DiscoveryResult } from "./discoverySources";
import type { PlatformId } from "../../src/types/community";

export function isSearchEngineOrRedirectUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("google.com") ||
    lower.includes("vertexaisearch.cloud.google.com") ||
    lower.includes("grounding-api-redirect") ||
    lower.includes("googleapis.com") ||
    lower.includes("gstatic.com") ||
    lower.includes("bing.com") ||
    lower.includes("duckduckgo.com") ||
    lower.includes("yahoo.com")
  );
}

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
- Format each link on a separate line with only its community name next to it.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract real grounding sources from Gemini search metadata (strictly filter out search redirects)
        const candidateObj = result.response.candidates?.[0];
        const groundingMetadata = (candidateObj as any)?.groundingMetadata;
        const groundingChunks: any[] = groundingMetadata?.groundingChunks || [];
        const webSources: string[] = groundingChunks
          .map((c) => c.web?.uri)
          .filter((u): u is string => typeof u === "string" && u.startsWith("http") && !isSearchEngineOrRedirectUrl(u));

        // Extract candidate URLs from response text and web sources
        const combinedContent = `${responseText}\n${webSources.join("\n")}`;
        const primarySource = webSources.length > 0 ? webSources[0] : "";
        const candidates = extractCandidateUrls(combinedContent, primarySource);

        return candidates.map((cand) => {
          // Find genuine independent web source for this candidate, or fallback to the invite URL itself
          const matchingSource =
            webSources.find((s) => s.toLowerCase().includes(cand.platform) || !s.includes(cand.normalizedUrl)) ||
            (primarySource && !isSearchEngineOrRedirectUrl(primarySource) ? primarySource : cand.normalizedUrl);

          return {
            url: cand.normalizedUrl,
            sourceUrl: isSearchEngineOrRedirectUrl(matchingSource) ? cand.normalizedUrl : matchingSource,
            platform: cand.platform,
            snippet: cand.evidenceText,
            category: context?.category,
            subcategory: context?.subcategory,
          };
        });
      } catch (e: any) {
        if (
          e.message?.includes("429") ||
          e.message?.includes("403") ||
          e.message?.includes("Quota exceeded") ||
          e.message?.includes("RESOURCE_EXHAUSTED") ||
          e.message?.includes("denied access")
        ) {
          geminiKeyPool.markRateLimited(apiKey, 86400000);
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
