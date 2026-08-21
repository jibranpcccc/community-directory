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
      `tech job postings Discord ${country}`,
      `software jobs Telegram ${short}`,
      `tech hiring Discord ${short}`,
      `software engineer jobs ${short} community`,
      `developer jobs ${short} job alerts`,
      `frontend backend developer jobs ${country} Discord`,
      `data science machine learning jobs ${short} Telegram`,
      `devops cloud engineer jobs ${country} community`,
      `cybersecurity jobs ${short} Discord invite`,
      `tech startup hiring ${country} Telegram`,
    ],
  },
  {
    category: "remote-jobs",
    subcategory: "Remote Work",
    topic: "Remote Jobs",
    weight: 0.20,
    getKeywords: (country, short) => [
      `remote job alerts Telegram ${short}`,
      `daily remote job postings Discord ${country}`,
      `remote hiring ${short} job alerts`,
      `work from home jobs ${short} community`,
      `remote tech developer jobs Discord ${country}`,
      `worldwide remote jobs ${short} Telegram channel`,
    ],
  },
  {
    category: "internships-graduate",
    subcategory: "Graduate & Internships",
    topic: "Internships & Graduate Schemes",
    weight: 0.20,
    getKeywords: (country, short) => [
      `new grad tech jobs Discord ${country}`,
      `internship postings Discord ${country}`,
      `${country} student internships Discord server`,
      `${short} graduate jobs Telegram group`,
      `entry level software engineer jobs ${short}`,
      `summer internship 2026 ${country} Discord`,
      `junior developer careers ${short} Telegram`,
    ],
  },
  {
    category: "visa-sponsorship-jobs",
    subcategory: "Visa Sponsorship",
    topic: "Visa Sponsorship Jobs",
    weight: 0.15,
    getKeywords: (country, short) => [
      `visa sponsorship jobs ${country} community`,
      `skilled worker visa jobs ${short} Telegram`,
      `relocation tech jobs ${country} Discord`,
      `work visa hiring ${country} community group`,
      `international tech hiring ${short} Discord`,
    ],
  },
  {
    category: "healthcare-jobs",
    subcategory: "Nursing & Medical",
    topic: "Healthcare & Nursing",
    weight: 0.10,
    getKeywords: (country, short) => [
      `nursing job alerts ${short} Telegram`,
      `healthcare vacancies ${country} community`,
      `hospital nursing jobs ${short} group`,
      `travel nurse jobs ${country} community`,
      `medical doctor healthcare hiring ${short}`,
    ],
  },
  // TIER B (10% of category allocation combined)
  {
    category: "finance-jobs",
    subcategory: "Finance & Accounting",
    topic: "Finance & Accounting",
    weight: 0.025,
    getKeywords: (country, short) => [
      `finance accounting job alerts ${short} Telegram`,
      `fintech careers hiring ${country} Discord`,
      `banking finance vacancies ${short} community`,
    ],
  },
  {
    category: "engineering-jobs",
    subcategory: "Civil & Mechanical",
    topic: "Engineering Careers",
    weight: 0.025,
    getKeywords: (country, short) => [
      `engineering job postings ${short} Telegram`,
      `mechanical electrical engineer vacancies ${country}`,
      `civil engineering careers ${short} community`,
    ],
  },
  {
    category: "sales-marketing-jobs",
    subcategory: "Sales & Marketing",
    topic: "Sales & Marketing",
    weight: 0.025,
    getKeywords: (country, short) => [
      `sales marketing job alerts ${short} Telegram`,
      `B2B sales vacancies ${country} community`,
      `digital growth marketing jobs ${short} Discord`,
    ],
  },
  {
    category: "government-jobs",
    subcategory: "Public Sector",
    topic: "Government & Public Sector",
    weight: 0.025,
    getKeywords: (country, short) => [
      `government job alerts ${short} Telegram`,
      `civil service vacancies ${country} community`,
      `public sector hiring ${short} group`,
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
 * 8 English-speaking countries and Telegram, Discord, WhatsApp.
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
          weight: tpl.weight * performanceWeight * (c.discoveryBudgetWeight || 0.1),
        });

        // Discord query
        poolByCountryAndPlatform[`${c.code}:discord`].push({
          query: kw.includes("site:") || kw.includes("discord.gg") ? kw : `discord.gg ${kw}`,
          platform: "discord",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
          weight: tpl.weight * performanceWeight * (c.discoveryBudgetWeight || 0.1),
        });

        // WhatsApp query
        poolByCountryAndPlatform[`${c.code}:whatsapp`].push({
          query: kw.includes("site:") || kw.includes("chat.whatsapp.com") ? kw : `site:chat.whatsapp.com ${kw}`,
          platform: "whatsapp",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
          weight: tpl.weight * performanceWeight * (c.discoveryBudgetWeight || 0.1),
        });
      }

      // Add top 3 cities per country for high-converting metro coverage
      const topCities = c.cities.slice(0, 3);
      for (const city of topCities) {
        poolByCountryAndPlatform[`${c.code}:telegram`].push({
          query: `site:t.me ${city} tech jobs OR ${city} job alerts`,
          platform: "telegram",
          countryCode: c.code,
          category: tpl.category,
          subcategory: `${city} Jobs`,
          topic: `${city} Job Alerts`,
          targetCity: city,
        });

        poolByCountryAndPlatform[`${c.code}:discord`].push({
          query: `discord.gg ${city} tech jobs OR ${city} hiring`,
          platform: "discord",
          countryCode: c.code,
          category: tpl.category,
          subcategory: `${city} Jobs`,
          topic: `${city} Job Alerts`,
          targetCity: city,
        });

        poolByCountryAndPlatform[`${c.code}:whatsapp`].push({
          query: `site:chat.whatsapp.com ${city} job alerts`,
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

  // Interleave with Guaranteed 100% Market Coverage & Multi-Pass Fair Allocation
  const interleaved: SearchQuery[] = [];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const countryStartOffset = dayOfYear % countries.length;

  // Build ordered countries list with daily rotation
  const orderedCountries: typeof countries = [];
  for (let i = 0; i < countries.length; i++) {
    orderedCountries.push(countries[(i + countryStartOffset) % countries.length]);
  }

  // Pass 1: Allocate at least 1 primary query for EVERY country (14 queries)
  for (let cIdx = 0; cIdx < orderedCountries.length; cIdx++) {
    const c = orderedCountries[cIdx];
    const preferredPlatform = platforms[(cIdx + dayOfYear) % platforms.length];
    const bucket = poolByCountryAndPlatform[`${c.code}:${preferredPlatform}`];
    if (bucket && bucket.length > 0) {
      const qIdx = (dayOfYear * 3) % bucket.length;
      const q = bucket[qIdx];
      if (q && !interleaved.some((ex) => ex.query === q.query)) {
        interleaved.push(q);
      }
    }
  }

  // Pass 2: Allocate 2nd query for EVERY country across alternating platform (28 queries)
  for (let cIdx = 0; cIdx < orderedCountries.length; cIdx++) {
    if (interleaved.length >= maxQueries) break;
    const c = orderedCountries[cIdx];
    const secondPlatform = platforms[(cIdx + dayOfYear + 1) % platforms.length];
    const bucket = poolByCountryAndPlatform[`${c.code}:${secondPlatform}`];
    if (bucket && bucket.length > 0) {
      const qIdx = (dayOfYear * 7 + 1) % bucket.length;
      const q = bucket[qIdx];
      if (q && !interleaved.some((ex) => ex.query === q.query)) {
        interleaved.push(q);
      }
    }
  }

  // Pass 3: Fill remaining capacity up to maxQueries
  const maxPerBucket = Math.max(
    ...Object.values(poolByCountryAndPlatform).map((arr) => arr.length)
  );

  for (let idx = 0; idx < maxPerBucket && interleaved.length < maxQueries; idx++) {
    for (const c of orderedCountries) {
      for (const p of platforms) {
        if (interleaved.length >= maxQueries) break;
        const bucket = poolByCountryAndPlatform[`${c.code}:${p}`];
        if (!bucket || bucket.length === 0) continue;

        const rotatedIndex = (idx + dayOfYear * 5) % bucket.length;
        const q = bucket[rotatedIndex];

        if (q && !interleaved.some((existing) => existing.query === q.query)) {
          interleaved.push(q);
        }
      }
    }
  }

  return interleaved.slice(0, maxQueries);
}
