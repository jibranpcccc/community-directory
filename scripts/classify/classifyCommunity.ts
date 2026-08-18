import "../utilities/loadEnv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { categories } from "../../src/config/categories";
import { discoveryConfig } from "../../src/config/discovery";
import { geminiKeyPool } from "../utilities/geminiPool";
import { sanitizePlainText, detectSafetyFlags } from "./normalizeMetadata";
import type { PlatformId, AccessType, CommunityType } from "../../src/types/community";

export interface ClassificationResult {
  title: string;
  category: string;
  subcategory?: string | null;
  tags: string[];
  description?: string | null;
  language?: string | null;
  country?: string | null;
  accessType: AccessType;
  communityType: CommunityType;
  safetyFlags: string[];
  confidence: number;
}

/**
 * Classifies a candidate using Google Gemini API with strict structured output.
 * If GEMINI_API_KEY is not configured or errors, falls back cleanly to deterministic heuristic classification.
 */
export async function classifyCommunityWithGemini(candidate: {
  inviteUrl: string;
  platform: PlatformId;
  evidenceText?: string;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
}): Promise<ClassificationResult> {
  let poolRetries = Math.min(geminiKeyPool.getPoolSize(), 5);

  while (poolRetries > 0) {
    const apiKey = geminiKeyPool.getKey();
    if (!apiKey) break;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: discoveryConfig.geminiModel,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const prompt = `You are a strict data classifier for an online community directory.
Analyze the following public community candidate evidence:
- Platform: ${candidate.platform}
- Invite URL: ${candidate.inviteUrl}
- Raw Evidence Text: ${candidate.evidenceText || "No text"}
- Suggested Category: ${candidate.suggestedCategory || "ai-tech"}

Valid Category Slugs: ${categories.map((c) => `"${c.slug}"`).join(", ")}

STRICT RULES:
1. Use ONLY supplied evidence.
2. DO NOT invent or assume member counts, admin names, or fake claims.
3. If unknown, return null for description, language, or country.
4. Output strict JSON adhering to schema:
{
  "title": "Clean Community Name",
  "category": "one of the valid category slugs",
  "subcategory": "subcategory name or null",
  "tags": ["3-5 lowercase alphanumeric tags"],
  "description": "Factual 1-2 sentence description based on evidence or null",
  "language": "two-letter code e.g. en or null",
  "country": "two-letter code e.g. us or null",
  "accessType": "free" | "paid" | "mixed" | "unknown",
  "communityType": "discussion" | "education" | "signals" | "news" | "jobs" | "deals" | "support" | "other" | "unknown",
  "confidence": 0.0 to 1.0
}`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      const title = sanitizePlainText(parsed.title, 100) || `${candidate.platform} Community`;
      const description = sanitizePlainText(parsed.description, 400);
      const flags = detectSafetyFlags(`${title} ${description || ""}`);

      return {
        title,
        category: categories.some((c) => c.slug === parsed.category)
          ? parsed.category
          : candidate.suggestedCategory || "ai-tech",
        subcategory: parsed.subcategory || candidate.suggestedSubcategory || null,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.map((t: string) => t.toLowerCase().replace(/[^a-z0-9-]/g, "")).filter(Boolean).slice(0, 5)
          : ["community"],
        description,
        language: parsed.language || "en",
        country: parsed.country || null,
        accessType: parsed.accessType || "free",
        communityType: parsed.communityType || "discussion",
        safetyFlags: flags,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
      };
    } catch (e: any) {
      if (e.message?.includes("429") || e.message?.includes("Quota exceeded") || e.message?.includes("RESOURCE_EXHAUSTED")) {
        geminiKeyPool.markRateLimited(apiKey);
        poolRetries--;
        continue;
      }
      console.warn(`[classify] Gemini classification failed (${e.message}), using heuristic fallback.`);
      poolRetries--;
    }
  }

  // Deterministic Heuristic Fallback
  return fallbackHeuristicClassification(candidate);
}

/**
 * Heuristic fallback classifier when Gemini API is offline or unconfigured.
 */
export function fallbackHeuristicClassification(candidate: {
  inviteUrl: string;
  platform: PlatformId;
  evidenceText?: string;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
}): ClassificationResult {
  const parts = candidate.inviteUrl.split("/").filter(Boolean);
  const identifier = parts[parts.length - 1] || "Community";
  const cleanTitle = identifier
    .replace(/[_-]+/g, " ")
    .replace(/^(joinchat|invite)/i, "")
    .trim();

  const title = cleanTitle.length > 2
    ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
    : `${candidate.platform.toUpperCase()} Community`;

  const category = candidate.suggestedCategory || "ai-tech";
  const subcategory = candidate.suggestedSubcategory || null;

  const desc = candidate.evidenceText
    ? sanitizePlainText(candidate.evidenceText, 250)
    : `A public ${candidate.platform} community listed under ${category}.`;

  const flags = detectSafetyFlags(`${title} ${desc}`);

  return {
    title: sanitizePlainText(title, 80) || "Community",
    category,
    subcategory,
    tags: [candidate.platform, category.replace(/-/g, "")].slice(0, 3),
    description: desc,
    language: "en",
    country: null,
    accessType: "free",
    communityType: "discussion",
    safetyFlags: flags,
    confidence: 0.6,
  };
}
