# Custom Domain Migration Guide (Pre-Launch Protocol)

> **IMPORTANT**: This guide documents the exact migration procedure to execute when the custom `.com` domain is acquired and ready for launch (approximately 1 week from now). **DO NOT execute these migration steps prior to domain acquisition.**

---

## 1. Architectural Readiness

The JobAlertHub codebase has been engineered with a **Single Source of Truth** for site identity and URL generation:

- **Central Configuration File**: `src/config/site.ts` (`siteConfig.url`)
- **Environment Variable**: `PUBLIC_SITE_URL` (Defaults to `https://communityhub-directory.netlify.app` until migration)
- **Automatic Derivatives**:
  - Canonical URLs (`<link rel="canonical">`)
  - Open Graph / Twitter URLs (`og:url`, `twitter:url`)
  - JSON-LD Structured Data (`WebSite`, `Organization`, `WebPage`, `BreadcrumbList`, `CollectionPage`)
  - XML Sitemap (`sitemap-index.xml`)
  - Robots.txt Sitemap Declaration (`robots.txt`)

All URL paths will be strictly preserved 1:1 during the migration:
- `https://communityhub-directory.netlify.app/group/northerndev-formerly-tech-career-north-discord` $\rightarrow$ `https://<CUSTOM-DOMAIN>.com/group/northerndev-formerly-tech-career-north-discord`
- `https://communityhub-directory.netlify.app/jobs` $\rightarrow$ `https://<CUSTOM-DOMAIN>.com/jobs`
- `https://communityhub-directory.netlify.app/country/canada` $\rightarrow$ `https://<CUSTOM-DOMAIN>.com/country/canada`

---

## 2. Pre-Migration Checklist

Before triggering DNS or environment changes:

- [ ] Custom domain registered and DNS access confirmed.
- [ ] Primary canonical host decided (e.g. `https://jobalerthub.com` or `https://www.jobalerthub.com`).
- [ ] Netlify site dashboard access verified (`communityhub-directory`).

---

## 3. Step-by-Step Migration Protocol

### Step 1: Add Custom Domain in Netlify
1. Log in to Netlify Dashboard $\rightarrow$ Select `communityhub-directory`.
2. Navigate to **Site configuration** $\rightarrow$ **Domain management** $\rightarrow$ **Custom domains**.
3. Click **Add a domain** $\rightarrow$ Enter your apex domain (e.g. `jobalerthub.com`).
4. Click **Verify** $\rightarrow$ **Add domain**.

### Step 2: Configure DNS Records
Configure DNS with your domain registrar:
- **Apex domain (`jobalerthub.com`)**:
  - `A` Record $\rightarrow$ `75.2.60.5` (Netlify load balancer)
  - OR `ALIAS` / `ANAME` record to `communityhub-directory.netlify.app`
- **Subdomain (`www.jobalerthub.com`)**:
  - `CNAME` Record $\rightarrow$ `communityhub-directory.netlify.app`

### Step 3: SSL / TLS Certificate Provisioning
1. Under **Domain management** $\rightarrow$ **HTTPS**, Netlify will automatically provision a Let's Encrypt SSL certificate once DNS resolves.
2. Verify that `https://jobalerthub.com` loads with a valid padlock icon.

### Step 4: Primary Domain & Canonical Redirect in Netlify
1. In Netlify Domain Management, set your preferred host as **Primary domain** (e.g. `jobalerthub.com`).
2. Netlify will automatically 301-redirect `www.jobalerthub.com` to `jobalerthub.com`.

### Step 5: Update Central Codebase URL & Build Config
1. In `src/config/site.ts`, update the default URL:
   ```typescript
   url: process.env.PUBLIC_SITE_URL || "https://jobalerthub.com",
   ```
2. In `netlify.toml`, update `PUBLIC_SITE_URL`:
   ```toml
   [build.environment]
     NODE_VERSION = "20"
     PUBLIC_SITE_URL = "https://jobalerthub.com"
   ```
3. In `public/robots.txt`, update the sitemap directive:
   ```text
   Sitemap: https://jobalerthub.com/sitemap-index.xml
   ```

### Step 6: 301 Redirect Old Netlify Subdomain to Custom Domain
Add a permanent 301 redirect rule at the top of `netlify.toml` or `public/_redirects`:
```toml
[[redirects]]
  from = "https://communityhub-directory.netlify.app/*"
  to = "https://jobalerthub.com/:splat"
  status = 301
  force = true
```

### Step 7: Local Verification & Git Push
1. Run local build and validation suite:
   ```bash
   npm run typecheck
   npm run test
   npm run validate-data
   npm run build
   npm run seo:audit
   ```
2. Commit and push changes:
   ```bash
   git add -A
   git commit -m "feat(domain): migrate site URL to custom domain jobalerthub.com"
   git push origin main
   ```
3. GitHub Actions will build and deploy the updated site to Netlify with the new custom domain.

### Step 8: Google Search Console & Webmaster Setup
1. Open [Google Search Console](https://search.google.com/search-console).
2. Add a new **Domain Property** (`jobalerthub.com`) using DNS TXT record verification.
3. Once verified, navigate to **Sitemaps** $\rightarrow$ Submit `https://jobalerthub.com/sitemap-index.xml`.
4. Perform **URL Inspection** on:
   - `https://jobalerthub.com/`
   - `https://jobalerthub.com/jobs`
   - `https://jobalerthub.com/group/<representative-slug>`
5. Verify that Google renders the canonical URL as `https://jobalerthub.com/...` with 0 errors.

---

## 4. Post-Migration Verification Checklist

- [ ] All pages serve HTTP 200 on `https://jobalerthub.com`.
- [ ] `http://` redirects (301) to `https://`.
- [ ] `www.` redirects (301) to non-www (or vice versa).
- [ ] `https://communityhub-directory.netlify.app` redirects (301) to `https://jobalerthub.com`.
- [ ] Canonical tags on all pages point to `https://jobalerthub.com/...`.
- [ ] Open Graph and Twitter tags reference `https://jobalerthub.com/...`.
- [ ] XML Sitemap lists only `https://jobalerthub.com/...` URLs.
- [ ] JSON-LD schema objects (`WebSite`, `Organization`, `WebPage`, `BreadcrumbList`) contain `https://jobalerthub.com/...`.
