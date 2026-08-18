import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import fs from 'fs';
import path from 'path';

// Calculate tags with at least 5 listings for sitemap indexation
let eligibleTags = new Set(['javascript', 'web-dev']);
try {
  const groupsPath = path.resolve('./src/data/groups.json');
  if (fs.existsSync(groupsPath)) {
    const raw = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
    const tagCounts = {};
    for (const item of raw) {
      if (item.published && item.linkStatus !== 'removed' && Array.isArray(item.tags)) {
        for (const t of item.tags) {
          const norm = t.toLowerCase().trim();
          tagCounts[norm] = (tagCounts[norm] || 0) + 1;
        }
      }
    }
    eligibleTags = new Set(
      Object.entries(tagCounts)
        .filter(([_, count]) => count >= 5)
        .map(([t]) => t)
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
        return true;
      },
    }),
  ],
  build: {
    format: 'directory',
  },
});
