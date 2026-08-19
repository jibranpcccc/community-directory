export interface JobTypeConfig {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  priority: number;
}

export const JOB_TYPES: JobTypeConfig[] = [
  {
    slug: "remote-jobs",
    name: "Remote Jobs",
    shortName: "Remote",
    description: "Public groups and channels sharing verified remote, telecommute, and distributed work opportunities.",
    icon: "laptop",
    priority: 1,
  },
  {
    slug: "full-time-jobs",
    name: "Full-Time Jobs",
    shortName: "Full-Time",
    description: "Communities sharing permanent, full-time career roles and corporate openings.",
    icon: "briefcase",
    priority: 2,
  },
  {
    slug: "internships",
    name: "Internships",
    shortName: "Internships",
    description: "Student and undergraduate internship opportunities, summer programs, and co-op placements.",
    icon: "academic-cap",
    priority: 3,
  },
  {
    slug: "graduate-jobs",
    name: "Graduate Jobs",
    shortName: "Graduate",
    description: "Entry-level schemes, graduate programs, and early-career opportunities.",
    icon: "sparkles",
    priority: 4,
  },
  {
    slug: "entry-level-jobs",
    name: "Entry-Level Jobs",
    shortName: "Entry Level",
    description: "Roles requiring zero to two years of experience, junior positions, and career starter openings.",
    icon: "arrow-trending-up",
    priority: 5,
  },
  {
    slug: "contract-jobs",
    name: "Contract Jobs",
    shortName: "Contract",
    description: "Fixed-term contracts, professional contracting, and consultancy placements.",
    icon: "document-text",
    priority: 6,
  },
  {
    slug: "freelance-jobs",
    name: "Freelance Jobs",
    shortName: "Freelance",
    description: "Gig, freelance, and project-based independent contractor work across digital disciplines.",
    icon: "pencil-square",
    priority: 7,
  },
  {
    slug: "visa-sponsorship-jobs",
    name: "Visa Sponsorship Jobs",
    shortName: "Visa Sponsorship",
    description: "Verified openings providing legitimate employer immigration or work visa sponsorship.",
    icon: "globe-alt",
    priority: 8,
  },
  {
    slug: "government-jobs",
    name: "Government Jobs",
    shortName: "Government",
    description: "Public sector, civil service, municipal, and state agency vacancy alerts.",
    icon: "building-library",
    priority: 9,
  },
  {
    slug: "part-time-jobs",
    name: "Part-Time Jobs",
    shortName: "Part-Time",
    description: "Flexible, hourly, and part-time positions accommodating varied schedules.",
    icon: "clock",
    priority: 10,
  },
  {
    slug: "temporary-jobs",
    name: "Temporary Jobs",
    shortName: "Temporary",
    description: "Seasonal, contingent, and interim staffing assignments.",
    icon: "calendar",
    priority: 11,
  },
];

export function getJobTypeBySlug(slug: string): JobTypeConfig | undefined {
  return JOB_TYPES.find((j) => j.slug === slug);
}
