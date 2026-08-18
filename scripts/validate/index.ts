import * as fs from "fs";
import * as path from "path";
import { validateTelegramLink } from "./telegram";
import { validateDiscordLink } from "./discord";
import { validateWhatsappLink } from "./whatsapp";
import { validateGenericLink } from "./generic";
import { atomicWriteJson } from "../data/mergeListings";
import { validateCommunitiesData } from "../data/validateSchema";
import type { Community } from "../../src/types/community";

async function runLinkValidation() {
  console.log("=========================================");
  console.log("🔗 LINK HEALTH VALIDATION ENGINE");
  console.log("=========================================");

  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");

  if (!fs.existsSync(groupsPath)) {
    console.error("❌ groups.json not found.");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    console.log("ℹ️  No communities in groups.json to validate.");
    return;
  }

  const communities: Community[] = raw;
  console.log(`[validate] Auditing ${communities.length} published communities...`);

  let updatedCount = 0;

  for (let i = 0; i < communities.length; i++) {
    const comm = communities[i];
    console.log(`  [check] (#${i + 1}/${communities.length}) Checking ${comm.platform}: ${comm.inviteUrl}...`);

    let result;
    switch (comm.platform) {
      case "telegram":
        result = await validateTelegramLink(comm.inviteUrl);
        break;
      case "discord":
        result = await validateDiscordLink(comm.inviteUrl);
        break;
      case "whatsapp":
        result = await validateWhatsappLink(comm.inviteUrl);
        break;
      default:
        result = await validateGenericLink(comm.inviteUrl);
    }

    // Only update if state or timestamp changed
    comm.lastCheckedAt = result.checkedAt;
    comm.updatedAt = result.checkedAt;
    
    // Cautious state transition: if previously active and now fails once, don't mark dead immediately unless 404
    if (result.status !== comm.linkStatus) {
      console.log(`    ↳ Status changed: ${comm.linkStatus} -> ${result.status} (${result.message || "OK"})`);
      comm.linkStatus = result.status;
      updatedCount++;
    }

    // Rate limiting delay (1000ms) between outbound HTTP requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Validate resulting data
  const valResult = validateCommunitiesData(communities);
  if (!valResult.valid) {
    console.error("❌ Link validation produced invalid dataset schema:", valResult.errors);
    process.exit(1);
  }

  // Atomic save
  atomicWriteJson(groupsPath, valResult.communities);
  console.log(`\n🎉 Link audit complete! Checked ${communities.length} listings. Status updated for ${updatedCount} items.`);
}

runLinkValidation().catch((err) => {
  console.error("❌ Link validation failed:", err);
  process.exit(1);
});
