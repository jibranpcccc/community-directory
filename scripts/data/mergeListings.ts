import * as fs from "fs";
import * as path from "path";
import type { Community } from "../../src/types/community";
import { validateCommunitiesData } from "./validateSchema";

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
 * Safely merges new listings into target JSON file with strict validation.
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

  // Stable sort by ID/title
  const combined = [...existing, ...newListings];
  combined.sort((a, b) => a.title.localeCompare(b.title));

  // Validate resulting data
  const validation = validateCommunitiesData(combined);
  if (!validation.valid) {
    throw new Error(
      `Dataset validation failed after merge: ${validation.errors.join("; ")}`
    );
  }

  // Write atomically
  atomicWriteJson(targetFilePath, validation.communities);

  return {
    addedCount: newListings.length,
    totalCount: validation.communities.length,
  };
}
