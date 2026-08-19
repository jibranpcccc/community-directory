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
  pageTypeCategory: "indexable" | "noindex";
  schemas: string[];
  forbiddenSchemas: string[];
  inboundLinks: string[];
  outboundInternalLinks: string[];
  brokenInternalLinks: string[];
  externalLinks: { href: string; rel: string; isNofollow: boolean }[];
  imageIssues: string[];
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
  orphanCount: number;
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
      orphanCount: 0,
      results: [],
      errors: [`Build directory ${distDir} not found.`],
    };
  }

  const htmlFiles = getAllHtmlFiles(distDir);
  console.log(`\n?? [seo:audit] Auditing ${htmlFiles.length} generated static HTML pages in ${distDir}...\n`);

  // Build a set of all valid generated URL paths
  const validUrlPaths = new Set<string>();
  const fileToUrlMap = new Map<string, string>();
  for (const file of htmlFiles) {
    const rel = path.relative(distDir, file).replace(/\\/g, "/");
    let urlPath = "/" + rel.replace(/\/index\.html$/, "").replace(/\.html$/, "");
    if (urlPath === "/index" || urlPath === "") urlPath = "/";
    validUrlPaths.add(urlPath);
    fileToUrlMap.set(file, urlPath);
  }

  // Internal Link Graph: targetUrl -> Set of sourceUrls
  const internalInboundGraph = new Map<string, Set<string>>();
  for (const u of validUrlPaths) {
    internalInboundGraph.set(u, new Set<string>());
  }

  let indexableCount = 0;
  let noindexCount = 0;

  // First pass: Page inspection & Link collection
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const urlPath = fileToUrlMap.get(file) || "/";

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

    // Rule: All tag pages MUST be noindex (Section 1)
    if (urlPath.startsWith("/tag/") && !isNoindex) {
      pageErrors.push("Tag page is missing mandatory noindex directive");
    }

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
            if (["JobPosting", "Review", "AggregateRating", "Product", "Course", "EmployerAggregateRating", "FAQPage"].includes(obj["@type"])) {
              forbiddenSchemas.push(obj["@type"]);
            }
          }
          if (obj["potentialAction"] && obj["potentialAction"]["@type"] === "SearchAction") {
            forbiddenSchemas.push("SearchAction");
          }
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === "object") {
              extractTypes(obj[key]);
            }
          }
        };
        extractTypes(parsed);

        // Community detail page must NOT tag informal chat groups as Organization (Section 4)
        if (urlPath.startsWith("/group/")) {
          if (parsed["mainEntity"] && parsed["mainEntity"]["@type"] === "Organization") {
            pageErrors.push("Community detail page contains unsupported mainEntity Organization schema");
          }
        }
      } catch (e: any) {
        pageErrors.push(`Invalid JSON-LD schema JSON: ${e.message}`);
      }
    }

    if (forbiddenSchemas.length > 0) {
      pageErrors.push(`Forbidden structured data types detected: ${forbiddenSchemas.join(", ")}`);
    }

    // 7. Internal Links Audit & Graph Building
    const brokenInternalLinks: string[] = [];
    const outboundInternalLinks: string[] = [];
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

          // Check external community invite links
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
        } else {
          outboundInternalLinks.push(targetPath);
          // Add to inbound graph (do not count links originating from utility success/404 as sole discovery)
          if (!urlPath.includes("success") && !urlPath.includes("404")) {
            const inboundSet = internalInboundGraph.get(targetPath);
            if (inboundSet) {
              inboundSet.add(urlPath);
            }
          }
        }
      }
    }

    // 8. Image & Accessibility Static Checks (Section 7)
    const imageIssues: string[] = [];
    const imgMatches = content.match(/<img[^>]*>/gi) || [];
    for (const imgTag of imgMatches) {
      if (!/alt=["'][^"']*["']/i.test(imgTag)) {
        imageIssues.push(`Image missing alt attribute: ${imgTag}`);
        pageErrors.push(`Image missing alt attribute: ${imgTag}`);
      }
      const srcMatch = imgTag.match(/src=["']([^"']*)["']/i);
      if (srcMatch && srcMatch[1]) {
        const src = srcMatch[1];
        if (src.startsWith("/") && !src.startsWith("//")) {
          const localFilePath = path.join(distDir, src.replace(/^\//, ""));
          const publicFilePath = path.join(path.resolve("./public"), src.replace(/^\//, ""));
          if (!fs.existsSync(localFilePath) && !fs.existsSync(publicFilePath)) {
            imageIssues.push(`Broken local image source: ${src}`);
            pageErrors.push(`Broken local image source: ${src}`);
          }
        }
      }
    }

    // 9. Prohibited Claims Check
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

  // Third pass: Detect Duplicate Titles and Duplicate Descriptions across Indexable Pages (Section 6)
  const indexableTitles = new Map<string, string[]>();
  const indexableDescriptions = new Map<string, string[]>();

  for (const r of results) {
    if (!r.isNoindex) {
      if (r.title) {
        const existing = indexableTitles.get(r.title) || [];
        existing.push(r.urlPath);
        indexableTitles.set(r.title, existing);
      }
      if (r.description) {
        const existingDesc = indexableDescriptions.get(r.description) || [];
        existingDesc.push(r.urlPath);
        indexableDescriptions.set(r.description, existingDesc);
      }
    }
  }

  for (const [titleStr, urls] of indexableTitles.entries()) {
    if (urls.length > 1) {
      const err = `DUPLICATE INDEXABLE TITLE "${titleStr}" shared across: ${urls.join(", ")}`;
      for (const u of urls) {
        const match = results.find((r) => r.urlPath === u);
        match?.errors.push(err);
      }
    }
  }

  for (const [descStr, urls] of indexableDescriptions.entries()) {
    if (urls.length > 1) {
      const err = `DUPLICATE INDEXABLE DESCRIPTION "${descStr.substring(0, 40)}..." shared across: ${urls.join(", ")}`;
      for (const u of urls) {
        const match = results.find((r) => r.urlPath === u);
        match?.errors.push(err);
      }
    }
  }

  // Fourth pass: XML Sitemap Verification
  let sitemapUrlCount = 0;
  const sitemapIndexPath = path.join(distDir, "sitemap-index.xml");
  const sitemap0Path = path.join(distDir, "sitemap-0.xml");

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

    for (const locTag of locMatches) {
      const locUrl = locTag.replace(/<[^>]+>/g, "").trim();
      sitemapUrls.add(locUrl);

      if (!locUrl.startsWith("https://communityhub-directory.netlify.app")) {
        errors.push(`Sitemap URL does not match production host: ${locUrl}`);
      }

      const relPath = locUrl.replace("https://communityhub-directory.netlify.app", "") || "/";
      const cleanPath = (relPath === "" || relPath === "/") ? "/" : relPath.replace(/\/+$/, "");

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
          ? "https://communityhub-directory.netlify.app/"
          : `https://communityhub-directory.netlify.app${r.urlPath}`;
        if (!sitemapUrls.has(expectedSitemapUrl)) {
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
  console.log("?? ENHANCED SEO BUILD AUDIT SUMMARY");
  console.log("==================================================");
  console.log(`Total HTML Pages Audited : ${htmlFiles.length}`);
  console.log(`Indexable Pages          : ${indexableCount}`);
  console.log(`Noindex Pages            : ${noindexCount}`);
  console.log(`Sitemap URLs             : ${sitemapUrlCount}`);
  console.log(`Orphan Indexable Pages   : ${orphanCount}`);
  console.log(`Audit Errors             : ${errors.length}`);
  console.log("==================================================");

  if (!passed) {
    console.error("? SEO Audit FAILURES:");
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
  } else {
    console.log("? All SEO, Internal Link Graph, and Accessibility checks PASSED!");
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
