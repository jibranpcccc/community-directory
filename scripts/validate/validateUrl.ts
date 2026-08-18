import type { LinkStatus } from "../../src/types/community";

export interface LinkValidationResult {
  url: string;
  status: LinkStatus;
  httpStatus?: number;
  message?: string;
  checkedAt: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (Compatible; CommunityDirectoryBot/1.0; +https://communitydirectory.netlify.app)";

/**
 * Performs a cautious HTTP link check with timeout, headers, and status mapping.
 * Rules:
 * - 200-299 => active
 * - 404/410 => dead
 * - 403/429/500/503/timeout => unknown (never guess or falsely mark dead due to bot protection)
 */
export async function performHttpLinkCheck(
  url: string,
  timeoutMs: number = 8000
): Promise<LinkValidationResult> {
  const checkedAt = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Try GET request with minimal body and stream abort
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
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

    // 403, 429, or 5xx server errors indicate anti-bot or temporary issues => mark as unknown
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
