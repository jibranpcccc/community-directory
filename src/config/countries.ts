export type CountryCode =
  | "GLOBAL"
  | "US"
  | "GB"
  | "CA"
  | "AU"
  | "NZ"
  | "IE"
  | "SG"
  | "ZA"
  | "DE"
  | "NL"
  | "IN"
  | "AE"
  | "PH";

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
  GLOBAL: {
    code: "GLOBAL",
    slug: "global",
    name: "Worldwide & International",
    shortName: "Global",
    flag: "🌐",
    priority: 1,
    enabled: true,
    discoveryBudgetWeight: 0.20,
    cities: ["Remote", "Worldwide", "Global", "Work From Home", "Anywhere", "WFH", "Virtual"],
  },
  US: {
    code: "US",
    slug: "usa",
    name: "United States",
    shortName: "USA",
    flag: "🇺🇸",
    priority: 2,
    enabled: true,
    discoveryBudgetWeight: 0.20,
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
    priority: 3,
    enabled: true,
    discoveryBudgetWeight: 0.15,
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
    priority: 4,
    enabled: true,
    discoveryBudgetWeight: 0.10,
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
    priority: 5,
    enabled: true,
    discoveryBudgetWeight: 0.05,
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
  IN: {
    code: "IN",
    slug: "india",
    name: "India",
    shortName: "India",
    flag: "🇮🇳",
    priority: 6,
    enabled: true,
    discoveryBudgetWeight: 0.10,
    cities: [
      "Bangalore",
      "Bengaluru",
      "Hyderabad",
      "Pune",
      "Mumbai",
      "Delhi",
      "Noida",
      "Gurgaon",
      "Chennai",
      "Kolkata",
      "Ahmedabad",
    ],
  },
  DE: {
    code: "DE",
    slug: "germany",
    name: "Germany",
    shortName: "Germany",
    flag: "🇩🇪",
    priority: 7,
    enabled: true,
    discoveryBudgetWeight: 0.04,
    cities: [
      "Berlin",
      "Munich",
      "Frankfurt",
      "Hamburg",
      "Cologne",
      "Stuttgart",
      "Dusseldorf",
    ],
  },
  NL: {
    code: "NL",
    slug: "netherlands",
    name: "Netherlands",
    shortName: "Netherlands",
    flag: "🇳🇱",
    priority: 8,
    enabled: true,
    discoveryBudgetWeight: 0.04,
    cities: [
      "Amsterdam",
      "Rotterdam",
      "The Hague",
      "Utrecht",
      "Eindhoven",
      "Delft",
    ],
  },
  SG: {
    code: "SG",
    slug: "singapore",
    name: "Singapore",
    shortName: "Singapore",
    flag: "🇸🇬",
    priority: 9,
    enabled: true,
    discoveryBudgetWeight: 0.04,
    cities: ["Singapore", "Jurong", "Changi", "Tampines", "Woodlands"],
  },
  AE: {
    code: "AE",
    slug: "uae",
    name: "United Arab Emirates",
    shortName: "UAE",
    flag: "🇦🇪",
    priority: 10,
    enabled: true,
    discoveryBudgetWeight: 0.02,
    cities: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  },
  PH: {
    code: "PH",
    slug: "philippines",
    name: "Philippines",
    shortName: "Philippines",
    flag: "🇵🇭",
    priority: 11,
    enabled: true,
    discoveryBudgetWeight: 0.02,
    cities: ["Manila", "Cebu", "Davao", "Quezon City", "Makati", "Taguig", "BGC"],
  },
  NZ: {
    code: "NZ",
    slug: "new-zealand",
    name: "New Zealand",
    shortName: "New Zealand",
    flag: "🇳🇿",
    priority: 12,
    enabled: true,
    discoveryBudgetWeight: 0.015,
    cities: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga"],
  },
  IE: {
    code: "IE",
    slug: "ireland",
    name: "Ireland",
    shortName: "Ireland",
    flag: "🇮🇪",
    priority: 13,
    enabled: true,
    discoveryBudgetWeight: 0.015,
    cities: ["Dublin", "Cork", "Galway", "Limerick", "Waterford"],
  },
  ZA: {
    code: "ZA",
    slug: "south-africa",
    name: "South Africa",
    shortName: "South Africa",
    flag: "🇿🇦",
    priority: 14,
    enabled: true,
    discoveryBudgetWeight: 0.01,
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
