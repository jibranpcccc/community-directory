import { TARGET_COUNTRIES, type CountryCode, ENABLED_COUNTRIES } from "../../src/config/countries";
import { JOB_TYPES } from "../../src/config/jobTypes";
import { INDUSTRIES } from "../../src/config/industries";
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
}

interface QueryTemplate {
  category: string;
  subcategory: string;
  topic: string;
  getKeywords: (countryName: string, shortName: string) => string[];
}

const TEMPLATES: QueryTemplate[] = [
  {
    category: "remote-jobs",
    subcategory: "Remote Work",
    topic: "Remote Jobs",
    getKeywords: (country, short) => [
      `remote jobs ${short}`,
      `remote hiring ${country}`,
      `work from home jobs ${short}`,
      `remote careers ${short}`,
    ],
  },
  {
    category: "tech-jobs",
    subcategory: "Software Engineering",
    topic: "Software & Tech Jobs",
    getKeywords: (country, short) => [
      `software engineer jobs ${short}`,
      `tech careers ${country}`,
      `developer jobs ${short}`,
      `engineering recruitment ${short}`,
    ],
  },
  {
    category: "tech-jobs",
    subcategory: "AI & Machine Learning",
    topic: "AI & Data Jobs",
    getKeywords: (country, short) => [
      `AI engineer jobs ${short}`,
      `machine learning careers ${country}`,
      `data science jobs ${short}`,
    ],
  },
  {
    category: "tech-jobs",
    subcategory: "Cybersecurity",
    topic: "Cybersecurity Jobs",
    getKeywords: (country, short) => [
      `cybersecurity jobs ${short}`,
      `infosec hiring ${country}`,
      `security engineer careers ${short}`,
    ],
  },
  {
    category: "healthcare-jobs",
    subcategory: "Nursing & Medical",
    topic: "Healthcare & Nursing",
    getKeywords: (country, short) => [
      `nursing jobs ${short}`,
      `healthcare recruitment ${country}`,
      `hospital nursing vacancies ${short}`,
    ],
  },
  {
    category: "finance-jobs",
    subcategory: "Finance & Accounting",
    topic: "Finance & Accounting",
    getKeywords: (country, short) => [
      `finance jobs ${short}`,
      `accounting careers ${country}`,
      `banking recruitment ${short}`,
    ],
  },
  {
    category: "internships-graduate",
    subcategory: "Graduate & Internships",
    topic: "Internships & Graduate Schemes",
    getKeywords: (country, short) => [
      `graduate jobs ${short}`,
      `internship openings ${country}`,
      `entry level tech careers ${short}`,
    ],
  },
  {
    category: "visa-sponsorship-jobs",
    subcategory: "Visa Sponsorship",
    topic: "Visa Sponsorship Jobs",
    getKeywords: (country, short) => [
      `visa sponsorship jobs ${country}`,
      `skilled worker visa jobs ${short}`,
      `relocation jobs ${country}`,
    ],
  },
  {
    category: "sales-marketing-jobs",
    subcategory: "Sales & Marketing",
    topic: "Sales & Marketing",
    getKeywords: (country, short) => [
      `sales marketing jobs ${short}`,
      `B2B tech sales careers ${country}`,
      `growth marketing jobs ${short}`,
    ],
  },
];

/**
 * Generates an interleaved, country-balanced query matrix across
 * US, GB, CA, AU and Telegram, Discord, WhatsApp.
 */
export function generateSearchQueries(maxQueries: number = discoveryConfig.maxQueriesPerRun): SearchQuery[] {
  const platforms: PlatformId[] = ["telegram", "discord", "whatsapp"];
  const countries = ENABLED_COUNTRIES;

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
        // Telegram query
        poolByCountryAndPlatform[`${c.code}:telegram`].push({
          query: `site:t.me "${kw}" channel OR group OR "job alerts"`,
          platform: "telegram",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
        });

        // Discord query
        poolByCountryAndPlatform[`${c.code}:discord`].push({
          query: `"discord.gg" "${kw}" server OR "job openings" OR "hiring"`,
          platform: "discord",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
        });

        // WhatsApp query
        poolByCountryAndPlatform[`${c.code}:whatsapp`].push({
          query: `site:chat.whatsapp.com "${kw}" group OR "job alerts"`,
          platform: "whatsapp",
          countryCode: c.code,
          category: tpl.category,
          subcategory: tpl.subcategory,
          topic: tpl.topic,
        });
      }

      // Add top 2 cities per country for metro-specific coverage
      const topCities = c.cities.slice(0, 2);
      for (const city of topCities) {
        const metroKw = `${city} jobs`;
        poolByCountryAndPlatform[`${c.code}:telegram`].push({
          query: `site:t.me "${metroKw}" group OR channel`,
          platform: "telegram",
          countryCode: c.code,
          category: tpl.category,
          subcategory: `${city} Jobs`,
          topic: `${city} Job Alerts`,
          targetCity: city,
        });

        poolByCountryAndPlatform[`${c.code}:discord`].push({
          query: `"discord.gg" "${metroKw}" server OR hiring`,
          platform: "discord",
          countryCode: c.code,
          category: tpl.category,
          subcategory: `${city} Jobs`,
          topic: `${city} Job Alerts`,
          targetCity: city,
        });

        poolByCountryAndPlatform[`${c.code}:whatsapp`].push({
          query: `site:chat.whatsapp.com "${metroKw}" group`,
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
