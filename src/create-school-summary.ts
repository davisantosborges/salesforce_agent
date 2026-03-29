/**
 * Reference: Create a School City Summary Calculated Insight in Data Cloud.
 *
 * Aggregates School DLO data by city:
 * - Dimensions: City, State, Country
 * - Measures: COUNT schools, SUM students, SUM teachers, AVG capacity
 *
 * Usage: npx tsx src/create-school-summary.ts
 */

import { login } from "./auth";
import { createDataCloudTransform } from "./skills/data-cloud-transform";
import type { TransformConfig } from "./skills/data-cloud-transform";

const schoolSummaryConfig: TransformConfig = {
  name: "School_City_Summary",
  label: "School City Summary",
  description:
    "Aggregates school data by city: count of schools, total students/teachers, average capacity",
  sourceTable: "School_c_Home__dll",

  dimensions: [
    { sourceField: "City_c__c", alias: "city" },
    { sourceField: "State_c__c", alias: "state" },
    { sourceField: "Country_c__c", alias: "country" },
  ],

  measures: [
    { function: "COUNT", sourceField: "*", alias: "school_count" },
    { function: "SUM", sourceField: "Number_of_Students_c__c", alias: "total_students" },
    { function: "SUM", sourceField: "Number_of_Teachers_c__c", alias: "total_teachers" },
    { function: "AVG", sourceField: "Max_Capacity_c__c", alias: "avg_capacity" },
  ],
};

async function main() {
  const conn = await login();
  const result = await createDataCloudTransform(conn, schoolSummaryConfig);

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
