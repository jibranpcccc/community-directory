import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import fs from 'fs';
import path from 'path';

// Calculate tags, categories, job-types, countries, and platforms with listings for sitemap indexation
let eligibleTags = new Set();
let eligibleCategories = new Set();
let eligibleJobTypes = new Set();
let eligibleCountries = new Set();
let eligiblePlatforms = new Set();

try {
  const groupsPath = path.resolve('./src/data/groups.json');
  if (fs.existsSync(groupsPath)) {
    const raw = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
    const tagCounts = {};
    const catCounts = {};
    const jobTypeCounts = {};
    const countryCounts = {};
    const platCounts = {};

    const countryCodeToSlug = {
      US: 'usa',
      GB: 'uk',
      CA: 'canada',
      AU: 'australia',
      NZ: 'new-zealand',
      IE: 'ireland',
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
        if (Array.isArray(item.tags)) {
          for (const t of item.tags) {
            const norm = t.toLowerCase().trim();
            tagCounts[norm] = (tagCounts[norm] || 0) + 1;
          }
        }
      }
    }

    eligibleTags = new Set(
      Object.entries(tagCounts)
        .filter(([_, count]) => count >= 3)
        .map(([t]) => t)
    );
    eligibleCategories = new Set(
      Object.entries(catCounts)
        .filter(([_, count]) => count > 0)
        .map(([c]) => c)
    );
    eligibleJobTypes = new Set(
      Object.entries(jobTypeCounts)
        .filter(([_, count]) => count > 0)
        .map(([jt]) => jt)
    );
    eligibleCountries = new Set(
      Object.entries(countryCounts)
        .filter(([_, count]) => count > 0)
        .map(([c]) => c)
    );
    eligiblePlatforms = new Set(
      Object.entries(platCounts)
        .filter(([_, count]) => count > 0)
        .map(([p]) => p)
    );
  }
} catch {
  // fallback
}

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://communityhub-directory.netlify.app',
  output: 'static',
  server: {
    host: true, // Listen on all network addresses (0.0.0.0, 127.0.0.1, localhost, IPv6)
    port: 4321,
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => {
        if (
          page.includes('/submit-success') ||
          page.includes('/report-success') ||
          page.includes('/new') ||
          page.includes('/recently-updated') ||
          page.includes('/404')
        ) {
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
        if (page.includes('/tag/')) {
          const match = page.match(/\/tag\/([^/]+)/);
          if (match && match[1]) {
            return eligibleTags.has(match[1].toLowerCase());
          }
          return false;
        }
        return true;
      },
      serialize: (item) => {
        const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://communityhub-directory.netlify.app').replace(/\/+$/, '');
        if (item.url !== `${siteUrl}/` && item.url.endsWith('/')) {
          item.url = item.url.replace(/\/+$/, '');
        }
        return item;
      },
    }),
  ],
  build: {
    format: 'directory',
  },
});
