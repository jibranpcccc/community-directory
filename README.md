# CommunityHub — Automated Public Community Directory

> A fast, searchable, statically generated public directory for discovering online communities across Telegram, Discord, and WhatsApp — built with strict zero-hallucination standards, automated Gemini-assisted discovery with Google Search grounding, and periodic link health auditing.

---

## 🌟 Key Features

- **Strict Data Integrity**: Zero fabricated metrics. If a member count or founder name is not directly verifiable from an authoritative public source, it is stored as `null` and omitted from the UI.
- **Explicit Verification Tiers**:
  - `unverified`: Discovered via public indexing.
  - `source-confirmed`: Sourced directly from official project domains (e.g. Astro.build, Solana.com).
  - `owner-confirmed`: Community admin confirmed ownership.
  - `manually-reviewed`: Administrator reviewed the listing manually.
- **Fast Static Site Generation**: Built with [Astro](https://astro.build/) and Tailwind CSS. Generates static HTML routes for categories, platforms, tags, and detail pages.
- **Multi-Platform Support**: Telegram channels/groups, Discord servers, WhatsApp groups, with pluggable support for Reddit, Slack, Skool, and GitHub Discussions.
- **Automated Discovery Engine**: Bounded query generator with Google Gemini Search Grounding, strict schema validation, candidate URL normalization, and deduplication.
- **Link Health Auditing**: Periodic automated link status checker that transitions states cautiously without false positives.
- **Netlify Ready**: Built-in Netlify static form integrations for submissions (`/submit`) and reports (`/report`) with bot honeypots and strict security headers.

---

## 🛠️ Tech Stack

- **Framework**: Astro 5 (Static Site Generation / SSG)
- **Language**: TypeScript (`strict: true`)
- **Styling**: Tailwind CSS
- **Data Layer**: Flat JSON files with Zod runtime schema validation
- **AI & Discovery**: Google Gemini API via official `@google/generative-ai` SDK
- **Testing**: Vitest
- **Hosting**: Netlify
- **CI/CD**: GitHub Actions (Daily discovery, bi-weekly health audits, pull-request quality gates)

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js `20.x` or `22.x+`
- npm `10.x+`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/community-directory.git
cd community-directory

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PUBLIC_SITE_URL` | Canonical domain for SEO & sitemaps | `http://localhost:4321` |
| `GEMINI_API_KEY` | Google AI Studio API key (Required for live discovery) | `""` |
| `GEMINI_MODEL` | Gemini model for search grounding and classification | `gemini-2.5-flash` |
| `GEMINI_SEARCH_ENABLED` | Enable Google Search grounding tool | `true` |
| `DISCOVERY_MAX_QUERIES`| Maximum search queries per discovery run | `30` |
| `DISCOVERY_MAX_CANDIDATES` | Max new candidate links per run | `100` |
| `AUTO_PUBLISH_DISCOVERED` | Publish directly to `groups.json` instead of `pending-groups.json` | `false` |
| `SHOW_AD_PLACEHOLDERS` | Show sponsorship/ad placeholder components | `false` |

> 💡 **Note:** Local development and static production builds work **100% without a `GEMINI_API_KEY`**. Discovery scripts use fallback heuristic parsers and seed files when the key is absent.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

---

## 💻 Available CLI Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start local Astro development server |
| `npm run build` | Build static production site to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | Run TypeScript compiler type checking |
| `npm run test` | Run Vitest unit tests suite |
| `npm run validate-data` | Validate schema integrity of `groups.json` and `pending-groups.json` |
| `npm run data:stats` | Print real dataset statistics (published, pending, platforms, health) |
| `npm run discover -- --dry-run` | Run discovery engine in dry-run mode (no files modified) |
| `npm run discover` | Run discovery engine to find new public community listings |
| `npm run approve` | List all pending candidates awaiting review |
| `npm run approve -- <id>` | Approve and move a candidate from pending to published |
| `npm run validate-links` | Audit HTTP link health across all published communities |

---

## 📁 Repository Structure

```text
├── .github/
│   └── workflows/
│       ├── discover-groups.yml    # Scheduled daily discovery workflow
│       ├── validate-groups.yml    # Bi-weekly link health audit
│       └── quality-check.yml      # CI lint, test, typecheck, validate, build
├── public/
│   ├── favicon.svg                # Modern SVG logo mark
│   └── robots.txt                 # Search engine directives
├── scripts/
│   ├── classify/                  # Prompting, sanitization, and safety tagger
│   ├── data/                      # Deduplication, normalizer, schema validator
│   ├── discover/                  # Query generation, Gemini provider, candidate parser
│   ├── utilities/                 # CLI tools (approve, data:stats)
│   └── validate/                  # Link health checker and platform adapters
├── src/
│   ├── components/                # Astro UI components (cards, badges, search, filters)
│   ├── config/                    # site.ts, categories.ts, platforms.ts, discovery.ts
│   ├── data/                      # groups.json, pending-groups.json, seeds.json
│   ├── layouts/                   # BaseLayout.astro, DirectoryLayout.astro
│   ├── lib/                       # Data repository, search, filters, SEO, schema
│   ├── pages/                     # All static pages and dynamic directory routes
│   ├── styles/                    # global.css (Tailwind tokens)
│   └── types/                     # TypeScript definitions
├── tests/                         # Vitest unit test suites
├── .env.example
├── AGENTS.md                      # Persistent engineering guidelines
├── astro.config.mjs
├── netlify.toml
├── package.json
└── tsconfig.json
```

---

## 🤖 Discovery & Moderation Workflow

```text
1. npm run discover
   ├── Generates search queries across categories & platforms
   ├── Queries Gemini with Google Search Grounding (or manual seeds)
   ├── Normalizes URLs (e.g. telegram.me -> t.me, discord.com/invite -> discord.gg)
   ├── Hierarchical deduplication (URL, ID, Title)
   ├── Classifies metadata and checks safety flags
   └── Appends candidates to src/data/pending-groups.json

2. Review & Approval
   ├── Run `npm run approve` to view pending queue
   └── Run `npm run approve -- <candidate-id>` to approve into src/data/groups.json

3. Build & Deploy
   └── Git push triggers Netlify static build and deployment
```

---

## 🌐 Netlify Deployment Guide

1. **Create Repository**: Push this codebase to your GitHub repository.
2. **Connect to Netlify**:
   - In Netlify dashboard, select **Add new site** > **Import an existing project**.
   - Choose your GitHub repository.
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Set Environment Variables in Netlify**:
   - `PUBLIC_SITE_URL`: `https://your-custom-domain.com` (or Netlify preview URL)
   - `GEMINI_API_KEY`: *(Optional in Netlify unless running build-time discovery)*
4. **Netlify Forms**:
   - Submissions (`/submit`) and Reports (`/report`) automatically appear in your Netlify Forms inbox.

---

## 🔒 GitHub Actions Secrets Configuration

To enable daily automated discovery via GitHub Actions:
1. Go to your GitHub repository **Settings** > **Secrets and variables** > **Actions**.
2. Add Repository Secret:
   - Name: `GEMINI_API_KEY`
   - Value: Your Google AI Studio API key.

---

## 🗄️ Future Database Migration (V2)

The codebase isolates all data reads and mutations behind `src/lib/communities.ts`:
```text
src/data/groups.json  --->  src/lib/communities.ts  --->  Astro Pages / UI Components
```
To migrate to PostgreSQL or Supabase in V2, simply update `src/lib/communities.ts` queries to fetch from your database client. The UI components and pages require zero modifications.

---

## 📄 License

MIT License. Open source and free for commercial and personal directory projects.
