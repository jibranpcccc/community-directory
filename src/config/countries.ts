export type CountryCode = "US" | "GB" | "CA" | "AU" | "NZ" | "IE" | "SG" | "ZA";

export interface TargetCountry {
  code: CountryCode;
  slug: string;
  name: string;
  shortName: string;
  flag: string;
  priority: number;
  enabled: boolean;
  discoveryBudgetWeight: number;
  cities: string[];
}

export const TARGET_COUNTRIES: Record<CountryCode, TargetCountry> = {
  US: {
    code: "US",
    slug: "usa",
    name: "United States",
    shortName: "USA",
    flag: "US",
    priority: 1,
    enabled: true,
    discoveryBudgetWeight: 0.30,
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
    flag: "UK",
    priority: 2,
    enabled: true,
    discoveryBudgetWeight: 0.20,
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
    flag: "CA",
    priority: 3,
    enabled: true,
    discoveryBudgetWeight: 0.15,
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
    flag: "AU",
    priority: 4,
    enabled: true,
    discoveryBudgetWeight: 0.10,
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
    shortName: "New Zealand",
    flag: "NZ",
    priority: 5,
    enabled: true,
    discoveryBudgetWeight: 0.05,
    cities: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga"],
  },
  IE: {
    code: "IE",
    slug: "ireland",
    name: "Ireland",
    shortName: "Ireland",
    flag: "IE",
    priority: 6,
    enabled: true,
    discoveryBudgetWeight: 0.05,
    cities: ["Dublin", "Cork", "Galway", "Limerick", "Waterford"],
  },
  SG: {
    code: "SG",
    slug: "singapore",
    name: "Singapore",
    shortName: "Singapore",
    flag: "SG",
    priority: 7,
    enabled: true,
    discoveryBudgetWeight: 0.10,
    cities: ["Singapore", "Jurong", "Changi", "Tampines", "Woodlands"],
  },
  ZA: {
    code: "ZA",
    slug: "south-africa",
    name: "South Africa",
    shortName: "South Africa",
    flag: "ZA",
    priority: 8,
    enabled: true,
    discoveryBudgetWeight: 0.05,
    cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Sandton", "Centurion"],
  },
};

export const ENABLED_COUNTRIES = Object.values(TARGET_COUNTRIES).filter((c) => c.enabled);

export function getCountryByCode(code: string | null | undefined): TargetCountry | undefined {
  if (!code) return undefined;
  return TARGET_COUNTRIES[code.toUpperCase() as CountryCode];
}

export function getCountryBySlug(slug: string | null | undefined): TargetCountry | undefined {
  if (!slug) return undefined;
  return Object.values(TARGET_COUNTRIES).find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}
