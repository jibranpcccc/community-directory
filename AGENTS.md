# AGENTS.md — Persistent Engineering Constitution

This document defines the strict engineering guidelines, architectural rules, and data integrity standards for the **Community Directory** project. All agents, contributors, and automated workflows modifying this codebase MUST follow these instructions.

---

## 1. Project Purpose & Philosophy

Community Directory is a fast, searchable, statically-generated public directory for discovering publicly listed online communities (Telegram channels/groups, WhatsApp groups, Discord servers, and future platforms).

### Core Principle: Zero Hallucination & Fact-First
- **Never fabricate data**: We never invent community names, invite links, member counts, growth stats, ratings, reviews, verification badges, activity stats, or founder information.
- **Explicit Unknowns**: If a field cannot be verified from a credible public source, store `null` or `"unknown"`. Do not generate filler copy.
- **No Fake Verified Badges**: Verification badges MUST strictly reflect one of four states:
  - `unverified`: Discovered publicly, no additional checks.
  - `source-confirmed`: Sourced directly from an official website or verified public domain.
  - `owner-confirmed`: Community admin confirmed ownership.
  - `manually-reviewed`: Administrator reviewed the listing manually.
- **No Fake Engagement / Trending**: Never generate fake "trending", "top-rated", or "+X members today" metrics. Use "Recently Added" or "Recently Checked" based on verified ISO timestamps.

---

## 2. Scraping & Public Access Ethics

- **Public Information Only**: Discovery and link validation work ONLY with publicly discoverable resources.
- **No Circumvention**:
  - Do NOT bypass login walls, CAPTCHAs, or anti-bot protections.
  - Do NOT join private groups or servers automatically.
  - Do NOT scrape private messages, member lists, or user profiles.
  - Do NOT impersonate users or spam community administrators.
  - If a source blocks access or returns 403/429, mark status as `"unknown"` — never attempt evasive workarounds.

---

## 3. Technology Stack & Architecture

- **Framework**: [Astro](https://astro.build/) (Static Site Generation / SSG)
- **Language**: TypeScript (`strict: true`)
- **Styling**: Tailwind CSS with custom restrained design tokens
- **Data Store (V1)**: Flat JSON files (`src/data/groups.json` for published, `src/data/pending-groups.json` for queue)
- **Data Access Layer**: All reads MUST go through `src/lib/communities.ts` (enables future migration to PostgreSQL / Supabase)
- **AI & Discovery**: Google Gemini API via official SDK with optional Google Search Grounding
- **Validation**: Runtime Zod schemas in `scripts/data/validateSchema.ts`
- **Hosting & Forms**: Netlify (`netlify.toml`, static HTML forms with honeypot spam protection)
- **CI/CD**: GitHub Actions for daily discovery, link health checks, and PR quality gates

---

## 4. Directory Structure

```text
/
├── .github/workflows/         # Automated GitHub Actions
│   ├── discover-groups.yml    # Daily discovery workflow
│   ├── validate-groups.yml    # Bi-weekly link health checker
│   └── quality-check.yml      # CI lint, test, typecheck, build
├── public/                    # Static assets (robots.txt, favicon.svg)
├── scripts/                   # Automation, discovery & maintenance scripts
│   ├── discover/              # Query generation & Gemini search integration
│   ├── validate/              # Link health check engine
│   ├── classify/              # Prompting & taxonomy assignment
│   ├── data/                  # Normalization, deduplication, schema validation
│   └── utilities/             # CLI tools (stats, approve)
├── src/
│   ├── components/            # Reusable Astro UI components
│   ├── config/                # Site, category, platform, discovery settings
│   ├── data/                  # groups.json, pending-groups.json, seeds.json
│   ├── layouts/               # BaseLayout, DirectoryLayout
│   ├── lib/                   # Data access, filters, search, SEO, schema
│   ├── pages/                 # Astro static pages & dynamic routes
│   ├── styles/                # global.css (Tailwind tokens)
│   └── types/                 # TypeScript interfaces
├── tests/                     # Vitest unit test suites
├── .env.example               # Template for environment variables
├── netlify.toml               # Netlify build and security headers
└── package.json
```

---

## 5. Development & Verification Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# TypeScript type checking
npm run typecheck

# Lint codebase
npm run lint

# Run unit tests
npm run test

# Validate JSON schema integrity
npm run validate-data

# View data statistics
npm run data:stats

# Build static production site
npm run build

# Run discovery engine (dry run)
npm run discover -- --dry-run

# Run discovery engine (live, requires GEMINI_API_KEY)
npm run discover

# Run link health validation
npm run validate-links

# Approve a pending community
npm run approve -- <id>
```

---

## 6. Environment Variables

| Variable | Required for | Default / Purpose |
| :--- | :--- | :--- |
| `PUBLIC_SITE_URL` | SEO / Canonical | `http://localhost:4321` (or Netlify domain in prod) |
| `GEMINI_API_KEY` | Discovery Script | Optional for local dev/build; required for `npm run discover` |
| `GEMINI_MODEL` | Discovery Script | `gemini-2.5-flash` |
| `GEMINI_SEARCH_ENABLED`| Discovery Script | `true` (Enables Google Search Grounding) |
| `DISCOVERY_MAX_QUERIES`| Discovery Script | `30` |
| `DISCOVERY_MAX_CANDIDATES`| Discovery Script | `100` |
| `AUTO_PUBLISH_DISCOVERED`| Discovery Script | `false` (Directs candidates to `pending-groups.json`) |

---

## 7. URL Normalization & Deduplication Rules

1. **Telegram**:
   - `https://telegram.me/example` → `https://t.me/example`
   - `http://t.me/example` → `https://t.me/example`
   - Strip tracking query parameters (`?start=...`, `?utm_...`) unless strictly required.
2. **Discord**:
   - `https://discord.com/invite/code` → `https://discord.gg/code`
   - Strip query strings and trailing slashes.
3. **WhatsApp**:
   - `https://chat.whatsapp.com/INVITE_CODE` normalized, preserving exact case-sensitive invite code.
4. **Deduplication Hierarchy**:
   - Primary: Normalized invite URL.
   - Secondary: Platform + canonical group identifier.
   - Tertiary: Same platform + exact matching title + same category.
   - Conflicting or ambiguous entries must be routed to `pending-groups.json`.

---

## 8. Financial & Safety Disclaimer Policy

All communities categorized under `Crypto & Web3` or `Forex & Stocks` MUST display neutral risk disclaimers. 
- Disclaimers state clearly that inclusion in the directory does not constitute financial advice, an endorsement, or verification of performance.
- Any listings containing phrases like "guaranteed profit", "100% win rate", or "double your money" must be tagged with `safetyFlags: ["potential-risk-language"]` and held for manual review.

---

## 9. Netlify Forms & Submission Protocol

- Submissions (`/submit`) and Reports (`/report`) utilize Netlify Forms with bot honeypots.
- In V1, user submissions are NOT automatically committed to `groups.json`. They are received in the Netlify Forms dashboard, reviewed manually by maintainers, and committed via Git.
- Admin contact info collected in submission forms is strictly private and MUST NOT be exposed in public JSON or frontend output.
