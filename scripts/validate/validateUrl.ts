import type { LinkStatus } from "../../src/types/community";

export interface LinkValidationResult {
  url: string;
  status: LinkStatus;
  httpStatus?: number;
  message?: string;
  checkedAt: string;
  extractedTitle?: string;
  extractedDescription?: string;
  extractedMemberCount?: number | null;
  extractedGuildId?: string;
}

export const BOT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (Compatible; CommunityHubBot/1.0; +https://communityhub-directory.netlify.app)";

/**
 * Performs a basic HTTP link check with timeout and status mapping.
 */
export async function performHttpLinkCheck(
  url: string,
  timeoutMs: number = 8000
): Promise<LinkValidationResult> {
  const checkedAt = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

    const statusCode = response.status;

    if (statusCode >= 200 && statusCode < 400) {
      return {
        url,
        status: "active",
        httpStatus: statusCode,
        message: "Reachable",
        checkedAt,
      };
    }

    if (statusCode === 404 || statusCode === 410) {
      return {
        url,
        status: "dead",
        httpStatus: statusCode,
        message: `HTTP ${statusCode} Resource Not Found`,
        checkedAt,
      };
    }

    return {
      url,
      status: "unknown",
      httpStatus: statusCode,
      message: `HTTP ${statusCode} (Restricted/Rate Limited)`,
      checkedAt,
    };
  } catch (err: any) {
    const isAbort = err.name === "AbortError";
    return {
      url,
      status: "unknown",
      message: isAbort ? "Request timed out" : `Network error: ${err.message}`,
      checkedAt,
    };
  }
}
