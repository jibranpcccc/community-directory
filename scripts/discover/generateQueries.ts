import * as fs from "fs";
import * as path from "path";
import { type CountryCode, ENABLED_COUNTRIES } from "../../src/config/countries";
import { discoveryConfig } from "../../src/config/discovery";
import type { PlatformId } from "../../src/types/community";

export interface SearchQuery {
  query: string;
  platform: PlatformId;
  countryCode: CountryCode;
  category: string;
  subcategory?: string;
  topic: string;
  targetCity?: string;
  weight?: number;
}

export interface QueryStats {
  query: string;
  country?: CountryCode;
  platform?: PlatformId;
  category?: string;
  lastRunAt: string;
  timesRun: number;
  rawCandidateCount: number;
  passedJobIntentCount: number;
  activeCandidateCount: number;
  confirmedTier1Count: number;
  wrongNicheCount: number;
  wrongCountryCount: number;
  duplicateCount: number;
  newPendingCount: number;
}

interface QueryTemplate {
  category: string;
  subcategory: string;
  topic: string;
  weight: number;
  getKeywords: (countryName: string, shortName: string) => string[];
}

const TEMPLATES: QueryTemplate[] = [
  // TIER A (90% of category allocation)
  {
    category: "tech-jobs",
    subcategory: "Software Engineering",
    topic: "Software & Tech Jobs",
    weight: 0.25,
    getKeywords: (country, short) => [
      `"tech job postings" Discord ${country}`,
      `"software jobs" Telegram ${short}`,
      `"tech hiring" Discord ${short}`,
      `"software engineer jobs" ${short}`,
      `"developer jobs" ${short} "job alerts"`,
    ],
  },
  {
    category: "remote-jobs",
    subcategory: "Remote Work",
    topic: "Remote Jobs",
    weight: 0.20,
    getKeywords: (country, short) => [
      `"remote job alerts" Telegram ${short}`,
      `"daily job postings" Discord ${country}`,
      `"remote hiring" ${short} "job alerts"`,
      `"work from home jobs" ${short}`,
    ],
  },
  {
    category: "internships-graduate",
    subcategory: "Graduate & Internships",
    topic: "Internships & Graduate Schemes",
    weight: 0.20,
    getKeywords: (country, short) => [
      `"new grad jobs" Discord ${country}`,
      `"internship postings" Discord ${country}`,
      `"${country} internships" Discord`,
      `"${short} graduate jobs" Telegram`,
      `"entry level tech jobs" ${short}`,
    ],
  },
  {
    category: "visa-sponsorship-jobs",
    subcategory: "Visa Sponsorship",
    topic: "Visa Sponsorship Jobs",
    weight: 0.15,
    getKeywords: (country, short) => [
      `"visa sponsorship jobs" ${country}`,
      `"skilled worker visa jobs" ${short}`,
      `"relocation tech jobs" ${country}`,
    ],
  },
  {
    category: "healthcare-jobs",
    subcategory: "Nursing & Medical",
    topic: "Healthcare & Nursing",
    weight: 0.10,
    getKeywords: (country, short) => [
      `"nursing job alerts" ${short}`,
      `"healthcare vacancies" ${country}`,
      `"hospital nursing jobs" ${short}`,
    ],
  },
  // TIER B (10% of category allocation combined)
  {
    category: "finance-jobs",
    subcategory: "Finance & Accounting",
    topic: "Finance & Accounting",
    weight: 0.025,
    getKeywords: (country, short) => [
      `"finance job alerts" ${short}`,
      `"accounting careers" ${country}`,
    ],
  },
  {
    category: "engineering-jobs",
    subcategory: "Civil & Mechanical",
    topic: "Engineering Careers",
    weight: 0.025,
    getKeywords: (country, short) => [
      `"engineering job postings" ${short}`,
      `"mechanical engineer vacancies" ${country}`,
    ],
  },
  {
    category: "sales-marketing-jobs",
    subcategory: "Sales & Marketing",
    topic: "Sales & Marketing",
    weight: 0.025,
    getKeywords: (country, short) => [
      `"sales marketing job alerts" ${short}`,
      `"B2B sales vacancies" ${country}`,
    ],
  },
  {
    category: "government-jobs",
    subcategory: "Public Sector",
    topic: "Government & Public Sector",
    weight: 0.025,
    getKeywords: (country, short) => [
      `"government job alerts" ${short}`,
      `"civil service vacancies" ${country}`,
    ],
  },
];

const STATS_FILE = path.resolve("./src/data/query-stats.json");

export function loadQueryStats(): Record<string, QueryStats> {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));
      if (Array.isArray(raw)) {
        const map: Record<string, QueryStats> = {};
        for (const item of raw) {
          if (item && item.query) map[item.query] = item;
        }
        return map;
      }
    }
  } catch {
    // fallback
  }
  return {};
}

export function saveQueryStats(statsMap: Record<string, QueryStats>): void {
  try {
    const list = Object.values(statsMap);
    fs.writeFileSync(STATS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

/**
 * Generates an interleaved, country-balanced query matrix across
 * US, GB, CA, AU and Telegram, Discord, WhatsApp.
 */
export function generateSearchQueries(maxQueries: number = discoveryConfig.maxQueriesPerRun): SearchQuery[] {
  const platforms: PlatformId[] = ["telegram", "discord", "whatsapp"];
  const countries = ENABLED_COUNTRIES;
  const stats = loadQueryStats();

  // Build query candidates partitioned by country and platform
  const poolByCountryAndPlatform: Record<string, SearchQuery[]> = {};

  for (const c of countries) {
    for (const p of platforms) {
      poolByCountryAndPlatform[`${c.code}:${p}`] = [];
    }
  }

  for (const c of countries) {
    for (const tpl of TEMPLATES) {
      const keywords = tpl.getKeywords(c.name, c.shortName);

      for (const kw of keywords) {
        // Query score calculation based on past performance
        const past = stats[kw];
        let performanceWeight = 1.0;
        if (past) {
          if (past.newPendingCount > 0) performanceWeight += 0.5;
          if (past.wrongNicheCount > 5 && past.newPendingCount === 0) performanceWeight -= 0.3;
        }

        // Telegram query
        poolByCountryAndPlatform[`${c.code}:telegram`].push({
          query: kw.includes("site:") ? kw : `site:t.me ${kw}`,
          platform: "telegram",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
          weight: tpl.weight * performanceWeight,
        });

        // Discord query
        poolByCountryAndPlatform[`${c.code}:discord`].push({
          query: kw.includes("site:") || kw.includes("discord.gg") ? kw : `"discord.gg" ${kw}`,
          platform: "discord",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
          weight: tpl.weight * performanceWeight,
        });

        // WhatsApp query
        poolByCountryAndPlatform[`${c.code}:whatsapp`].push({
          query: kw.includes("site:") || kw.includes("chat.whatsapp.com") ? kw : `site:chat.whatsapp.com ${kw}`,
          platform: "whatsapp",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
          weight: tpl.weight * performanceWeight,
        });
      }

      // Add top 2 cities per country for high-converting metro coverage
      const topCities = c.cities.slice(0, 2);
      for (const city of topCities) {
        poolByCountryAndPlatform[`${c.code}:telegram`].push({
          query: `site:t.me "${city} tech jobs" OR "${city} job alerts"`,
          platform: "telegram",
          countryCode: c.code,
          category: tpl.category,
          subcategory: `${city} Jobs`,
          topic: `${city} Job Alerts`,
          targetCity: city,
        });

        poolByCountryAndPlatform[`${c.code}:discord`].push({
          query: `"discord.gg" "${city} tech jobs" OR "${city} job postings"`,
          platform: "discord",
          countryCode: c.code,
          category: tpl.category,
          subcategory: `${city} Jobs`,
          topic: `${city} Job Alerts`,
          targetCity: city,
        });

        poolByCountryAndPlatform[`${c.code}:whatsapp`].push({
          query: `site:chat.whatsapp.com "${city} job alerts"`,
          platform: "whatsapp",
          countryCode: c.code,
          category: tpl.category,
          subcategory: `${city} Jobs`,
          topic: `${city} Job Alerts`,
          targetCity: city,
        });
      }
    }
  }

  // Interleave round-robin across (Country x Platform)
  const interleaved: SearchQuery[] = [];
  const maxPerBucket = Math.max(
    ...Object.values(poolByCountryAndPlatform).map((arr) => arr.length)
  );

  // Daily rotational offset
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

  for (let idx = 0; idx < maxPerBucket; idx++) {
    for (const c of countries) {
      for (const p of platforms) {
        const bucket = poolByCountryAndPlatform[`${c.code}:${p}`];
        if (!bucket || bucket.length === 0) continue;

        const rotatedIndex = (idx + dayOfYear * 3) % bucket.length;
        const q = bucket[rotatedIndex];

        if (q && !interleaved.some((existing) => existing.query === q.query)) {
          interleaved.push(q);
          if (interleaved.length >= maxQueries) {
            return interleaved;
          }
        }
      }
    }
  }

  return interleaved.slice(0, maxQueries);
}
