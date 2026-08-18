import * as fs from "fs";
import * as path from "path";
import type { PlatformId } from "../../src/types/community";

export interface DiscoveryResult {
  url: string;
  sourceUrl: string;
  platform: PlatformId;
  snippet?: string;
  category?: string;
  subcategory?: string;
}

export interface DiscoveryProvider {
  name: string;
  isAvailable(): boolean;
  search(query: string, context?: { platform: PlatformId; category: string; subcategory?: string }): Promise<DiscoveryResult[]>;
}

/**
 * Reads manually curated seeds from src/data/seeds.json.
 */
export class ManualSeedProvider implements DiscoveryProvider {
  name = "manual-seeds";

  isAvailable(): boolean {
    const seedPath = path.resolve(process.cwd(), "src/data/seeds.json");
    return fs.existsSync(seedPath);
  }

  async search(): Promise<DiscoveryResult[]> {
    const seedPath = path.resolve(process.cwd(), "src/data/seeds.json");
    if (!fs.existsSync(seedPath)) return [];

    try {
      const raw = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
      if (!Array.isArray(raw)) return [];

      return raw.map((item: any) => ({
        url: item.url,
        sourceUrl: item.url.startsWith("http") ? item.url : `https://${item.url}`,
        platform: item.platform,
        snippet: item.notes || "Manual seed community",
        category: item.category,
        subcategory: item.subcategory,
      }));
    } catch {
      return [];
    }
  }
}
