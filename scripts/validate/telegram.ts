import { performHttpLinkCheck, type LinkValidationResult } from "./validateUrl";

/**
 * Validates a public Telegram link (e.g. https://t.me/example).
 * Checks the public web preview page for missing channel indicators.
 */
export async function validateTelegramLink(url: string): Promise<LinkValidationResult> {
  const result = await performHttpLinkCheck(url);
  return result;
}
