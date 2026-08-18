import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import fs from 'fs';
import path from 'path';

// Calculate tags, categories, and platforms with listings for sitemap indexation
let eligibleTags = new Set(['javascript', 'web-dev']);
let eligibleCategories = new Set(['ai-tech', 'crypto-web3']);
let eligiblePlatforms = new Set(['discord', 'telegram']);

try {
  const groupsPath = path.resolve('./src/data/groups.json');
  if (fs.existsSync(groupsPath)) {
    const raw = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
    const tagCounts = {};
    const catCounts = {};
    const platCounts = {};
    for (const item of raw) {
      if (item.published && item.linkStatus !== 'removed') {
        if (item.category) {
          catCounts[item.category] = (catCounts[item.category] || 0) + 1;
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
        .filter(([_, count]) => count >= 5)
        .map(([t]) => t)
    );
    eligibleCategories = new Set(
      Object.entries(catCounts)
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
        if (page.includes('/tag/')) {
          const match = page.match(/\/tag\/([^/]+)/);
          if (match && match[1]) {
            return eligibleTags.has(match[1].toLowerCase());
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
    }),
  ],
  build: {
    format: 'directory',
  },
});
