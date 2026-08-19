import { isSearchEngineOrRedirectUrl } from "../discover/geminiSearch";
import { normalizeInviteUrl } from "../data/normalizeUrl";
import { validateDiscordLink } from "./discord";

export interface SourceVerificationResult {
  isConfirmed: boolean;
  evidenceSnippet?: string;
  sourceUrl: string;
  matchedBy?: "exact-href" | "discord-guild-id";
  matchedGuildId?: string | null;
}

const HREF_LINK_REGEX =
  /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;

/**
 * Validates that an independent external source webpage actually links
 * to the specific community via an exact normalized outbound invite URL
 * or matching Discord guild ID.
 *
 * NOTE: Plain text keyword occurrence NEVER establishes source-confirmed.
 */
export async function verifySourceMentionsInvite(
  sourceUrl: string | undefined | null,
  inviteUrl: string,
  candidateGuildId?: string | null
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

    // 1. Extract all outbound <a href="..."> links from HTML
    const extractedOutboundLinks: { href: string; anchorText: string }[] = [];
    let linkMatch: RegExpExecArray | null;
    const hrefRegex = new RegExp(HREF_LINK_REGEX);

    while ((linkMatch = hrefRegex.exec(html)) !== null) {
      const rawHref = linkMatch[1];
      const anchor = linkMatch[2].replace(/<[^>]+>/g, " ").trim();
      extractedOutboundLinks.push({ href: rawHref, anchorText: anchor });
    }

    // 2. Check for exact normalized invite URL match in outbound links
    for (const item of extractedOutboundLinks) {
      const normOutbound = normalizeInviteUrl(item.href);
      if (normOutbound && normOutbound === normInvite) {
        let snippet = item.anchorText;
        if (!snippet || snippet.length < 5) {
          // Extract short surrounding sentence
          const idx = html.indexOf(item.href);
          if (idx !== -1) {
            const start = Math.max(0, idx - 80);
            const end = Math.min(html.length, idx + item.href.length + 80);
            snippet = html.slice(start, end)
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          }
        }

        return {
          isConfirmed: true,
          evidenceSnippet: snippet && snippet.length > 5 ? snippet.slice(0, 300) : undefined,
          sourceUrl: normSource,
          matchedBy: "exact-href",
          matchedGuildId: candidateGuildId || null,
        };
      }
    }

    // 3. For Discord: Check if source links a different invite for the SAME Discord guild
    if (candidateGuildId && normInvite.includes("discord.gg")) {
      const discordLinks = extractedOutboundLinks
        .map((l) => normalizeInviteUrl(l.href))
        .filter((u): u is string => Boolean(u && u.includes("discord.gg") && u !== normInvite));

      for (const otherDiscordUrl of discordLinks.slice(0, 3)) {
        try {
          const sourceDiscordValidation = await validateDiscordLink(otherDiscordUrl);
          if (
            sourceDiscordValidation.status === "active" &&
            sourceDiscordValidation.extractedGuildId === candidateGuildId
          ) {
            return {
              isConfirmed: true,
              evidenceSnippet: `Official Discord server linked on ${new URL(normSource).hostname}`,
              sourceUrl: normSource,
              matchedBy: "discord-guild-id",
              matchedGuildId: candidateGuildId,
            };
          }
        } catch {
          // Continue checking other links
        }
      }
    }

    // Outbound link does not match candidate invite URL
    return { isConfirmed: false, sourceUrl: normInvite };
  } catch {
    // Network error or timeout: cannot confirm source
    return { isConfirmed: false, sourceUrl: normInvite };
  }
}
