import type { Community } from "../../src/types/community";
import { normalizeInviteUrl } from "../../src/lib/urls";

/**
 * Merges newly discovered candidate communities into the existing pending staging queue.
 * Updates timesSeen, lastSeenAt, observedRunIds (unique set), and providerIds (unique set).
 */
export function stageDiscoveredCandidates(
  existingPending: Community[],
  newCandidates: Community[],
  runId: string,
  providerId: string,
  nowIso: string = new Date().toISOString()
): { updatedPending: Community[]; newlyAddedCount: number; updatedCount: number } {
  const resultPending = [...existingPending];
  let newlyAddedCount = 0;
  let updatedCount = 0;

  for (const newCand of newCandidates) {
    const normUrl = normalizeInviteUrl(newCand.inviteUrl);
    const existingIdx = resultPending.findIndex(
      (p) => normalizeInviteUrl(p.inviteUrl) === normUrl
    );

    if (existingIdx !== -1) {
      const existing = resultPending[existingIdx];
      existing.timesSeen = (existing.timesSeen || 1) + 1;
      existing.lastSeenAt = nowIso;

      // Real observedRunIds aggregation - deduplicated unique set
      const currentRuns = new Set(existing.observedRunIds || []);
      currentRuns.add(runId);
      if (newCand.observedRunIds) {
        newCand.observedRunIds.forEach((r) => currentRuns.add(r));
      }
      existing.observedRunIds = Array.from(currentRuns);

      // Real providerIds aggregation - deduplicated unique set
      const currentProviders = new Set(existing.providerIds || []);
      currentProviders.add(providerId);
      if (newCand.providerIds) {
        newCand.providerIds.forEach((p) => currentProviders.add(p));
      }
      existing.providerIds = Array.from(currentProviders);

      existing.lastCheckedAt = nowIso;
      existing.linkStatus = "active";
      updatedCount++;
    } else {
      const candToInsert: Community = {
        ...newCand,
        firstSeenAt: newCand.firstSeenAt || nowIso,
        lastSeenAt: nowIso,
        timesSeen: newCand.timesSeen || 1,
        observedRunIds: Array.from(new Set([runId, ...(newCand.observedRunIds || [])])),
        providerIds: Array.from(new Set([providerId, ...(newCand.providerIds || [])])),
      };
      resultPending.push(candToInsert);
      newlyAddedCount++;
    }
  }

  return {
    updatedPending: resultPending,
    newlyAddedCount,
    updatedCount,
  };
}
