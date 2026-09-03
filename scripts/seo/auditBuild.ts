import fs from "fs";
import path from "path";

export interface PageAuditResult {
  file: string;
  urlPath: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  h1Count: number;
  h1Text: string[];
  isNoindex: boolean;
  pageTypeCategory: string;
  schemas: string[];
  forbiddenSchemas: string[];
  inboundLinks: string[];
  outboundInternalLinks: string[];
  brokenInternalLinks: string[];
  externalLinks: { href: string; rel: string }[];
  imageIssues: string[];
  prohibitedClaims: string[];
  characterCorruptionIssues: string[];
  errors: string[];
  warnings: string[];
}

export function getAllHtmlFiles(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllHtmlFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      // Exclude Google verification static files
      if (!/^google[a-zA-Z0-9_-]+\.html$/i.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

export function runSeoAudit(distDir: string = path.resolve("./dist")) {
  if (!fs.existsSync(distDir)) {
    console.error(`❌ Build directory not found at ${distDir}. Run "npm run build" first.`);
    return { passed: false, errors: [`Build directory not found at ${distDir}`] };
  }

  const htmlFiles = getAllHtmlFiles(distDir);
  const results: PageAuditResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build internal route set and link graph
  const allKnownRoutes = new Set<string>();
  const internalInboundGraph = new Map<string, Set<string>>();

  for (const file of htmlFiles) {
    const rel = path.relative(distDir, file).replace(/\\/g, "/");
    let route = "";
    if (rel === "index.html") {
      route = "/";
    } else if (rel.endsWith("/index.html")) {
      route = `/${rel.replace(/\/index\.html$/, "")}/`;
    } else {
      route = `/${rel.replace(/\.html$/, "")}/`;
    }
    allKnownRoutes.add(route);
    internalInboundGraph.set(route, new Set<string>());
  }

  let indexableCount = 0;
  let noindexCount = 0;

  // First pass: Analyze each individual HTML file
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const rel = path.relative(distDir, file).replace(/\\/g, "/");
    let urlPath = "";
    if (rel === "index.html") {
      urlPath = "/";
    } else if (rel.endsWith("/index.html")) {
      urlPath = `/${rel.replace(/\/index\.html$/, "")}/`;
    } else {
      urlPath = `/${rel.replace(/\.html$/, "")}/`;
    }

    const pageErrors: string[] = [];
    const pageWarnings: string[] = [];

    // 1. Visible Character Corruption Test (Detect ??, ???, mojibake, unencoded unicode)
    // Strip scripts, styles, SVG paths, and HTML tags to isolate rendered human text
    const cleanVisibleText = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z0-9#]+;/gi, " ");

    const characterCorruptionIssues: string[] = [];
    if (/\?{2,}/.test(cleanVisibleText)) {
      characterCorruptionIssues.push(`Double or multi-question mark corruption found in visible text`);
      pageErrors.push(`Corrupted character sequence (??+) found in visible rendered text.`);
    }
    if (cleanVisibleText.includes("\uFFFD")) {
      characterCorruptionIssues.push(`Unicode replacement character (\\uFFFD) found in visible text`);
      pageErrors.push(`Unicode replacement character (\\uFFFD) found in visible rendered text.`);
    }
    if (/(\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2\u0080[\u0090-\u00BF]|\uFFFD)/.test(cleanVisibleText)) {
      characterCorruptionIssues.push(`Mojibake corruption found in visible text`);
      pageErrors.push(`Mojibake corruption detected in visible rendered text.`);
    }

    // 2. Title Check (Section 1)
    const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    if (!title) {
      pageErrors.push("Missing <title> tag");
    } else {
      if (title.length > 70) {
        pageWarnings.push(`Title tag exceeds 70 characters (${title.length}): "${title}"`);
      }
      if (title.length < 15 && urlPath !== "/404/") {
        pageErrors.push(`Title tag too short (${title.length}): "${title}"`);
      }
    }

    // 3. Meta Description Check (Section 1)
    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
                      content.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : "";
    if (!description && urlPath !== "/404/") {
      pageErrors.push("Missing meta description");
    } else if (description) {
      if (description.length > 170) {
        pageWarnings.push(`Meta description exceeds 170 characters (${description.length})`);
      }
      if (description.length < 50 && urlPath !== "/404/") {
        pageErrors.push(`Meta description too short (${description.length})`);
      }
    }

    // 4. Canonical Tag & Trailing Slash Check (Section 1)
    const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) ||
                          content.match(/<link\s+href=["']([^"']*)["']\s+rel=["']canonical["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : "";
    if (!canonical) {
      pageErrors.push("Missing canonical URL tag");
    } else {
      const expectedHost = process.env.PUBLIC_SITE_URL || "https://jobalertgroups.com";
      if (!canonical.startsWith(expectedHost) && !canonical.startsWith("https://jobalertgroups.com")) {
        pageErrors.push(`Canonical URL does not match production host: ${canonical}`);
      }
      if (canonical.includes("communityhub-directory.netlify.app") || canonical.includes("localhost") || canonical.includes("127.0.0.1")) {
        pageErrors.push(`Stale/Legacy host detected in canonical: ${canonical}`);
      }
      // Ensure trailing slash on canonical URL
      if (!canonical.endsWith("/") && !/\.[a-zA-Z0-9]+$/.test(canonical)) {
        pageErrors.push(`Canonical URL missing trailing slash: ${canonical}`);
      }
    }

    // Check Open Graph / Twitter metadata for stale host
    if (content.includes("property=\"og:url\" content=\"https://communityhub-directory.netlify.app") ||
        content.includes("name=\"twitter:url\" content=\"https://communityhub-directory.netlify.app")) {
      pageErrors.push(`Stale/Legacy host detected in OpenGraph / Twitter metadata`);
    }

    // 5. Robots Meta Tag & Indexability Gating (Section 2)
    const robotsMatch = content.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i) ||
                        content.match(/<meta\s+content=["']([^"']*)["']\s+name=["']robots["']/i);
    const robots = robotsMatch ? robotsMatch[1].toLowerCase().trim() : "";
    const isNoindex = robots.includes("noindex");

    if (isNoindex) {
      noindexCount++;
    } else {
      indexableCount++;
    }

    // Section 2 & 8: Validate Noindex Policies
    if (urlPath.startsWith("/tag/")) {
      if (!isNoindex) {
        pageErrors.push(`TAG PAGE VIOLATION: ${urlPath} must be strictly noindex`);
      }
    }
    if (urlPath.includes("/submit") || urlPath.includes("/report") || urlPath.includes("/contact") || urlPath.includes("/404")) {
      if (!isNoindex) {
        pageErrors.push(`UTILITY/FORM PAGE VIOLATION: ${urlPath} must be strictly noindex`);
      }
    }
    if (urlPath.includes("/privacy") || urlPath.includes("/terms") || urlPath.includes("/disclaimer")) {
      if (!isNoindex) {
        pageErrors.push(`LEGAL PAGE VIOLATION: ${urlPath} must be strictly noindex`);
      }
    }

    // 6. Heading Hierarchy & Single H1 Check (Section 3)
    const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h1Count = h1Matches.length;
    const h1Text = h1Matches.map((h) => h.replace(/<[^>]+>/g, "").trim());

    if (h1Count === 0 && urlPath !== "/404/") {
      pageErrors.push("Missing <h1> heading");
    } else if (h1Count > 1) {
      pageErrors.push(`Multiple <h1> headings found (${h1Count}): ${h1Text.join(" | ")}`);
    }

    // 7. Structured Data & Schema Validation (Section 4)
    const schemas: string[] = [];
    const forbiddenSchemas: string[] = [];
    const jsonLdMatches = content.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi) || [];

    for (const jsonLdBlock of jsonLdMatches) {
      const jsonContent = jsonLdBlock.replace(/<script\s+type=["']application\/ld\+json["']>/i, "").replace(/<\/script>/i, "").trim();
      try {
        const parsed = JSON.parse(jsonContent);
        const types = Array.isArray(parsed) ? parsed.map((p) => p["@type"]) : [parsed["@type"]];

        for (const t of types) {
          if (t) {
            schemas.push(t);
            // Prohibited schema check: fake/hallucinated job postings, fake reviews/ratings, or ecommerce
            if (["JobPosting", "AggregateRating", "Review", "Product", "EmployerAggregateRating", "Course"].includes(t)) {
              forbiddenSchemas.push(t);
              pageErrors.push(`FORBIDDEN SCHEMA: Non-factual or hallucinated schema type "${t}" detected`);
            }
          }
        }
      } catch (err: any) {
        pageErrors.push(`Invalid JSON-LD syntax: ${err.message}`);
      }
    }

    // 8. Internal & External Links Extraction (Section 5)
    const outboundInternalLinks: string[] = [];
    const brokenInternalLinks: string[] = [];
    const externalLinks: { href: string; rel: string }[] = [];

    const linkMatches = content.match(/<a\b[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
    for (const linkTag of linkMatches) {
      const hrefMatch = linkTag.match(/href=["']([^"']*)["']/i);
      const relMatch = linkTag.match(/rel=["']([^"']*)["']/i);
      const href = hrefMatch ? hrefMatch[1] : "";
      const rel = relMatch ? relMatch[1] : "";

      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        continue;
      }

      if (href.startsWith("http://") || href.startsWith("https://")) {
        if (!href.startsWith("https://communityhub-directory.netlify.app")) {
          externalLinks.push({ href, rel });
          // Outbound community invite links MUST have nofollow noopener noreferrer
          if (href.includes("t.me/") || href.includes("discord.gg/") || href.includes("chat.whatsapp.com/")) {
            if (!rel.includes("nofollow") || !rel.includes("noopener")) {
              pageErrors.push(`Community invite link missing rel="nofollow noopener": ${href}`);
            }
          }
        }
      } else if (href.startsWith("/")) {
        let targetPath = href.split("?")[0].split("#")[0];
        if (targetPath === "" || targetPath === "/") {
          targetPath = "/";
        } else if (!targetPath.endsWith("/") && !/\.[a-zA-Z0-9]+$/.test(targetPath)) {
          targetPath = `${targetPath}/`;
        }

        if (!allKnownRoutes.has(targetPath) && !fs.existsSync(path.join(path.resolve("./public"), targetPath.replace(/^\//, "")))) {
          brokenInternalLinks.push(href);
          pageErrors.push(`Broken internal link target: ${href}`);
        } else {
          outboundInternalLinks.push(targetPath);
          if (!urlPath.includes("success") && !urlPath.includes("404")) {
            const inboundSet = internalInboundGraph.get(targetPath);
            if (inboundSet) {
              inboundSet.add(urlPath);
            }
          }
        }
      }
    }

    // 9. Image & Accessibility Static Checks (Section 7)
    const imageIssues: string[] = [];
    const imgMatches = content.match(/<img[^>]*>/gi) || [];
    for (const imgTag of imgMatches) {
      if (!/alt=["'][^"']*["']/i.test(imgTag)) {
        imageIssues.push(`Image missing alt attribute: ${imgTag}`);
        pageErrors.push(`Image missing alt attribute: ${imgTag}`);
      }
    }

    // 10. Prohibited Claims Check
    const prohibitedPatterns = [
      /\b100%\s+safe\b/i,
      /\bgoogle\s+verified\b/i,
      /\bguaranteed\s+job\b/i,
      /\bguaranteed\s+employment\b/i,
      /\b#1\s+job\s+group\b/i,
      /\bbest\s+job\s+groups?\s+on\s+the\s+internet\b/i,
    ];
    const prohibitedClaims: string[] = [];
    for (const pattern of prohibitedPatterns) {
      if (pattern.test(content)) {
        prohibitedClaims.push(pattern.source);
        pageErrors.push(`Prohibited unsupported claim matching: ${pattern.source}`);
      }
    }

    results.push({
      file,
      urlPath,
      title,
      description,
      canonical,
      robots,
      h1Count,
      h1Text,
      isNoindex,
      pageTypeCategory: isNoindex ? "noindex" : "indexable",
      schemas,
      forbiddenSchemas,
      inboundLinks: [],
      outboundInternalLinks,
      brokenInternalLinks,
      externalLinks,
      imageIssues,
      prohibitedClaims,
      characterCorruptionIssues,
      errors: pageErrors,
      warnings: pageWarnings,
    });
  }

  // Second pass: Populate inbound links and detect Orphan Indexable Pages (Section 5)
  let orphanCount = 0;
  for (const r of results) {
    const inbound = Array.from(internalInboundGraph.get(r.urlPath) || []);
    r.inboundLinks = inbound;

    if (!r.isNoindex && r.urlPath !== "/") {
      if (inbound.length === 0) {
        orphanCount++;
        r.errors.push(`ORPHAN INDEXABLE PAGE: No crawlable inbound internal links found for ${r.urlPath}`);
      }
    }
  }

  // Third pass: XML Sitemap Verification
  let sitemapUrlCount = 0;
  const sitemap0Path = path.join(distDir, "sitemap-0.xml");
  const sitemapIndexPath = path.join(distDir, "sitemap-index.xml");

  let sitemapXml = "";
  if (fs.existsSync(sitemap0Path)) {
    sitemapXml = fs.readFileSync(sitemap0Path, "utf-8");
  } else if (fs.existsSync(sitemapIndexPath)) {
    sitemapXml = fs.readFileSync(sitemapIndexPath, "utf-8");
  }

  const sitemapUrls = new Set<string>();
  if (sitemapXml) {
    const locMatches = sitemapXml.match(/<loc>([\s\S]*?)<\/loc>/gi) || [];
    sitemapUrlCount = locMatches.length;

    const expectedHost = process.env.PUBLIC_SITE_URL || "https://jobalertgroups.com";
    for (const locTag of locMatches) {
      const locUrl = locTag.replace(/<[^>]+>/g, "").trim();
      sitemapUrls.add(locUrl);

      if (!locUrl.startsWith(expectedHost) && !locUrl.startsWith("https://jobalertgroups.com")) {
        errors.push(`Sitemap URL does not match production host: ${locUrl}`);
      }
      if (locUrl.includes("communityhub-directory.netlify.app") || locUrl.includes("localhost") || locUrl.includes("127.0.0.1")) {
        errors.push(`Stale/Legacy host detected in sitemap URL: ${locUrl}`);
      }

      if (!locUrl.endsWith("/") && !/\.[a-zA-Z0-9]+$/.test(locUrl)) {
        errors.push(`Sitemap URL missing trailing slash: ${locUrl}`);
      }

      const relPath = locUrl.replace(expectedHost, "").replace("https://jobalertgroups.com", "") || "/";
      const cleanPath = (relPath === "" || relPath === "/") ? "/" : (relPath.endsWith("/") ? relPath : `${relPath}/`);

      const matchingPage = results.find((r) => r.urlPath === cleanPath);
      if (!matchingPage) {
        errors.push(`Sitemap contains non-existent URL: ${locUrl}`);
      } else if (matchingPage.isNoindex) {
        errors.push(`Sitemap contains noindex page: ${locUrl}`);
      }
    }

    // Verify all indexable pages are present in sitemap
    for (const r of results) {
      if (!r.isNoindex) {
        const expectedSitemapUrl = r.urlPath === "/"
          ? `${expectedHost}/`
          : `${expectedHost}${r.urlPath}`;
        if (!sitemapUrls.has(expectedSitemapUrl) && !sitemapUrls.has(`https://jobalertgroups.com${r.urlPath}`)) {
          errors.push(`Indexable page missing from XML sitemap: ${expectedSitemapUrl}`);
        }
      }
    }
  }

  // Aggregate all page errors
  for (const r of results) {
    if (r.errors.length > 0) {
      for (const e of r.errors) {
        if (!errors.includes(`[${r.urlPath}] ${e}`)) {
          errors.push(`[${r.urlPath}] ${e}`);
        }
      }
    }
  }

  const passed = errors.length === 0;

  console.log("==================================================");
  console.log("✅ ENHANCED SEO BUILD AUDIT SUMMARY");
  console.log("==================================================");
  console.log(`Total HTML Pages Audited : ${htmlFiles.length}`);
  console.log(`Indexable Pages          : ${indexableCount}`);
  console.log(`Noindex Pages            : ${noindexCount}`);
  console.log(`Sitemap URLs             : ${sitemapUrlCount}`);
  console.log(`Orphan Indexable Pages   : ${orphanCount}`);
  console.log(`Audit Errors             : ${errors.length}`);
  console.log("==================================================");

  if (!passed) {
    console.error("❌ SEO Audit FAILURES:");
    for (const err of errors) {
      console.error(`    ${err}`);
    }
  } else {
    console.log("✅ All SEO, Character Safety, Link Graph, and Accessibility checks PASSED!");
  }
  console.log("==================================================\n");

  return {
    passed,
    totalPages: htmlFiles.length,
    indexableCount,
    noindexCount,
    sitemapUrlCount,
    orphanCount,
    results,
    errors,
  };
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && process.argv[1].endsWith("auditBuild.ts"))) {
  const result = runSeoAudit();
  if (!result.passed) {
    process.exit(1);
  }
}
