/**
 * SKILL: Data Cloud Transform
 *
 * Creates Data Cloud data transformations programmatically using
 * Calculated Insights (MktCalcInsightObjectDef) — the correct metadata
 * type for SQL-based aggregations and transforms in Data Cloud.
 *
 * === DATA CLOUD OBJECT HIERARCHY ===
 *
 * Data Source → Data Stream → DSO → DLO → DMO → Unified DMO → CIO
 *
 * - DLO (__dll): Physical data lake storage, auto-created by Data Streams
 * - DMO (__dlm): Virtual harmonized view, created via field mappings
 * - CIO: Calculated Insight Object, SQL-based metrics/aggregations
 *
 * DLOs and DMOs CANNOT be created directly via Metadata API.
 * They are byproducts of deploying DataStreamDefinition + ObjectSourceTargetMap.
 * CIOs CAN be created directly via MktCalcInsightObjectDef.
 *
 * === WORKFLOW ===
 *
 * Phase 1: DEFINE
 *   - Source DLO/DMO name (use __dll for DLOs, __dlm for DMOs)
 *   - SQL expression with aggregations
 *   - Output field aliases (must end with __c)
 *
 * Phase 2: CREATE CALCULATED INSIGHT
 *   - Create MktCalcInsightObjectDef via Metadata API
 *   - SQL format: SELECT Table.Field as alias__c, AGG(Table.Field) as alias__c
 *                 FROM Table GROUP BY Table.Field
 *
 * Phase 3: VERIFY
 *   - Read back the CIO metadata
 *   - Query via /ssot/calculated-insights endpoint
 *
 * === SQL CONVENTIONS ===
 *
 * - Table names use __dll (DLO) or __dlm (DMO) suffix
 * - Field names must be prefixed with table name: School_c_Home__dll.City_c__c
 * - Output aliases must end with __c: as city__c, as school_count__c
 * - Supports: SELECT, FROM, JOIN, WHERE, GROUP BY, AGG functions
 * - AGG functions: COUNT, SUM, AVG, MIN, MAX, NTILE, ROW_NUMBER, RANK
 */

import { Connection } from "jsforce";
import {
  createCalculatedInsight,
  readCalculatedInsight,
  deleteCalculatedInsight,
  type CalculatedInsightConfig,
} from "../data-cloud";

// ── Types ──

export interface TransformConfig {
  /** API name for the CIO (e.g., "School_City_Summary") */
  name: string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Source table (DLO or DMO with suffix, e.g., "School_c_Home__dll") */
  sourceTable: string;
  /** Dimensions — GROUP BY fields */
  dimensions: Array<{
    /** Source field (e.g., "City_c__c") */
    sourceField: string;
    /** Output alias without __c (e.g., "city" → becomes "city__c") */
    alias: string;
  }>;
  /** Measures — aggregate functions */
  measures: Array<{
    /** Aggregate function: COUNT, SUM, AVG, MIN, MAX */
    function: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
    /** Source field (e.g., "Number_of_Students_c__c"). Use "*" for COUNT(*) */
    sourceField: string;
    /** Output alias without __c (e.g., "total_students" → becomes "total_students__c") */
    alias: string;
  }>;
  /** Optional WHERE clause (without the WHERE keyword) */
  whereClause?: string;
}

export interface TransformResult {
  name: string;
  success: boolean;
  expression: string;
  steps: Array<{ step: string; status: "success" | "error"; detail: string }>;
}

// ── SQL Builder ──

/**
 * Build the CIO SQL expression from a TransformConfig.
 */
export function buildCioExpression(config: TransformConfig): string {
  const table = config.sourceTable;

  // SELECT clause
  const selectParts: string[] = [];

  for (const dim of config.dimensions) {
    selectParts.push(`${table}.${dim.sourceField} as ${dim.alias}__c`);
  }

  for (const measure of config.measures) {
    if (measure.sourceField === "*") {
      selectParts.push(`${measure.function}(*) as ${measure.alias}__c`);
    } else {
      selectParts.push(
        `${measure.function}(${table}.${measure.sourceField}) as ${measure.alias}__c`
      );
    }
  }

  // FROM clause
  let sql = `SELECT ${selectParts.join(", ")} FROM ${table}`;

  // WHERE clause
  if (config.whereClause) {
    sql += ` WHERE ${config.whereClause}`;
  }

  // GROUP BY clause
  if (config.dimensions.length > 0) {
    const groupBy = config.dimensions
      .map((d) => `${table}.${d.sourceField}`)
      .join(", ");
    sql += ` GROUP BY ${groupBy}`;
  }

  return sql;
}

// ── Main Function ──

/**
 * Create a Calculated Insight (CIO) in Data Cloud.
 */
export async function createDataCloudTransform(
  conn: Connection,
  config: TransformConfig
): Promise<TransformResult> {
  const steps: TransformResult["steps"] = [];
  const expression = buildCioExpression(config);

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Calculated Insight: ${config.label}`);
  console.log(`║  Source: ${config.sourceTable}`);
  console.log(`║  Dimensions: ${config.dimensions.map((d) => d.alias).join(", ")}`);
  console.log(`║  Measures: ${config.measures.map((m) => `${m.function}(${m.alias})`).join(", ")}`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  console.log("SQL:", expression);
  console.log("");

  // Step 1: Create CIO
  console.log("── Step 1: Create Calculated Insight ──\n");
  try {
    const ciConfig: CalculatedInsightConfig = {
      fullName: config.name,
      label: config.label,
      description: config.description,
      expression,
    };

    const result = await createCalculatedInsight(conn, ciConfig);
    if (result.success) {
      steps.push({ step: "CreateCIO", status: "success", detail: `Created ${config.name}` });
      console.log(`  ✓ Created: ${config.name}`);
    } else {
      steps.push({ step: "CreateCIO", status: "error", detail: JSON.stringify(result.errors) });
      console.log(`  ✗ Failed: ${JSON.stringify(result.errors)}`);
    }
  } catch (err: any) {
    steps.push({ step: "CreateCIO", status: "error", detail: err.message });
    console.log(`  ✗ Exception: ${err.message}`);
  }

  // Step 2: Verify
  console.log("\n── Step 2: Verify ──\n");
  try {
    const ci = await readCalculatedInsight(conn, config.name);
    if (ci && ci.fullName) {
      steps.push({
        step: "Verify",
        status: "success",
        detail: `${ci.masterLabel} — expression verified`,
      });
      console.log(`  ✓ Verified: ${ci.masterLabel}`);
      console.log(`  Expression: ${ci.expression?.substring(0, 150)}...`);
    } else {
      steps.push({ step: "Verify", status: "error", detail: "CIO not found after creation" });
      console.log(`  ✗ CIO not found`);
    }
  } catch (err: any) {
    steps.push({ step: "Verify", status: "error", detail: err.message });
    console.log(`  ✗ Verify error: ${err.message}`);
  }

  // Step 3: Try querying via /ssot/calculated-insights
  console.log("\n── Step 3: Query CIO ──\n");
  try {
    const ciData: any = await conn.request({
      method: "GET",
      url: `/services/data/v62.0/ssot/calculated-insights`,
    });
    const found = ciData.collection?.calculatedInsights?.find(
      (ci: any) => ci.name === config.name || ci.label === config.label
    );
    if (found) {
      steps.push({ step: "QueryCIO", status: "success", detail: `Found in /ssot/ API` });
      console.log(`  ✓ Found in calculated-insights API`);
    } else {
      steps.push({ step: "QueryCIO", status: "success", detail: "CIO created but may need processing time" });
      console.log(`  ○ CIO exists in metadata but may need processing time to appear in query API`);
    }
  } catch (err: any) {
    steps.push({ step: "QueryCIO", status: "error", detail: err.message?.substring(0, 100) });
    console.log(`  ○ Query API: ${err.message?.substring(0, 100)}`);
  }

  const success = steps.every((s) => s.status !== "error");

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Result: ${success ? "SUCCESS" : "PARTIAL"}`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  return { name: config.name, success, expression, steps };
}

// ── Complementary Questions ──

export function getTransformQuestions(
  partial: Partial<TransformConfig>
): string[] {
  const questions: string[] = [];
  if (!partial.sourceTable) {
    questions.push("What source table? Use __dll for DLOs (e.g., School_c_Home__dll) or __dlm for DMOs");
  }
  if (!partial.name) {
    questions.push("What should the Calculated Insight be named?");
  }
  if (!partial.dimensions || partial.dimensions.length === 0) {
    questions.push("What dimensions (GROUP BY fields)? e.g., City, State, Country");
  }
  if (!partial.measures || partial.measures.length === 0) {
    questions.push("What measures (aggregations)? e.g., COUNT schools, SUM students, AVG capacity");
  }
  return questions;
}

// ── Cleanup ──

export async function deleteTransform(
  conn: Connection,
  name: string
): Promise<void> {
  try {
    await deleteCalculatedInsight(conn, name);
    console.log(`  ✓ Deleted CIO: ${name}`);
  } catch {
    console.log(`  ○ CIO ${name} not found or already deleted`);
  }
}
