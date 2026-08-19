export const siteConfig = {
  name: "JobAlertHub",
  shortName: "JobAlerts",
  tagline: "Active Job Alert Groups for US, UK, Canada & Australia",
  headline: "Find Active Job Alert Groups",
  subheadline:
    "Discover public WhatsApp, Telegram, and Discord communities sharing job openings, hiring alerts, career opportunities, and remote work across the United States, United Kingdom, Canada, and Australia.",
  description:
    "Discover active public job alert communities across Discord, Telegram, and WhatsApp for the US, UK, Canada, and Australia, with automated link checks, relevance screening, and job-scam safeguards.",
  url: process.env.PUBLIC_SITE_URL || "https://communityhub-directory.netlify.app",
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
    { label: "USA", href: "/country/usa/" },
    { label: "UK", href: "/country/uk/" },
    { label: "Canada", href: "/country/canada/" },
    { label: "Australia", href: "/country/australia/" },
    { label: "Remote Jobs", href: "/job-type/remote-jobs/" },
    { label: "Tech Jobs", href: "/category/tech-jobs/" },
    { label: "Healthcare", href: "/category/healthcare-jobs/" },
    { label: "How We Verify", href: "/how-we-verify/" },
    { label: "Safety", href: "/safety/" },
  ],
  footerNav: {
    countries: [
      { label: "USA Job Groups", href: "/country/usa/" },
      { label: "UK Job Groups", href: "/country/uk/" },
      { label: "Canada Job Groups", href: "/country/canada/" },
      { label: "Australia Job Groups", href: "/country/australia/" },
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
      { label: "Report a Listing", href: "/report/" },
      { label: "Contact Us", href: "/contact/" },
      { label: "Privacy Policy", href: "/privacy/" },
      { label: "Terms of Service", href: "/terms/" },
      { label: "Disclaimer", href: "/disclaimer/" },
    ],
  },
};
