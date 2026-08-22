import fs from "fs";
import path from "path";

// Ensure audit directory exists
if (!fs.existsSync("audit")) {
  fs.mkdirSync("audit", { recursive: true });
}

// 1. Compute taxonomy content similarity across dist HTML files
function extractSubstantiveText(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateJaccardSimilarity(textA, textB) {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

const distDir = path.resolve("./dist");
const taxonomyPaths = [
  "/country/global/",
  "/country/usa/",
  "/country/uk/",
  "/country/canada/",
  "/country/australia/",
  "/country/india/",
  "/country/germany/",
  "/country/netherlands/",
  "/country/singapore/",
  "/country/uae/",
  "/country/philippines/",
  "/country/new-zealand/",
  "/country/ireland/",
  "/country/south-africa/",
  "/category/remote-jobs/",
  "/category/tech-jobs/",
  "/category/healthcare-jobs/",
  "/category/finance-jobs/",
  "/category/internships-graduate/",
  "/category/visa-sponsorship-jobs/",
  "/category/government-jobs/",
  "/category/sales-marketing-jobs/",
  "/category/engineering-jobs/",
  "/platform/telegram/",
  "/platform/discord/",
  "/platform/whatsapp/",
  "/job-type/remote-jobs/",
  "/job-type/full-time-jobs/",
  "/job-type/internships/",
  "/job-type/graduate-jobs/",
  "/job-type/entry-level-jobs/",
  "/job-type/contract-jobs/",
  "/job-type/freelance-jobs/",
  "/job-type/visa-sponsorship-jobs/",
  "/job-type/government-jobs/",
  "/job-type/part-time-jobs/",
  "/job-type/temporary-jobs/",
];

const taxonomyDocs = [];
for (const tp of taxonomyPaths) {
  const filePath = path.join(distDir, tp.replace(/^\//, "").replace(/\/$/, ""), "index.html");
  if (fs.existsSync(filePath)) {
    const html = fs.readFileSync(filePath, "utf-8");
    taxonomyDocs.push({
      route: tp,
      text: extractSubstantiveText(html),
    });
  }
}

const taxonomyPairs = [];
let exactDupes = 0;
let highSimCount = 0;
let manualReviewCount = 0;

for (let i = 0; i < taxonomyDocs.length; i++) {
  for (let j = i + 1; j < taxonomyDocs.length; j++) {
    const docA = taxonomyDocs[i];
    const docB = taxonomyDocs[j];
    const sim = calculateJaccardSimilarity(docA.text, docB.text);

    if (sim === 1.0) exactDupes++;
    if (sim >= 0.85 && sim < 1.0) highSimCount++;
    if (sim >= 0.70 && sim < 0.85) manualReviewCount++;

    taxonomyPairs.push({
      routeA: docA.route,
      routeB: docB.route,
      similarity: Number(sim.toFixed(4)),
      classification: sim === 1.0 ? "EXACT_DUPLICATE" : sim >= 0.85 ? "HIGH_SIMILARITY" : sim >= 0.70 ? "MANUAL_REVIEW" : "DISTINCT",
    });
  }
}

const taxonomySimilarityReport = {
  totalPairs: taxonomyPairs.length,
  exactDuplicateSubstantiveParagraphs: exactDupes,
  highSimilarityPairs: highSimCount,
  manualReviewPairs: manualReviewCount,
  pairs: taxonomyPairs.filter(p => p.similarity >= 0.70),
};

fs.writeFileSync("audit/taxonomy-content-similarity.json", JSON.stringify(taxonomySimilarityReport, null, 2));
console.log("✅ Wrote audit/taxonomy-content-similarity.json");

// Commercial Hub Content Similarity (Indexable only + key commercial hubs)
const commercialHubPaths = [
  "/",
  "/jobs/",
  "/country/global/",
  "/category/tech-jobs/",
  "/category/remote-jobs/",
  "/platform/telegram/",
  "/platform/discord/",
  "/platform/whatsapp/",
  "/job-type/remote-jobs/",
];

const commDocs = [];
for (const cp of commercialHubPaths) {
  const filePath = cp === "/" 
    ? path.join(distDir, "index.html")
    : path.join(distDir, cp.replace(/^\//, "").replace(/\/$/, ""), "index.html");
  if (fs.existsSync(filePath)) {
    const html = fs.readFileSync(filePath, "utf-8");
    commDocs.push({ route: cp, text: extractSubstantiveText(html) });
  }
}

const commPairs = [];
for (let i = 0; i < commDocs.length; i++) {
  for (let j = i + 1; j < commDocs.length; j++) {
    const docA = commDocs[i];
    const docB = commDocs[j];
    const sim = calculateJaccardSimilarity(docA.text, docB.text);
    commPairs.push({
      routeA: docA.route,
      routeB: docB.route,
      similarity: Number(sim.toFixed(4)),
      classification: sim === 1.0 ? "EXACT_DUPLICATE" : sim >= 0.85 ? "HIGH_SIMILARITY" : sim >= 0.70 ? "MANUAL_REVIEW" : "DISTINCT",
    });
  }
}

const commercialSimilarityReport = {
  totalPairs: commPairs.length,
  exactDuplicates: commPairs.filter(p => p.similarity === 1.0).length,
  highSimilarity: commPairs.filter(p => p.similarity >= 0.85 && p.similarity < 1.0).length,
  manualReview: commPairs.filter(p => p.similarity >= 0.70 && p.similarity < 0.85).length,
  pairs: commPairs,
};

fs.writeFileSync("audit/commercial-hub-content-similarity.json", JSON.stringify(commercialSimilarityReport, null, 2));
console.log("✅ Wrote audit/commercial-hub-content-similarity.json");
