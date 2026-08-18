import * as fs from "fs";
import * as path from "path";
import type { Community } from "../../src/types/community";
import { atomicWriteJson } from "../data/mergeListings";
import { validateCommunitiesData } from "../data/validateSchema";
import { getCurrentIsoTimestamp } from "../../src/lib/dates";

function runApprove() {
  const targetId = process.argv[2];

  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const pendingPath = path.join(dataDir, "pending-groups.json");

  const published: Community[] = fs.existsSync(groupsPath)
    ? JSON.parse(fs.readFileSync(groupsPath, "utf-8"))
    : [];
  const pending: Community[] = fs.existsSync(pendingPath)
    ? JSON.parse(fs.readFileSync(pendingPath, "utf-8"))
    : [];

  if (!targetId) {
    console.log("=========================================");
    console.log("📝 PENDING COMMUNITIES AWAITING APPROVAL");
    console.log("=========================================");
    if (pending.length === 0) {
      console.log("No communities currently pending review.");
      return;
    }
    pending.forEach((c, idx) => {
      console.log(`[#${idx + 1}] ID: ${c.id}`);
      console.log(`    Title:    ${c.title} (${c.platform})`);
      console.log(`    URL:      ${c.inviteUrl}`);
      console.log(`    Category: ${c.category}`);
      console.log("-----------------------------------------");
    });
    console.log("\nTo approve a listing, run:");
    console.log("  npm run approve -- <candidate-id>");
    return;
  }

  const index = pending.findIndex(
    (c) => c.id === targetId || c.slug === targetId
  );

  if (index === -1) {
    console.error(`❌ Candidate with ID or slug "${targetId}" not found in pending-groups.json.`);
    process.exit(1);
  }

  const [toApprove] = pending.splice(index, 1);
  toApprove.published = true;
  toApprove.verificationStatus = "manually-reviewed";
  toApprove.updatedAt = getCurrentIsoTimestamp();

  published.push(toApprove);
  published.sort((a, b) => a.title.localeCompare(b.title));

  // Validate both datasets
  const valPub = validateCommunitiesData(published);
  const valPen = validateCommunitiesData(pending);

  if (!valPub.valid || !valPen.valid) {
    console.error("❌ Schema validation failed during approval:", [
      ...valPub.errors,
      ...valPen.errors,
    ]);
    process.exit(1);
  }

  // Atomic writes
  atomicWriteJson(groupsPath, valPub.communities);
  atomicWriteJson(pendingPath, valPen.communities);

  console.log(`🎉 Successfully approved "${toApprove.title}" (${toApprove.id})! Moved to groups.json.`);
}

runApprove();
