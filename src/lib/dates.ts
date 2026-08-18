/**
 * Formats an ISO date string into a clean, human-readable date.
 * Avoids relative words like "today" or "yesterday" which become stale on static pages.
 * e.g., "2026-08-18T10:00:00.000Z" -> "Aug 18, 2026"
 */
export function formatDate(isoString?: string | null): string {
  if (!isoString) return "Not recorded";

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "Invalid date";
  }
}

/**
 * Returns an ISO string timestamp for the current moment in UTC.
 */
export function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Checks if a date string is valid ISO 8601 format.
 */
export function isValidIsoDate(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  const d = new Date(str);
  return !isNaN(d.getTime()) && str.includes("T");
}
