import fs from "fs";
import path from "path";

function getAllFiles(dir, exts) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== "node_modules" && item !== ".git" && item !== ".lighthouse-tmp") {
        files = files.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.some((ext) => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log("=== 1. CHARACTER ENCODING & MOJIBAKE AUDIT ===");
const textFiles = getAllFiles(".", [".ts", ".astro", ".json", ".html", ".md", ".toml"]);
let encodingIssues = 0;

for (const file of textFiles) {
  const content = fs.readFileSync(file, "utf-8");
  if (content.includes("\uFFFD")) {
    console.error(`❌ U+FFFD Replacement char found in: ${file}`);
    encodingIssues++;
  }
  // Check for suspicious double question marks in prose
  const matches = content.match(/[a-zA-Z]\?\?[a-zA-Z]/g);
  if (matches) {
    console.error(`❌ Suspicious corrupted punctuation in ${file}:`, matches);
    encodingIssues++;
  }
}

if (encodingIssues === 0) {
  console.log(`✅ 0 character encoding or mojibake issues found across ${textFiles.length} files.`);
} else {
  console.error(`❌ Found ${encodingIssues} character encoding issues!`);
}

console.log("\n=== 2. NETLIFY SECURITY HEADERS AUDIT ===");
const netlifyToml = fs.readFileSync("netlify.toml", "utf-8");
const headers = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];

for (const h of headers) {
  if (netlifyToml.includes(h)) {
    console.log(`✅ ${h} configured in netlify.toml`);
  } else {
    console.error(`❌ Missing ${h} in netlify.toml`);
  }
}
