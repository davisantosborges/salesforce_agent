/**
 * Data Cloud API module
 *
 * Provides functions for:
 * - MktDataTranObject (DLO) operations via Metadata API
 * - Data Transform operations via /ssot/ REST API
 * - Data Cloud Query V2 (ANSI SQL)
 * - Calculated Insights (MktCalcInsightObjectDef)
 * - Segmentation (MarketSegmentDefinition)
 * - Ingestion API (DC token exchange + streaming/bulk data push)
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

// ── Segmentation (MarketSegmentDefinition) ──

/**
 * Segment filter criteria — JSON structure used in includeCriteria.
 * This is the filter expression that defines which records are in the segment.
 *
 * Pattern from existing segments:
 * {
 *   "filter": { type, subject: { objectApiName, fieldApiName }, operator, value },
 *   "containerObjectApiName": "DMO__dlm",
 *   "path": [[source, target]],
 *   ...
 * }
 */
export interface SegmentFilterCriteria {
  type: "TextComparison" | "NumberComparison" | "DateComparison" | "BooleanComparison" | "NumberAggregation";
  subject: {
    objectApiName: string; // DMO name e.g. "SchoolCustom__dlm"
    fieldApiName: string;  // Field name e.g. "Status_c__c"
  };
  operator: string; // "equals", "not equals", "greater than", "less than", "contains", etc.
  value: string | number | boolean;
  selfReference?: boolean;
  subjectFieldDataType?: string;
  subjectFieldBusinessType?: string;
  subjectFieldSourceType?: string;
}

export interface SegmentConfig {
  /** API name for the segment (e.g., "Active_High_Schools") */
  fullName: string;
  /** Display label */
  label: string;
  /** DMO to segment on (must be Profile or Engagement category) */
  segmentOn: string;
  /** Filter criteria as JSON object — will be stringified */
  includeCriteria: {
    filter: SegmentFilterCriteria;
    containerObjectApiName?: string;
    path?: any[];
    joinPath?: any[];
    type?: string;
  };
  /** Segment type — typically "UI" */
  segmentType?: string;
}

/**
 * Create a segment via MarketSegmentDefinition metadata.
 *
 * The includeCriteria must be a JSON string containing the filter expression.
 * Use buildSegmentCriteria() to construct it from simple inputs.
 */
export async function createSegment(
  conn: Connection,
  config: SegmentConfig
): Promise<any> {
  return conn.metadata.create("MarketSegmentDefinition" as any, {
    fullName: config.fullName,
    masterLabel: config.label,
    segmentOn: config.segmentOn,
    segmentType: config.segmentType || "UI",
    includeCriteria: JSON.stringify(config.includeCriteria),
  });
}

/**
 * Read a segment definition.
 */
export async function readSegment(
  conn: Connection,
  fullName: string
): Promise<any> {
  return conn.metadata.read("MarketSegmentDefinition" as any, fullName);
}

/**
 * List all segments.
 */
export async function listSegments(
  conn: Connection
): Promise<any[]> {
  const result = await conn.metadata.list([{ type: "MarketSegmentDefinition" }]);
  return Array.isArray(result) ? result : result ? [result] : [];
}

/**
 * Delete a segment.
 */
export async function deleteSegment(
  conn: Connection,
  fullName: string
): Promise<any> {
  return conn.metadata.delete("MarketSegmentDefinition" as any, fullName);
}

/**
 * List segments via /ssot/segments REST API (includes runtime status).
 */
export async function listSegmentsRest(
  conn: Connection
): Promise<any> {
  return conn.request({
    method: "GET",
    url: "/services/data/v62.0/ssot/segments",
  });
}

/**
 * Publish (activate) a segment.
 */
export async function publishSegment(
  conn: Connection,
  segmentApiName: string
): Promise<any> {
  return conn.request({
    method: "POST",
    url: `/services/data/v62.0/ssot/segments/${segmentApiName}/actions/publish`,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Build a simple filter criteria for a segment.
 * Convenience function for common comparison patterns.
 */
export function buildSegmentFilter(
  dmoName: string,
  fieldName: string,
  operator: string,
  value: string | number | boolean,
  dataType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" = "TEXT"
): SegmentConfig["includeCriteria"] {
  const typeMap: Record<string, string> = {
    TEXT: "TextComparison",
    NUMBER: "NumberComparison",
    DATE: "DateComparison",
    BOOLEAN: "BooleanComparison",
  };

  return {
    filter: {
      type: typeMap[dataType] as any,
      subject: {
        objectApiName: dmoName,
        fieldApiName: fieldName,
      },
      operator,
      value,
      selfReference: false,
      subjectFieldDataType: dataType,
      subjectFieldBusinessType: dataType,
      subjectFieldSourceType: "DIRECT",
    },
    containerObjectApiName: dmoName,
    path: null as any,
    joinPath: null as any,
    type: typeMap[dataType],
  };
}

// ── Ingestion API (DC Token Exchange + Data Push) ──

/**
 * Data Cloud token — result of the /services/a360/token exchange.
 */
export interface DCToken {
  accessToken: string;
  instanceUrl: string; // DC tenant URL (e.g., https://xxx.c360a.salesforce.com)
  expiresIn: number;
}

/**
 * Exchange a Salesforce access token for a Data Cloud token.
 *
 * Requires a Connected App with `cdp_ingest_api` + `api` scopes.
 * PlatformCLI tokens do NOT work — they lack the cdp scope.
 *
 * @param instanceUrl - Salesforce instance URL (e.g., https://orgfarm-xxx.develop.my.salesforce.com)
 * @param sfAccessToken - Salesforce access token with cdp_ingest_api scope
 */
export async function exchangeDCToken(
  instanceUrl: string,
  sfAccessToken: string
): Promise<DCToken> {
  const resp = await fetch(`${instanceUrl}/services/a360/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:salesforce:grant-type:external:cdp",
      subject_token: sfAccessToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    }),
  });

  const data: any = await resp.json();

  if (!data.access_token) {
    throw new Error(`DC token exchange failed: ${data.error || JSON.stringify(data)}`);
  }

  // instance_url may lack https:// prefix
  let dcUrl = data.instance_url;
  if (!dcUrl.startsWith("https://")) dcUrl = "https://" + dcUrl;

  return {
    accessToken: data.access_token,
    instanceUrl: dcUrl,
    expiresIn: data.expires_in || 7200,
  };
}

/**
 * Push data via the Ingestion API (streaming mode — JSON, max 200KB per request).
 *
 * @param dcToken - Data Cloud token from exchangeDCToken()
 * @param connectorName - Ingestion API connector name (e.g., "SchoolDataConnector")
 * @param objectName - Schema object name (e.g., "SchoolProfile")
 * @param records - Array of record objects matching the schema
 * @returns { accepted: true } on success (202 Accepted — async processing)
 */
export async function ingestData(
  dcToken: DCToken,
  connectorName: string,
  objectName: string,
  records: Record<string, any>[]
): Promise<{ accepted: boolean }> {
  const resp = await fetch(
    `${dcToken.instanceUrl}/api/v1/ingest/sources/${connectorName}/${objectName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dcToken.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: records }),
    }
  );

  if (resp.status === 202 || resp.status === 200) {
    const data: any = await resp.json().catch(() => ({}));
    return { accepted: true, ...data };
  }

  const errorText = await resp.text();
  throw new Error(`Ingestion failed (${resp.status}): ${errorText}`);
}

/**
 * Delete records from a DLO via the Ingestion API.
 *
 * @param dcToken - Data Cloud token
 * @param connectorName - Connector name
 * @param objectName - Object name
 * @param ids - Array of primary key values to delete
 */
export async function deleteIngestionData(
  dcToken: DCToken,
  connectorName: string,
  objectName: string,
  ids: string[]
): Promise<{ accepted: boolean }> {
  const resp = await fetch(
    `${dcToken.instanceUrl}/api/v1/ingest/sources/${connectorName}/${objectName}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${dcToken.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: ids.map((id) => ({ id })) }),
    }
  );

  if (resp.status === 202 || resp.status === 200) {
    return { accepted: true };
  }

  const errorText = await resp.text();
  throw new Error(`Delete failed (${resp.status}): ${errorText}`);
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
