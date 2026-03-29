import { describe, it, expect, afterAll } from "vitest";
import { HAS_SF_CREDENTIALS, getConnection } from "./setup";
import { TestCleanupRegistry, generateTestName } from "../helpers/cleanup";
import { createCompleteCustomObject } from "../../src/skills/create-custom-object";
import type { CompleteObjectConfig } from "../../src/skills/create-custom-object";
import { describeObject } from "../../src/tooling";
import { readMetadata, deleteMetadata } from "../../src/metadata";

const registry = new TestCleanupRegistry();
const testObjName = generateTestName("ZZWf");
const testObjApi = `${testObjName}__c`;

const workflowConfig: CompleteObjectConfig = {
  objectName: testObjName,
  label: `ZZ Workflow Test`,
  pluralLabel: `ZZ Workflow Tests`,
  description: "End-to-end workflow test object",
  fields: [
    {
      name: "WF_Text",
      label: "WF Text",
      type: "Text",
      length: 100,
      section: "Info",
      inListView: true,
      inCompactLayout: true,
    },
    {
      name: "WF_Status",
      label: "WF Status",
      type: "Picklist",
      picklistValues: ["New", "Active", "Closed"],
      required: true,
      section: "Info",
      inListView: true,
      inCompactLayout: true,
    },
    {
      name: "WF_Count",
      label: "WF Count",
      type: "Number",
      precision: 6,
      scale: 0,
      section: "Info",
    },
  ],
  layoutSections: ["Info"],
};

describe.skipIf(!HAS_SF_CREDENTIALS)("Integration: Full Workflow", () => {
  let result: Awaited<ReturnType<typeof createCompleteCustomObject>>;

  afterAll(async () => {
    const conn = await getConnection();
    // Manual cleanup since the workflow creates many components
    try { await deleteMetadata(conn, "ValidationRule", `${testObjApi}.Test_Rule`); } catch {}
    try { await deleteMetadata(conn, "PermissionSet", `${testObjName}_Access`); } catch {}
    try { await deleteMetadata(conn, "CustomTab", testObjApi); } catch {}
    try { await deleteMetadata(conn, "CompactLayout", `${testObjApi}.${testObjName}_Compact`); } catch {}
    try { await deleteMetadata(conn, "ListView", `${testObjApi}.All`); } catch {}
    try { await deleteMetadata(conn, "CustomField", `${testObjApi}.WF_Text__c`); } catch {}
    try { await deleteMetadata(conn, "CustomField", `${testObjApi}.WF_Status__c`); } catch {}
    try { await deleteMetadata(conn, "CustomField", `${testObjApi}.WF_Count__c`); } catch {}
    try { await deleteMetadata(conn, "CustomObject", testObjApi); } catch {}
  });

  it("creates a complete custom object with all components", async () => {
    const conn = await getConnection();
    result = await createCompleteCustomObject(conn, workflowConfig);

    expect(result.objectName).toBe(testObjApi);
    expect(result.steps.length).toBeGreaterThan(0);

    // Object creation should succeed
    const objectStep = result.steps.find((s) => s.step === "CustomObject");
    expect(objectStep?.status).toBe("success");
  }, 120000); // Allow 2 minutes for full workflow

  it("created all fields successfully", () => {
    const fieldSteps = result.steps.filter((s) => s.step === "CustomField");
    expect(fieldSteps.length).toBe(3);
    const successFields = fieldSteps.filter((s) => s.status === "success");
    expect(successFields.length).toBe(3);
  });

  it("created tab successfully", () => {
    const tabStep = result.steps.find((s) => s.step === "CustomTab");
    expect(tabStep?.status).toBe("success");
  });

  it("updated profile FLS successfully", () => {
    const flsStep = result.steps.find((s) => s.step === "ProfileFLS");
    expect(flsStep?.status).toBe("success");
  });

  it("created permission set successfully", () => {
    const psStep = result.steps.find((s) => s.step === "PermissionSet");
    expect(psStep?.status).toBe("success");
  });

  it("verification confirms object exists", () => {
    expect(result.verification).toBeDefined();
    expect(result.verification!.objectExists).toBe(true);
  });

  it("test record was created and cleaned up", () => {
    const testStep = result.steps.find((s) => s.step === "TestRecord");
    expect(testStep?.status).toBe("success");
  });
});
