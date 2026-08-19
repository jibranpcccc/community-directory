import type { CategoryConfig } from "../types/community";

export const categories: CategoryConfig[] = [
  {
    slug: "remote-jobs",
    name: "Remote & Distributed Work",
    description: "Public communities and alert channels sharing verified remote, telecommute, and work-from-home career opportunities.",
    icon: "laptop",
    subcategories: ["Global Remote", "US Remote", "UK Remote", "Canada Remote", "Australia Remote"],
    tags: ["remote", "workfromhome", "telecommute", "distributed", "freelance"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "tech-jobs",
    name: "Technology & Software Jobs",
    description: "Software engineering, DevOps, cloud, cybersecurity, data science, and AI hiring communities.",
    icon: "code-bracket",
    subcategories: ["Software Engineering", "AI & Machine Learning", "Cybersecurity", "DevOps & Cloud", "Data Analytics"],
    tags: ["tech", "software", "developer", "engineering", "ai", "cybersecurity"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "healthcare-jobs",
    name: "Healthcare & Nursing",
    description: "Verified groups for registered nurses, travel nurses, physicians, allied health, and clinical staffing alerts.",
    icon: "heart",
    subcategories: ["Nursing", "Travel Nursing", "Medical Practitioners", "Allied Health", "Healthcare Administration"],
    tags: ["healthcare", "nursing", "medical", "hospital", "clinical"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "finance-jobs",
    name: "Finance, Banking & Accounting",
    description: "Investment banking, corporate finance, accounting, CPA, and audit career communities.",
    icon: "banknotes",
    subcategories: ["Investment Banking", "Corporate Finance", "Accounting & Audit", "FinTech", "Risk Advisory"],
    tags: ["finance", "banking", "accounting", "cpa", "audit"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "internships-graduate",
    name: "Internships & Graduate Schemes",
    description: "Student internships, co-op placements, graduate training schemes, and entry-level career starter groups.",
    icon: "academic-cap",
    subcategories: ["Summer Internships", "Graduate Schemes", "Co-op Programs", "Entry Level", "Apprenticeships"],
    tags: ["internships", "graduate", "students", "entrylevel", "coop"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "visa-sponsorship-jobs",
    name: "Visa Sponsorship Jobs",
    description: "Legitimate communities sharing verified employer visa sponsorship opportunities in the US, UK, Canada, and Australia.",
    icon: "globe-alt",
    subcategories: ["US Visa Sponsorship", "UK Skilled Worker", "Canada LMIA & PNP", "Australia TSS & PR"],
    tags: ["visasponsorship", "immigration", "skilledworker", "relocation"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "government-jobs",
    name: "Government & Public Sector",
    description: "Civil service, municipal, state/provincial, federal agency, and public sector vacancy alerts.",
    icon: "building-library",
    subcategories: ["Civil Service", "Federal Jobs", "Municipal Careers", "Defense & Security", "Public Utilities"],
    tags: ["government", "civilservice", "publicsector", "federal", "municipal"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "sales-marketing-jobs",
    name: "Sales, Marketing & Growth",
    description: "B2B sales, account executives, digital marketing, SEO, content, and growth marketing hiring channels.",
    icon: "megaphone",
    subcategories: ["B2B Sales & SDR", "Digital Marketing", "Growth & SEO", "Product Marketing", "Brand & PR"],
    tags: ["sales", "marketing", "growth", "advertising", "seo"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "engineering-jobs",
    name: "Engineering & Skilled Trades",
    description: "Civil, mechanical, electrical engineering, construction management, and industrial trade opportunities.",
    icon: "wrench-screwdriver",
    subcategories: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Construction", "Project Management"],
    tags: ["engineering", "construction", "civil", "mechanical", "electrical"],
    financialDisclaimerRequired: false,
  },
];

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getAllCategorySlugs(): string[] {
  return categories.map((c) => c.slug);
}
