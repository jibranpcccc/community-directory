# Custom Domain Migration Protocol: JobAlertGroups.com

**Domain:** `JobAlertGroups.com` (`https://jobalertgroups.com`)  
**Status:** Codebase & CI/CD Configured for Production Deployment  
**DNS Status:** Delegated to Netlify DNS (`dns1.p01.nsone.net` / `dns2.p02.nsone.net`)  

---

## 1. Codebase Single Source of Truth Alignment

The codebase has been updated with `https://jobalertgroups.com` across all core layers:

1. **`src/config/site.ts`**:
   - `url: process.env.PUBLIC_SITE_URL || "https://jobalertgroups.com"`
2. **`astro.config.mjs`**:
   - `site: process.env.PUBLIC_SITE_URL || "https://jobalertgroups.com"`
3. **`netlify.toml`**:
   - `PUBLIC_SITE_URL = "https://jobalertgroups.com"`
   - 301 redirects for `communityhub-directory.netlify.app` $\rightarrow$ `https://jobalertgroups.com/:splat`
   - 301 redirects for `www.jobalertgroups.com` $\rightarrow$ `https://jobalertgroups.com/:splat`
4. **`public/robots.txt`**:
   - `Sitemap: https://jobalertgroups.com/sitemap-index.xml`
5. **`.github/workflows/quality-check.yml` & `.github/workflows/discover-groups.yml`**:
   - Added Netlify API custom domain attachment step during production deployment.

---

## 2. Automated Derivatives

All site artifacts and structured metadata now render `jobalertgroups.com`:

- **Canonical URLs**: `<link rel="canonical" href="https://jobalertgroups.com/...">`
- **XML Sitemaps**: `https://jobalertgroups.com/sitemap-index.xml` & `https://jobalertgroups.com/sitemap-0.xml`
- **Robots Directive**: `Sitemap: https://jobalertgroups.com/sitemap-index.xml`
- **OpenGraph & Twitter Cards**: `og:url` and `twitter:url` point to `https://jobalertgroups.com/...`
- **JSON-LD Structured Data**: `WebSite`, `Organization`, `CollectionPage`, `BreadcrumbList`, and `WebPage` URLs point to `https://jobalertgroups.com/...`

---

## 3. Netlify DNS & Custom Domain Verification

With DNS delegated to Netlify Name Servers:
- **Apex Domain (`jobalertgroups.com`)**: Serves primary SSL production build.
- **Subdomain (`www.jobalertgroups.com`)**: 301 redirects to apex `https://jobalertgroups.com`.
- **Legacy Subdomain (`communityhub-directory.netlify.app`)**: 301 redirects to `https://jobalertgroups.com`.
