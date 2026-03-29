import { describe, it, expect, afterAll } from "vitest";
import { HAS_SF_CREDENTIALS, getConnection } from "./setup";
import { TestCleanupRegistry, generateTestName } from "../helpers/cleanup";
import {
  createCustomObject,
  createCustomField,
  createCustomTab,
  createListView,
  createCompactLayout,
  createPermissionSet,
  createValidationRule,
  readMetadata,
  deleteMetadata,
} from "../../src/metadata";

const registry = new TestCleanupRegistry();
const testObjName = generateTestName("ZZMeta");
const testObjApi = `${testObjName}__c`;

describe.skipIf(!HAS_SF_CREDENTIALS)("Integration: Metadata API", () => {
  afterAll(async () => {
    const conn = await getConnection();
    await registry.cleanupAll(conn);
  });

  it("creates a custom object", async () => {
    const conn = await getConnection();
    const result = await createCustomObject(conn, {
      fullName: testObjName,
      label: `ZZ Test ${testObjName}`,
      pluralLabel: `ZZ Tests ${testObjName}`,
      description: "Integration test object",
    });
    expect(result.success).toBe(true);
    registry.register("CustomObject", testObjApi);
  });

  it("reads back the custom object via metadata", async () => {
    const conn = await getConnection();
    const meta = await readMetadata(conn, "CustomObject", testObjApi);
    expect(meta.fullName).toBe(testObjApi);
    expect(meta.label).toContain("ZZ Test");
  });

  it("creates a Text field", async () => {
    const conn = await getConnection();
    const result = await createCustomField(conn, {
      objectName: testObjApi,
      fieldName: "Test_Text",
      label: "Test Text",
      type: "Text",
      length: 100,
    });
    expect(result.success).toBe(true);
    registry.register("CustomField", `${testObjApi}.Test_Text__c`);
  });

  it("creates a Number field with scale 0", async () => {
    const conn = await getConnection();
    const result = await createCustomField(conn, {
      objectName: testObjApi,
      fieldName: "Test_Number",
      label: "Test Number",
      type: "Number",
      precision: 8,
      scale: 0,
    });
    expect(result.success).toBe(true);
    registry.register("CustomField", `${testObjApi}.Test_Number__c`);
  });

  it("creates a Picklist field", async () => {
    const conn = await getConnection();
    const result = await createCustomField(conn, {
      objectName: testObjApi,
      fieldName: "Test_Pick",
      label: "Test Pick",
      type: "Picklist",
      picklistValues: ["Alpha", "Beta", "Gamma"],
    });
    expect(result.success).toBe(true);
    registry.register("CustomField", `${testObjApi}.Test_Pick__c`);
  });

  it("creates a LongTextArea field with visibleLines", async () => {
    const conn = await getConnection();
    const result = await createCustomField(conn, {
      objectName: testObjApi,
      fieldName: "Test_LTA",
      label: "Test Long Text",
      type: "LongTextArea",
      length: 32768,
      visibleLines: 4,
    });
    expect(result.success).toBe(true);
    registry.register("CustomField", `${testObjApi}.Test_LTA__c`);
  });

  it("creates a custom tab", async () => {
    const conn = await getConnection();
    const result = await createCustomTab(conn, {
      objectName: testObjApi,
    });
    expect(result.success).toBe(true);
    registry.register("CustomTab", testObjApi);
  });

  it("creates a list view", async () => {
    const conn = await getConnection();
    const result = await createListView(conn, {
      objectName: testObjApi,
      viewName: "All",
      label: "All Records",
      columns: ["NAME", "Test_Text__c", "Test_Pick__c"],
    });
    expect(result.success).toBe(true);
    registry.register("ListView", `${testObjApi}.All`);
  });

  it("creates a compact layout", async () => {
    const conn = await getConnection();
    const result = await createCompactLayout(conn, {
      objectName: testObjApi,
      name: "Test_Compact",
      label: "Test Compact",
      fields: ["Name", "Test_Text__c", "Test_Pick__c"],
    });
    expect(result.success).toBe(true);
    registry.register("CompactLayout", `${testObjApi}.Test_Compact`);
  });

  it("creates a permission set", async () => {
    const conn = await getConnection();
    const psName = `${testObjName}_Access`;
    const result = await createPermissionSet(conn, {
      name: psName,
      label: `${testObjName} Access`,
      objectPermissions: [
        { object: testObjApi, allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true },
      ],
    });
    expect(result.success).toBe(true);
    registry.register("PermissionSet", psName);
  });

  it("creates a validation rule", async () => {
    const conn = await getConnection();
    const result = await createValidationRule(conn, {
      objectName: testObjApi,
      ruleName: "Test_Validation",
      errorConditionFormula: "ISBLANK(Test_Text__c)",
      errorMessage: "Test text is required",
    });
    expect(result.success).toBe(true);
    registry.register("ValidationRule", `${testObjApi}.Test_Validation`);
  });

  it("returns error for duplicate object creation", async () => {
    const conn = await getConnection();
    const result = await createCustomObject(conn, {
      fullName: testObjName,
      label: "Duplicate",
      pluralLabel: "Duplicates",
    });
    expect(result.success).toBe(false);
  });

  it("deletes metadata", async () => {
    const conn = await getConnection();
    // Create a throwaway field, then delete it
    const tmpField = `${testObjApi}.Tmp_Delete_Test__c`;
    await createCustomField(conn, {
      objectName: testObjApi,
      fieldName: "Tmp_Delete_Test",
      label: "Tmp Delete",
      type: "Text",
      length: 10,
    });
    const result = await deleteMetadata(conn, "CustomField", tmpField);
    expect(result.success).toBe(true);
  });
});
