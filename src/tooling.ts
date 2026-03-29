import { Connection } from "jsforce";

// Tooling API — faster for individual CRUD operations on metadata components

export async function toolingQuery(
  conn: Connection,
  soql: string
): Promise<any> {
  return conn.tooling.query(soql);
}

export async function describeObject(
  conn: Connection,
  objectName: string
): Promise<any> {
  return conn.describe(objectName);
}

export async function describeGlobal(
  conn: Connection
): Promise<any> {
  return conn.describeGlobal();
}

// Run anonymous Apex — useful for data setup and testing
export async function executeAnonymous(
  conn: Connection,
  apexCode: string
): Promise<any> {
  return conn.tooling.executeAnonymous(apexCode);
}

// Query with Tooling API (access metadata-like objects: ApexClass, ApexTrigger, etc.)
export async function getApexClasses(
  conn: Connection,
  namePattern?: string
): Promise<any> {
  let soql = "SELECT Id, Name, Body FROM ApexClass";
  if (namePattern) {
    soql += ` WHERE Name LIKE '${namePattern}'`;
  }
  return conn.tooling.query(soql);
}

export async function getApexTriggers(
  conn: Connection,
  objectName?: string
): Promise<any> {
  let soql = "SELECT Id, Name, Body, TableEnumOrId FROM ApexTrigger";
  if (objectName) {
    soql += ` WHERE TableEnumOrId = '${objectName}'`;
  }
  return conn.tooling.query(soql);
}

export async function getCustomFields(
  conn: Connection,
  objectName: string
): Promise<any> {
  return conn.tooling.query(
    `SELECT Id, DeveloperName, DataType, FullName FROM CustomField WHERE TableEnumOrId = '${objectName}'`
  );
}

export async function getValidationRules(
  conn: Connection,
  objectName: string
): Promise<any> {
  return conn.tooling.query(
    `SELECT Id, ValidationName, Active, ErrorMessage, Metadata FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = '${objectName}'`
  );
}
