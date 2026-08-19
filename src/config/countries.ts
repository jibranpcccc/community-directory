export type CountryCode = "US" | "GB" | "CA" | "AU" | "NZ" | "IE";

export interface TargetCountry {
  code: CountryCode;
  slug: string;
  name: string;
  shortName: string;
  flag: string;
  priority: number;
  enabled: boolean;
  discoveryBudgetWeight: number; // percentage weight for daily discovery
  cities: string[];
}

export const TARGET_COUNTRIES: Record<CountryCode, TargetCountry> = {
  US: {
    code: "US",
    slug: "usa",
    name: "United States",
    shortName: "USA",
    flag: "🇺🇸",
    priority: 1,
    enabled: true,
    discoveryBudgetWeight: 0.40, // 40%
    cities: [
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "Dallas",
      "San Francisco",
      "Seattle",
      "Boston",
      "Austin",
      "Atlanta",
      "Washington DC",
      "Miami",
      "Denver",
      "Phoenix",
      "San Diego",
    ],
  },
  GB: {
    code: "GB",
    slug: "uk",
    name: "United Kingdom",
    shortName: "UK",
    flag: "🇬🇧",
    priority: 2,
    enabled: true,
    discoveryBudgetWeight: 0.25, // 25%
    cities: [
      "London",
      "Manchester",
      "Birmingham",
      "Leeds",
      "Bristol",
      "Edinburgh",
      "Glasgow",
      "Liverpool",
      "Cambridge",
      "Oxford",
    ],
  },
  CA: {
    code: "CA",
    slug: "canada",
    name: "Canada",
    shortName: "Canada",
    flag: "🇨🇦",
    priority: 3,
    enabled: true,
    discoveryBudgetWeight: 0.20, // 20%
    cities: [
      "Toronto",
      "Vancouver",
      "Montreal",
      "Calgary",
      "Ottawa",
      "Edmonton",
      "Waterloo",
      "Halifax",
    ],
  },
  AU: {
    code: "AU",
    slug: "australia",
    name: "Australia",
    shortName: "Australia",
    flag: "🇦🇺",
    priority: 4,
    enabled: true,
    discoveryBudgetWeight: 0.15, // 15%
    cities: [
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Canberra",
      "Gold Coast",
    ],
  },
  NZ: {
    code: "NZ",
    slug: "new-zealand",
    name: "New Zealand",
    shortName: "NZ",
    flag: "🇳🇿",
    priority: 5,
    enabled: false, // Secondary - disabled in Phase 1
    discoveryBudgetWeight: 0.0,
    cities: ["Auckland", "Wellington", "Christchurch"],
  },
  IE: {
    code: "IE",
    slug: "ireland",
    name: "Ireland",
    shortName: "Ireland",
    flag: "🇮🇪",
    priority: 6,
    enabled: false, // Secondary - disabled in Phase 1
    discoveryBudgetWeight: 0.0,
    cities: ["Dublin", "Cork", "Galway", "Limerick"],
  },
};

export const ENABLED_COUNTRIES = Object.values(TARGET_COUNTRIES).filter((c) => c.enabled);

export function getCountryByCode(code: string | null | undefined): TargetCountry | undefined {
  if (!code) return undefined;
  return TARGET_COUNTRIES[code.toUpperCase() as CountryCode];
}

export function getCountryBySlug(slug: string | null | undefined): TargetCountry | undefined {
  if (!slug) return undefined;
  return Object.values(TARGET_COUNTRIES).find(
    (c) => c.slug.toLowerCase() === slug.toLowerCase()
  );
}
