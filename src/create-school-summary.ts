/**
 * Reference: Create a School City Summary transform in Data Cloud.
 *
 * Transforms School_c_Home DLO → School_City_Summary DLO:
 * - Groups by City, State, Country
 * - Counts schools per city
 * - Sums total students
 * - Averages max capacity
 *
 * Usage: npx tsx src/create-school-summary.ts
 */

import { login } from "./auth";
import { createDataCloudTransform } from "./skills/data-cloud-transform";
import type { TransformConfig } from "./skills/data-cloud-transform";

const schoolSummaryConfig: TransformConfig = {
  targetName: "School_City_Summary",
  targetLabel: "School City Summary",
  sourceObjects: ["School_c_Home__dll"],
  transformType: "Batch",

  sql: `
    SELECT
      City_c__c AS City,
      State_c__c AS State,
      Country_c__c AS Country,
      COUNT(*) AS School_Count,
      SUM(Number_of_Students_c__c) AS Total_Students,
      SUM(Number_of_Teachers_c__c) AS Total_Teachers,
      AVG(Max_Capacity_c__c) AS Avg_Capacity
    FROM School_c_Home__dll
    WHERE IsDeleted__c = 'false'
    GROUP BY City_c__c, State_c__c, Country_c__c
  `.trim(),

  outputFields: [
    { name: "City", label: "City", type: "S", isPrimaryKey: true },
    { name: "State", label: "State", type: "S" },
    { name: "Country", label: "Country", type: "S" },
    { name: "School_Count", label: "School Count", type: "N" },
    { name: "Total_Students", label: "Total Students", type: "N" },
    { name: "Total_Teachers", label: "Total Teachers", type: "N" },
    { name: "Avg_Capacity", label: "Average Capacity", type: "N" },
  ],

  objectCategory: "Salesforce_SFDCReferenceModel_0_93.Related",
};

async function main() {
  const conn = await login();
  const result = await createDataCloudTransform(conn, schoolSummaryConfig);

  console.log("\n── Step Details ──\n");
  for (const step of result.steps) {
    const icon =
      step.status === "success" ? "✅" : step.status === "error" ? "❌" : "⏭️";
    console.log(`${icon} ${step.step}: ${step.detail}`);
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
