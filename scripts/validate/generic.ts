import { performHttpLinkCheck, type LinkValidationResult } from "./validateUrl";

export async function validateGenericLink(url: string): Promise<LinkValidationResult> {
  return performHttpLinkCheck(url);
}
