import { normalizeInviteUrl, extractCommunityIdentifier } from "../data/normalizeUrl";
import { detectPlatformFromUrl } from "../../src/config/platforms";
import type { PlatformId } from "../../src/types/community";

export interface CandidateDiscovery {
  candidateUrl: string;
  normalizedUrl: string;
  sourceUrl: string;
  platform: PlatformId;
  evidenceText?: string;
  extractedTitle?: string;
}

const URL_EXTRACTION_REGEX =
  /https?:\/\/(?:t\.me|telegram\.me|discord\.gg|discord\.com\/invite|chat\.whatsapp\.com)\/[a-zA-Z0-9_+%-]+/gi;

/**
 * Parses raw text or search snippets to extract concrete community invite URLs.
 */
export function extractCandidateUrls(
  content: string,
  sourceUrl: string = ""
): CandidateDiscovery[] {
  if (!content) return [];

  const matches = content.match(URL_EXTRACTION_REGEX) || [];
  const candidates: CandidateDiscovery[] = [];
  const seen = new Set<string>();
  const lines = content.split("\n");

  for (const rawUrl of matches) {
    const normalized = normalizeInviteUrl(rawUrl);
    if (!normalized || seen.has(normalized)) continue;

    // Filter out top-level or generic domain roots without token
    const identifier = extractCommunityIdentifier(normalized);
    if (!identifier || identifier.length < 2 || ["share", "join", "invite", "addstickers"].includes(identifier)) {
      continue;
    }

    const platform = detectPlatformFromUrl(normalized);
    if (platform) {
      seen.add(normalized);

      // Extract ONLY the specific line/sentence mentioning this exact URL
      const matchingLine = lines.find((l) => l.includes(rawUrl)) || "";
      const lineText = matchingLine
        .replace(URL_EXTRACTION_REGEX, "")
        .replace(/[*\-_#`[\]()]/g, " ")
        .trim();

      candidates.push({
        candidateUrl: rawUrl,
        normalizedUrl: normalized,
        sourceUrl: sourceUrl || normalized,
        platform,
        evidenceText: lineText.length > 5 ? lineText.slice(0, 200) : undefined,
      });
    }
  }

  return candidates;
}
