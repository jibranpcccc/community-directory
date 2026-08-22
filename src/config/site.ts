export const siteConfig = {
  name: "JobAlertHub",
  shortName: "JobAlerts",
  tagline: "Active Job Alert Groups Across 14 Target Markets (13 Countries + Worldwide/Remote)",
  headline: "Find Active Job Alert Groups",
  subheadline:
    "Discover public WhatsApp, Telegram, and Discord communities sharing job openings, hiring alerts, career opportunities, and remote work across 14 target markets (13 countries + Worldwide/Remote).",
  description:
    "JobAlertHub discovers and monitors public job-alert communities across Discord, Telegram and WhatsApp, covering 14 target markets (13 countries and Worldwide/Remote) including the United States, United Kingdom, Canada, Australia, India, Germany, the Netherlands, Singapore, the United Arab Emirates, the Philippines, New Zealand, Ireland and South Africa.",
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
