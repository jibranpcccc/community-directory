import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { normalizeInviteUrl } from "../../src/lib/urls";

export const VerificationStatusSchema = z.enum([
  "unverified",
  "source-confirmed",
  "owner-confirmed",
  "manually-reviewed",
]);

export const LinkStatusSchema = z.enum([
  "active",
  "unknown",
  "dead",
  "removed",
  "reported",
]);

export const PlatformIdSchema = z.enum([
  "telegram",
  "whatsapp",
  "discord",
  "reddit",
  "slack",
  "skool",
  "github",
  "forum",
]);

export const CountryCodeSchema = z.enum(["US", "GB", "CA", "AU", "NZ", "IE"]);

export const WorkArrangementSchema = z.enum([
  "remote",
  "hybrid",
  "onsite",
  "mixed",
  "unknown",
]);

export const ExperienceLevelSchema = z.enum([
  "internship",
  "entry-level",
  "graduate",
  "mid-level",
  "senior",
  "executive",
]);

export const VisaSponsorshipSchema = z.enum(["yes", "no", "mixed", "unknown"]);

export const AccessTypeSchema = z.enum(["free", "paid", "mixed", "unknown"]);

export const CommunityTypeSchema = z.enum([
  "discussion",
  "education",
  "signals",
  "news",
  "jobs",
  "deals",
  "support",
  "other",
  "unknown",
]);

export const DiscoveryMethodSchema = z.enum([
  "gemini-search",
  "manual",
  "user-submission",
  "platform-api",
  "other",
]);

// Prohibited non-job keywords (Build-time Niche Guard)
const DISALLOWED_NICHE_REGEX =
  /\b(crypto\s+signals|forex\s+signals|binance\s+pump|airdrop\s+hunters|online\s+casino|sports\s+betting|binary\s+options|free\s+nitro)\b/i;

export const CommunitySchema = z.object({
  id: z.string().min(1, "ID is required"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1, "Title is required").max(120, "Title too long"),
  platform: PlatformIdSchema,
  vertical: z.literal("jobs", { errorMap: () => ({ message: "Community must have vertical='jobs'" }) }),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().nullable().optional(),
  tags: z.array(z.string()),
  inviteUrl: z.string().url("Invite URL must be a valid URL"),
  description: z.string().nullable().optional(),
  descriptionSource: z.enum(["platform", "confirmed-source", "platform-title", "platform-description", "independent-source"]).nullable().optional(),
  language: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  countryCode: CountryCodeSchema.nullable().optional().default(null),
  city: z.string().nullable().optional().default(null),
  countryEvidence: z.object({
    sourceType: z.enum(["platform-title", "platform-description", "independent-source", "official-source"]),
    text: z.string(),
    sourceUrl: z.string().optional(),
    checkedAt: z.string().datetime({ offset: true }).optional(),
  }).nullable().optional(),
  cityEvidence: z.object({
    sourceType: z.enum(["platform-title", "platform-description", "independent-source", "official-source"]),
    text: z.string(),
    checkedAt: z.string().datetime({ offset: true }).optional(),
  }).nullable().optional(),
  jobTypes: z.array(z.string()).optional().default([]),
  industries: z.array(z.string()).optional().default([]),
  workArrangement: WorkArrangementSchema.optional().default("unknown"),
  experienceLevels: z.array(ExperienceLevelSchema).optional().default([]),
  visaSponsorship: VisaSponsorshipSchema.optional().default("unknown"),
  accessType: AccessTypeSchema.optional().default("unknown"),
  communityType: CommunityTypeSchema.optional().default("unknown"),
  memberCount: z.number().int().nonnegative().nullable().optional(),
  memberCountSource: z.string().url().nullable().optional(),
  memberCountCheckedAt: z.string().datetime({ offset: true }).nullable().optional(),
  verificationStatus: VerificationStatusSchema,
  linkStatus: LinkStatusSchema,
  lastKnownLinkStatus: LinkStatusSchema.optional(),
  lastSuccessfulValidationAt: z.string().datetime({ offset: true }).nullable().optional(),
  sourceUrls: z.array(z.string().url()),
  sourceCheckedAt: z.string().datetime({ offset: true }).nullable().optional(),
  sourceVerification: z.object({
    status: z.enum(["confirmed", "failed", "unverified"]),
    checkedAt: z.string().datetime({ offset: true }),
    sourceUrl: z.string().url(),
    inviteUrl: z.string().url(),
    matchedBy: z.enum(["exact-href", "discord-guild-id"]),
    matchedGuildId: z.string().nullable().optional(),
    evidenceSnippet: z.string().nullable().optional(),
  }).nullable().optional(),
  discoveryMethod: DiscoveryMethodSchema,
  discoveredAt: z.string().datetime({ offset: true }),
  lastCheckedAt: z.string().datetime({ offset: true }).nullable().optional(),
  updatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  safetyFlags: z.array(z.string()).optional().default([]),
  guildId: z.string().nullable().optional(),
  published: z.boolean(),
  featured: z.boolean().optional(),
  // Probation and lifecycle tracking fields
  firstSeenAt: z.string().datetime({ offset: true }).optional(),
  lastSeenAt: z.string().datetime({ offset: true }).optional(),
  timesSeen: z.number().int().nonnegative().optional(),
  providerIds: z.array(z.string()).optional(),
  observedRunIds: z.array(z.string()).optional(),
  querySource: z.string().optional(),
  sourceHostname: z.string().optional(),
  validationAttempts: z.number().int().nonnegative().optional(),
  consecutiveUnknownCount: z.number().int().nonnegative().optional(),
  lastValidationStatus: LinkStatusSchema.optional(),
  publicationConfidence: z.number().optional(),
  publicationTier: z.enum(["A", "B", "C"]).optional(),
  autoPublishBlockedReasons: z.array(z.string()).optional(),
  unpublishedAt: z.string().datetime({ offset: true }).nullable().optional(),
  unpublishReason: z.string().nullable().optional(),
}).refine((data) => {
  const fullText = `${data.title} ${data.description || ""} ${data.tags.join(" ")}`;
  return !DISALLOWED_NICHE_REGEX.test(fullText);
}, { message: "Community contains prohibited non-job niche terms (crypto/forex/casino/etc.)" });

export type ValidatedCommunity = z.infer<typeof CommunitySchema>;

export function validateCommunitiesData(items: unknown[]): {
  valid: boolean;
  errors: string[];
  communities: ValidatedCommunity[];
} {
  const errors: string[] = [];
  const communities: ValidatedCommunity[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const seenSlugs = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const parseResult = CommunitySchema.safeParse(item);

    if (!parseResult.success) {
      errors.push(`Item #${i} (${(item as any)?.title || 'unknown'}): ${parseResult.error.message}`);
      continue;
    }

    const comm = parseResult.data;

    // Build-time Niche Guard
    if (comm.vertical !== "jobs") {
      errors.push(`Item #${i} (${comm.title}): Invalid vertical '${(comm as any).vertical}'. Must be 'jobs'.`);
    }

    if (DISALLOWED_NICHE_REGEX.test(comm.title) || DISALLOWED_NICHE_REGEX.test(comm.category)) {
      errors.push(`Item #${i} (${comm.title}): Rejected by Build-Time Niche Guard for prohibited niche keyword.`);
    }

    // Check duplicate ID
    if (seenIds.has(comm.id)) {
      errors.push(`Duplicate ID detected: "${comm.id}" at index ${i}`);
    }
    seenIds.add(comm.id);

    // Check duplicate Slug
    if (seenSlugs.has(comm.slug)) {
      errors.push(`Duplicate slug detected: "${comm.slug}" at index ${i}`);
    }
    seenSlugs.add(comm.slug);

    // Check duplicate normalized invite URL
    const normalized = normalizeInviteUrl(comm.inviteUrl);
    if (seenUrls.has(normalized)) {
      errors.push(`Duplicate normalized invite URL detected: "${normalized}" (item: ${comm.title})`);
    }
    seenUrls.add(normalized);

    communities.push(comm);
  }

  return {
    valid: errors.length === 0,
    errors,
    communities,
  };
}

// CLI execution
if (process.argv[1] && process.argv[1].includes("validateSchema")) {
  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const pendingPath = path.join(dataDir, "pending-groups.json");

  console.log("?? Validating JSON datasets against Job Directory Schema...");

  let hasError = false;

  if (fs.existsSync(groupsPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
      const res = validateCommunitiesData(Array.isArray(raw) ? raw : []);
      if (!res.valid) {
        console.error(`? groups.json validation failed with ${res.errors.length} error(s):`);
        res.errors.forEach((err) => console.error(`   - ${err}`));
        hasError = true;
      } else {
        console.log(`? groups.json is valid (${res.communities.length} items).`);
      }
    } catch (e: any) {
      console.error(`? Failed to parse groups.json: ${e.message}`);
      hasError = true;
    }
  } else {
    console.warn("?? groups.json not found (will be created).");
  }

  if (fs.existsSync(pendingPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(pendingPath, "utf-8"));
      const res = validateCommunitiesData(Array.isArray(raw) ? raw : []);
      if (!res.valid) {
        console.error(`? pending-groups.json validation failed with ${res.errors.length} error(s):`);
        res.errors.forEach((err) => console.error(`   - ${err}`));
        hasError = true;
      } else {
        console.log(`? pending-groups.json is valid (${res.communities.length} items).`);
      }
    } catch (e: any) {
      console.error(`? Failed to parse pending-groups.json: ${e.message}`);
      hasError = true;
    }
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log("?? All dataset schemas passed validation!");
  }
}
