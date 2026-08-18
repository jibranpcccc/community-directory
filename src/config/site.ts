export const siteConfig = {
  name: "CommunityHub",
  shortName: "CommunityHub",
  tagline: "Find Communities Worth Joining",
  description:
    "A searchable, curated, and automated directory of publicly discoverable online communities across Telegram, WhatsApp, Discord, and more. Built with zero hallucinated metrics.",
  url: process.env.PUBLIC_SITE_URL || "https://communityhub-directory.netlify.app",
  defaultLocale: "en",
  showAdPlaceholders: process.env.SHOW_AD_PLACEHOLDERS === "true",
  tagPageMinCommunities: 2, // minimum communities required before generating indexable tag page
  paginationPageSize: 24,
  links: {
    github: "https://github.com",
    submit: "/submit",
    report: "/report",
  },
  nav: [
    { label: "Browse", href: "/communities" },
    { label: "Categories", href: "/#categories" },
    { label: "Platforms", href: "/#platforms" },
    { label: "Recently Added", href: "/new" },
    { label: "Recently Checked", href: "/recently-updated" },
    { label: "Submit Community", href: "/submit" },
  ],
  footerNav: {
    directory: [
      { label: "All Communities", href: "/communities" },
      { label: "Telegram Channels & Groups", href: "/platform/telegram" },
      { label: "WhatsApp Groups", href: "/platform/whatsapp" },
      { label: "Discord Servers", href: "/platform/discord" },
      { label: "Recently Added", href: "/new" },
      { label: "Recently Checked", href: "/recently-updated" },
    ],
    categories: [
      { label: "AI & Tech", href: "/category/ai-tech" },
      { label: "Crypto & Web3", href: "/category/crypto-web3" },
      { label: "Forex & Stocks", href: "/category/forex-stocks" },
      { label: "Online Earning & Remote Work", href: "/category/online-earning-remote-work" },
      { label: "Deals & Coupons", href: "/category/deals-coupons" },
    ],
    trustAndLegal: [
      { label: "Safety Guide", href: "/safety" },
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
