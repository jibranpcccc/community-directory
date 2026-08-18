import { BOT_USER_AGENT, type LinkValidationResult } from "./validateUrl";
import { extractCommunityIdentifier } from "../data/normalizeUrl";

/**
 * Validates a public Telegram link (e.g. https://t.me/example).
 * Performs deep semantic HTML inspection on the public preview page.
 * 
 * Rejects:
 * - Personal contact pages ("If you have Telegram, you can contact @...", "Contact @...")
 * - Non-existent/deleted handles
 * 
 * Accepts:
 * - Public channels/groups with subscriber/member counts or public preview descriptions.
 */
export async function validateTelegramLink(url: string): Promise<LinkValidationResult> {
  const checkedAt = new Date().toISOString();
  const username = extractCommunityIdentifier(url, "telegram");

  if (!username) {
    return {
      url,
      status: "dead",
      message: "Missing Telegram username or invite code",
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
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        url,
        status: "dead",
        httpStatus: 404,
        message: "Telegram channel/handle not found",
        checkedAt,
      };
    }

    const html = await response.text();

    // 1. Detect personal user contact page (NOT a community)
    const isContactOnly =
      html.includes("If you have Telegram, you can contact") ||
      html.includes("You can contact @") ||
      (html.includes("Contact @") && !html.includes("members") && !html.includes("subscribers"));

    if (isContactOnly) {
      return {
        url,
        status: "dead",
        httpStatus: 200,
        message: "Rejected: Personal contact page, not a public group or channel",
        checkedAt,
      };
    }

    // 2. Extract public metadata
    const titleMatch = html.match(/<div class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;

    const extraMatch = html.match(/<div class="tgme_page_extra"[^>]*>([\s\S]*?)<\/div>/);
    const extra = extraMatch ? extraMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    const descMatch = html.match(/<div class="tgme_page_description"[^>]*>([\s\S]*?)<\/div>/);
    const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;

    // Check if it has member/subscriber count
    let memberCount: number | null = null;
    const countMatch = extra.match(/([\d\s,]+)\s*(?:members|subscribers)/i);
    if (countMatch) {
      const cleanNum = parseInt(countMatch[1].replace(/[\s,]/g, ""), 10);
      if (!isNaN(cleanNum)) {
        memberCount = cleanNum;
      }
    }

    // Has valid community evidence
    const hasCommunityEvidence =
      extra.includes("members") ||
      extra.includes("subscribers") ||
      extra.includes("preview channel") ||
      html.includes("tgme_action_button_new");

    if (hasCommunityEvidence || (title && title.length > 0 && !isContactOnly)) {
      return {
        url,
        status: "active",
        httpStatus: 200,
        message: "Valid active Telegram community",
        checkedAt,
        extractedTitle: title,
        extractedDescription: desc,
        extractedMemberCount: memberCount,
      };
    }

    return {
      url,
      status: "unknown",
      httpStatus: response.status,
      message: "Insufficient public community preview evidence",
      checkedAt,
    };
  } catch (e: any) {
    const isAbort = e.name === "AbortError";
    return {
      url,
      status: "unknown",
      message: isAbort ? "Telegram connection timed out" : `Network error: ${e.message}`,
      checkedAt,
    };
  }
}
