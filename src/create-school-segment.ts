/**
 * Reference: Create an "Active High Schools" segment in Data Cloud.
 *
 * Segments School records where Status = "Active" AND School_Type = "High School"
 *
 * Prerequisites:
 * - SchoolCustom DMO must be provisioned (data stream synced)
 * - DMO category must be "Profile" or "Engagement"
 *
 * Usage: npx tsx src/create-school-segment.ts
 */

import { login } from "./auth";
import { createDataCloudSegment } from "./skills/segmentation";

async function main() {
  const conn = await login();

  const result = await createDataCloudSegment(conn, {
    name: "Active_Schools",
    label: "Active Schools",
    segmentOn: "SchoolCustom__dlm",
    filter: {
      field: "Status_c__c",
      operator: "equals",
      value: "Active",
      dataType: "TEXT",
    },
  });

  console.log("── Step Details ──\n");
  for (const step of result.steps) {
    const icon = step.status === "success" ? "✅" : "❌";
    console.log(`${icon} ${step.step}: ${step.detail}`);
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
