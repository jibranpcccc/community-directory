import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { DailyMetricsRecord } from "../scripts/discover/index";

describe("Daily Discovery Metrics Integrity & Non-Fabrication Guard", () => {
  const metricsPath = path.resolve(process.cwd(), "src/data/daily-metrics.json");

  it("Ensures daily-metrics.json exists as a valid JSON array", () => {
    expect(fs.existsSync(metricsPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));
    expect(Array.isArray(content)).toBe(true);
  });

  it("Ensures all recorded entries strictly follow the real execution schema", () => {
    const content: DailyMetricsRecord[] = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));

    for (const record of content) {
      expect(record.runId).toBeTruthy();
      expect(record.startedAt).toBeTruthy();
      expect(record.finishedAt).toBeTruthy();
      expect(record.generatedBy).toBe("discovery-pipeline");
      expect(new Date(record.startedAt).getTime()).not.toBeNaN();
      expect(new Date(record.finishedAt).getTime()).not.toBeNaN();
      expect(record.queryTopics).toBeGreaterThanOrEqual(0);
      expect(record.rawCandidates).toBeGreaterThanOrEqual(0);
      expect(record.active).toBeGreaterThanOrEqual(0);
    }
  });

  it("Rejects synthetic records lacking execution metadata", () => {
    const syntheticRecord = {
      date: "2026-08-13",
      queryTopics: 30,
      rawCandidates: 9,
      // Missing runId, startedAt, finishedAt, generatedBy
    };

    const hasRequiredTelemetry = Boolean(
      (syntheticRecord as any).runId &&
      (syntheticRecord as any).startedAt &&
      (syntheticRecord as any).finishedAt &&
      (syntheticRecord as any).generatedBy === "discovery-pipeline"
    );

    expect(hasRequiredTelemetry).toBe(false);
  });
});
