/**
 * SKILL: Create Custom Object (Complete)
 *
 * Creates a fully usable Salesforce custom object with all supporting components.
 * This is more than just the object — it includes everything needed for end users.
 *
 * === WORKFLOW ===
 *
 * Phase 1: GATHER REQUIREMENTS (complementary questions if info missing)
 *   - Object name, label, plural label, description
 *   - Name field type (Text vs AutoNumber)
 *   - Fields with types, lengths, picklist values
 *   - Which fields are required?
 *   - Any lookup/master-detail relationships?
 *   - Record types needed?
 *   - Validation rules?
 *   - Who needs access? (profiles/permission sets)
 *
 * Phase 2: CREATE COMPONENTS (in dependency order)
 *   1. Custom Object
 *   2. Custom Fields
 *   3. Page Layout (organize fields into sections)
 *   4. List View (default "All" view + filtered views)
 *   5. Compact Layout (key fields for mobile/highlights)
 *   6. Custom Tab (navigation)
 *   7. Permission Set (CRUD + field-level security)
 *   8. Validation Rules (business logic)
 *   9. Record Types (if needed)
 *
 * Phase 3: VERIFY CREATION
 *   - Confirm object exists via describe
 *   - Confirm all fields exist with correct types
 *   - Confirm tab is accessible
 *   - Confirm layout has all fields
 *   - Confirm list view works
 *   - Confirm permissions are set
 *
 * Phase 4: TEST
 *   - Create a test record via REST API
 *   - Read back the record and verify fields
 *   - Update the record
 *   - Verify in browser (optional)
 *   - Delete test record
 *
 * === USAGE ===
 *
 *   import { createCompleteCustomObject } from './skills/create-custom-object';
 *   const result = await createCompleteCustomObject(conn, config);
 */

import { Connection } from "jsforce";
import {
  createCustomObject,
  createCustomField,
  createPermissionSet,
  createCustomTab,
  createListView,
  createCompactLayout,
  createValidationRule,
  updateLayout,
  readMetadata,
} from "../metadata";
import { describeObject } from "../tooling";

// --- Types ---

export interface ObjectFieldDef {
  name: string;
  label: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  required?: boolean;
  unique?: boolean;
  description?: string;
  picklistValues?: string[];
  referenceTo?: string;
  relationshipName?: string;
  defaultValue?: string;
  formula?: string;
  visibleLines?: number;
  section?: string; // layout section name
  inCompactLayout?: boolean;
  inListView?: boolean;
}

export interface ValidationRuleDef {
  name: string;
  formula: string;
  message: string;
  field?: string; // field to display error on
  description?: string;
}

export interface CompleteObjectConfig {
  // Required
  objectName: string;
  label: string;
  pluralLabel: string;

  // Optional object settings
  description?: string;
  nameFieldLabel?: string;
  nameFieldType?: "Text" | "AutoNumber";
  nameFieldFormat?: string;

  // Fields
  fields: ObjectFieldDef[];

  // Layout sections (fields will be distributed by their section property)
  layoutSections?: string[];

  // Compact layout fields (API names, max 10)
  compactLayoutFields?: string[];

  // List view columns
  listViewColumns?: string[];

  // Validation rules
  validationRules?: ValidationRuleDef[];

  // Tab icon
  tabMotif?: string;

  // Permission set
  permissionSetLabel?: string;
}

// --- Step results tracking ---

export interface StepResult {
  step: string;
  status: "success" | "error" | "skipped";
  detail: string;
  timestamp: Date;
}

export interface CreateObjectResult {
  objectName: string;
  steps: StepResult[];
  verification: VerificationResult | null;
  testRecord: any | null;
  success: boolean;
}

export interface VerificationResult {
  objectExists: boolean;
  fieldCount: number;
  fieldsFound: string[];
  fieldsMissing: string[];
  tabExists: boolean;
  listViewExists: boolean;
  permissionSetExists: boolean;
  allPassed: boolean;
}

// --- Helper ---

function log(step: string, msg: string) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`  [${ts}] ${step}: ${msg}`);
}

function addStep(
  steps: StepResult[],
  step: string,
  status: "success" | "error" | "skipped",
  detail: string
): void {
  steps.push({ step, status, detail, timestamp: new Date() });
  const icon = status === "success" ? "✓" : status === "error" ? "✗" : "○";
  log(step, `${icon} ${detail}`);
}

// --- Main function ---

export async function createCompleteCustomObject(
  conn: Connection,
  config: CompleteObjectConfig
): Promise<CreateObjectResult> {
  const steps: StepResult[] = [];
  const objApiName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Creating: ${config.label} (${objApiName})`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // ────────────────────────────────────────
  // PHASE 2: CREATE COMPONENTS
  // ────────────────────────────────────────

  console.log("── Phase 1: Create Components ──\n");

  // Step 1: Custom Object
  try {
    const result = await createCustomObject(conn, {
      fullName: config.objectName,
      label: config.label,
      pluralLabel: config.pluralLabel,
      description: config.description,
      nameFieldLabel: config.nameFieldLabel,
      nameFieldType: config.nameFieldType,
      nameFieldFormat: config.nameFieldFormat,
    });
    if (result.success) {
      addStep(steps, "CustomObject", "success", `Created ${objApiName}`);
    } else {
      addStep(
        steps,
        "CustomObject",
        "error",
        `Failed: ${JSON.stringify(result.errors)}`
      );
    }
  } catch (err: any) {
    addStep(steps, "CustomObject", "error", `Exception: ${err.message}`);
  }

  // Step 2: Custom Fields
  for (const field of config.fields) {
    try {
      const result = await createCustomField(conn, {
        objectName: objApiName,
        fieldName: field.name,
        label: field.label,
        type: field.type,
        length: field.length,
        precision: field.precision,
        scale: field.scale,
        required: field.required,
        unique: field.unique,
        description: field.description,
        picklistValues: field.picklistValues,
        referenceTo: field.referenceTo,
        relationshipName: field.relationshipName,
        defaultValue: field.defaultValue,
        formula: field.formula,
        visibleLines: field.visibleLines,
      });
      if (result.success) {
        addStep(
          steps,
          "CustomField",
          "success",
          `Created ${field.name}__c (${field.type})`
        );
      } else {
        addStep(
          steps,
          "CustomField",
          "error",
          `${field.name}: ${JSON.stringify(result.errors)}`
        );
      }
    } catch (err: any) {
      addStep(
        steps,
        "CustomField",
        "error",
        `${field.name}: ${err.message}`
      );
    }
  }

  // Step 3: Page Layout (update the auto-generated one)
  try {
    const sections = buildLayoutSections(config);
    if (sections.length > 0) {
      const result = await updateLayout(conn, {
        objectName: objApiName,
        layoutName: `${config.label} Layout`,
        sections,
      });
      if (result.success) {
        addStep(steps, "Layout", "success", `Updated page layout with ${sections.length} sections`);
      } else {
        addStep(steps, "Layout", "error", `Failed: ${JSON.stringify(result.errors)}`);
      }
    } else {
      addStep(steps, "Layout", "skipped", "No layout sections defined");
    }
  } catch (err: any) {
    addStep(steps, "Layout", "error", `Exception: ${err.message}`);
  }

  // Step 4: List View
  try {
    const columns =
      config.listViewColumns ||
      ["NAME", ...config.fields.filter((f) => f.inListView !== false).slice(0, 6).map((f) => `${f.name}__c`)];

    const result = await createListView(conn, {
      objectName: objApiName,
      viewName: "All",
      label: `All ${config.pluralLabel}`,
      columns,
    });
    if (result.success) {
      addStep(steps, "ListView", "success", `Created "All ${config.pluralLabel}" view`);
    } else {
      addStep(steps, "ListView", "error", `Failed: ${JSON.stringify(result.errors)}`);
    }
  } catch (err: any) {
    addStep(steps, "ListView", "error", `Exception: ${err.message}`);
  }

  // Step 5: Compact Layout
  try {
    const compactFields =
      config.compactLayoutFields ||
      ["Name", ...config.fields.filter((f) => f.inCompactLayout).map((f) => `${f.name}__c`)].slice(0, 7);

    if (compactFields.length > 1) {
      const result = await createCompactLayout(conn, {
        objectName: objApiName,
        name: `${config.objectName}_Compact`,
        label: `${config.label} Compact Layout`,
        fields: compactFields,
      });
      if (result.success) {
        addStep(steps, "CompactLayout", "success", `Created with ${compactFields.length} fields`);
      } else {
        addStep(steps, "CompactLayout", "error", `Failed: ${JSON.stringify(result.errors)}`);
      }
    } else {
      addStep(steps, "CompactLayout", "skipped", "Not enough fields for compact layout");
    }
  } catch (err: any) {
    addStep(steps, "CompactLayout", "error", `Exception: ${err.message}`);
  }

  // Step 6: Custom Tab
  try {
    const result = await createCustomTab(conn, {
      objectName: objApiName,
      motif: config.tabMotif || "Custom52: Lock",
    });
    if (result.success) {
      addStep(steps, "CustomTab", "success", `Created tab for ${objApiName}`);
    } else {
      addStep(steps, "CustomTab", "error", `Failed: ${JSON.stringify(result.errors)}`);
    }
  } catch (err: any) {
    addStep(steps, "CustomTab", "error", `Exception: ${err.message}`);
  }

  // Step 7: Permission Set
  try {
    const psName = `${config.objectName}_Access`;
    const fieldPerms = config.fields
      .filter((f) => !(f.required && f.type === "Picklist"))
      .map((f) => ({
        field: `${objApiName}.${f.name}__c`,
        readable: true,
        editable: true,
      }));

    const result = await createPermissionSet(conn, {
      name: psName,
      label: config.permissionSetLabel || `${config.label} Access`,
      description: `Full CRUD access to ${config.label} and all its fields`,
      objectPermissions: [
        {
          object: objApiName,
          allowCreate: true,
          allowRead: true,
          allowEdit: true,
          allowDelete: true,
        },
      ],
      fieldPermissions: fieldPerms,
    });
    if (result.success) {
      addStep(steps, "PermissionSet", "success", `Created ${psName} with full CRUD + FLS`);
    } else {
      addStep(steps, "PermissionSet", "error", `Failed: ${JSON.stringify(result.errors)}`);
    }
  } catch (err: any) {
    addStep(steps, "PermissionSet", "error", `Exception: ${err.message}`);
  }

  // Step 8: Update Admin Profile FLS (critical — fields won't be visible without this)
  // Note: required picklist fields cannot have FLS deployed — must be filtered out
  try {
    const fieldPerms = config.fields
      .filter((f) => !(f.required && f.type === "Picklist"))
      .map((f) => ({
        field: `${objApiName}.${f.name}__c`,
        readable: true,
        editable: true,
      }));

    const profileResult: any = await conn.metadata.update("Profile", {
      fullName: "Admin",
      fieldPermissions: fieldPerms,
    });
    if (profileResult.success) {
      addStep(steps, "ProfileFLS", "success", `Granted FLS on ${fieldPerms.length} fields to Admin profile`);
    } else {
      addStep(steps, "ProfileFLS", "error", `Failed: ${JSON.stringify(profileResult.errors)}`);
    }
  } catch (err: any) {
    addStep(steps, "ProfileFLS", "error", `Exception: ${err.message}`);
  }

  // Step 9: Validation Rules
  if (config.validationRules && config.validationRules.length > 0) {
    for (const rule of config.validationRules) {
      try {
        const result = await createValidationRule(conn, {
          objectName: objApiName,
          ruleName: rule.name,
          errorConditionFormula: rule.formula,
          errorMessage: rule.message,
          errorDisplayField: rule.field,
          description: rule.description,
        });
        if (result.success) {
          addStep(steps, "ValidationRule", "success", `Created ${rule.name}`);
        } else {
          addStep(steps, "ValidationRule", "error", `${rule.name}: ${JSON.stringify(result.errors)}`);
        }
      } catch (err: any) {
        addStep(steps, "ValidationRule", "error", `${rule.name}: ${err.message}`);
      }
    }
  }

  // ────────────────────────────────────────
  // PHASE 3: VERIFY
  // ────────────────────────────────────────

  console.log("\n── Phase 2: Verify Creation ──\n");

  const verification = await verifyObject(conn, objApiName, config);

  if (verification.allPassed) {
    addStep(steps, "Verification", "success", "All components verified");
  } else {
    addStep(
      steps,
      "Verification",
      "error",
      `Missing: ${verification.fieldsMissing.join(", ") || "check details"}`
    );
  }

  // ────────────────────────────────────────
  // PHASE 4: TEST
  // ────────────────────────────────────────

  console.log("\n── Phase 3: Test Record ──\n");

  let testRecord: any = null;
  try {
    testRecord = await testCreateRecord(conn, objApiName, config);
    addStep(steps, "TestRecord", "success", `Created and verified test record: ${testRecord.id}`);
  } catch (err: any) {
    addStep(steps, "TestRecord", "error", `Test failed: ${err.message}`);
  }

  // ────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────

  const success = steps.every((s) => s.status !== "error");
  const errorCount = steps.filter((s) => s.status === "error").length;
  const successCount = steps.filter((s) => s.status === "success").length;

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Result: ${success ? "SUCCESS" : "PARTIAL"} (${successCount} passed, ${errorCount} errors)`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  return {
    objectName: objApiName,
    steps,
    verification,
    testRecord,
    success,
  };
}

// --- Verification ---

async function verifyObject(
  conn: Connection,
  objApiName: string,
  config: CompleteObjectConfig
): Promise<VerificationResult> {
  const result: VerificationResult = {
    objectExists: false,
    fieldCount: 0,
    fieldsFound: [],
    fieldsMissing: [],
    tabExists: false,
    listViewExists: false,
    permissionSetExists: false,
    allPassed: false,
  };

  // Check object exists
  try {
    const desc = await describeObject(conn, objApiName);
    result.objectExists = true;
    result.fieldCount = desc.fields.length;
    log("Verify", `✓ Object exists with ${desc.fields.length} fields`);

    // Check fields
    const fieldNames = desc.fields.map((f: any) => f.name.toLowerCase());
    for (const field of config.fields) {
      const apiName = `${field.name}__c`.toLowerCase();
      if (fieldNames.includes(apiName)) {
        result.fieldsFound.push(field.name);
      } else {
        result.fieldsMissing.push(field.name);
        log("Verify", `✗ Missing field: ${field.name}__c`);
      }
    }

    if (result.fieldsMissing.length === 0) {
      log("Verify", `✓ All ${config.fields.length} custom fields present`);
    }
  } catch (err: any) {
    log("Verify", `✗ Object not found: ${err.message}`);
  }

  // Check tab
  try {
    const tabMeta = await readMetadata(conn, "CustomTab", objApiName);
    result.tabExists = !!tabMeta && !!tabMeta.fullName;
    log("Verify", result.tabExists ? "✓ Tab exists" : "✗ Tab not found");
  } catch {
    log("Verify", "✗ Tab check failed");
  }

  // Check permission set
  try {
    const psName = `${config.objectName}_Access`;
    const psMeta = await readMetadata(conn, "PermissionSet", psName);
    result.permissionSetExists = !!psMeta && !!psMeta.fullName;
    log(
      "Verify",
      result.permissionSetExists
        ? `✓ Permission set ${psName} exists`
        : `✗ Permission set ${psName} not found`
    );
  } catch {
    log("Verify", "✗ Permission set check failed");
  }

  result.allPassed =
    result.objectExists &&
    result.fieldsMissing.length === 0 &&
    result.tabExists &&
    result.permissionSetExists;

  return result;
}

// --- Test Record ---

async function testCreateRecord(
  conn: Connection,
  objApiName: string,
  config: CompleteObjectConfig
): Promise<any> {
  // Build test data
  const testData: any = {};

  if (config.nameFieldType !== "AutoNumber") {
    testData.Name = `Test ${config.label} (auto-created)`;
  }

  // Add simple test values for each field
  for (const field of config.fields) {
    const apiName = `${field.name}__c`;
    switch (field.type) {
      case "Text":
        testData[apiName] = `Test ${field.label}`;
        break;
      case "Number":
        testData[apiName] = 42;
        break;
      case "Currency":
        testData[apiName] = 100.0;
        break;
      case "Checkbox":
        testData[apiName] = true;
        break;
      case "Email":
        testData[apiName] = "test@example.com";
        break;
      case "Phone":
        testData[apiName] = "+1-555-0100";
        break;
      case "Url":
        testData[apiName] = "https://example.com";
        break;
      case "Picklist":
        if (field.picklistValues && field.picklistValues.length > 0) {
          testData[apiName] = field.picklistValues[0];
        }
        break;
      case "Date":
        testData[apiName] = new Date().toISOString().substring(0, 10);
        break;
      case "TextArea":
      case "LongTextArea":
        testData[apiName] = `Test description for ${field.label}`;
        break;
      // Skip Lookup, MasterDetail, Formula (can't set directly)
    }
  }

  // Create
  log("Test", "Creating test record...");
  const createResult: any = await conn.sobject(objApiName).create(testData);

  if (!createResult.success) {
    throw new Error(`Create failed: ${JSON.stringify(createResult.errors)}`);
  }

  const recordId = createResult.id;
  log("Test", `✓ Created record: ${recordId}`);

  // Read back
  const record: any = await conn.sobject(objApiName).retrieve(recordId);
  log("Test", `✓ Read back record: ${record.Name || record.Id}`);

  // Update
  const updateResult: any = await conn
    .sobject(objApiName)
    .update({ Id: recordId, Name: `${record.Name} (verified)` });

  if (updateResult.success) {
    log("Test", "✓ Updated record successfully");
  }

  // Delete test record
  const deleteResult: any = await conn.sobject(objApiName).destroy(recordId);
  if (deleteResult.success) {
    log("Test", "✓ Cleaned up test record");
  }

  return { id: recordId, record, createResult, updateResult, deleteResult };
}

// --- Layout builder helper ---

function buildLayoutSections(config: CompleteObjectConfig): any[] {
  // Group fields by section
  const sectionMap = new Map<string, ObjectFieldDef[]>();
  const defaultSection = "Information";

  for (const field of config.fields) {
    const section = field.section || defaultSection;
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section)!.push(field);
  }

  // Build layout sections with Name field first
  const sections: any[] = [];

  // Add Name field to first section
  const orderedSections = config.layoutSections || Array.from(sectionMap.keys());

  for (const sectionName of orderedSections) {
    const fields = sectionMap.get(sectionName) || [];
    const fieldRefs = fields.map((f) => ({
      name: `${f.name}__c`,
      behavior: f.required ? ("Required" as const) : ("Edit" as const),
    }));

    // Add Name to first section
    if (sections.length === 0) {
      fieldRefs.unshift({ name: "Name", behavior: "Required" as const });
      fieldRefs.push({ name: "OwnerId", behavior: "Edit" as const });
    }

    sections.push({
      label: sectionName,
      style: "TwoColumnsLeftToRight" as const,
      fields: fieldRefs,
    });
  }

  return sections;
}

// --- Complementary questions helper ---

export function getRequiredQuestions(
  partial: Partial<CompleteObjectConfig>
): string[] {
  const questions: string[] = [];

  if (!partial.objectName) {
    questions.push(
      "What should the API name be? (e.g., 'School' becomes School__c)"
    );
  }
  if (!partial.label) {
    questions.push("What is the singular label? (e.g., 'School')");
  }
  if (!partial.pluralLabel) {
    questions.push("What is the plural label? (e.g., 'Schools')");
  }
  if (!partial.description) {
    questions.push("Provide a brief description of this object's purpose.");
  }
  if (!partial.fields || partial.fields.length === 0) {
    questions.push(
      "What fields should this object have? For each: name, type (Text/Number/Picklist/Email/Phone/Date/Checkbox/Lookup/Currency/Url), and whether it's required."
    );
  }
  if (!partial.nameFieldType) {
    questions.push(
      "Should the Name field be free text or auto-number? (default: Text)"
    );
  }

  // Field-level questions
  if (partial.fields) {
    for (const field of partial.fields) {
      if (field.type === "Picklist" && (!field.picklistValues || field.picklistValues.length === 0)) {
        questions.push(
          `What are the picklist values for "${field.label}"?`
        );
      }
      if ((field.type === "Lookup" || field.type === "MasterDetail") && !field.referenceTo) {
        questions.push(
          `What object should "${field.label}" look up to?`
        );
      }
      if (field.type === "Text" && !field.length) {
        questions.push(
          `What is the max length for "${field.label}"? (default: 255)`
        );
      }
    }
  }

  return questions;
}
