import { describe, it, expect, vi } from "vitest";
import { getRequiredQuestions } from "../../src/skills/create-custom-object";
import type { CompleteObjectConfig } from "../../src/skills/create-custom-object";

describe("getRequiredQuestions", () => {
  it("asks for object name when missing", () => {
    const questions = getRequiredQuestions({});
    expect(questions.some((q) => q.includes("API name"))).toBe(true);
  });

  it("asks for label when missing", () => {
    const questions = getRequiredQuestions({ objectName: "Test" });
    expect(questions.some((q) => q.includes("singular label"))).toBe(true);
  });

  it("asks for plural label when missing", () => {
    const questions = getRequiredQuestions({ objectName: "Test", label: "Test" });
    expect(questions.some((q) => q.includes("plural label"))).toBe(true);
  });

  it("asks for fields when none provided", () => {
    const questions = getRequiredQuestions({ objectName: "Test", label: "Test", pluralLabel: "Tests" });
    expect(questions.some((q) => q.includes("fields"))).toBe(true);
  });

  it("asks for picklist values when missing", () => {
    const questions = getRequiredQuestions({
      objectName: "Test",
      label: "Test",
      pluralLabel: "Tests",
      fields: [{ name: "Status", label: "Status", type: "Picklist" }],
    });
    expect(questions.some((q) => q.includes("picklist values") && q.includes("Status"))).toBe(true);
  });

  it("asks for lookup target when missing", () => {
    const questions = getRequiredQuestions({
      objectName: "Test",
      label: "Test",
      pluralLabel: "Tests",
      fields: [{ name: "Account", label: "Account", type: "Lookup" }],
    });
    expect(questions.some((q) => q.includes("look up to") && q.includes("Account"))).toBe(true);
  });

  it("returns no questions when config is complete", () => {
    const complete: Partial<CompleteObjectConfig> = {
      objectName: "Test",
      label: "Test",
      pluralLabel: "Tests",
      description: "A test",
      nameFieldType: "Text",
      fields: [
        { name: "City", label: "City", type: "Text", length: 80 },
      ],
    };
    const questions = getRequiredQuestions(complete);
    expect(questions).toHaveLength(0);
  });
});

describe("createCompleteCustomObject", () => {
  it("tracks step results with correct statuses", async () => {
    // We test the step tracking by importing and calling with a mock connection
    const { createMockConnection } = await import("../helpers/mock-connection");
    const { createCompleteCustomObject } = await import("../../src/skills/create-custom-object");

    const { conn } = createMockConnection();
    // Mock describe to return fields matching the config
    conn.describe.mockResolvedValue({
      fields: [
        { name: "Id", custom: false },
        { name: "Name", custom: false },
        { name: "Test_Field__c", custom: true, type: "string" },
      ],
    });

    const result = await createCompleteCustomObject(conn, {
      objectName: "ZZTest",
      label: "ZZ Test",
      pluralLabel: "ZZ Tests",
      fields: [{ name: "Test_Field", label: "Test Field", type: "Text", length: 100 }],
    });

    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.objectName).toBe("ZZTest__c");

    // Should have steps for: object, field, layout, listview, compactlayout, tab, permission, profile FLS, verify, test
    const stepNames = result.steps.map((s) => s.step);
    expect(stepNames).toContain("CustomObject");
    expect(stepNames).toContain("CustomField");
    expect(stepNames).toContain("CustomTab");
    expect(stepNames).toContain("PermissionSet");
    expect(stepNames).toContain("ProfileFLS");
  });

  it("continues execution when a step fails", async () => {
    const { createMockConnection } = await import("../helpers/mock-connection");
    const { createCompleteCustomObject } = await import("../../src/skills/create-custom-object");

    const { conn } = createMockConnection();
    // Make field creation fail
    conn.metadata.create.mockImplementation((type: string) => {
      if (type === "CustomField") {
        return Promise.resolve({ success: false, errors: [{ message: "test error" }] });
      }
      return Promise.resolve({ success: true, fullName: "test" });
    });

    conn.describe.mockResolvedValue({ fields: [{ name: "Id", custom: false }] });

    const result = await createCompleteCustomObject(conn, {
      objectName: "ZZTest",
      label: "ZZ Test",
      pluralLabel: "ZZ Tests",
      fields: [{ name: "Fail_Field", label: "Fail", type: "Text", length: 50 }],
    });

    // Should have error step but also continue to later steps
    const errorSteps = result.steps.filter((s) => s.status === "error");
    const successSteps = result.steps.filter((s) => s.status === "success");
    expect(errorSteps.length).toBeGreaterThan(0);
    expect(successSteps.length).toBeGreaterThan(0);
  });
});
