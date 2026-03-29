import { describe, it, expect } from "vitest";
import { createMockConnection } from "../helpers/mock-connection";
import {
  toolingQuery,
  describeObject,
  describeGlobal,
  executeAnonymous,
  getApexClasses,
  getApexTriggers,
  getCustomFields,
  getValidationRules,
} from "../../src/tooling";

describe("toolingQuery", () => {
  it("passes SOQL to tooling.query", async () => {
    const { conn } = createMockConnection();
    await toolingQuery(conn, "SELECT Id FROM ApexClass");
    expect(conn.tooling.query).toHaveBeenCalledWith("SELECT Id FROM ApexClass");
  });
});

describe("describeObject", () => {
  it("calls conn.describe with object name", async () => {
    const { conn } = createMockConnection();
    await describeObject(conn, "Account");
    expect(conn.describe).toHaveBeenCalledWith("Account");
  });
});

describe("describeGlobal", () => {
  it("calls conn.describeGlobal", async () => {
    const { conn } = createMockConnection();
    const result = await describeGlobal(conn);
    expect(conn.describeGlobal).toHaveBeenCalled();
    expect(result.sobjects).toBeDefined();
  });
});

describe("executeAnonymous", () => {
  it("passes Apex code to tooling", async () => {
    const { conn } = createMockConnection();
    await executeAnonymous(conn, "System.debug('hello');");
    expect(conn.tooling.executeAnonymous).toHaveBeenCalledWith("System.debug('hello');");
  });
});

describe("getApexClasses", () => {
  it("queries ApexClass without filter", async () => {
    const { conn } = createMockConnection();
    await getApexClasses(conn);
    expect(conn.tooling.query).toHaveBeenCalledWith("SELECT Id, Name, Body FROM ApexClass");
  });

  it("queries ApexClass with name pattern", async () => {
    const { conn } = createMockConnection();
    await getApexClasses(conn, "Test%");
    expect(conn.tooling.query).toHaveBeenCalledWith("SELECT Id, Name, Body FROM ApexClass WHERE Name LIKE 'Test%'");
  });
});

describe("getApexTriggers", () => {
  it("queries triggers without filter", async () => {
    const { conn } = createMockConnection();
    await getApexTriggers(conn);
    expect(conn.tooling.query).toHaveBeenCalledWith("SELECT Id, Name, Body, TableEnumOrId FROM ApexTrigger");
  });

  it("queries triggers for specific object", async () => {
    const { conn } = createMockConnection();
    await getApexTriggers(conn, "Account");
    expect(conn.tooling.query).toHaveBeenCalledWith(
      "SELECT Id, Name, Body, TableEnumOrId FROM ApexTrigger WHERE TableEnumOrId = 'Account'"
    );
  });
});

describe("getCustomFields", () => {
  it("queries custom fields for object", async () => {
    const { conn } = createMockConnection();
    await getCustomFields(conn, "School__c");
    expect(conn.tooling.query).toHaveBeenCalledWith(
      "SELECT Id, DeveloperName, DataType, FullName FROM CustomField WHERE TableEnumOrId = 'School__c'"
    );
  });
});

describe("getValidationRules", () => {
  it("queries validation rules for object", async () => {
    const { conn } = createMockConnection();
    await getValidationRules(conn, "School__c");
    expect(conn.tooling.query).toHaveBeenCalledWith(
      "SELECT Id, ValidationName, Active, ErrorMessage, Metadata FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = 'School__c'"
    );
  });
});
