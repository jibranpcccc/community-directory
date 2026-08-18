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
 * Generates bounded, deterministic search queries across platforms and categories.
 */
export function generateSearchQueries(maxQueries: number = discoveryConfig.maxQueriesPerRun): SearchQuery[] {
  const queries: SearchQuery[] = [];
  const platforms: PlatformId[] = ["telegram", "discord", "whatsapp"];

  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      for (const platform of platforms) {
        if (queries.length >= maxQueries) break;

        let queryStr = "";
        switch (platform) {
          case "telegram":
            queryStr = `site:t.me "${sub}" community`;
            break;
          case "discord":
            queryStr = `"discord.gg" "${sub}" community`;
            break;
          case "whatsapp":
            queryStr = `site:chat.whatsapp.com "${sub}"`;
            break;
          default:
            queryStr = `"${platform}" "${sub}" community`;
        }

        queries.push({
          query: queryStr,
          platform,
          category: cat.slug,
          subcategory: sub,
          topic: sub,
        });
      }
      if (queries.length >= maxQueries) break;
    }
    if (queries.length >= maxQueries) break;
  }

  return queries;
}
