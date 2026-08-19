export interface IndustryConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export const INDUSTRIES: IndustryConfig[] = [
  {
    slug: "technology",
    name: "Technology",
    description: "General tech, IT support, systems administration, and cloud infrastructure groups.",
    icon: "cpu-chip",
  },
  {
    slug: "software-engineering",
    name: "Software Engineering",
    description: "Frontend, backend, fullstack, mobile, DevOps, and systems engineering communities.",
    icon: "code-bracket",
  },
  {
    slug: "ai-machine-learning",
    name: "AI & Machine Learning",
    description: "AI engineering, ML research, computer vision, NLP, and prompt engineering jobs.",
    icon: "sparkles",
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    description: "Information security, ethical hacking, SOC analyst, and network defense job alerts.",
    icon: "shield-check",
  },
  {
    slug: "data-analytics",
    name: "Data & Analytics",
    description: "Data science, BI analysis, data engineering, and business analytics hiring alerts.",
    icon: "chart-bar",
  },
  {
    slug: "healthcare-medical",
    name: "Healthcare & Medical",
    description: "Physicians, clinical specialists, allied health, and healthcare administration roles.",
    icon: "heart",
  },
  {
    slug: "nursing",
    name: "Nursing",
    description: "Registered nurses, travel nursing, nurse practitioners, and clinical care groups.",
    icon: "plus-circle",
  },
  {
    slug: "finance-banking",
    name: "Finance & Banking",
    description: "Investment banking, financial analysis, corporate finance, and risk advisory jobs.",
    icon: "banknotes",
  },
  {
    slug: "accounting",
    name: "Accounting",
    description: "CPAs, auditors, corporate controllers, tax specialists, and bookkeeping vacancies.",
    icon: "calculator",
  },
  {
    slug: "marketing-sales",
    name: "Marketing & Sales",
    description: "Digital marketing, growth, SEO, B2B sales, account executives, and SDR openings.",
    icon: "megaphone",
  },
  {
    slug: "customer-support",
    name: "Customer Support",
    description: "Customer success, support desk, client onboarding, and technical helpdesk roles.",
    icon: "chat-bubble-left-right",
  },
  {
    slug: "education-teaching",
    name: "Education & Teaching",
    description: "K-12 educators, higher education lecturers, academic researchers, and tutors.",
    icon: "academic-cap",
  },
  {
    slug: "engineering-construction",
    name: "Engineering & Construction",
    description: "Civil, mechanical, electrical engineering, project management, and skilled trades.",
    icon: "wrench-screwdriver",
  },
  {
    slug: "hospitality-retail",
    name: "Hospitality & Retail",
    description: "Restaurant management, retail operations, hotel administration, and service roles.",
    icon: "shopping-bag",
  },
  {
    slug: "government-public-sector",
    name: "Government & Public Sector",
    description: "Municipal, federal, defense, public utility, and civil service vacancies.",
    icon: "building-library",
  },
  {
    slug: "legal",
    name: "Legal",
    description: "Corporate counsel, paralegal, associate attorney, and compliance officer alerts.",
    icon: "scale",
  },
  {
    slug: "logistics-supply-chain",
    name: "Logistics & Supply Chain",
    description: "Procurement, warehouse operations, freight forwarding, and inventory management.",
    icon: "truck",
  },
  {
    slug: "design-creative",
    name: "Design & Creative",
    description: "UI/UX design, product design, graphic design, video editing, and creative roles.",
    icon: "paint-brush",
  },
  {
    slug: "human-resources",
    name: "Human Resources",
    description: "Talent acquisition, technical recruiting, HR business partners, and people ops.",
    icon: "user-group",
  },
];

export function getIndustryBySlug(slug: string): IndustryConfig | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}
