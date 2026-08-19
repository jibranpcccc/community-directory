import { discoveryConfig } from "../../src/config/discovery";

/**
 * Sanitizes plain text input, strips HTML tags, and truncates to maxLength.
 */
export function sanitizePlainText(text?: string | null, maxLength: number = 500): string | null {
  if (!text || typeof text !== "string") return null;

  const stripped = text
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/[^\x20-\x7E\p{L}\p{N}\p{P}\p{Z}\n]/gu, "") // Clean control characters
    .trim();

  if (!stripped) return null;
  return stripped.length > maxLength ? stripped.slice(0, maxLength) + "..." : stripped;
}

/**
 * Checks description and title for suspicious financial or scam keywords.
 */
export function detectSafetyFlags(text?: string | null): string[] {
  if (!text) return [];

  const lower = text.toLowerCase();
  const flags: string[] = [];

  const scamKeywords = [
    ...(discoveryConfig.jobScamKeywords || []),
    ...(discoveryConfig.disallowedNicheKeywords || []),
  ];

  for (const kw of scamKeywords) {
    if (lower.includes(kw.toLowerCase())) {
      flags.push("potential-risk-language");
      break;
    }
  }

  return flags;
}
