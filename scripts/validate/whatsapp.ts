import { performHttpLinkCheck, type LinkValidationResult } from "./validateUrl";

/**
 * Validates a public WhatsApp group link (https://chat.whatsapp.com/...).
 * Does NOT join or bypass anti-bot protections. Cautiously maps status.
 */
export async function validateWhatsappLink(url: string): Promise<LinkValidationResult> {
  const result = await performHttpLinkCheck(url);
  return result;
}
