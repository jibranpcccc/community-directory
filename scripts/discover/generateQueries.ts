import { categories } from "../../src/config/categories";
import { discoveryConfig } from "../../src/config/discovery";
import type { PlatformId } from "../../src/types/community";

export interface SearchQuery {
  query: string;
  platform: PlatformId;
  category: string;
  subcategory?: string;
  topic: string;
}

/**
 * Generates bounded, diverse search queries across platforms and categories with daily rotation.
 */
export function generateSearchQueries(maxQueries: number = discoveryConfig.maxQueriesPerRun): SearchQuery[] {
  const allCombinations: SearchQuery[] = [];
  const platforms: PlatformId[] = ["discord", "telegram", "whatsapp"];

  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      for (const platform of platforms) {
        let queryStr = "";
        switch (platform) {
          case "telegram":
            queryStr = `site:t.me "${sub}" channel OR group`;
            break;
          case "discord":
            queryStr = `"discord.gg" "${sub}" official community server`;
            break;
          case "whatsapp":
            queryStr = `site:chat.whatsapp.com "${sub}" community`;
            break;
        }

        allCombinations.push({
          query: queryStr,
          platform,
          category: cat.slug,
          subcategory: sub,
          topic: sub,
        });
      }
    }
  }

  // Interleave combinations across categories and platforms
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const offset = (dayOfYear * 7) % allCombinations.length;
  const rotated = [...allCombinations.slice(offset), ...allCombinations.slice(0, offset)];

  // Group by platform and interleave
  const byPlatform: Partial<Record<PlatformId, SearchQuery[]>> = {
    discord: rotated.filter((q) => q.platform === "discord"),
    telegram: rotated.filter((q) => q.platform === "telegram"),
    whatsapp: rotated.filter((q) => q.platform === "whatsapp"),
  };

  const interleaved: SearchQuery[] = [];
  const maxLen = Math.max(
    byPlatform.discord?.length || 0,
    byPlatform.telegram?.length || 0,
    byPlatform.whatsapp?.length || 0
  );

  for (let i = 0; i < maxLen; i++) {
    for (const p of platforms) {
      const list = byPlatform[p];
      if (list && list[i] && interleaved.length < maxQueries) {
        interleaved.push(list[i]);
      }
    }
    if (interleaved.length >= maxQueries) break;
  }

  return interleaved;
}
