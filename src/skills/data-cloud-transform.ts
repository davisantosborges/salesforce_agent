/**
 * SKILL: Data Cloud Transform
 *
 * Creates Data Cloud data transformations programmatically:
 * 1. Creates a target DLO (MktDataTranObject) with output field schema
 * 2. Attempts to create a batch/streaming transform via /ssot/ API
 * 3. Falls back to browser-based transform creation if API isn't available
 * 4. Verifies the transform output
 *
 * === WORKFLOW ===
 *
 * Phase 1: DEFINE
 *   - Source DLO/DMO name and fields
 *   - SQL transformation query
 *   - Target DLO name and output field schema
 *
 * Phase 2: CREATE TARGET DLO
 *   - Create MktDataTranObject via Metadata API
 *   - Define output fields with correct data types
 *
 * Phase 3: CREATE TRANSFORM
 *   - Try /ssot/data-transforms API first
 *   - If not available, provide browser steps for UI-based creation
 *
 * Phase 4: VERIFY
 *   - Read back MktDataTranObject and confirm fields
 *   - Query Data Cloud to check output data
 *
 * === COMPLEMENTARY QUESTIONS ===
 *
 * If info is missing, ask:
 * - What is the source DLO/DMO? (e.g., School_c_Home__dll)
 * - What SQL transformation? (e.g., GROUP BY city, COUNT schools)
 * - What output fields? (name, type, label for each)
 * - What should the target DLO be named?
 * - Batch or streaming?
 */

import { Connection } from "jsforce";
import {
  createDataLakeObject,
  readDataLakeObject,
  createDataTransform,
  listDataTransforms,
  queryDataCloud,
  deleteDataLakeObject,
  type DloConfig,
  type DloFieldConfig,
  type DataTransformConfig,
  type DloFieldDatatype,
} from "../data-cloud";

// ── Types ──

export interface TransformFieldDef {
  name: string;
  label: string;
  type: DloFieldDatatype;
  isPrimaryKey?: boolean;
  description?: string;
}

export interface TransformConfig {
  /** Name for the target DLO (e.g., "School_City_Summary") */
  targetName: string;
  /** Display label for the target */
  targetLabel: string;
  /** Source DLO/DMO names */
  sourceObjects: string[];
  /** SQL query (ANSI SQL against Data Cloud data lake) */
  sql: string;
  /** Output field definitions */
  outputFields: TransformFieldDef[];
  /** Object category */
  objectCategory?: string;
  /** Transform type */
  transformType?: "Batch" | "Streaming";
}

export interface TransformStepResult {
  step: string;
  status: "success" | "error" | "skipped";
  detail: string;
}

export interface TransformResult {
  targetName: string;
  steps: TransformStepResult[];
  success: boolean;
  apiTransformCreated: boolean;
  browserStepsNeeded: boolean;
}

// ── Main Function ──

export async function createDataCloudTransform(
  conn: Connection,
  config: TransformConfig
): Promise<TransformResult> {
  const steps: TransformStepResult[] = [];
  let apiTransformCreated = false;
  let browserStepsNeeded = false;

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Data Cloud Transform: ${config.targetLabel}`);
  console.log(`║  Source: ${config.sourceObjects.join(", ")}`);
  console.log(`║  Target: ${config.targetName}`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // ── Step 1: Create Target DLO ──
  console.log("── Step 1: Create Target DLO ──\n");

  try {
    const dloFields: DloFieldConfig[] = config.outputFields.map((f) => ({
      name: f.name,
      label: f.label,
      datatype: f.type,
      isPrimaryKey: f.isPrimaryKey,
    }));

    const dloConfig: DloConfig = {
      fullName: config.targetName,
      label: config.targetLabel,
      creationType: "Custom",
      objectCategory: config.objectCategory || "Salesforce_SFDCReferenceModel_0_93.Related",
      fields: dloFields,
    };

    const result = await createDataLakeObject(conn, dloConfig);
    if (result.success) {
      steps.push({
        step: "CreateTargetDLO",
        status: "success",
        detail: `Created ${config.targetName} with ${dloFields.length} fields`,
      });
      console.log(`  ✓ Created DLO: ${config.targetName} (${dloFields.length} fields)`);
    } else {
      steps.push({
        step: "CreateTargetDLO",
        status: "error",
        detail: JSON.stringify(result.errors),
      });
      console.log(`  ✗ Failed: ${JSON.stringify(result.errors)}`);
    }
  } catch (err: any) {
    steps.push({ step: "CreateTargetDLO", status: "error", detail: err.message });
    console.log(`  ✗ Exception: ${err.message}`);
  }

  // ── Step 2: Create Transform via API ──
  console.log("\n── Step 2: Create Transform ──\n");

  try {
    const transformConfig: DataTransformConfig = {
      name: `${config.targetName}_Transform`,
      sql: config.sql,
      sourceObjects: config.sourceObjects,
      targetObject: config.targetName,
      type: config.transformType || "Batch",
    };

    const result = await createDataTransform(conn, transformConfig);
    apiTransformCreated = true;
    steps.push({
      step: "CreateTransform",
      status: "success",
      detail: `Created transform via /ssot/ API: ${transformConfig.name}`,
    });
    console.log(`  ✓ Created transform: ${transformConfig.name}`);
    console.log(`  Result: ${JSON.stringify(result)}`);
  } catch (err: any) {
    // /ssot/ API may not be available with CRM tokens
    browserStepsNeeded = true;
    steps.push({
      step: "CreateTransform",
      status: "skipped",
      detail: `API not available (${err.message?.substring(0, 100)}). Use browser to create transform.`,
    });
    console.log(`  ○ /ssot/ transform API not available — browser creation needed`);
    console.log(`  ℹ SQL for manual creation:\n`);
    console.log(`    ${config.sql}\n`);
  }

  // ── Step 3: Verify Target DLO ──
  console.log("── Step 3: Verify Target DLO ──\n");

  try {
    const dlo = await readDataLakeObject(conn, config.targetName);
    if (dlo && dlo.fullName) {
      const fields = Array.isArray(dlo.mktDataTranFields)
        ? dlo.mktDataTranFields
        : dlo.mktDataTranFields ? [dlo.mktDataTranFields] : [];

      steps.push({
        step: "VerifyDLO",
        status: "success",
        detail: `${config.targetName} exists with ${fields.length} fields`,
      });
      console.log(`  ✓ DLO exists: ${dlo.masterLabel} (${fields.length} fields)`);

      for (const f of fields) {
        console.log(`    - ${f.fullName}: ${f.datatype} (${f.masterLabel})`);
      }
    } else {
      steps.push({ step: "VerifyDLO", status: "error", detail: "DLO not found" });
      console.log(`  ✗ DLO not found`);
    }
  } catch (err: any) {
    steps.push({ step: "VerifyDLO", status: "error", detail: err.message });
    console.log(`  ✗ Verify error: ${err.message}`);
  }

  // ── Step 4: Query Data (if transform was created via API) ──
  if (apiTransformCreated) {
    console.log("\n── Step 4: Query Transform Output ──\n");
    try {
      const queryResult = await queryDataCloud(
        conn,
        `SELECT * FROM ${config.targetName}__dll LIMIT 5`
      );
      steps.push({
        step: "QueryOutput",
        status: "success",
        detail: `Query returned data`,
      });
      console.log(`  ✓ Query result: ${JSON.stringify(queryResult).substring(0, 200)}`);
    } catch (err: any) {
      steps.push({
        step: "QueryOutput",
        status: "skipped",
        detail: `Query not yet available: ${err.message?.substring(0, 100)}`,
      });
      console.log(`  ○ Data not yet available (transform may still be processing)`);
    }
  }

  // ── Browser steps if needed ──
  if (browserStepsNeeded) {
    console.log("\n── Browser Steps Required ──\n");
    console.log("  The /ssot/ data-transforms API is not accessible with the current token.");
    console.log("  To create the transform via UI:\n");
    console.log("  1. Open Data Cloud > Data Transforms");
    console.log("  2. Click 'New' > 'Batch Transform'");
    console.log(`  3. Name: ${config.targetName}_Transform`);
    console.log(`  4. Add source: ${config.sourceObjects.join(", ")}`);
    console.log(`  5. Paste SQL:\n`);
    console.log(`     ${config.sql}\n`);
    console.log(`  6. Map output to target DLO: ${config.targetName}`);
    console.log("  7. Save and Run\n");
  }

  // ── Summary ──
  const success = steps.every((s) => s.status !== "error");
  const errorCount = steps.filter((s) => s.status === "error").length;
  const successCount = steps.filter((s) => s.status === "success").length;

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║  Result: ${success ? "SUCCESS" : "PARTIAL"} (${successCount} passed, ${errorCount} errors)`);
  if (browserStepsNeeded) {
    console.log(`║  Note: Browser steps needed for transform creation`);
  }
  console.log(`╚══════════════════════════════════════════════╝\n`);

  return {
    targetName: config.targetName,
    steps,
    success,
    apiTransformCreated,
    browserStepsNeeded,
  };
}

// ── Complementary Questions ──

export function getTransformQuestions(
  partial: Partial<TransformConfig>
): string[] {
  const questions: string[] = [];

  if (!partial.sourceObjects || partial.sourceObjects.length === 0) {
    questions.push("What source DLO/DMO should the transform read from? (e.g., School_c_Home__dll)");
  }
  if (!partial.sql) {
    questions.push("What SQL transformation should be applied? (ANSI SQL — SELECT, GROUP BY, JOIN, etc.)");
  }
  if (!partial.targetName) {
    questions.push("What should the target DLO be named? (e.g., School_City_Summary)");
  }
  if (!partial.outputFields || partial.outputFields.length === 0) {
    questions.push("What fields should the output have? (name, type, label for each)");
  }
  if (!partial.transformType) {
    questions.push("Should this be a Batch or Streaming transform?");
  }

  return questions;
}

// ── Cleanup ──

export async function deleteTransform(
  conn: Connection,
  targetName: string
): Promise<void> {
  try {
    await deleteDataLakeObject(conn, targetName);
    console.log(`  ✓ Deleted DLO: ${targetName}`);
  } catch {
    console.log(`  ○ DLO ${targetName} not found or already deleted`);
  }
}
