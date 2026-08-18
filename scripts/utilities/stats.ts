import * as fs from "fs";
import * as path from "path";
import type { Community } from "../../src/types/community";

function runDataStats() {
  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const pendingPath = path.join(dataDir, "pending-groups.json");

  const published: Community[] = fs.existsSync(groupsPath)
    ? JSON.parse(fs.readFileSync(groupsPath, "utf-8"))
    : [];
  const pending: Community[] = fs.existsSync(pendingPath)
    ? JSON.parse(fs.readFileSync(pendingPath, "utf-8"))
    : [];

  const platformCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {
    active: 0,
    unknown: 0,
    dead: 0,
    removed: 0,
    reported: 0,
  };
  const verificationCounts: Record<string, number> = {
    unverified: 0,
    "source-confirmed": 0,
    "owner-confirmed": 0,
    "manually-reviewed": 0,
  };

  for (const c of published) {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    statusCounts[c.linkStatus] = (statusCounts[c.linkStatus] || 0) + 1;
    verificationCounts[c.verificationStatus] =
      (verificationCounts[c.verificationStatus] || 0) + 1;
  }

  console.log("=========================================");
  console.log("📊 COMMUNITY DIRECTORY DATASET SUMMARY");
  console.log("=========================================");
  console.log(`Total published: ${published.length}`);
  console.log(`Pending review:  ${pending.length}`);
  console.log("-----------------------------------------");
  console.log("Platforms (Published):");
  Object.entries(platformCounts).forEach(([plat, count]) => {
    console.log(`  - ${plat.padEnd(12)}: ${count}`);
  });
  console.log("-----------------------------------------");
  console.log("Link Status (Published):");
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  - ${status.padEnd(12)}: ${count}`);
  });
  console.log("-----------------------------------------");
  console.log("Verification Tiers:");
  Object.entries(verificationCounts).forEach(([tier, count]) => {
    console.log(`  - ${tier.padEnd(18)}: ${count}`);
  });
  console.log("=========================================");
}

runDataStats();
