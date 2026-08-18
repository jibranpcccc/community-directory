import * as fs from "fs";
import * as path from "path";
import type { Community } from "../../src/types/community";
import { validateCommunitiesData } from "./validateSchema";
import { normalizeInviteUrl } from "./normalizeUrl";

/**
 * Safely writes JSON data to disk atomically using a temp file.
 */
export function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.tmp.${Date.now()}`;
  const serialized = JSON.stringify(data, null, 2) + "\n";

  fs.writeFileSync(tempPath, serialized, "utf-8");
  fs.renameSync(tempPath, filePath);
}

/**
 * Safely merges new listings into target JSON file with strict validation and deduplication.
 */
export function mergeListingsIntoFile(
  targetFilePath: string,
  newListings: Community[]
): { addedCount: number; totalCount: number } {
  let existing: Community[] = [];

  if (fs.existsSync(targetFilePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(targetFilePath, "utf-8"));
      if (Array.isArray(raw)) {
        existing = raw;
      }
    } catch (e: any) {
      throw new Error(`Failed to read target file ${targetFilePath}: ${e.message}`);
    }
  }

  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const merged: Community[] = [];

  // Add existing items first
  for (const item of existing) {
    const normUrl = normalizeInviteUrl(item.inviteUrl);
    seenUrls.add(normUrl);
    seenIds.add(item.id);
    seenSlugs.add(item.slug);
    merged.push(item);
  }

  let actuallyAdded = 0;

  // Add new items only if not already present
  for (const item of newListings) {
    const normUrl = normalizeInviteUrl(item.inviteUrl);
    if (seenUrls.has(normUrl) || seenIds.has(item.id) || seenSlugs.has(item.slug)) {
      continue;
    }
    seenUrls.add(normUrl);
    seenIds.add(item.id);
    seenSlugs.add(item.slug);
    merged.push(item);
    actuallyAdded++;
  }

  // Stable sort by title
  merged.sort((a, b) => a.title.localeCompare(b.title));

  // Validate resulting data
  const validation = validateCommunitiesData(merged);
  if (!validation.valid) {
    throw new Error(
      `Dataset validation failed after merge: ${validation.errors.join("; ")}`
    );
  }

  // Write atomically
  atomicWriteJson(targetFilePath, validation.communities);

  return {
    addedCount: actuallyAdded,
    totalCount: validation.communities.length,
  };
}
