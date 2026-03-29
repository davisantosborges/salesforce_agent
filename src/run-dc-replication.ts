/**
 * Data Cloud Replication Runner
 * Prints the replication plan and executes API pre-flight checks.
 *
 * Usage: npx tsx src/run-dc-replication.ts [objectApiName]
 */

import { login } from "./auth";
import { describeObject } from "./tooling";
import {
  schoolReplicationConfig,
  printReplicationPlan,
  type DataCloudReplicationConfig,
} from "./skills/data-cloud-replication";

const objectArg = process.argv[2] || "School__c";

let config: DataCloudReplicationConfig;
switch (objectArg) {
  case "School__c":
  case "School":
    config = schoolReplicationConfig;
    break;
  default:
    console.error(`No replication config for: ${objectArg}`);
    process.exit(1);
}

async function main() {
  // Print the full plan
  printReplicationPlan(config);

  // Execute API pre-flight checks
  console.log("═══════════════════════════════════════════════");
  console.log("  Executing API Pre-flight Checks...");
  console.log("═══════════════════════════════════════════════\n");

  const conn = await login();

  // Check 1: Object exists
  console.log("1. Verifying source object...");
  try {
    const desc = await describeObject(conn, config.objectApiName);
    const customFields = desc.fields.filter((f: any) => f.custom);
    console.log(`   ✓ ${config.objectApiName} exists — ${customFields.length} custom fields`);

    if (config.fields) {
      const fieldNames = desc.fields.map((f: any) => f.name);
      const missing = config.fields.filter((f) => !fieldNames.includes(f));
      if (missing.length > 0) {
        console.log(`   ✗ Missing fields: ${missing.join(", ")}`);
      } else {
        console.log(`   ✓ All ${config.fields.length} configured fields present`);
      }
    }
  } catch (err: any) {
    console.log(`   ✗ Object not found: ${err.message}`);
    process.exit(1);
  }

  // Check 2: Create test record
  console.log("\n2. Creating test record for replication...");
  try {
    const testData: any = {
      Name: "DC Replication Test",
      School_Type__c: "Charter",
      Status__c: "Active",
      School_Code__c: "DC-TEST-001",
      Number_of_Students__c: 100,
      City__c: "Data Cloud City",
    };

    const result: any = await conn.request({
      method: "POST",
      url: `/services/data/v62.0/sobjects/${config.objectApiName}`,
      body: JSON.stringify(testData),
      headers: { "Content-Type": "application/json" },
    });

    if (result.id) {
      console.log(`   ✓ Created test record: ${result.id}`);
      console.log(`   ℹ Keep this record — it will be used to verify replication`);
    } else {
      console.log(`   ✗ Create failed: ${JSON.stringify(result)}`);
    }
  } catch (err: any) {
    console.log(`   ✗ ${err.message}`);
  }

  // Check 3: Verify existing data streams (API)
  console.log("\n3. Checking existing Data Cloud data streams...");
  try {
    const streams: any = await conn.request({
      method: "GET",
      url: "/services/data/v62.0/ssot/data-streams",
    });
    if (streams && Array.isArray(streams)) {
      console.log(`   ✓ Data Cloud API accessible — ${streams.length} existing streams`);
      const schoolStream = streams.find(
        (s: any) => s.name?.includes("School") || s.developerName?.includes("School")
      );
      if (schoolStream) {
        console.log(`   ℹ School data stream already exists: ${schoolStream.name}`);
      } else {
        console.log(`   ℹ No School data stream yet — ready to create`);
      }
    }
  } catch (err: any) {
    // DC API may not be available via this token format
    console.log(`   ℹ Data Cloud API not accessible via current token (expected for CRM tokens)`);
    console.log(`   ℹ Browser-based verification will be used instead`);
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Pre-flight complete. Ready for browser steps.");
  console.log("  Ask Claude Code to execute the Data Cloud");
  console.log("  replication steps via Chrome browser tools.");
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
