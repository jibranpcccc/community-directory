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

try {
  const groupsPath = path.resolve('./src/data/groups.json');
  if (fs.existsSync(groupsPath)) {
    const raw = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
    const catCounts = {};
    const jobTypeCounts = {};
    const countryCounts = {};
    const platCounts = {};

    const countryCodeToSlug = {
      US: 'usa',
      GB: 'uk',
      CA: 'canada',
      AU: 'australia',
    };

    for (const item of raw) {
      if (item.published && item.linkStatus !== 'removed' && item.linkStatus !== 'dead') {
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
        // Exclude utility, success, and error pages
        if (
          page.includes('/submit-success') ||
          page.includes('/report-success') ||
          page.includes('/new') ||
          page.includes('/recently-updated') ||
          page.includes('/submit') ||
          page.includes('/report') ||
          page.includes('/contact') ||
          page.includes('/404')
        ) {
          return false;
        }
        // Permanently exclude all tag pages
        if (page.includes('/tag/')) {
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
