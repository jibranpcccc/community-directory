export const siteConfig = {
  name: "JobAlertHub",
  shortName: "JobAlerts",
  tagline: "Find Active Job Alert Groups",
  headline: "Find Active Job Alert Groups",
  subheadline:
    "Discover public WhatsApp, Telegram and Discord communities sharing job openings, hiring alerts, career opportunities and remote work across the United States, United Kingdom, Canada and Australia.",
  description:
    "Discover public WhatsApp, Telegram and Discord communities sharing job openings, hiring alerts, career opportunities and remote work across the United States, United Kingdom, Canada and Australia. Built with zero hallucinated metrics.",
  url: process.env.PUBLIC_SITE_URL || "https://communityhub-directory.netlify.app",
  defaultLocale: "en",
  showAdPlaceholders: process.env.SHOW_AD_PLACEHOLDERS === "true",
  tagPageMinCommunities: 3, // minimum communities required before generating indexable tag page
  paginationPageSize: 24,
  links: {
    github: "https://github.com",
    submit: "/submit",
    report: "/report",
  },
  nav: [
    { label: "All Job Groups", href: "/jobs" },
    { label: "USA", href: "/country/usa" },
    { label: "UK", href: "/country/uk" },
    { label: "Canada", href: "/country/canada" },
    { label: "Australia", href: "/country/australia" },
    { label: "Remote Jobs", href: "/job-type/remote-jobs" },
    { label: "Tech Jobs", href: "/category/tech-jobs" },
    { label: "Healthcare", href: "/category/healthcare-jobs" },
    { label: "Submit", href: "/submit" },
    { label: "Safety", href: "/safety" },
  ],
  footerNav: {
    countries: [
      { label: "USA Job Groups", href: "/country/usa" },
      { label: "UK Job Groups", href: "/country/uk" },
      { label: "Canada Job Groups", href: "/country/canada" },
      { label: "Australia Job Groups", href: "/country/australia" },
    ],
    jobTypes: [
      { label: "Remote Jobs", href: "/job-type/remote-jobs" },
      { label: "Full-Time Jobs", href: "/job-type/full-time-jobs" },
      { label: "Tech & Software Jobs", href: "/category/tech-jobs" },
      { label: "Healthcare & Nursing", href: "/category/healthcare-jobs" },
      { label: "Internships & Graduate", href: "/category/internships-graduate" },
      { label: "Visa Sponsorship", href: "/category/visa-sponsorship-jobs" },
    ],
    platforms: [
      { label: "Telegram Job Channels", href: "/platform/telegram" },
      { label: "WhatsApp Job Groups", href: "/platform/whatsapp" },
      { label: "Discord Job Servers", href: "/platform/discord" },
    ],
    trustAndLegal: [
      { label: "Job Scam Safety Guide", href: "/safety" },
      { label: "How We Verify", href: "/how-we-verify" },
      { label: "Editorial Policy", href: "/editorial-policy" },
      { label: "About Us", href: "/about" },
      { label: "Report Listing", href: "/report" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
};
