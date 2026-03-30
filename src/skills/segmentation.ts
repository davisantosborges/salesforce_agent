/**
 * SKILL: Data Cloud Segmentation
 *
 * Creates and manages Data Cloud segments (MarketSegmentDefinition).
 * Segments define audiences based on filter criteria on DMOs.
 *
 * === PREREQUISITES ===
 * - DMO must exist and be category "Profile" or "Engagement" (NOT "Other")
 * - Data stream must be synced with records
 * - DMO fields must be mapped for filtering
 *
 * === SEGMENT STRUCTURE ===
 * - segmentOn: DMO name (__dlm suffix) — the target entity
 * - includeCriteria: JSON filter expression
 * - Filters support: TextComparison, NumberComparison, DateComparison, BooleanComparison
 * - Operators: equals, not equals, greater than, less than, contains, starts with
 */

import { Connection } from "jsforce";
import {
  createSegment,
  readSegment,
  deleteSegment,
  publishSegment,
  listSegmentsRest,
  buildSegmentFilter,
  type SegmentConfig,
} from "../data-cloud";

// ── Types ──

export interface SimpleFilterDef {
  field: string;
  operator: string;
  value: string | number | boolean;
  dataType?: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN";
}

export interface SegmentSkillConfig {
  name: string;
  label: string;
  /** DMO to segment on (with __dlm suffix) */
  segmentOn: string;
  /** Simple filter definition */
  filter: SimpleFilterDef;
}

export interface SegmentResult {
  name: string;
  success: boolean;
  steps: Array<{ step: string; status: "success" | "error"; detail: string }>;
}

// ── Main Function ──

export async function createDataCloudSegment(
  conn: Connection,
  config: SegmentSkillConfig
): Promise<SegmentResult> {
  const steps: SegmentResult["steps"] = [];

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Segment: ${config.label}`);
  console.log(`║  On: ${config.segmentOn}`);
  console.log(`║  Filter: ${config.filter.field} ${config.filter.operator} ${config.filter.value}`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Step 1: Build criteria and create segment
  console.log("── Step 1: Create Segment ──\n");
  try {
    const criteria = buildSegmentFilter(
      config.segmentOn,
      config.filter.field,
      config.filter.operator,
      config.filter.value,
      config.filter.dataType || "TEXT"
    );

    const segConfig: SegmentConfig = {
      fullName: config.name,
      label: config.label,
      segmentOn: config.segmentOn,
      includeCriteria: criteria,
    };

    const result = await createSegment(conn, segConfig);
    if (result.success) {
      steps.push({ step: "CreateSegment", status: "success", detail: `Created ${config.name}` });
      console.log(`  ✓ Created: ${config.name}`);
    } else {
      steps.push({ step: "CreateSegment", status: "error", detail: JSON.stringify(result.errors) });
      console.log(`  ✗ Failed: ${JSON.stringify(result.errors)}`);
    }
  } catch (err: any) {
    steps.push({ step: "CreateSegment", status: "error", detail: err.message });
    console.log(`  ✗ Exception: ${err.message}`);
  }

  // Step 2: Verify
  console.log("\n── Step 2: Verify ──\n");
  try {
    const seg = await readSegment(conn, config.name);
    if (seg && seg.fullName) {
      steps.push({ step: "Verify", status: "success", detail: `${seg.masterLabel} on ${seg.segmentOn}` });
      console.log(`  ✓ Verified: ${seg.masterLabel}`);
      console.log(`  Segment On: ${seg.segmentOn}`);
      console.log(`  Type: ${seg.segmentType}`);
    } else {
      steps.push({ step: "Verify", status: "error", detail: "Segment not found" });
      console.log(`  ✗ Segment not found`);
    }
  } catch (err: any) {
    steps.push({ step: "Verify", status: "error", detail: err.message });
    console.log(`  ✗ Verify error: ${err.message}`);
  }

  // Step 3: Try to publish
  console.log("\n── Step 3: Publish ──\n");
  try {
    const pubResult = await publishSegment(conn, config.name);
    steps.push({ step: "Publish", status: "success", detail: "Published" });
    console.log(`  ✓ Published: ${JSON.stringify(pubResult).substring(0, 200)}`);
  } catch (err: any) {
    steps.push({ step: "Publish", status: "error", detail: err.message?.substring(0, 100) });
    console.log(`  ○ Publish: ${err.message?.substring(0, 150)}`);
    console.log(`    (May need DMO to be fully provisioned before publishing)`);
  }

  const success = steps.filter((s) => s.status === "error").length === 0;
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Result: ${success ? "SUCCESS" : "PARTIAL"}`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  return { name: config.name, success, steps };
}

// ── Complementary Questions ──

export function getSegmentQuestions(
  partial: Partial<SegmentSkillConfig>
): string[] {
  const questions: string[] = [];
  if (!partial.name) questions.push("What should the segment be named? (e.g., Active_High_Schools)");
  if (!partial.segmentOn) questions.push("Which DMO to segment on? (must be Profile or Engagement category, use __dlm suffix)");
  if (!partial.filter) questions.push("What filter criteria? (field, operator, value — e.g., Status equals Active)");
  return questions;
}
