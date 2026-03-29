/**
 * Data Cloud API module
 *
 * Provides functions for:
 * - MktDataTranObject (DLO) operations via Metadata API
 * - Data Transform operations via /ssot/ REST API
 * - Data Cloud Query V2 (ANSI SQL)
 */

import { Connection } from "jsforce";

// ── Data Type Codes ──
// From MktDataTranField.datatype:
//   S = String/Text
//   N = Number
//   D = Date (yyyy-MM-dd)
//   F = DateTime (yyyy-MM-dd'T'HH:mm:ss.SSS'Z')
//   E = Email
//   H = Phone
//   U = URL

export type DloFieldDatatype = "S" | "N" | "D" | "F" | "E" | "H" | "U";

export const DATATYPE_LABELS: Record<DloFieldDatatype, string> = {
  S: "Text",
  N: "Number",
  D: "Date",
  F: "DateTime",
  E: "Email",
  H: "Phone",
  U: "URL",
};

export const DATATYPE_DATE_FORMATS: Partial<Record<DloFieldDatatype, string>> = {
  D: "yyyy-MM-dd",
  F: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
};

// ── Interfaces ──

export interface DloFieldConfig {
  name: string;
  label: string;
  datatype: DloFieldDatatype;
  externalName?: string;
  isRequired?: boolean;
  isPrimaryKey?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
}

export interface DloConfig {
  /** API name for the DLO (e.g., "School_City_Summary") */
  fullName: string;
  /** Display label */
  label: string;
  /** Connector name (e.g., "SalesforceDotCom_Home" for CRM, or custom) */
  connector?: string;
  /** Creation type — typically "Custom" */
  creationType?: string;
  /** Data source name */
  dataSource?: string;
  /** Source object name (for CRM connector DLOs) */
  dataSourceObject?: string;
  /** Object category (e.g., "Other", "Profile", "Engagement") */
  objectCategory?: string;
  /** Field definitions */
  fields: DloFieldConfig[];
}

export interface DataTransformConfig {
  /** Transform name */
  name: string;
  /** SQL query defining the transformation */
  sql: string;
  /** Source DLO/DMO names referenced in the SQL */
  sourceObjects: string[];
  /** Target DLO name where results are written */
  targetObject: string;
  /** Transform type */
  type?: "Batch" | "Streaming";
  /** Schedule (for batch) */
  schedule?: string;
}

// ── MktDataTranObject (DLO) Operations via Metadata API ──

/**
 * Build a MktDataTranField metadata object from a config.
 */
function buildDloField(field: DloFieldConfig, sequence: number): any {
  const result: any = {
    fullName: field.name,
    creationType: "Custom",
    datatype: field.datatype,
    externalName: field.externalName || field.name,
    isDataRequired: field.isRequired ? "true" : "false",
    length: String(field.length || 0),
    masterLabel: field.label,
    precision: String(field.precision || 0),
    primaryIndexOrder: field.isPrimaryKey ? "1" : "0",
    scale: String(field.scale || 0),
    sequence: String(sequence),
  };

  // Add date format for date/datetime fields
  const dateFormat = DATATYPE_DATE_FORMATS[field.datatype];
  if (dateFormat) {
    result.dateFormat = dateFormat;
  }

  return result;
}

/**
 * Create a Data Lake Object via MktDataTranObject metadata.
 */
export async function createDataLakeObject(
  conn: Connection,
  config: DloConfig
): Promise<any> {
  const fields = config.fields.map((f, i) => buildDloField(f, i));

  const metadata: any = {
    fullName: config.fullName,
    masterLabel: config.label,
    creationType: config.creationType || "Custom",
    connector: config.connector || "SalesforceDotCom_Home",
    dataSource: config.dataSource || "Salesforce_Home",
    dataSourceObject: config.dataSourceObject || config.fullName,
    objectCategory: config.objectCategory || "Salesforce_SFDCReferenceModel_0_93.Related",
    mktDataTranFields: fields,
  };

  return conn.metadata.create("MktDataTranObject" as any, metadata);
}

/**
 * Read a Data Lake Object's metadata.
 */
export async function readDataLakeObject(
  conn: Connection,
  fullName: string
): Promise<any> {
  return conn.metadata.read("MktDataTranObject" as any, fullName);
}

/**
 * List all Data Lake Objects in the org.
 */
export async function listDataLakeObjects(
  conn: Connection
): Promise<any[]> {
  const result = await conn.metadata.list([{ type: "MktDataTranObject" }]);
  return Array.isArray(result) ? result : result ? [result] : [];
}

/**
 * Delete a Data Lake Object.
 */
export async function deleteDataLakeObject(
  conn: Connection,
  fullName: string
): Promise<any> {
  return conn.metadata.delete("MktDataTranObject" as any, fullName);
}

// ── Data Transform Operations via /ssot/ REST API ──

/**
 * List all data transforms via the Data Cloud Connect API.
 */
export async function listDataTransforms(
  conn: Connection
): Promise<any> {
  return conn.request({
    method: "GET",
    url: "/services/data/v62.0/ssot/data-transforms",
  });
}

/**
 * Create a data transform via the Data Cloud Connect API.
 * Note: This endpoint may require Data Cloud-specific auth tokens.
 */
export async function createDataTransform(
  conn: Connection,
  config: DataTransformConfig
): Promise<any> {
  return conn.request({
    method: "POST",
    url: "/services/data/v62.0/ssot/data-transforms",
    body: JSON.stringify({
      name: config.name,
      sql: config.sql,
      sourceObjects: config.sourceObjects,
      targetObject: config.targetObject,
      type: config.type || "Batch",
      schedule: config.schedule,
    }),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Get a specific data transform's status.
 */
export async function getDataTransform(
  conn: Connection,
  nameOrId: string
): Promise<any> {
  return conn.request({
    method: "GET",
    url: `/services/data/v62.0/ssot/data-transforms/${nameOrId}`,
  });
}

// ── Data Cloud Query V2 (ANSI SQL) ──

/**
 * Execute an ANSI SQL query against Data Cloud.
 * Uses the Query V2 endpoint.
 */
export async function queryDataCloud(
  conn: Connection,
  sql: string
): Promise<any> {
  return conn.request({
    method: "POST",
    url: "/services/data/v62.0/ssot/queryv2",
    body: JSON.stringify({ sql }),
    headers: { "Content-Type": "application/json" },
  });
}

// ── Calculated Insights (CIO) via MktCalcInsightObjectDef ──

export interface CalculatedInsightConfig {
  /** API name (e.g., "School_City_Summary") */
  fullName: string;
  /** Display label */
  label: string;
  /** Description of the insight */
  description?: string;
  /**
   * SQL expression. Use __dll suffix for DLOs, __dlm for DMOs.
   * Prefix field names with table name (e.g., School_c_Home__dll.City_c__c).
   * Alias output columns with __c suffix (e.g., as city__c).
   */
  expression: string;
}

/**
 * Create a Calculated Insight via MktCalcInsightObjectDef metadata.
 *
 * This is the correct way to create SQL-based aggregations/transforms
 * in Data Cloud. CIOs operate on DLOs (__dll) or DMOs (__dlm) and
 * produce queryable insight objects.
 *
 * SQL pattern:
 *   SELECT Table__dll.Field__c as alias__c, AGG(Table__dll.Field__c) as alias__c
 *   FROM Table__dll
 *   GROUP BY Table__dll.Field__c
 */
export async function createCalculatedInsight(
  conn: Connection,
  config: CalculatedInsightConfig
): Promise<any> {
  return conn.metadata.create("MktCalcInsightObjectDef" as any, {
    fullName: config.fullName,
    creationType: "Custom",
    description: config.description || "",
    expression: config.expression,
    masterLabel: config.label,
  });
}

/**
 * Read a Calculated Insight's metadata.
 */
export async function readCalculatedInsight(
  conn: Connection,
  fullName: string
): Promise<any> {
  return conn.metadata.read("MktCalcInsightObjectDef" as any, fullName);
}

/**
 * List all Calculated Insights.
 */
export async function listCalculatedInsights(
  conn: Connection
): Promise<any[]> {
  const result = await conn.metadata.list([{ type: "MktCalcInsightObjectDef" }]);
  return Array.isArray(result) ? result : result ? [result] : [];
}

/**
 * Delete a Calculated Insight.
 */
export async function deleteCalculatedInsight(
  conn: Connection,
  fullName: string
): Promise<any> {
  return conn.metadata.delete("MktCalcInsightObjectDef" as any, fullName);
}

// ── ObjectSourceTargetMap (DLO→DMO field mappings) ──

/**
 * List all DLO→DMO field mappings.
 */
export async function listFieldMappings(
  conn: Connection
): Promise<any[]> {
  const result = await conn.metadata.list([{ type: "ObjectSourceTargetMap" }]);
  return Array.isArray(result) ? result : result ? [result] : [];
}

/**
 * Read a specific field mapping.
 */
export async function readFieldMapping(
  conn: Connection,
  fullName: string
): Promise<any> {
  return conn.metadata.read("ObjectSourceTargetMap" as any, fullName);
}

// ── Helpers ──

/**
 * Map a simple type name to a DLO datatype code.
 */
export function mapTypeToDloDatatype(type: string): DloFieldDatatype {
  const map: Record<string, DloFieldDatatype> = {
    text: "S",
    string: "S",
    number: "N",
    integer: "N",
    decimal: "N",
    date: "D",
    datetime: "F",
    email: "E",
    phone: "H",
    url: "U",
  };
  return map[type.toLowerCase()] || "S";
}

/**
 * Build DLO fields from a simple key-value definition.
 * Convenience function for quick DLO creation.
 */
export function buildFieldsFromSchema(
  schema: Record<string, { type: string; label: string; primaryKey?: boolean }>
): DloFieldConfig[] {
  return Object.entries(schema).map(([name, def]) => ({
    name,
    label: def.label,
    datatype: mapTypeToDloDatatype(def.type),
    isPrimaryKey: def.primaryKey,
  }));
}
