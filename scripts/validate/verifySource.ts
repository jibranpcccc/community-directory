import { isSearchEngineOrRedirectUrl } from "../discover/geminiSearch";
import { extractCommunityIdentifier, normalizeInviteUrl } from "../data/normalizeUrl";

export interface SourceVerificationResult {
  isConfirmed: boolean;
  evidenceSnippet?: string;
  sourceUrl: string;
}

/**
 * Validates that an independent external source webpage actually contains
 * and references the specific community invite URL or token.
 */
export async function verifySourceMentionsInvite(
  sourceUrl: string | undefined | null,
  inviteUrl: string
): Promise<SourceVerificationResult> {
  const normInvite = normalizeInviteUrl(inviteUrl);
  if (!sourceUrl || !sourceUrl.startsWith("http") || isSearchEngineOrRedirectUrl(sourceUrl)) {
    return { isConfirmed: false, sourceUrl: normInvite };
  }

  const normSource = sourceUrl.trim();

  // If source is the same as the invite URL or another chat platform, it cannot be 'source-confirmed'
  if (
    normSource === normInvite ||
    normSource.includes("discord.gg") ||
    normSource.includes("t.me") ||
    normSource.includes("chat.whatsapp.com")
  ) {
    return { isConfirmed: false, sourceUrl: normInvite };
  }

  const identifier = extractCommunityIdentifier(normInvite);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(normSource, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { isConfirmed: false, sourceUrl: normInvite };
    }

    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // Check if full invite URL or identifier appears in the source page HTML
    const hasFullUrl = normInvite && lowerHtml.includes(normInvite.toLowerCase());
    const hasIdentifier = identifier && identifier.length > 3 && lowerHtml.includes(identifier.toLowerCase());

    if (hasFullUrl || hasIdentifier) {
      // Extract brief clean text snippet around the reference if possible
      let snippet: string | undefined;
      const target = (identifier || normInvite).toLowerCase();
      const idx = lowerHtml.indexOf(target);
      if (idx !== -1) {
        const start = Math.max(0, idx - 80);
        const end = Math.min(html.length, idx + 120);
        const rawSnippet = html.slice(start, end)
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (rawSnippet.length > 15) {
          snippet = rawSnippet;
        }
      }

      return {
        isConfirmed: true,
        evidenceSnippet: snippet,
        sourceUrl: normSource,
      };
    }

    // Source does not actually mention or link this community
    return { isConfirmed: false, sourceUrl: normInvite };
  } catch {
    // Network error or timeout: cannot confirm source
    return { isConfirmed: false, sourceUrl: normInvite };
  }
}
