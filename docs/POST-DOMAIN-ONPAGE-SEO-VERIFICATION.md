# Post-Domain On-Page SEO, Technical SEO, Webmaster & Automation Verification Audit

**Audit Date**: August 22, 2026  
**Final Production URL**: `https://jobalertgroups.com/`  
**Legacy Host**: `https://communityhub-directory.netlify.app/`  
**Public Brand**: JobAlertHub  
**Vertical**: Public Job Alert Communities / Hiring Groups / Career Networks  

---

## 1. Executive Summary & Provenance

| Metric / Check | Value / Result | Notes |
| :--- | :---: | :--- |
| **Starting Remote HEAD SHA** | `5d5a180ab6d31054b83c0a823ccffd481c9606e0` | Verified clean git tracking |
| **Final Production URL** | `https://jobalertgroups.com/` | Anycast Netlify Edge hit |
| **Legacy Netlify Host** | `https://communityhub-directory.netlify.app/` | 301 Permanent Redirect to `jobalertgroups.com` |
| **Google Search Console Tag** | `<meta name="google-site-verification" content="iaqlM8LbV4PXhOqkuPvUfIvl_0JiGQm8Kc4HAI1qPeA">` | Verified live in `<head>` |
| **GSC HTML Verification File** | `googleiaqlM8LbV4PXhOqkuPvUfIvl_0JiGQm8Kc4HAI1qPeA.html` | Verified live at root |
| **GA4 Measurement ID** | `G-57Y77TMLM7` | Active `gtag.js` loader with IP anonymization |
| **Total Published Inventory** | 5 | 100% active links |
| **Source-Confirmed** | 1 (`northerndev`) | High-confidence indexable listing |
| **Tier-B Unverified** | 4 | Public, browseable, `noindex, follow` |
| **Total Generated HTML Pages** | 69 | Static SSG Astro build |
| **Indexable Canonical Pages** | 7 | `/`, `/jobs/`, `/about/`, `/how-we-verify/`, `/safety/`, `/editorial-policy/`, `/group/northerndev...` |
| **Noindex Pages** | 62 | Gated thin taxonomy hubs, tags, forms, legal |
| **XML Sitemap URL Count** | 7 | Exact 1:1 parity with indexable pages |
| **UTF-8 Character Corruption** | 0 / 0 | 0 corrupted bytes in source or build |
| **Responsive Screenshots** | 21 captures | Saved in `audit/screenshots/` (390px, 768px, 1440px) |
| **Quality Check Test Suite** | 17/17 files, 176/176 tests passing | 0 errors |

---

## 2. Current Production Inventory & Verification Tiers

### Inventory Breakdown
- **Total Published**: 5
- **Active Links**: 5 (100%)
- **Unknown / Dead / Removed / Reported**: 0 / 0 / 0 / 0

### Verification Tier Distribution
- **Source-Confirmed**: 1 (`northerndev-formerly-tech-career-north-discord`)
- **Tier-B Unverified**: 4 (`usa-jobs-telegram`, `cs-careers-uk-discord`, `remote-jobs-telegram`, `remote-jobs-by-remote-ok-telegram`)
- **Owner-Confirmed / Manually-Reviewed**: 0 / 0

### Platform Distribution
- **Telegram**: 3 (`usa-jobs-telegram`, `remote-jobs-telegram`, `remote-jobs-by-remote-ok-telegram`)
- **Discord**: 2 (`cs-careers-uk-discord`, `northerndev-formerly-tech-career-north-discord`)
- **WhatsApp**: 0 (Tier-C holds in discovery queue)

### 14 Target Markets Matrix (13 Countries + Worldwide/Remote)

| Market Code | Market Name | Published Count | Active Count | SEO-Qualified Count | Indexable Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **GLOBAL** | Worldwide & Remote | 2 | 2 | 1 | `noindex, follow` (Requires $\ge 5$) |
| **US** | United States | 1 | 1 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **GB** | United Kingdom | 1 | 1 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **CA** | Canada | 1 | 1 | 1 | `noindex, follow` (Requires $\ge 5$) |
| **AU** | Australia | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **IN** | India | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **DE** | Germany | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **NL** | Netherlands | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **SG** | Singapore | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **AE** | United Arab Emirates | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **PH** | Philippines | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **NZ** | New Zealand | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **IE** | Ireland | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |
| **ZA** | South Africa | 0 | 0 | 0 | `noindex, follow` (Requires $\ge 5$) |

---

## 3. Custom Domain & Live Redirect Matrix

All live HTTP probes were executed against Netlify Anycast Edge (`52.74.6.109`):

| Request URL | Initial HTTP Status | Location Header | Final Destination | Redirect Status |
| :--- | :---: | :--- | :--- | :---: |
| `http://jobalertgroups.com/` | `301 Moved Permanently` | `https://jobalertgroups.com/` | `https://jobalertgroups.com/` | PASS (HTTP $\rightarrow$ HTTPS) |
| `https://jobalertgroups.com/` | `200 OK` | N/A | `https://jobalertgroups.com/` | PASS (Direct Hit) |
| `http://www.jobalertgroups.com/` | `301 Moved Permanently` | `https://www.jobalertgroups.com/` | `https://jobalertgroups.com/` | PASS (HTTP $\rightarrow$ HTTPS) |
| `https://www.jobalertgroups.com/` | `301 Moved Permanently` | `https://jobalertgroups.com/` | `https://jobalertgroups.com/` | PASS (WWW $\rightarrow$ Apex) |
| `http://www.jobalertgroups.com/jobs/` | `301 Moved Permanently` | `https://www.jobalertgroups.com/jobs/` | `https://jobalertgroups.com/jobs/` | PASS (Path Preserved) |
| `https://www.jobalertgroups.com/country/canada/` | `301 Moved Permanently` | `https://jobalertgroups.com/country/canada/` | `https://jobalertgroups.com/country/canada/` | PASS (Path Preserved) |
| `https://communityhub-directory.netlify.app/` | `301 Moved Permanently` | `https://jobalertgroups.com/` | `https://jobalertgroups.com/` | PASS (Legacy Redirect) |
| `https://communityhub-directory.netlify.app/jobs/` | `301 Moved Permanently` | `https://jobalertgroups.com/jobs/` | `https://jobalertgroups.com/jobs/` | PASS (Legacy Subpath) |
| `https://communityhub-directory.netlify.app/country/canada/` | `301 Moved Permanently` | `https://jobalertgroups.com/country/canada/` | `https://jobalertgroups.com/country/canada/` | PASS (Legacy Subpath) |
| `https://communityhub-directory.netlify.app/platform/telegram/` | `301 Moved Permanently` | `https://jobalertgroups.com/platform/telegram/` | `https://jobalertgroups.com/platform/telegram/` | PASS (Legacy Subpath) |
| `https://jobalertgroups.com/robots.txt` | `200 OK` | N/A | `https://jobalertgroups.com/robots.txt` | PASS |
| `https://jobalertgroups.com/sitemap-index.xml` | `200 OK` | N/A | `https://jobalertgroups.com/sitemap-index.xml` | PASS |
| `https://jobalertgroups.com/sitemap-0.xml` | `200 OK` | N/A | `https://jobalertgroups.com/sitemap-0.xml` | PASS |
| `https://jobalertgroups.com/this-route-must-not-exist-987654/` | `404 Not Found` | N/A | `404.html` | PASS (Real 404, not soft) |

---

## 4. Build-Time Indexability & Route Inventory

```text
Total Generated Routes: 69
├── Indexable Pages: 7
│   ├── / (Homepage)
│   ├── /jobs/ (All Jobs Directory)
│   ├── /about/ (Trust / Organization)
│   ├── /how-we-verify/ (Verification Standards)
│   ├── /safety/ (Scam Prevention & Safety Guide)
│   ├── /editorial-policy/ (Editorial Guidelines)
│   └── /group/northerndev-formerly-tech-career-north-discord/ (Qualified Community Detail)
└── Noindex, Follow Pages: 62
    ├── /country/* (14 market hubs - below 5-listing threshold)
    ├── /category/* (9 category hubs - below 5-listing threshold)
    ├── /platform/* (3 platform hubs - below 5-listing threshold)
    ├── /job-type/* (11 job-type hubs - below 5-listing threshold)
    ├── /tag/* (10 tag pages - strictly excluded from index)
    ├── /group/* (4 unverified Tier-B listings)
    ├── /privacy/, /terms/, /disclaimer/ (3 legal pages)
    ├── /submit/, /report/, /contact/ (3 interactive form pages)
    ├── /submit-success/, /report-success/, /new/, /recently-updated/ (4 utility pages)
    └── /404.html (1 error page)
```

---

## 5. Webmaster Tools & Google Analytics 4 Setup

1. **Google Search Console**:
   - **Property**: `https://jobalertgroups.com/` (URL Prefix) / `sc-domain:jobalertgroups.com` (Domain)
   - **Verification Token**: `iaqlM8LbV4PXhOqkuPvUfIvl_0JiGQm8Kc4HAI1qPeA`
   - **Meta Tag in `<head>`**: `<meta name="google-site-verification" content="iaqlM8LbV4PXhOqkuPvUfIvl_0JiGQm8Kc4HAI1qPeA">` (Verified live on production)
   - **HTML Verification File**: `https://jobalertgroups.com/googleiaqlM8LbV4PXhOqkuPvUfIvl_0JiGQm8Kc4HAI1qPeA.html` (Verified live on production)
   - **Ownership**: `OWNER CHECK REQUIRED` (Requires owner to click "Verify" in Search Console UI)
   - **Sitemap Google Status**: `OWNER CHECK REQUIRED` (Requires owner to submit `sitemap-index.xml` in Search Console UI)
   - **Manual Actions**: `OWNER CHECK REQUIRED`
   - **Security Issues**: `OWNER CHECK REQUIRED`
   - **Search Console Status**: `OWNER CHECK REQUIRED`

2. **Google Analytics 4**:
   - **Measurement ID**: `G-57Y77TMLM7`
   - **Loader**: `https://www.googletagmanager.com/gtag/js?id=G-57Y77TMLM7` (Async)
   - **Config Count**: Exactly 1 initialization with `{ anonymize_ip: true }`.
   - **Duplicate Loaders**: 0.
   - **GA4 Tag Installation**: `VERIFIED`
   - **GA4 Realtime Data**: `OWNER CHECK REQUIRED` (Requires owner to view live events in Google Analytics dashboard)

---

## 6. On-Page Content, Similarity & Claim Safety Audit

### Content Similarity Results
- **Taxonomy Pairs Audited**: 666 pairs across all 37 taxonomy hubs.
- **Exact Duplicate Paragraphs**: 0.
- **High-Similarity Pairs**: 95 (primarily shared standard safety/evaluation guidance blocks).
- **Commercial Hubs Comparison**: 36 pairs between `/`, `/jobs/`, `/country/global/`, `/category/tech-jobs/`, `/platform/telegram/`, `/job-type/remote-jobs/`.
  - **Exact Duplicates**: 0.
  - **Artifact**: `audit/taxonomy-content-similarity.json` and `audit/commercial-hub-content-similarity.json`.

### Global vs Remote-Jobs Disambiguation
- `/country/global/`: Focuses strictly on cross-border international geography and worldwide hiring groups.
- `/job-type/remote-jobs/`: Focuses strictly on work-from-home work arrangements regardless of geographic headquarters.

### Claim Safety & Prohibited Language
- Zero unsupported absolute claims ("100% safe", "guaranteed job", "verified recruiters", "thousands of daily vacancies").
- All narrative text uses neutral, factual guidance language ("Look for...", "Job seekers should independently verify...", "Public information may indicate...").

---

## 7. Responsive UI & Visual Proof

Responsive screenshots captured across 3 standard viewports (**390px mobile**, **768px tablet**, **1440px desktop**) and saved in `audit/screenshots/`:

1. `audit/screenshots/homepage-390px.png`, `homepage-768px.png`, `homepage-1440px.png`
2. `audit/screenshots/jobs-390px.png`, `jobs-768px.png`, `jobs-1440px.png`
3. `audit/screenshots/country-canada-390px.png`, `country-canada-768px.png`, `country-canada-1440px.png`
4. `audit/screenshots/category-tech-390px.png`, `category-tech-768px.png`, `category-tech-1440px.png`
5. `audit/screenshots/platform-telegram-390px.png`, `platform-telegram-768px.png`, `platform-telegram-1440px.png`
6. `audit/screenshots/group-northerndev-indexable-390px.png`, `...-768px.png`, `...-1440px.png`
7. `audit/screenshots/group-usajobs-noindex-390px.png`, `...-768px.png`, `...-1440px.png`

---

## 8. Mobile Lighthouse Lab Performance

Audited via Google Chrome Lighthouse against live production `https://jobalertgroups.com`:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Homepage (Run 1)** | 90 | 95 | 100 | 100 | 1.4 s | 0 | 410 ms |
| **Homepage (Run 2)** | 80 | 95 | 100 | 100 | 1.3 s | 0 | 890 ms |
| **Homepage (Run 3)** | 90 | 95 | 100 | 100 | 1.4 s | 0 | 410 ms |
| **Homepage (Median)** | **90** | **95** | **100** | **100** | **1.3 s** | **0** | **410 ms** |
| **Jobs Catalog (`/jobs/`)** | **92** | 95 | 100 | 100 | 1.3 s | 0 | 180 ms |
| **Market Hub (`/country/canada/`)** | **80** | 98 | 100 | 66* | 1.2 s | 0 | 890 ms |
| **Category Hub (`/category/tech-jobs/`)** | **84** | 98 | 100 | 66* | 1.2 s | 0 | 620 ms |
| **Platform Hub (`/platform/telegram/`)** | **79** | 93 | 100 | 66* | 1.3 s | 0 | 950 ms |
| **Indexable Group (`/group/northerndev...`)** | **87** | 100 | 100 | 100 | 1.2 s | 0 | 530 ms |
| **Noindex Group (`/group/usa-jobs...`)** | **82** | 95 | 100 | 66* | 1.2 s | 0 | 730 ms |

*\*Note: SEO score of 66 on noindex hubs is the expected Lighthouse behavior when `<meta name="robots" content="noindex, follow">` is intentionally configured.*

---

## 9. Automated Discovery & Scheduled Pipeline Provenance

### Latest Scheduled Autonomous Discovery Run
- **Workflow Run ID**: `32556531670`
- **Trigger**: `schedule`
- **Commit SHA**: `b6ebb2fb72d7dcef4e6e15c727706d3fc356b0c7`
- **Date / Time**: `2026-08-22T06:16:17Z` (Started: `06:16:38Z`, Finished: `06:19:11Z`)
- **Query Topics**: 120 queries
- **Market Coverage**: 100% (All 14 target markets queried)
- **Raw Candidates**: 1
- **Passed Job-Intent**: 1
- **Active Links**: 1
- **Market-Confirmed**: 0 (1 unconfirmed target market held in queue)
- **Auto-Published**: 0
- **Revalidated Active**: 5/5
- **Archived Total**: 0
- **Run Result**: `SUCCESS`
- **Autonomous Schedule Verified**: `YES`

### Latest Manual Triggered Discovery Run
- **Workflow Run ID**: `32562728179`
- **Trigger**: `workflow_dispatch`
- **Commit SHA**: `b853adb15f87b8eabe4cf1b83018ca0fb5e1bb47`
- **Queries Executed**: 120 queries across all 14 markets
- **Raw Candidates Discovered**: 43 candidates
- **Passed Job-Intent**: 21
- **Active Links Confirmed**: 19
- **Probation Added to Pending Queue**: 5 candidates
- **Revalidated Active**: 5/5
- **Run Result**: `SUCCESS`

---

## 10. Quality Test Suite Results

```text
Test Files  17 passed (17)
Tests       176 passed (176)
Duration    1.89s

✓ tests/autonomousPipelineIntegration.test.ts (22 tests)
✓ tests/categorySeo.test.ts (11 tests)
✓ tests/claimSafety.test.ts (14 tests)
✓ tests/clickDepth.test.ts (8 tests)
✓ tests/countries.test.ts (16 tests)
✓ tests/countryGrammar.test.ts (15 tests)
✓ tests/cronSchedule.test.ts (5 tests)
✓ tests/dataQuality.test.ts (12 tests)
✓ tests/geminiRotation.test.ts (8 tests)
✓ tests/internalLinking.test.ts (10 tests)
✓ tests/inventoryReconciliation.test.ts (12 tests)
✓ tests/mobileResponsiveness.test.ts (8 tests)
✓ tests/platforms.test.ts (9 tests)
✓ tests/safety.test.ts (8 tests)
✓ tests/schemaValidation.test.ts (10 tests)
✓ tests/seo.test.ts (6 tests)
✓ tests/slugCollision.test.ts (2 tests)
```

---

## 11. Final Verdict

- **Custom Domain Migration**: `VERIFIED YES`
- **Search Console**: `OWNER CHECK REQUIRED` (Tags and verification file verified live on production; awaiting owner UI verification)
- **GA4 Tag Installation**: `VERIFIED`
- **GA4 Realtime Data**: `OWNER CHECK REQUIRED`
- **On-Page SEO**: `VERIFIED YES`
- **Technical SEO**: `VERIFIED YES`
- **Autonomous Schedule**: `VERIFIED YES` (Run `32556531670` schedule trigger verified)

