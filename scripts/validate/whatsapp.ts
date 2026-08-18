import { BOT_USER_AGENT, type LinkValidationResult } from "./validateUrl";
import { extractCommunityIdentifier } from "../data/normalizeUrl";

/**
 * Validates a public WhatsApp group link (https://chat.whatsapp.com/...).
 * Rejects placeholder/demo fixture codes and verifies invite page reachability.
 */
export async function validateWhatsappLink(url: string): Promise<LinkValidationResult> {
  const checkedAt = new Date().toISOString();
  const code = extractCommunityIdentifier(url, "whatsapp");

  if (!code) {
    return {
      url,
      status: "dead",
      message: "Missing WhatsApp invite code",
      checkedAt,
    };
  }

  // Reject demo fixture codes
  if (code.toLowerCase().includes("demo") || code.length < 15) {
    return {
      url,
      status: "dead",
      message: "Rejected: Demo or placeholder WhatsApp invite code",
      checkedAt,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BOT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        url,
        status: "dead",
        httpStatus: 404,
        message: "WhatsApp group not found or revoked",
        checkedAt,
      };
    }

    const html = await response.text();

    if (
      html.includes("Couldn't find this group") ||
      html.includes("Invite link is invalid") ||
      html.includes("This invite link was revoked")
    ) {
      return {
        url,
        status: "dead",
        httpStatus: 200,
        message: "WhatsApp invite link is invalid or revoked",
        checkedAt,
      };
    }

    // Extract group title from open graph metadata if available
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    const title = ogTitleMatch ? ogTitleMatch[1].replace(/WhatsApp Group Invite/i, "").trim() : undefined;

    return {
      url,
      status: "active",
      httpStatus: 200,
      message: "Valid WhatsApp group invite",
      checkedAt,
      extractedTitle: title || undefined,
    };
  } catch (e: any) {
    const isAbort = e.name === "AbortError";
    return {
      url,
      status: "unknown",
      message: isAbort ? "WhatsApp connection timed out" : `Network error: ${e.message}`,
      checkedAt,
    };
  }
}
