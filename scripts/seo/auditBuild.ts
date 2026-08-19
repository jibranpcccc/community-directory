import fs from "fs";
import path from "path";

interface AuditResult {
  file: string;
  urlPath: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  h1Count: number;
  h1Text: string | null;
  isNoindex: boolean;
  schemas: string[];
  forbiddenSchemas: string[];
  brokenInternalLinks: string[];
  externalLinks: { href: string; rel: string; isNofollow: boolean }[];
  prohibitedClaims: string[];
  errors: string[];
  warnings: string[];
}

function getAllHtmlFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllHtmlFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

export function runSeoAudit(distDir: string = path.resolve("./dist")): {
  passed: boolean;
  totalPages: number;
  indexableCount: number;
  noindexCount: number;
  sitemapUrlCount: number;
  results: AuditResult[];
  errors: string[];
} {
  const errors: string[] = [];
  const results: AuditResult[] = [];

  if (!fs.existsSync(distDir)) {
    console.error(`[seo:audit] Error: Build directory ${distDir} does not exist. Run "npm run build" first.`);
    return {
      passed: false,
      totalPages: 0,
      indexableCount: 0,
      noindexCount: 0,
      sitemapUrlCount: 0,
      results: [],
      errors: [`Build directory ${distDir} not found.`],
    };
  }

  const htmlFiles = getAllHtmlFiles(distDir);
  console.log(`\n?? [seo:audit] Auditing ${htmlFiles.length} generated static HTML pages in ${distDir}...\n`);

  // Build a set of all valid generated URL paths
  const validUrlPaths = new Set<string>();
  for (const file of htmlFiles) {
    const rel = path.relative(distDir, file).replace(/\\/g, "/");
    let urlPath = "/" + rel.replace(/\/index\.html$/, "").replace(/\.html$/, "");
    if (urlPath === "/index" || urlPath === "") urlPath = "/";
    validUrlPaths.add(urlPath);
  }

  let indexableCount = 0;
  let noindexCount = 0;

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const rel = path.relative(distDir, file).replace(/\\/g, "/");
    let urlPath = "/" + rel.replace(/\/index\.html$/, "").replace(/\.html$/, "");
    if (urlPath === "/index" || urlPath === "") urlPath = "/";

    const pageErrors: string[] = [];
    const pageWarnings: string[] = [];

    // 1. Title Tag
    const titleMatches = content.match(/<title[^>]*>([\s\S]*?)<\/title>/gi) || [];
    let title: string | null = null;
    if (titleMatches.length === 0) {
      pageErrors.push("Missing <title> tag");
    } else if (titleMatches.length > 1) {
      pageErrors.push(`Multiple (${titleMatches.length}) <title> tags detected`);
    } else {
      const firstTitle = titleMatches[0];
      if (firstTitle) {
        title = firstTitle.replace(/<[^>]+>/g, "").trim();
        if (!title) {
          pageErrors.push("Empty <title> tag");
        }
      }
    }

    // 2. Meta Description
    const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
      || content.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
    const description = descMatch ? descMatch[1]?.trim() ?? null : null;
    if (!description && !urlPath.includes("/404")) {
      pageWarnings.push("Missing meta description");
    }

    // 3. Canonical Tag
    const canonicalMatches = content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/gi)
      || content.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/gi);
    let canonical: string | null = null;
    if (!canonicalMatches || canonicalMatches.length === 0) {
      pageErrors.push("Missing <link rel=\"canonical\">");
    } else if (canonicalMatches.length > 1) {
      pageErrors.push(`Multiple (${canonicalMatches.length}) canonical tags detected`);
    } else {
      const firstCanonical = canonicalMatches[0];
      const match = firstCanonical ? firstCanonical.match(/href=["']([^"']*)["']/i) : null;
      canonical = match ? match[1] ?? null : null;
      if (canonical) {
        if (!canonical.startsWith("https://communityhub-directory.netlify.app")) {
          pageErrors.push(`Canonical URL does not use production host: ${canonical}`);
        }
        if (canonical.includes("localhost") || canonical.includes("127.0.0.1")) {
          pageErrors.push(`Canonical URL contains localhost: ${canonical}`);
        }
      }
    }

    // 4. Robots Meta
    const robotsMatch = content.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const robots = robotsMatch ? robotsMatch[1]?.toLowerCase() ?? null : null;
    const isNoindex = robots ? robots.includes("noindex") : false;

    if (isNoindex) {
      noindexCount++;
    } else {
      indexableCount++;
    }

    // 5. H1 Tag
    const h1Matches = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h1Count = h1Matches.length;
    let h1Text: string | null = null;
    if (h1Count === 0) {
      pageErrors.push("Missing <h1> tag");
    } else if (h1Count > 1) {
      pageErrors.push(`Multiple (${h1Count}) <h1> tags detected`);
    } else {
      const firstH1 = h1Matches[0];
      if (firstH1) {
        h1Text = firstH1.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (!h1Text) {
          pageErrors.push("Empty <h1> tag");
        }
      }
    }

    // 6. JSON-LD Structured Data
    const schemas: string[] = [];
    const forbiddenSchemas: string[] = [];
    const jsonLdMatches = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

    for (const tag of jsonLdMatches) {
      const jsonStr = tag.replace(/<script[^>]*>|<\/script>/gi, "").trim();
      try {
        const parsed = JSON.parse(jsonStr);
        const extractTypes = (obj: any) => {
          if (!obj || typeof obj !== "object") return;
          if (obj["@type"]) {
            schemas.push(obj["@type"]);
            if (["JobPosting", "Review", "AggregateRating", "Product", "Course", "EmployerAggregateRating"].includes(obj["@type"])) {
              forbiddenSchemas.push(obj["@type"]);
            }
          }
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === "object") {
              extractTypes(obj[key]);
            }
          }
        };
        extractTypes(parsed);
      } catch (e: any) {
        pageErrors.push(`Invalid JSON-LD schema JSON: ${e.message}`);
      }
    }

    if (forbiddenSchemas.length > 0) {
      pageErrors.push(`Forbidden structured data types detected: ${forbiddenSchemas.join(", ")}`);
    }

    // 7. Internal Links Audit
    const brokenInternalLinks: string[] = [];
    const linkMatches = content.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
    const externalLinks: { href: string; rel: string; isNofollow: boolean }[] = [];

    for (const aTag of linkMatches) {
      const hrefMatch = aTag.match(/href=["']([^"']*)["']/i);
      const relMatch = aTag.match(/rel=["']([^"']*)["']/i);
      if (!hrefMatch || !hrefMatch[1]) continue;
      const href = hrefMatch[1];
      const rel = relMatch && relMatch[1] ? relMatch[1] : "";

      if (href.startsWith("http://") || href.startsWith("https://")) {
        // External link
        const isExternal = !href.startsWith("https://communityhub-directory.netlify.app");
        if (isExternal) {
          externalLinks.push({
            href,
            rel,
            isNofollow: rel.includes("nofollow"),
          });

          // Check external CTA invite links
          if (href.includes("discord.gg") || href.includes("t.me") || href.includes("chat.whatsapp.com")) {
            if (!rel.includes("nofollow") && !rel.includes("noreferrer")) {
              pageWarnings.push(`External community CTA missing nofollow/noreferrer: ${href}`);
            }
          }
        }
      } else if (href.startsWith("/")) {
        // Internal link
        const firstPart = href.split("?")[0];
        const cleanHref = firstPart ? firstPart.split("#")[0] ?? "/" : "/";
        let targetPath = cleanHref;
        if (targetPath !== "/" && targetPath.endsWith("/")) {
          targetPath = targetPath.replace(/\/+$/, "");
        }
        if (targetPath === "") targetPath = "/";

        if (targetPath.startsWith("/communities")) {
          pageErrors.push(`Legacy old-niche link to /communities detected in href: ${href}`);
        } else if (!validUrlPaths.has(targetPath) && !targetPath.includes("favicon") && !targetPath.includes("robots.txt")) {
          brokenInternalLinks.push(href);
          pageErrors.push(`Broken internal link target: ${href}`);
        }
      }
    }

    // 8. Prohibited Claims Check (Section 98)
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

    if (pageErrors.length > 0) {
      errors.push(`[${urlPath}] ${pageErrors.join("; ")}`);
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
      schemas,
      forbiddenSchemas,
      brokenInternalLinks,
      externalLinks,
      prohibitedClaims,
      errors: pageErrors,
      warnings: pageWarnings,
    });
  }

  // 9. XML Sitemap Validation
  let sitemapUrlCount = 0;
  const sitemapIndexPath = path.join(distDir, "sitemap-index.xml");
  const sitemap0Path = path.join(distDir, "sitemap-0.xml");

  let sitemapXml = "";
  if (fs.existsSync(sitemap0Path)) {
    sitemapXml = fs.readFileSync(sitemap0Path, "utf-8");
  } else if (fs.existsSync(sitemapIndexPath)) {
    sitemapXml = fs.readFileSync(sitemapIndexPath, "utf-8");
  }

  if (sitemapXml) {
    const locMatches = sitemapXml.match(/<loc>([\s\S]*?)<\/loc>/gi) || [];
    sitemapUrlCount = locMatches.length;

    for (const locTag of locMatches) {
      const locUrl = locTag.replace(/<[^>]+>/g, "").trim();
      if (!locUrl.startsWith("https://communityhub-directory.netlify.app")) {
        errors.push(`Sitemap URL does not match production host: ${locUrl}`);
      }

      const relPath = locUrl.replace("https://communityhub-directory.netlify.app", "") || "/";
      const cleanPath = relPath === "" ? "/" : relPath.replace(/\/+$/, "");

      // Check if sitemap contains a page marked as noindex
      const matchingPage = results.find((r) => r.urlPath === cleanPath);
      if (matchingPage && matchingPage.isNoindex) {
        errors.push(`Sitemap contains noindex page: ${locUrl}`);
      }
    }
  }

  const passed = errors.length === 0;

  console.log("==================================================");
  console.log("?? SEO BUILD AUDIT SUMMARY");
  console.log("==================================================");
  console.log(`Total HTML Pages Audited : ${htmlFiles.length}`);
  console.log(`Indexable Pages          : ${indexableCount}`);
  console.log(`Noindex Pages            : ${noindexCount}`);
  console.log(`Sitemap URLs             : ${sitemapUrlCount}`);
  console.log(`Audit Errors             : ${errors.length}`);
  console.log("==================================================");

  if (!passed) {
    console.error("? SEO Audit FAILURES:");
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
  } else {
    console.log("? All SEO checks PASSED successfully!");
  }
  console.log("==================================================\n");

  return {
    passed,
    totalPages: htmlFiles.length,
    indexableCount,
    noindexCount,
    sitemapUrlCount,
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
