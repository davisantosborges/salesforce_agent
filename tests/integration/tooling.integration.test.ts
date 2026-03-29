import { describe, it, expect } from "vitest";
import { HAS_SF_CREDENTIALS, getConnection } from "./setup";
import {
  describeObject,
  describeGlobal,
  toolingQuery,
  executeAnonymous,
} from "../../src/tooling";

describe.skipIf(!HAS_SF_CREDENTIALS)("Integration: Tooling API", () => {
  it("describes Account object", async () => {
    const conn = await getConnection();
    const desc = await describeObject(conn, "Account");
    expect(desc.name).toBe("Account");
    expect(desc.fields.length).toBeGreaterThan(0);
    expect(desc.createable).toBe(true);
  });

  it("describes global objects", async () => {
    const conn = await getConnection();
    const result = await describeGlobal(conn);
    expect(result.sobjects.length).toBeGreaterThan(100);
  });

  it("runs tooling SOQL query", async () => {
    const conn = await getConnection();
    const result = await toolingQuery(conn, "SELECT Id, Name FROM ApexClass LIMIT 5");
    expect(result.totalSize).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.records)).toBe(true);
  });

  it("executes anonymous Apex", async () => {
    const conn = await getConnection();
    const result = await executeAnonymous(conn, "System.debug('vitest integration test');");
    expect(result.success).toBe(true);
    expect(result.compiled).toBe(true);
  });

  it("describes School__c object (from previous creation)", async () => {
    const conn = await getConnection();
    const desc = await describeObject(conn, "School__c");
    expect(desc.name).toBe("School__c");
    expect(desc.label).toBe("School");
    const customFields = desc.fields.filter((f: any) => f.custom);
    expect(customFields.length).toBeGreaterThanOrEqual(15);
  });

  it("queries validation rules on School__c", async () => {
    const conn = await getConnection();
    const result = await toolingQuery(
      conn,
      "SELECT ValidationName, Active FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = 'School__c'"
    );
    expect(result.totalSize).toBeGreaterThanOrEqual(1);
  });
});
