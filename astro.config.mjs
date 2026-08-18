import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://communitydirectory.netlify.app',
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
      filter: (page) =>
        !page.includes('/submit-success') &&
        !page.includes('/report-success') &&
        !page.includes('/404'),
    }),
  ],
  build: {
    format: 'directory',
  },
});
