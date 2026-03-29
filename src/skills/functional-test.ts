/**
 * SKILL: Functional Test — Browser-Based UI Verification
 *
 * Verifies Salesforce custom object usability through the Lightning UI
 * using Claude's chrome browser automation tools.
 *
 * === WHAT IT TESTS ===
 *
 * 1. TAB NAVIGATION
 *    - Object tab appears in the App Launcher
 *    - Clicking tab opens the list view
 *
 * 2. LIST VIEW
 *    - Default list view loads
 *    - Expected columns are visible
 *    - "New" button is present
 *
 * 3. RECORD CREATION (UI)
 *    - Click "New" opens the record creation form
 *    - All expected sections are visible
 *    - Required fields are marked as required
 *    - Filling and saving creates a record successfully
 *
 * 4. VALIDATION RULES (UI)
 *    - Submitting invalid data shows the correct error message
 *    - Fixing the data allows save
 *
 * 5. RECORD DETAIL VIEW
 *    - All fields display with correct values
 *    - Compact layout shows key fields in highlights
 *    - Edit and Delete buttons are present
 *
 * 6. RECORD EDIT
 *    - Edit button opens edit form
 *    - Changes can be saved
 *
 * 7. RECORD DELETE
 *    - Delete removes the record
 *    - List view no longer shows it
 *
 * === USAGE ===
 *
 * This is a SPECIFICATION, not executable code.
 * It is run by Claude Code using the chrome browser tools interactively.
 *
 * To run: Ask Claude Code to "run functional tests for School__c"
 * or "run functional tests for <ObjectName>__c"
 *
 * Claude will:
 *   1. Read this spec
 *   2. Navigate to the Salesforce org in Chrome
 *   3. Execute each test step
 *   4. Report results
 *
 * === CONFIGURATION ===
 */

export interface FunctionalTestConfig {
  // Salesforce instance
  instanceUrl: string; // e.g. "https://orgfarm-xxx.develop.lightning.force.com"

  // Object under test
  objectApiName: string; // e.g. "School__c"
  objectLabel: string; // e.g. "School"
  objectPluralLabel: string; // e.g. "Schools"

  // Expected page layout sections
  expectedSections: string[];

  // Required fields (label as shown in UI)
  requiredFields: string[];

  // Test record data (label → value)
  testRecordData: Record<string, string>;

  // Validation rule tests
  validationTests?: Array<{
    description: string;
    // Fields to fill (label → value). Missing required fields or invalid values trigger rules.
    formData: Record<string, string>;
    expectedError: string;
  }>;

  // Expected list view columns (labels)
  expectedListViewColumns?: string[];

  // Expected compact layout fields (labels)
  expectedCompactFields?: string[];
}

/**
 * Pre-built config for School__c functional tests
 */
export const schoolFunctionalConfig: FunctionalTestConfig = {
  instanceUrl:
    "https://orgfarm-7b5728161f-dev-ed.develop.lightning.force.com",

  objectApiName: "School__c",
  objectLabel: "School",
  objectPluralLabel: "Schools",

  expectedSections: [
    "School Information",
    "Description",
    "Enrollment",
    "Contact Information",
    "Address",
  ],

  requiredFields: ["School Name", "School Type", "Status"],

  testRecordData: {
    "School Name": "Functional Test School",
    "School Type": "High School",
    Status: "Active",
    "School Code": "FUNC-001",
    Phone: "+1-555-0199",
    Email: "functional@test.edu",
    "Principal / Head of School": "Test Principal",
    City: "Test City",
    "State / Province": "CA",
    Country: "USA",
    "Number of Students": "500",
    "Number of Teachers": "30",
    "Max Capacity": "600",
  },

  validationTests: [
    {
      description: "School Code required when Active",
      formData: {
        "School Name": "Validation Test School",
        "School Type": "Elementary",
        Status: "Active",
        // School Code intentionally omitted
      },
      expectedError: "School Code is required when the school status is Active",
    },
    {
      description: "Students cannot exceed Max Capacity",
      formData: {
        "School Name": "Capacity Test School",
        "School Type": "Elementary",
        Status: "Active",
        "School Code": "CAP-001",
        "Number of Students": "700",
        "Max Capacity": "500",
      },
      expectedError: "Number of Students cannot exceed Max Capacity",
    },
  ],

  expectedListViewColumns: [
    "School Name",
    "School Type",
    "Status",
    "School Code",
    "Number of Students",
    "City",
    "Principal / Head of School",
  ],

  expectedCompactFields: [
    "School Name",
    "School Type",
    "Status",
    "Number of Students",
    "Phone",
  ],
};

// === TEST STEP DEFINITIONS ===
// These are executed by Claude Code using chrome browser tools

export interface FunctionalTestStep {
  id: string;
  name: string;
  description: string;
  actions: string[]; // Human-readable steps for Claude to execute
  verify: string[]; // What to check after actions
}

export function generateTestSteps(
  config: FunctionalTestConfig
): FunctionalTestStep[] {
  const steps: FunctionalTestStep[] = [];

  // Test 1: Tab Navigation
  steps.push({
    id: "tab_navigation",
    name: "Tab Navigation",
    description: `Verify ${config.objectLabel} tab is accessible`,
    actions: [
      `Navigate to ${config.instanceUrl}`,
      `Click the App Launcher (waffle icon)`,
      `Search for "${config.objectPluralLabel}"`,
      `Click on "${config.objectPluralLabel}" in results`,
    ],
    verify: [
      `Page title or header contains "${config.objectPluralLabel}"`,
      `List view is displayed`,
      `"New" button is visible`,
    ],
  });

  // Test 2: List View
  if (config.expectedListViewColumns) {
    steps.push({
      id: "list_view",
      name: "List View Columns",
      description: "Verify list view displays expected columns",
      actions: [
        `On the ${config.objectPluralLabel} list view page`,
        `Read the column headers`,
      ],
      verify: config.expectedListViewColumns.map(
        (col) => `Column "${col}" is visible`
      ),
    });
  }

  // Test 3: Record Creation Form
  steps.push({
    id: "record_create_form",
    name: "Record Creation Form",
    description: "Verify the new record form has all expected sections and fields",
    actions: [
      `Click the "New" button`,
      `Wait for the record creation modal/page to load`,
    ],
    verify: [
      ...config.expectedSections.map((s) => `Section "${s}" is visible`),
      ...config.requiredFields.map((f) => `Field "${f}" is marked as required`),
    ],
  });

  // Test 4: Save Valid Record
  steps.push({
    id: "record_create_save",
    name: "Create Record",
    description: "Fill in the form and save a valid record",
    actions: [
      ...Object.entries(config.testRecordData).map(
        ([label, value]) => `Fill "${label}" with "${value}"`
      ),
      `Click "Save"`,
    ],
    verify: [
      `Record detail page opens`,
      `Toast message confirms creation (e.g. "was created")`,
      ...Object.entries(config.testRecordData)
        .slice(0, 5)
        .map(([label, value]) => `Field "${label}" shows "${value}"`),
    ],
  });

  // Test 5: Validation Rules
  if (config.validationTests) {
    for (const vt of config.validationTests) {
      steps.push({
        id: `validation_${vt.description.replace(/\s+/g, "_").toLowerCase()}`,
        name: `Validation: ${vt.description}`,
        description: `Verify validation rule: ${vt.description}`,
        actions: [
          `Navigate to ${config.instanceUrl}/lightning/o/${config.objectApiName}/new`,
          `Wait for form to load`,
          ...Object.entries(vt.formData).map(
            ([label, value]) => `Fill "${label}" with "${value}"`
          ),
          `Click "Save"`,
        ],
        verify: [
          `Error message appears: "${vt.expectedError}"`,
          `Record is NOT saved (still on form)`,
        ],
      });
    }
  }

  // Test 6: Record Edit
  steps.push({
    id: "record_edit",
    name: "Record Edit",
    description: "Verify record can be edited",
    actions: [
      `Navigate back to the record created in test "record_create_save"`,
      `Click "Edit" or the pencil icon`,
      `Change one field value (e.g. Phone to "+1-555-0200")`,
      `Click "Save"`,
    ],
    verify: [
      `Record saves successfully`,
      `Updated value is displayed`,
    ],
  });

  // Test 7: Record Delete
  steps.push({
    id: "record_delete",
    name: "Record Delete",
    description: "Verify record can be deleted",
    actions: [
      `On the record detail page`,
      `Click the dropdown menu (▼) next to Edit`,
      `Click "Delete"`,
      `Confirm deletion in the dialog`,
    ],
    verify: [
      `Record is deleted`,
      `Redirected to list view`,
      `Deleted record no longer appears in list`,
    ],
  });

  return steps;
}

// === RESULTS ===

export interface FunctionalTestResult {
  stepId: string;
  name: string;
  status: "pass" | "fail" | "skip";
  detail: string;
  screenshotId?: string;
  timestamp: Date;
}

export function formatResults(results: FunctionalTestResult[]): string {
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  let output = "\n══════════════════════════════════════════\n";
  output += `  Functional Test Results: ${passed}/${results.length} passed\n`;
  output += "══════════════════════════════════════════\n\n";

  for (const r of results) {
    const icon = r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : "⏭️";
    output += `${icon} ${r.name}: ${r.detail}\n`;
  }

  output += `\n  Summary: ${passed} passed, ${failed} failed, ${skipped} skipped\n`;
  return output;
}
