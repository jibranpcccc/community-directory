import type { CategoryConfig } from "../types/community";

export const categories: CategoryConfig[] = [
  {
    slug: "remote-jobs",
    name: "Remote Jobs",
    description:
      "Public communities and alert channels sharing active remote, telecommute, and work-from-home career opportunities.",
    icon: "laptop",
    subcategories: [
      "Global Remote",
      "US Remote",
      "EU Remote",
      "Async Work",
      "Digital Nomad",
    ],
    tags: ["remote", "work-from-home", "telecommute", "async", "digital-nomad"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "tech-jobs",
    name: "Tech & Software Jobs",
    description:
      "Developer communities, software engineering hiring alerts, DevOps, QA, product management, and IT roles.",
    icon: "code",
    subcategories: [
      "Frontend & React",
      "Backend & Cloud",
      "DevOps & SRE",
      "Mobile Dev",
      "AI & Data Science",
    ],
    tags: ["software-engineering", "web-dev", "python", "devops", "data-science"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "healthcare-jobs",
    name: "Healthcare & Nursing",
    description:
      "Public groups for registered nurses, travel nurses, physicians, allied health, and clinical staffing alerts.",
    icon: "heart",
    subcategories: [
      "Nursing & Travel Nurse",
      "Physicians & Medical Staff",
      "Pharmacy & Clinical",
      "Allied Health",
    ],
    tags: ["nursing", "travel-nurse", "healthcare", "medical", "physician"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "finance-jobs",
    name: "Finance & Accounting",
    description:
      "Corporate finance openings, investment banking discussions, CPA jobs, auditing, and fintech careers.",
    icon: "banknotes",
    subcategories: [
      "Accounting & CPA",
      "Fintech & Payments",
      "Corporate Finance",
      "Tax & Advisory",
    ],
    tags: ["accounting", "finance", "cpa", "fintech", "banking"],
    financialDisclaimerRequired: true,
  },
  {
    slug: "internships-graduate",
    name: "Internships & Graduate Jobs",
    description:
      "University recruitment groups, summer analyst applications, co-ops, and entry-level graduate schemes.",
    icon: "academic-cap",
    subcategories: [
      "Summer Internships",
      "Graduate Schemes",
      "Co-op Programs",
      "Early Career",
    ],
    tags: ["internships", "graduate-jobs", "entry-level", "co-op", "early-career"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "visa-sponsorship-jobs",
    name: "Visa Sponsorship Jobs",
    description:
      "Communities sharing employer visa sponsorship alerts and immigration job discussions in the US, UK, Canada, and Australia.",
    icon: "globe-alt",
    subcategories: [
      "US H-1B / O-1 Roles",
      "UK Skilled Worker Visa",
      "Canada LMIA / Global Talent",
      "Australia TSS 482",
    ],
    tags: ["visa-sponsorship", "h1b", "skilled-worker", "lmia", "immigration-jobs"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "government-jobs",
    name: "Government & Public Sector",
    description:
      "Civil service jobs, municipal openings, state agency employment, and public sector careers.",
    icon: "building-library",
    subcategories: [
      "Federal & Civil Service",
      "State & Local Government",
      "Defense & Security",
      "Public Education",
    ],
    tags: ["government-jobs", "civil-service", "public-sector", "federal-jobs"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "sales-marketing-jobs",
    name: "Sales & Marketing",
    description:
      "B2B SaaS sales, SDR/AE positions, digital marketing, growth hacking, and content marketing hiring hubs.",
    icon: "chart-bar",
    subcategories: [
      "B2B Tech Sales (SDR/AE)",
      "Growth Marketing",
      "Content & Copywriting",
      "Customer Success",
    ],
    tags: ["sales", "marketing", "sdr", "growth-marketing", "content-marketing"],
    financialDisclaimerRequired: false,
  },
  {
    slug: "engineering-jobs",
    name: "Engineering (Non-Software)",
    description:
      "Mechanical, electrical, civil, biomedical, and aerospace engineering career alerts.",
    icon: "cog",
    subcategories: [
      "Mechanical & Hardware",
      "Civil & Structural",
      "Electrical & Electronics",
      "Aerospace & Defense",
    ],
    tags: ["mechanical-engineering", "electrical", "civil-engineering", "hardware"],
    financialDisclaimerRequired: false,
  },
];

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return categories.find((c) => c.slug === slug);
}
