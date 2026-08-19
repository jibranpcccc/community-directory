export type VerificationStatus =
  | "unverified"
  | "source-confirmed"
  | "owner-confirmed"
  | "manually-reviewed";

export type LinkStatus =
  | "active"
  | "unknown"
  | "dead"
  | "removed"
  | "reported";

export type PlatformId =
  | "telegram"
  | "whatsapp"
  | "discord"
  | "reddit"
  | "slack"
  | "skool"
  | "github"
  | "forum";

export type CountryCode = "US" | "GB" | "CA" | "AU" | "NZ" | "IE";

export type WorkArrangement =
  | "remote"
  | "hybrid"
  | "onsite"
  | "mixed"
  | "unknown";

export type ExperienceLevel =
  | "internship"
  | "entry-level"
  | "graduate"
  | "mid-level"
  | "senior"
  | "executive";

export type VisaSponsorship = "yes" | "no" | "mixed" | "unknown";

export type AccessType = "free" | "paid" | "mixed" | "unknown";

export type CommunityType =
  | "discussion"
  | "education"
  | "signals"
  | "news"
  | "jobs"
  | "deals"
  | "support"
  | "other"
  | "unknown";

export type DiscoveryMethod =
  | "gemini-search"
  | "manual"
  | "user-submission"
  | "platform-api"
  | "other";

export interface CountryEvidence {
  sourceType:
    | "platform-title"
    | "platform-description"
    | "independent-source"
    | "official-source";
  text?: string;
  sourceUrl?: string;
}

export interface Community {
  id: string;
  slug: string;
  title: string;
  platform: PlatformId;
  vertical: "jobs";
  category: string;
  subcategory?: string | null;
  tags: string[];
  inviteUrl: string;
  description?: string | null;
  language?: string | null;
  country?: string | null;
  countryCode: CountryCode | null;
  city: string | null;
  countryEvidence?: CountryEvidence | null;
  jobTypes: string[];
  industries: string[];
  workArrangement: WorkArrangement;
  experienceLevels: ExperienceLevel[];
  visaSponsorship: VisaSponsorship;
  accessType?: AccessType;
  communityType?: CommunityType;
  memberCount?: number | null;
  memberCountSource?: string | null;
  memberCountCheckedAt?: string | null;
  verificationStatus: VerificationStatus;
  linkStatus: LinkStatus;
  sourceUrls: string[];
  discoveryMethod: DiscoveryMethod;
  discoveredAt: string;
  lastCheckedAt?: string | null;
  updatedAt?: string | null;
  safetyFlags?: string[];
  guildId?: string | null;
  published: boolean;
  featured?: boolean;

  // Automated probation & lifecycle tracking metadata
  firstSeenAt?: string;
  lastSeenAt?: string;
  timesSeen?: number;
  providerIds?: string[];
  validationAttempts?: number;
  consecutiveUnknownCount?: number;
  lastValidationStatus?: LinkStatus;
  publicationConfidence?: number;
  publicationTier?: "A" | "B" | "C";
  autoPublishBlockedReasons?: string[];
  unpublishedAt?: string | null;
  unpublishReason?: string | null;
}

export interface ArchivedCommunity {
  id: string;
  slug: string;
  title: string;
  platform: PlatformId;
  inviteUrl: string;
  publishedAt?: string;
  unpublishedAt: string;
  unpublishReason: string;
  lastKnownStatus: LinkStatus;
  guildId?: string | null;
  countryCode?: CountryCode | null;
  category?: string;
}

export interface CategoryConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
  subcategories: string[];
  tags: string[];
  financialDisclaimerRequired?: boolean;
}

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  description: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  hostnamePatterns: string[];
  urlPrefixes: string[];
  isConfigured: boolean;
}

export interface FilterOptions {
  countryCode?: CountryCode;
  jobType?: string;
  industry?: string;
  workArrangement?: WorkArrangement;
  visaSponsorship?: VisaSponsorship;
  category?: string;
  platform?: PlatformId;
  tag?: string;
  language?: string;
  country?: string;
  accessType?: AccessType;
  verificationStatus?: VerificationStatus;
  linkStatus?: LinkStatus;
  communityType?: CommunityType;
  search?: string;
  featured?: boolean;
}

export type SortOption =
  | "newest"
  | "recently-checked"
  | "alphabetical"
  | "member-count";
