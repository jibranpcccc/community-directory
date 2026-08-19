import "../utilities/loadEnv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { categories } from "../../src/config/categories";
import { TARGET_COUNTRIES, type CountryCode } from "../../src/config/countries";
import { discoveryConfig } from "../../src/config/discovery";
import { geminiKeyPool } from "../utilities/geminiPool";
import { sanitizePlainText } from "./normalizeMetadata";
import { classifyJobScamRisk, isJobRelevant } from "../safety/jobRiskClassifier";
import type {
  PlatformId,
  AccessType,
  CommunityType,
  WorkArrangement,
  ExperienceLevel,
  VisaSponsorship,
} from "../../src/types/community";

export interface JobClassificationResult {
  title: string;
  category: string;
  subcategory?: string | null;
  tags: string[];
  description?: string | null;
  language?: string | null;
  country?: string | null;
  countryCode: CountryCode | null;
  city: string | null;
  jobTypes: string[];
  industries: string[];
  workArrangement: WorkArrangement;
  experienceLevels: ExperienceLevel[];
  visaSponsorship: VisaSponsorship;
  accessType: AccessType;
  communityType: CommunityType;
  safetyFlags: string[];
  isSevereScam: boolean;
  confidence: number;
}

/**
 * Classifies a job candidate using Google Gemini API with strict structured output.
 * If GEMINI_API_KEY is not configured or errors, falls back cleanly to deterministic heuristic classification.
 */
export async function classifyJobCommunityWithGemini(candidate: {
  inviteUrl: string;
  platform: PlatformId;
  evidenceText?: string;
  suggestedCountryCode?: CountryCode;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
  suggestedCity?: string;
}): Promise<JobClassificationResult> {
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

      const prompt = `You are a strict data classifier for a Tier-1 Job Alert Directory (US, UK, Canada, Australia).
Analyze the following job community candidate evidence:
- Platform: ${candidate.platform}
- Invite URL: ${candidate.inviteUrl}
- Raw Evidence Text: ${candidate.evidenceText || "No text"}
- Suggested Country Code: ${candidate.suggestedCountryCode || "None"}
- Suggested Category: ${candidate.suggestedCategory || "remote-jobs"}
- Suggested City: ${candidate.suggestedCity || "None"}

Valid Category Slugs: ${categories.map((c) => `"${c.slug}"`).join(", ")}
Target Country Codes: "US", "GB", "CA", "AU", "NZ", "IE", or null

STRICT ZERO-FABRICATION RULES:
1. Assign countryCode ONLY if explicit evidence mentions the target country/city. If ambiguous, return null.
2. Assign city ONLY if explicit evidence clearly mentions the city name. Otherwise return null.
3. If no description is in evidence, return null. Never fabricate filler text.
4. Output strict JSON adhering to schema:
{
  "title": "Clean Community Name",
  "category": "one of valid category slugs",
  "subcategory": "subcategory name or null",
  "tags": ["3-5 lowercase alphanumeric tags"],
  "countryCode": "US" | "GB" | "CA" | "AU" | "NZ" | "IE" | null,
  "city": "City name or null",
  "jobTypes": ["remote-jobs" | "full-time-jobs" | "internships" | "graduate-jobs" | "entry-level-jobs" | "contract-jobs" | "freelance-jobs" | "visa-sponsorship-jobs" | "government-jobs"],
  "industries": ["technology" | "software-engineering" | "ai-machine-learning" | "cybersecurity" | "data-analytics" | "healthcare-medical" | "nursing" | "finance-banking" | "accounting" | "marketing-sales" | "engineering-construction" | "education-teaching"],
  "workArrangement": "remote" | "hybrid" | "onsite" | "mixed" | "unknown",
  "experienceLevels": ["internship" | "entry-level" | "graduate" | "mid-level" | "senior" | "executive"],
  "visaSponsorship": "yes" | "no" | "mixed" | "unknown",
  "accessType": "free" | "paid" | "mixed" | "unknown",
  "communityType": "jobs" | "discussion" | "education" | "support" | "unknown",
  "confidence": 0.0 to 1.0
}`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      const title = sanitizePlainText(parsed.title, 100) || `${candidate.platform} Job Group`;
      const combinedText = `${title} ${candidate.evidenceText || ""}`;
      const scamCheck = classifyJobScamRisk(combinedText);

      let finalCountryCode: CountryCode | null = null;
      if (typeof parsed.countryCode === "string") {
        const codeUpper = parsed.countryCode.toUpperCase() as CountryCode;
        if (["US", "GB", "CA", "AU", "NZ", "IE"].includes(codeUpper)) {
          finalCountryCode = codeUpper;
        }
      }
      if (!finalCountryCode && candidate.suggestedCountryCode) {
        // Only assign suggested country if evidence contains relevant country/metro term
        const cConfig = TARGET_COUNTRIES[candidate.suggestedCountryCode];
        if (cConfig) {
          const lowerEvidence = combinedText.toLowerCase();
          const hasCountryEvidence =
            lowerEvidence.includes(cConfig.name.toLowerCase()) ||
            lowerEvidence.includes(cConfig.shortName.toLowerCase()) ||
            cConfig.cities.some((city) => lowerEvidence.includes(city.toLowerCase()));
          if (hasCountryEvidence) {
            finalCountryCode = candidate.suggestedCountryCode;
          }
        }
      }

      let finalCity: string | null = null;
      if (typeof parsed.city === "string" && parsed.city.trim().length > 1) {
        finalCity = sanitizePlainText(parsed.city, 60);
      } else if (candidate.suggestedCity && combinedText.toLowerCase().includes(candidate.suggestedCity.toLowerCase())) {
        finalCity = candidate.suggestedCity;
      }

      return {
        title,
        category: categories.some((c) => c.slug === parsed.category)
          ? parsed.category
          : candidate.suggestedCategory || "remote-jobs",
        subcategory: parsed.subcategory || candidate.suggestedSubcategory || null,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.map((t: string) => t.toLowerCase().replace(/[^a-z0-9-]/g, "")).filter(Boolean).slice(0, 5)
          : ["jobs", "careers"],
        description: null, // Priority handled by crawler
        language: "en",
        country: finalCountryCode,
        countryCode: finalCountryCode,
        city: finalCity,
        jobTypes: Array.isArray(parsed.jobTypes) ? parsed.jobTypes : ["remote-jobs"],
        industries: Array.isArray(parsed.industries) ? parsed.industries : [],
        workArrangement: ["remote", "hybrid", "onsite", "mixed"].includes(parsed.workArrangement)
          ? parsed.workArrangement
          : "unknown",
        experienceLevels: Array.isArray(parsed.experienceLevels)
          ? (parsed.experienceLevels as string[])
              .map((el) => el.toLowerCase().trim())
              .filter((el) =>
                ["internship", "entry-level", "graduate", "mid-level", "senior", "executive"].includes(el)
              ) as ExperienceLevel[]
          : [],
        visaSponsorship: ["yes", "no", "mixed"].includes(parsed.visaSponsorship)
          ? parsed.visaSponsorship
          : "unknown",
        accessType: ["free", "paid", "mixed"].includes(parsed.accessType) ? parsed.accessType : "unknown",
        communityType: ["jobs", "discussion", "education", "support"].includes(parsed.communityType)
          ? parsed.communityType
          : "jobs",
        safetyFlags: scamCheck.safetyFlags,
        isSevereScam: scamCheck.isSevereScam,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
      };
    } catch (e: any) {
      if (
        e.message?.includes("429") ||
        e.message?.includes("403") ||
        e.message?.includes("Quota exceeded") ||
        e.message?.includes("RESOURCE_EXHAUSTED") ||
        e.message?.includes("denied access")
      ) {
        geminiKeyPool.markRateLimited(apiKey, 86400000);
        poolRetries--;
        continue;
      }
      console.warn(`[classify] Gemini classification failed (${e.message}), using heuristic fallback.`);
      poolRetries--;
    }
  }

  // Deterministic Heuristic Fallback
  return fallbackHeuristicJobClassification(candidate);
}

/**
 * Heuristic fallback classifier for jobs when Gemini API is unavailable.
 */
export function fallbackHeuristicJobClassification(candidate: {
  inviteUrl: string;
  platform: PlatformId;
  evidenceText?: string;
  suggestedCountryCode?: CountryCode;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
  suggestedCity?: string;
}): JobClassificationResult {
  const parts = candidate.inviteUrl.split("/").filter(Boolean);
  const identifier = parts[parts.length - 1] || "Job Group";
  const cleanTitle = identifier
    .replace(/[_-]+/g, " ")
    .replace(/^(joinchat|invite)/i, "")
    .trim();

  const title = cleanTitle.length > 2
    ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
    : `${candidate.platform.toUpperCase()} Job Alerts`;

  const category = candidate.suggestedCategory || "remote-jobs";
  const subcategory = candidate.suggestedSubcategory || null;
  const combinedText = `${title} ${candidate.evidenceText || ""}`;
  const scamCheck = classifyJobScamRisk(combinedText);

  let countryCode: CountryCode | null = null;
  if (candidate.suggestedCountryCode) {
    const cConfig = TARGET_COUNTRIES[candidate.suggestedCountryCode];
    if (cConfig) {
      const lower = combinedText.toLowerCase();
      if (
        lower.includes(cConfig.name.toLowerCase()) ||
        lower.includes(cConfig.shortName.toLowerCase()) ||
        cConfig.cities.some((city) => lower.includes(city.toLowerCase()))
      ) {
        countryCode = candidate.suggestedCountryCode;
      }
    }
  }

  let city: string | null = null;
  if (candidate.suggestedCity && combinedText.toLowerCase().includes(candidate.suggestedCity.toLowerCase())) {
    city = candidate.suggestedCity;
  }

  const safetyFlags = scamCheck.safetyFlags.length > 0
    ? Array.from(new Set([...scamCheck.safetyFlags, "potential-risk-language"]))
    : [];

  return {
    title: sanitizePlainText(title, 80) || "Job Group",
    category,
    subcategory,
    tags: [candidate.platform, "jobs", category.replace(/-/g, "")].slice(0, 4),
    description: null,
    language: null,
    country: countryCode,
    countryCode,
    city,
    jobTypes: [category],
    industries: [],
    workArrangement: "unknown",
    experienceLevels: [],
    visaSponsorship: "unknown",
    accessType: "unknown",
    communityType: "unknown",
    safetyFlags,
    isSevereScam: scamCheck.isSevereScam,
    confidence: 0.6,
  };
}
