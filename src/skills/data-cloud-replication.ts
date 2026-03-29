/**
 * SKILL: Data Cloud CRM Connector Replication
 *
 * Replicates a Salesforce CRM custom object into Data Cloud via CRM Connector,
 * creates a custom DMO, maps fields, and verifies data flow.
 *
 * === PREREQUISITES ===
 * - Data Cloud must be provisioned and enabled in the org
 * - CRM Connector must be available (Salesforce CRM data source)
 * - The source object must exist with fields deployed and FLS granted
 * - User must have Data Cloud admin permissions
 *
 * === WORKFLOW ===
 *
 * Phase 1: PRE-FLIGHT CHECKS
 *   - Verify object exists and has fields via API
 *   - Check Data Cloud is accessible
 *   - Create test record in source object (needed for data to flow)
 *
 * Phase 2: CREATE CRM DATA STREAM (Browser — UI required)
 *   1. Navigate to Data Cloud > Data Streams
 *   2. Click "New"
 *   3. Select "Salesforce CRM" connector
 *   4. Select the target object (e.g., School__c)
 *   5. Select fields to include
 *   6. Configure refresh schedule
 *   7. Deploy the data stream
 *   8. Wait for initial sync to complete
 *
 * Phase 3: CREATE CUSTOM DMO & MAP FIELDS (Browser — UI required)
 *   1. Navigate to Data Cloud > Data Model
 *   2. Click "New" to create a custom DMO
 *   3. Name the DMO (e.g., "School")
 *   4. Set category (Other)
 *   5. Map fields from the Data Lake Object to DMO attributes
 *   6. Set primary key
 *   7. Save and deploy
 *
 * Phase 4: VERIFY REPLICATION (API + Browser)
 *   1. Check data stream status is "Active" and "Success"
 *   2. Query Data Cloud via ANSI SQL to confirm records exist
 *   3. Verify field values match source object
 *   4. Check DMO in Data Explorer
 *
 * Phase 5: TEST (API)
 *   1. Create a new record in source object
 *   2. Trigger data stream refresh
 *   3. Wait for sync
 *   4. Query Data Cloud to verify new record appears
 *   5. Clean up test records
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
 */

export interface DataCloudReplicationConfig {
  // Source object
  objectApiName: string; // e.g. "School__c"
  objectLabel: string; // e.g. "School"

  // Fields to replicate (API names). If empty, replicate all custom fields.
  fields?: string[];

  // DMO configuration
  dmoName: string; // e.g. "School"
  dmoCategory: "Profile" | "Engagement" | "Other";

  // Salesforce instance
  instanceUrl: string;
  lightningUrl: string;

  // Refresh schedule
  refreshSchedule?: "15min" | "hourly" | "daily";
}

export interface DataCloudReplicationStep {
  id: string;
  name: string;
  phase: "preflight" | "data_stream" | "dmo_mapping" | "verify" | "test";
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
    "Name",
    "School_Type__c",
    "Status__c",
    "School_Code__c",
    "Founded_Date__c",
    "Number_of_Students__c",
    "Number_of_Teachers__c",
    "Max_Capacity__c",
    "Phone__c",
    "Email__c",
    "Website__c",
    "Principal_Name__c",
    "City__c",
    "State__c",
    "Postal_Code__c",
    "Country__c",
  ],
  dmoName: "School",
  dmoCategory: "Other",
  instanceUrl: "https://orgfarm-7b5728161f-dev-ed.develop.my.salesforce.com",
  lightningUrl: "https://orgfarm-7b5728161f-dev-ed.develop.lightning.force.com",
  refreshSchedule: "hourly",
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
      `List all custom field API names`,
    ],
    verify: [
      `Object ${config.objectApiName} exists`,
      `All ${config.fields?.length || "custom"} fields are present`,
      `Object is createable and queryable`,
    ],
  });

  steps.push({
    id: "preflight_test_record",
    name: "Create test record in source object",
    phase: "preflight",
    type: "api",
    actions: [
      `Create a record in ${config.objectApiName} via REST API`,
      `Record name: "DC Replication Test"`,
      `Fill key fields with identifiable test data`,
    ],
    verify: [
      `Record created successfully with an ID`,
      `Record is queryable via SOQL`,
    ],
  });

  steps.push({
    id: "preflight_check_dc",
    name: "Verify Data Cloud is accessible",
    phase: "preflight",
    type: "browser",
    actions: [
      `Navigate to ${config.lightningUrl}`,
      `Open App Launcher > search "Data Cloud"`,
      `Click Data Cloud app`,
    ],
    verify: [
      `Data Cloud home page loads`,
      `Data Streams tab is visible in navigation`,
      `Data Model tab is visible`,
    ],
  });

  // ── Phase 2: Create Data Stream ──

  steps.push({
    id: "ds_navigate",
    name: "Navigate to New Data Stream",
    phase: "data_stream",
    type: "browser",
    actions: [
      `Click "Data Streams" in the Data Cloud nav bar`,
      `Click "New" button`,
    ],
    verify: [
      `Data stream creation wizard opens`,
      `Connector selection page is displayed`,
    ],
  });

  steps.push({
    id: "ds_select_connector",
    name: "Select Salesforce CRM connector",
    phase: "data_stream",
    type: "browser",
    actions: [
      `Find and select "Salesforce CRM" as the data connector type`,
      `Click "Next" or proceed to object selection`,
    ],
    verify: [
      `Salesforce CRM connector is selected`,
      `Object selection screen appears`,
    ],
  });

  steps.push({
    id: "ds_select_object",
    name: `Select ${config.objectLabel} object and fields`,
    phase: "data_stream",
    type: "browser",
    actions: [
      `Search for "${config.objectApiName}" in the object list`,
      `Select/check "${config.objectApiName}"`,
      `Expand to see available fields`,
      ...(config.fields
        ? [`Select these specific fields: ${config.fields.join(", ")}`]
        : [`Select all available fields`]),
      `Click "Next" to proceed`,
    ],
    verify: [
      `${config.objectApiName} is checked/selected`,
      `Expected fields are selected`,
    ],
  });

  steps.push({
    id: "ds_deploy",
    name: "Deploy the data stream",
    phase: "data_stream",
    type: "browser",
    actions: [
      `Review the data stream configuration summary`,
      `Click "Deploy" or "Save" to activate the data stream`,
      `Wait for the deployment to complete`,
    ],
    verify: [
      `Data stream appears in the Data Streams list`,
      `Status shows "Active"`,
      `Last Run Status eventually shows "Success"`,
      `Total Records shows >= 1 (the test record)`,
    ],
  });

  // ── Phase 3: Create DMO & Map Fields ──

  steps.push({
    id: "dmo_navigate",
    name: "Navigate to Data Model",
    phase: "dmo_mapping",
    type: "browser",
    actions: [
      `Click "Data Model" in the Data Cloud nav bar`,
      `Click "New" button to create a new DMO`,
    ],
    verify: [
      `DMO creation form/wizard opens`,
    ],
  });

  steps.push({
    id: "dmo_create",
    name: `Create ${config.dmoName} DMO`,
    phase: "dmo_mapping",
    type: "browser",
    actions: [
      `Set Object Label to "${config.dmoName}"`,
      `Set Object API Name (auto-generated or manual)`,
      `Set Category to "${config.dmoCategory}"`,
      `Save the DMO`,
    ],
    verify: [
      `DMO "${config.dmoName}" is created`,
      `DMO appears in the Data Model list`,
    ],
  });

  steps.push({
    id: "dmo_map_fields",
    name: "Map fields from Data Lake Object to DMO",
    phase: "dmo_mapping",
    type: "browser",
    actions: [
      `Open the newly created DMO`,
      `Go to the field mapping section`,
      `Map the Data Lake Object (from the ${config.objectApiName} data stream) as the source`,
      `Map each source field to a DMO attribute:`,
      ...(config.fields || []).map(
        (f) => `  - Map "${f}" → DMO attribute "${f}"`
      ),
      `Set the primary key (typically "Id" or "School_Code__c")`,
      `Save the mapping`,
    ],
    verify: [
      `All fields are mapped`,
      `Primary key is set`,
      `DMO status shows "Ready" or "Mapped"`,
    ],
  });

  // ── Phase 4: Verify ──

  steps.push({
    id: "verify_data_stream",
    name: "Verify data stream status",
    phase: "verify",
    type: "browser",
    actions: [
      `Navigate to Data Streams`,
      `Find the ${config.objectApiName} data stream`,
      `Check its status`,
    ],
    verify: [
      `Data Stream Status: Active`,
      `Last Run Status: Success`,
      `Total Records >= 1`,
      `Last Refreshed: recent timestamp`,
    ],
  });

  steps.push({
    id: "verify_data_explorer",
    name: "Verify data in Data Explorer",
    phase: "verify",
    type: "browser",
    actions: [
      `Navigate to Data Explorer`,
      `Select the ${config.dmoName} DMO or Data Lake Object`,
      `Run a query or browse the data`,
    ],
    verify: [
      `Test record "DC Replication Test" appears in the data`,
      `Field values match the source record`,
    ],
  });

  steps.push({
    id: "verify_api_query",
    name: "Query Data Cloud via API",
    phase: "verify",
    type: "api",
    actions: [
      `Use the Data Cloud Query V2 API:`,
      `POST /services/data/v62.0/ssot/queryv2`,
      `Query: SELECT * FROM <DLO_or_DMO_name> LIMIT 10`,
      `Parse the results`,
    ],
    verify: [
      `Query returns records`,
      `Test record data matches source`,
      `Field types are correct`,
    ],
  });

  // ── Phase 5: Test ──

  steps.push({
    id: "test_create_record",
    name: "Create new record and verify replication",
    phase: "test",
    type: "hybrid",
    actions: [
      `Create a new record in ${config.objectApiName}: "DC Test Record 2"`,
      `Trigger data stream refresh (or wait for scheduled refresh)`,
      `Query Data Cloud to check if new record appears`,
    ],
    verify: [
      `New record appears in Data Cloud within expected timeframe`,
      `All field values match`,
    ],
  });

  steps.push({
    id: "test_cleanup",
    name: "Clean up test records",
    phase: "test",
    type: "api",
    actions: [
      `Delete "DC Replication Test" from ${config.objectApiName}`,
      `Delete "DC Test Record 2" from ${config.objectApiName}`,
      `Note: Data Cloud records may persist until next sync`,
    ],
    verify: [
      `Source records deleted`,
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

  if (!partial.objectApiName) {
    questions.push("What is the API name of the object to replicate? (e.g., School__c)");
  }
  if (!partial.objectLabel) {
    questions.push("What is the display label for this object?");
  }
  if (!partial.dmoName) {
    questions.push("What should the Data Model Object (DMO) be named?");
  }
  if (!partial.dmoCategory) {
    questions.push("What category for the DMO? (Profile, Engagement, or Other)");
  }
  if (!partial.fields) {
    questions.push(
      "Which fields should be replicated? (all custom fields, or a specific list)"
    );
  }
  if (!partial.refreshSchedule) {
    questions.push("How often should data refresh? (every 15 minutes, hourly, daily)");
  }

  return questions;
}

/**
 * Print the execution plan
 */
export function printReplicationPlan(config: DataCloudReplicationConfig): void {
  const steps = generateReplicationSteps(config);

  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log(`║  Data Cloud Replication Plan: ${config.objectLabel} (${config.objectApiName})`);
  console.log(`║  DMO: ${config.dmoName} | Category: ${config.dmoCategory}`);
  console.log(`║  Fields: ${config.fields?.length || "all"} | Refresh: ${config.refreshSchedule || "default"}`);
  console.log(`║  Steps: ${steps.length}`);
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const phases = ["preflight", "data_stream", "dmo_mapping", "verify", "test"];
  const phaseLabels: Record<string, string> = {
    preflight: "Phase 1: Pre-flight Checks",
    data_stream: "Phase 2: Create CRM Data Stream",
    dmo_mapping: "Phase 3: Create DMO & Map Fields",
    verify: "Phase 4: Verify Replication",
    test: "Phase 5: Test",
  };

  for (const phase of phases) {
    const phaseSteps = steps.filter((s) => s.phase === phase);
    if (phaseSteps.length === 0) continue;

    console.log(`── ${phaseLabels[phase]} ──\n`);

    for (const step of phaseSteps) {
      const typeIcon = step.type === "api" ? "🔧" : step.type === "browser" ? "🌐" : "🔄";
      console.log(`  ${typeIcon} ${step.name}`);
      console.log(`     Actions:`);
      for (const action of step.actions) {
        console.log(`       → ${action}`);
      }
      console.log(`     Verify:`);
      for (const check of step.verify) {
        console.log(`       ✓ ${check}`);
      }
      console.log("");
    }
  }
}
