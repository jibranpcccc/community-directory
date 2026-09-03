export const siteConfig = {
  name: "JobAlertHub",
  shortName: "JobAlerts",
  tagline: "Job Alert Groups: Telegram Channels & Discord Career Servers",
  headline: "Discover Active Job Alert Groups, Telegram Channels & Discord Servers",
  subheadline:
    "Search public WhatsApp job groups, Telegram hiring channels, and Discord career servers sharing job openings, tech hiring alerts, and remote work across 14 target markets (13 countries + Worldwide/Remote).",
  description:
    "JobAlertHub is a verified directory of public job alert groups, Telegram job channels, and Discord career servers across 14 target markets including the USA, UK, Canada, Australia, India, and remote work.",
  url: process.env.PUBLIC_SITE_URL || "https://jobalertgroups.com",
  defaultLocale: "en",
  showAdPlaceholders: process.env.SHOW_AD_PLACEHOLDERS === "true",
  taxonomyMinCommunitiesForIndex: 5, // minimum 5 published listings required before indexation
  tagPageMinCommunities: 5,          // minimum 5 published listings required before tag indexation
  categoryMinCommunities: 5,         // minimum 5 published listings required before category indexation
  countryMinCommunities: 5,          // minimum 5 published listings required before country indexation
  jobTypeMinCommunities: 5,          // minimum 5 published listings required before job-type indexation
  platformMinCommunities: 5,         // minimum 5 published listings required before platform indexation
  paginationPageSize: 24,
  analytics: {
    googleAnalyticsId: process.env.PUBLIC_GA_MEASUREMENT_ID || "G-57Y77TMLM7",
    googleSiteVerification:
      process.env.PUBLIC_GSC_VERIFICATION || "iaqlM8LbV4PXhOqkuPvUfIvl_0JiGQm8Kc4HAI1qPeA",
    bingSiteVerification: process.env.PUBLIC_BING_VERIFICATION || "",
  },
  links: {
    github: "https://github.com/jibranpcccc/community-directory",
    submit: "/submit/",
    report: "/report/",
  },
  nav: [
    { label: "All Job Groups", href: "/jobs/" },
    { label: "Worldwide / Remote", href: "/country/global/" },
    { label: "Remote Jobs", href: "/job-type/remote-jobs/" },
    { label: "Tech Jobs", href: "/category/tech-jobs/" },
    { label: "How We Verify", href: "/how-we-verify/" },
    { label: "Safety", href: "/safety/" },
  ],
  footerNav: {
    countries: [
      { label: "Worldwide / Remote", href: "/country/global/" },
      { label: "USA Job Groups", href: "/country/usa/" },
      { label: "UK Job Groups", href: "/country/uk/" },
      { label: "Canada Job Groups", href: "/country/canada/" },
      { label: "Australia Job Groups", href: "/country/australia/" },
      { label: "India Job Groups", href: "/country/india/" },
      { label: "Germany Job Groups", href: "/country/germany/" },
      { label: "Netherlands Job Groups", href: "/country/netherlands/" },
      { label: "Singapore Job Groups", href: "/country/singapore/" },
      { label: "UAE Job Groups", href: "/country/uae/" },
      { label: "Philippines Job Groups", href: "/country/philippines/" },
      { label: "New Zealand Job Groups", href: "/country/new-zealand/" },
      { label: "Ireland Job Groups", href: "/country/ireland/" },
      { label: "South Africa Job Groups", href: "/country/south-africa/" },
    ],
    jobTypes: [
      { label: "Remote Jobs", href: "/job-type/remote-jobs/" },
      { label: "Government Jobs", href: "/job-type/government-jobs/" },
      { label: "Full-Time Jobs", href: "/job-type/full-time-jobs/" },
      { label: "Tech & Software Jobs", href: "/category/tech-jobs/" },
      { label: "Healthcare & Nursing", href: "/category/healthcare-jobs/" },
      { label: "Internships & Graduate", href: "/category/internships-graduate/" },
      { label: "Visa Sponsorship", href: "/category/visa-sponsorship-jobs/" },
    ],
    platforms: [
      { label: "Discord Job Servers", href: "/platform/discord/" },
      { label: "Telegram Job Channels", href: "/platform/telegram/" },
      { label: "WhatsApp Job Groups", href: "/platform/whatsapp/" },
    ],
    trustAndLegal: [
      { label: "About JobAlertHub", href: "/about/" },
      { label: "How We Verify", href: "/how-we-verify/" },
      { label: "Job Scam Safety Guide", href: "/safety/" },
      { label: "Editorial Policy", href: "/editorial-policy/" },
      { label: "Disclaimer", href: "/disclaimer/" },
      { label: "Privacy Policy", href: "/privacy/" },
      { label: "Terms of Service", href: "/terms/" },
    ],
  },
};
