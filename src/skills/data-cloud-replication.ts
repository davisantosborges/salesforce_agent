/**
 * SKILL: Data Cloud CRM Connector Replication
 *
 * Replicates a Salesforce CRM custom object into Data Cloud via CRM Connector,
 * creates a custom DMO, maps fields, and optionally creates Calculated Insights.
 *
 * === DATA CLOUD OBJECT HIERARCHY ===
 *
 * Data Source → Data Stream → DSO → DLO (__dll) → DMO (__dlm) → CIO
 *
 * - DSO: Raw staging (temporary, auto-created)
 * - DLO: Physical data lake storage (Parquet/S3, auto-created by Data Stream deploy)
 * - DMO: Virtual harmonized view (created via ObjectSourceTargetMap field mappings)
 * - CIO: Calculated Insight Object (SQL aggregations via MktCalcInsightObjectDef)
 *
 * KEY: DLOs and DMOs CANNOT be created directly via Metadata API.
 *      They are byproducts of DataStreamDefinition + ObjectSourceTargetMap.
 *      CIOs CAN be created fully via Metadata API.
 *
 * === PREREQUISITES ===
 * - Data Cloud must be provisioned and enabled in the org
 * - CRM Connector must be available (Salesforce CRM data source)
 * - The source object must exist with fields deployed and FLS granted
 * - User must have Data Cloud admin permissions
 *
 * === WORKFLOW ===
 *
 * Phase 1: PRE-FLIGHT CHECKS (API)
 *   - Verify object exists and has fields via API
 *   - Check Data Cloud is accessible
 *   - Create test record in source object (needed for data to flow)
 *
 * Phase 2: CREATE CRM DATA STREAM (Browser — UI required)
 *   - DLOs are auto-created when Data Stream is deployed
 *   - Steps: Data Cloud > Data Streams > New > Salesforce CRM > Select object > Deploy
 *   - This provisions the __dll DLO in the data lake
 *
 * Phase 3: CREATE DMO & MAP FIELDS (Browser — UI required)
 *   - DMOs are virtual views created via field mappings
 *   - Steps: Data Stream detail > Data Mapping > Start > Select Objects > New Custom Object
 *   - ObjectSourceTargetMap metadata is created automatically
 *
 * Phase 4: CREATE CALCULATED INSIGHTS (API — fully programmatic!)
 *   - CIOs are SQL-based aggregations that CAN be created via Metadata API
 *   - Uses MktCalcInsightObjectDef metadata type
 *   - SQL: SELECT Table__dll.Field__c as alias__c, AGG() FROM Table__dll GROUP BY ...
 *
 * Phase 5: VERIFY REPLICATION (API + Browser)
 *   - Check data stream status is "Active" and "Success"
 *   - Query Data Cloud via /ssot/calculated-insights
 *   - Verify field values match source object
 *
 * Phase 6: TEST (API)
 *   - Create a new record in source object
 *   - Trigger data stream refresh
 *   - Wait for sync, query CIO to verify
 *
 * === METADATA TYPES REFERENCE ===
 *
 * | Component | Metadata Type | API Creatable? |
 * |-----------|--------------|:-:|
 * | Data Stream | DataStreamDefinition | ✅ (provisions DLO) |
 * | DLO metadata | MktDataTranObject | ✅ (metadata only, no __dll) |
 * | DLO→DMO mapping | ObjectSourceTargetMap | ✅ |
 * | Calculated Insight | MktCalcInsightObjectDef | ✅ |
 * | Provisioned DLO (__dll) | N/A | ❌ (UI only via Data Stream deploy) |
 * | DMO (__dlm) | N/A | ❌ (byproduct of field mapping) |
 *
 * === COMPLEMENTARY QUESTIONS ===
 *
 * If information is missing, ask:
 * - What object to replicate? (API name)
 * - Which fields to include? (all or specific subset)
 * - What should the DMO be named?
 * - What category? (Profile, Engagement, Other)
 * - What's the refresh schedule? (every 15min, hourly, daily)
 * - Should we include formula fields? (they need special handling)
 * - Are there related objects to also replicate?
 * - What Calculated Insights (aggregations) should be created?
 */

export interface DataCloudReplicationConfig {
  // Source object
  objectApiName: string;
  objectLabel: string;

  // Fields to replicate (API names). If empty, replicate all custom fields.
  fields?: string[];

  // DMO configuration (created via UI mapping)
  dmoName: string;
  dmoCategory: "Profile" | "Engagement" | "Other";

  // Salesforce instance
  instanceUrl: string;
  lightningUrl: string;

  // Refresh schedule
  refreshSchedule?: "15min" | "hourly" | "daily";

  // Calculated Insights to create after replication (API-driven)
  calculatedInsights?: Array<{
    name: string;
    label: string;
    description?: string;
    /** SQL expression using DLO __dll table and field names */
    expression: string;
  }>;
}

export interface DataCloudReplicationStep {
  id: string;
  name: string;
  phase: "preflight" | "data_stream" | "dmo_mapping" | "calc_insights" | "verify" | "test";
  type: "api" | "browser" | "hybrid";
  actions: string[];
  verify: string[];
}

/**
 * Pre-built config for School__c replication
 */
export const schoolReplicationConfig: DataCloudReplicationConfig = {
  objectApiName: "School__c",
  objectLabel: "School",
  fields: [
    "Name", "School_Type__c", "Status__c", "School_Code__c",
    "Founded_Date__c", "Number_of_Students__c", "Number_of_Teachers__c",
    "Max_Capacity__c", "Phone__c", "Email__c", "Website__c",
    "Principal_Name__c", "City__c", "State__c", "Postal_Code__c", "Country__c",
  ],
  dmoName: "SchoolCustom",
  dmoCategory: "Other",
  instanceUrl: "https://orgfarm-7b5728161f-dev-ed.develop.my.salesforce.com",
  lightningUrl: "https://orgfarm-7b5728161f-dev-ed.develop.lightning.force.com",
  refreshSchedule: "hourly",
  calculatedInsights: [
    {
      name: "School_City_Summary",
      label: "School City Summary",
      description: "Aggregates school data by city: count of schools, total students/teachers, average capacity",
      expression: "SELECT School_c_Home__dll.City_c__c as city__c, School_c_Home__dll.State_c__c as state__c, School_c_Home__dll.Country_c__c as country__c, COUNT(*) as school_count__c, SUM(School_c_Home__dll.Number_of_Students_c__c) as total_students__c, SUM(School_c_Home__dll.Number_of_Teachers_c__c) as total_teachers__c, AVG(School_c_Home__dll.Max_Capacity_c__c) as avg_capacity__c FROM School_c_Home__dll GROUP BY School_c_Home__dll.City_c__c, School_c_Home__dll.State_c__c, School_c_Home__dll.Country_c__c",
    },
  ],
};

/**
 * Generate the full step-by-step execution plan
 */
export function generateReplicationSteps(
  config: DataCloudReplicationConfig
): DataCloudReplicationStep[] {
  const steps: DataCloudReplicationStep[] = [];

  // ── Phase 1: Pre-flight ──

  steps.push({
    id: "preflight_verify_object",
    name: "Verify source object exists",
    phase: "preflight",
    type: "api",
    actions: [
      `Run: describeObject(conn, "${config.objectApiName}")`,
      `Confirm object exists with expected fields`,
    ],
    verify: [
      `Object ${config.objectApiName} exists`,
      `All ${config.fields?.length || "custom"} fields are present`,
    ],
  });

  steps.push({
    id: "preflight_test_record",
    name: "Create test record in source object",
    phase: "preflight",
    type: "api",
    actions: [
      `Create a record in ${config.objectApiName} via REST API`,
      `Fill key fields with identifiable test data`,
    ],
    verify: [`Record created successfully with an ID`],
  });

  // ── Phase 2: Create Data Stream (Browser) ──

  steps.push({
    id: "ds_create",
    name: "Create CRM Data Stream",
    phase: "data_stream",
    type: "browser",
    actions: [
      `Data Cloud > Data Streams > New`,
      `Select "Salesforce CRM" connector`,
      `Click "View Objects", search for "${config.objectApiName}"`,
      `Select object, set category to "${config.dmoCategory}"`,
      `Click Next > Deploy`,
      `Wait for status to show "Active"`,
    ],
    verify: [
      `Data stream deployed with status "Active"`,
      `DLO auto-created: ${config.objectApiName.replace("__c", "_c_Home__dll")}`,
    ],
  });

  // ── Phase 3: Create DMO & Map Fields (Browser) ──

  steps.push({
    id: "dmo_create",
    name: "Create DMO and map fields",
    phase: "dmo_mapping",
    type: "browser",
    actions: [
      `On Data Stream detail page, click "Start" under Data Mapping`,
      `Click "Select Objects" > "Custom Data Model" tab`,
      `Click "+ New Custom Object"`,
      `Set Object Label to "${config.dmoName}"`,
      `All fields pre-selected — click "Save"`,
      `Click "Save & Close" on mapping canvas`,
    ],
    verify: [
      `DMO "${config.dmoName}" created with mapped fields`,
      `ObjectSourceTargetMap metadata created automatically`,
    ],
  });

  // ── Phase 4: Create Calculated Insights (API) ──

  if (config.calculatedInsights && config.calculatedInsights.length > 0) {
    for (const ci of config.calculatedInsights) {
      steps.push({
        id: `ci_create_${ci.name}`,
        name: `Create Calculated Insight: ${ci.label}`,
        phase: "calc_insights",
        type: "api",
        actions: [
          `conn.metadata.create("MktCalcInsightObjectDef", {`,
          `  fullName: "${ci.name}",`,
          `  creationType: "Custom",`,
          `  expression: "${ci.expression.substring(0, 80)}...",`,
          `  masterLabel: "${ci.label}",`,
          `})`,
        ],
        verify: [
          `CIO "${ci.name}" created successfully`,
          `Verified via conn.metadata.read("MktCalcInsightObjectDef", "${ci.name}")`,
        ],
      });
    }
  }

  // ── Phase 5: Verify ──

  steps.push({
    id: "verify_stream",
    name: "Verify data stream and replication",
    phase: "verify",
    type: "hybrid",
    actions: [
      `Check data stream status via browser or /ssot/data-streams`,
      `Verify DLO has records via Data Explorer`,
      `Verify CIO results via /ssot/calculated-insights`,
    ],
    verify: [
      `Data Stream: Active, Last Run: Success`,
      `Total Records >= 1`,
      `CIO queryable with expected dimensions/measures`,
    ],
  });

  // ── Phase 6: Test ──

  steps.push({
    id: "test_replication",
    name: "Test end-to-end replication",
    phase: "test",
    type: "hybrid",
    actions: [
      `Create new record in ${config.objectApiName}`,
      `Trigger data stream refresh`,
      `Query CIO to verify aggregation updated`,
      `Clean up test records`,
    ],
    verify: [
      `New record appears in Data Cloud after refresh`,
      `CIO aggregation reflects the new data`,
    ],
  });

  return steps;
}

/**
 * Get questions for missing configuration
 */
export function getReplicationQuestions(
  partial: Partial<DataCloudReplicationConfig>
): string[] {
  const questions: string[] = [];
  if (!partial.objectApiName) questions.push("What object to replicate? (API name, e.g., School__c)");
  if (!partial.dmoName) questions.push("What should the DMO be named?");
  if (!partial.dmoCategory) questions.push("Category? (Profile, Engagement, or Other)");
  if (!partial.calculatedInsights) questions.push("What aggregations/insights should be calculated? (e.g., count by city, sum students)");
  return questions;
}

/**
 * Print the execution plan
 */
export function printReplicationPlan(config: DataCloudReplicationConfig): void {
  const steps = generateReplicationSteps(config);

  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log(`║  Data Cloud Replication Plan: ${config.objectLabel} (${config.objectApiName})`);
  console.log(`║  DMO: ${config.dmoName} | CIOs: ${config.calculatedInsights?.length || 0}`);
  console.log(`║  Steps: ${steps.length}`);
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const phases = ["preflight", "data_stream", "dmo_mapping", "calc_insights", "verify", "test"];
  const phaseLabels: Record<string, string> = {
    preflight: "Phase 1: Pre-flight Checks (API)",
    data_stream: "Phase 2: Create CRM Data Stream (Browser)",
    dmo_mapping: "Phase 3: Create DMO & Map Fields (Browser)",
    calc_insights: "Phase 4: Create Calculated Insights (API)",
    verify: "Phase 5: Verify Replication",
    test: "Phase 6: Test",
  };

  for (const phase of phases) {
    const phaseSteps = steps.filter((s) => s.phase === phase);
    if (phaseSteps.length === 0) continue;

    console.log(`── ${phaseLabels[phase]} ──\n`);
    for (const step of phaseSteps) {
      const icon = step.type === "api" ? "🔧" : step.type === "browser" ? "🌐" : "🔄";
      console.log(`  ${icon} ${step.name}`);
      for (const action of step.actions) console.log(`     → ${action}`);
      console.log(`     Verify:`);
      for (const check of step.verify) console.log(`     ✓ ${check}`);
      console.log("");
    }
  }
}
