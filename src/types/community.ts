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

export interface Community {
  id: string;
  slug: string;
  title: string;
  platform: PlatformId;
  category: string;
  subcategory?: string | null;
  tags: string[];
  inviteUrl: string;
  description?: string | null;
  language?: string | null;
  country?: string | null;
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
  published: boolean;
  featured?: boolean;
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
