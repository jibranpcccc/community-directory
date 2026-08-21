import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import fs from 'fs';
import path from 'path';

// Calculate categories, job-types, countries, and platforms with listings for sitemap indexation
let eligibleCategories = new Set();
let eligibleJobTypes = new Set();
let eligibleCountries = new Set();
let eligiblePlatforms = new Set();
let eligibleGroupSlugs = new Set();

function isCommunityIndexWorthy(item) {
  if (!item.published || item.linkStatus !== 'active') return false;
  if (item.vertical !== 'jobs') return false;
  if (!item.lastSuccessfulValidationAt) return false;
  const validationAgeDays = (Date.now() - new Date(item.lastSuccessfulValidationAt).getTime()) / (1000 * 3600 * 24);
  if (validationAgeDays > 30) return false;
  const approvedMarkets = [
    'GLOBAL', 'US', 'GB', 'CA', 'AU', 'IN', 'DE', 'NL', 'SG', 'AE', 'PH', 'NZ', 'IE', 'ZA'
  ];
  if (!item.countryCode || !approvedMarkets.includes(item.countryCode)) return false;
  if (!['discord', 'telegram', 'whatsapp'].includes(item.platform)) return false;
  if (!item.countryEvidence || !item.countryEvidence.text) return false;
  if (item.safetyFlags && item.safetyFlags.length > 0) return false;
  if (!item.slug || !/^[a-z0-9-]+$/.test(item.slug)) return false;
  if (!item.title || item.title.trim().length < 3) return false;
  if (item.verificationStatus === 'source-confirmed') {
    if (
      !item.sourceVerification ||
      item.sourceVerification.status !== 'confirmed' ||
      !item.sourceUrls ||
      item.sourceUrls.length === 0
    ) {
      return false;
    }
  }
  const isHighTrust = ['source-confirmed', 'owner-confirmed', 'manually-reviewed'].includes(item.verificationStatus);
  if (!isHighTrust) {
    return false;
  }
  return true;
}

try {
  const groupsPath = path.resolve('./src/data/groups.json');
  if (fs.existsSync(groupsPath)) {
    const raw = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
    const catCounts = {};
    const jobTypeCounts = {};
    const countryCounts = {};
    const platCounts = {};

    const countryCodeToSlug = {
      GLOBAL: 'global',
      US: 'usa',
      GB: 'uk',
      CA: 'canada',
      AU: 'australia',
      IN: 'india',
      DE: 'germany',
      NL: 'netherlands',
      SG: 'singapore',
      AE: 'uae',
      PH: 'philippines',
      NZ: 'new-zealand',
      IE: 'ireland',
      ZA: 'south-africa',
    };

    for (const item of raw) {
      if (isCommunityIndexWorthy(item)) {
        eligibleGroupSlugs.add(item.slug);

        if (item.category) {
          catCounts[item.category] = (catCounts[item.category] || 0) + 1;
        }
        if (item.countryCode && countryCodeToSlug[item.countryCode]) {
          const cSlug = countryCodeToSlug[item.countryCode];
          countryCounts[cSlug] = (countryCounts[cSlug] || 0) + 1;
        }
        if (Array.isArray(item.jobTypes)) {
          for (const jt of item.jobTypes) {
            jobTypeCounts[jt] = (jobTypeCounts[jt] || 0) + 1;
          }
        }
        if (item.platform) {
          platCounts[item.platform] = (platCounts[item.platform] || 0) + 1;
        }
      }
    }

    eligibleCategories = new Set(
      Object.entries(catCounts)
        .filter(([_, count]) => count >= 5)
        .map(([c]) => c)
    );
    eligibleJobTypes = new Set(
      Object.entries(jobTypeCounts)
        .filter(([_, count]) => count >= 5)
        .map(([jt]) => jt)
    );
    eligibleCountries = new Set(
      Object.entries(countryCounts)
        .filter(([_, count]) => count >= 5)
        .map(([c]) => c)
    );
    eligiblePlatforms = new Set(
      Object.entries(platCounts)
        .filter(([_, count]) => count >= 5)
        .map(([p]) => p)
    );
  }
} catch {
  // fallback if file not read
}

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://communityhub-directory.netlify.app',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => {
        // Exclude utility, success, error, and legal pages from sitemap
        if (
          page.includes('/submit-success') ||
          page.includes('/report-success') ||
          page.includes('/new') ||
          page.includes('/recently-updated') ||
          page.includes('/submit') ||
          page.includes('/report') ||
          page.includes('/contact') ||
          page.includes('/privacy') ||
          page.includes('/terms') ||
          page.includes('/disclaimer') ||
          page.includes('/404')
        ) {
          return false;
        }
        // Permanently exclude all tag pages
        if (page.includes('/tag/')) {
          return false;
        }
        // Group detail pages must pass index-worthiness gate
        if (page.includes('/group/')) {
          const match = page.match(/\/group\/([^/]+)/);
          if (match && match[1]) {
            return eligibleGroupSlugs.has(match[1]);
          }
          return false;
        }
        if (page.includes('/country/')) {
          const match = page.match(/\/country\/([^/]+)/);
          if (match && match[1]) {
            return eligibleCountries.has(match[1].toLowerCase());
          }
          return false;
        }
        if (page.includes('/job-type/')) {
          const match = page.match(/\/job-type\/([^/]+)/);
          if (match && match[1]) {
            return eligibleJobTypes.has(match[1].toLowerCase());
          }
          return false;
        }
        if (page.includes('/category/')) {
          const match = page.match(/\/category\/([^/]+)/);
          if (match && match[1]) {
            return eligibleCategories.has(match[1]);
          }
          return false;
        }
        if (page.includes('/platform/')) {
          const match = page.match(/\/platform\/([^/]+)/);
          if (match && match[1]) {
            return eligiblePlatforms.has(match[1]);
          }
          return false;
        }
        return true;
      },
      serialize: (item) => {
        const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://communityhub-directory.netlify.app').replace(/\/+$/, '');
        if (item.url === siteUrl || item.url === `${siteUrl}/`) {
          item.url = `${siteUrl}/`;
        } else if (!item.url.endsWith('/')) {
          item.url = `${item.url}/`;
        }
        return item;
      },
    }),
  ],
  build: {
    format: 'directory',
  },
});
