import { describe, it, expect } from "vitest";
import { createMockConnection } from "../helpers/mock-connection";
import {
  createCustomObject,
  createCustomField,
  createPermissionSet,
  createCustomTab,
  createLayout,
  updateLayout,
  createListView,
  createCompactLayout,
  createValidationRule,
  createRecordType,
  readMetadata,
  updateMetadata,
  deleteMetadata,
  listMetadata,
} from "../../src/metadata";

describe("createCustomObject", () => {
  it("creates object with correct metadata payload", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomObject(conn, {
      fullName: "Test",
      label: "Test",
      pluralLabel: "Tests",
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomObject", expect.objectContaining({
      fullName: "Test__c",
      label: "Test",
      pluralLabel: "Tests",
      sharingModel: "ReadWrite",
      deploymentStatus: "Deployed",
    }));
  });

  it("does not double-append __c suffix", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomObject(conn, {
      fullName: "Test__c",
      label: "Test",
      pluralLabel: "Tests",
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomObject", expect.objectContaining({
      fullName: "Test__c",
    }));
  });

  it("sets AutoNumber name field when configured", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomObject(conn, {
      fullName: "Test",
      label: "Test",
      pluralLabel: "Tests",
      nameFieldType: "AutoNumber",
      nameFieldFormat: "TST-{0000}",
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomObject", expect.objectContaining({
      nameField: expect.objectContaining({
        type: "AutoNumber",
        displayFormat: "TST-{0000}",
      }),
    }));
  });

  it("defaults name field to Text type", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomObject(conn, {
      fullName: "Test",
      label: "Test",
      pluralLabel: "Tests",
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomObject", expect.objectContaining({
      nameField: expect.objectContaining({ type: "Text" }),
    }));
  });
});

describe("createCustomField", () => {
  it("creates Text field with correct payload", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomField(conn, {
      objectName: "School__c",
      fieldName: "City",
      label: "City",
      type: "Text",
      length: 80,
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomField", expect.objectContaining({
      fullName: "School__c.City__c",
      type: "Text",
      length: 80,
    }));
  });

  it("does not double-append __c on field name", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomField(conn, {
      objectName: "School__c",
      fieldName: "City__c",
      label: "City",
      type: "Text",
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomField", expect.objectContaining({
      fullName: "School__c.City__c",
    }));
  });

  it("creates Number field with explicit scale", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomField(conn, {
      objectName: "Test__c",
      fieldName: "Count",
      label: "Count",
      type: "Number",
      precision: 8,
      scale: 0,
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomField", expect.objectContaining({
      precision: 8,
      scale: 0,
    }));
  });

  it("creates Picklist field with valueSet", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomField(conn, {
      objectName: "Test__c",
      fieldName: "Status",
      label: "Status",
      type: "Picklist",
      picklistValues: ["Active", "Inactive"],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.valueSet.valueSetDefinition.value).toEqual([
      { fullName: "Active", label: "Active", default: true },
      { fullName: "Inactive", label: "Inactive", default: false },
    ]);
  });

  it("creates LongTextArea with visibleLines", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomField(conn, {
      objectName: "Test__c",
      fieldName: "Notes",
      label: "Notes",
      type: "LongTextArea",
      length: 32768,
      visibleLines: 6,
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.visibleLines).toBe(6);
    expect(call.length).toBe(32768);
  });

  it("creates Lookup field with referenceTo", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomField(conn, {
      objectName: "Test__c",
      fieldName: "Account",
      label: "Account",
      type: "Lookup",
      referenceTo: "Account",
      relationshipName: "TestAccounts",
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.referenceTo).toBe("Account");
    expect(call.relationshipName).toBe("TestAccounts");
  });

  it("sets required and unique flags", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomField(conn, {
      objectName: "Test__c",
      fieldName: "Code",
      label: "Code",
      type: "Text",
      length: 20,
      required: true,
      unique: true,
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.required).toBe(true);
    expect(call.unique).toBe(true);
  });
});

describe("createCustomTab", () => {
  it("creates tab with correct object name", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomTab(conn, { objectName: "School__c" });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomTab", expect.objectContaining({
      fullName: "School__c",
      customObject: true,
    }));
  });

  it("appends __c when missing", async () => {
    const { conn, mocks } = createMockConnection();
    await createCustomTab(conn, { objectName: "School" });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomTab", expect.objectContaining({
      fullName: "School__c",
    }));
  });
});

describe("createListView", () => {
  it("creates list view with columns and scope", async () => {
    const { conn, mocks } = createMockConnection();
    await createListView(conn, {
      objectName: "School__c",
      viewName: "All",
      label: "All Schools",
      columns: ["NAME", "School_Type__c"],
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("ListView", expect.objectContaining({
      fullName: "School__c.All",
      label: "All Schools",
      columns: ["NAME", "School_Type__c"],
      filterScope: "Everything",
    }));
  });

  it("includes filters when provided", async () => {
    const { conn, mocks } = createMockConnection();
    await createListView(conn, {
      objectName: "Test__c",
      viewName: "Active",
      label: "Active Only",
      columns: ["NAME"],
      filters: [{ field: "Status__c", operation: "equals", value: "Active" }],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.filters).toHaveLength(1);
    expect(call.filters[0].field).toBe("Status__c");
  });
});

describe("createCompactLayout", () => {
  it("creates compact layout with max 10 fields", async () => {
    const { conn, mocks } = createMockConnection();
    const fields = Array.from({ length: 12 }, (_, i) => `Field_${i}__c`);
    await createCompactLayout(conn, {
      objectName: "Test__c",
      name: "Test_Compact",
      label: "Test Compact",
      fields,
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.fields).toHaveLength(10);
  });
});

describe("createPermissionSet", () => {
  it("creates permission set with object and field perms", async () => {
    const { conn, mocks } = createMockConnection();
    await createPermissionSet(conn, {
      name: "Test_Access",
      label: "Test Access",
      objectPermissions: [{ object: "Test__c", allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true }],
      fieldPermissions: [{ field: "Test__c.Name__c", readable: true, editable: true }],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.objectPermissions[0].allowCreate).toBe(true);
    expect(call.fieldPermissions[0].readable).toBe(true);
  });

  it("defaults CRUD to read-only", async () => {
    const { conn, mocks } = createMockConnection();
    await createPermissionSet(conn, {
      name: "Test_Read",
      label: "Test Read",
      objectPermissions: [{ object: "Test__c" }],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.objectPermissions[0].allowCreate).toBe(false);
    expect(call.objectPermissions[0].allowRead).toBe(true);
  });
});

describe("createValidationRule", () => {
  it("creates active rule by default", async () => {
    const { conn, mocks } = createMockConnection();
    await createValidationRule(conn, {
      objectName: "Test__c",
      ruleName: "Test_Rule",
      errorConditionFormula: "ISBLANK(Name)",
      errorMessage: "Name is required",
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.active).toBe(true);
    expect(call.fullName).toBe("Test__c.Test_Rule");
  });
});

describe("createRecordType", () => {
  it("creates record type with correct fullName", async () => {
    const { conn, mocks } = createMockConnection();
    await createRecordType(conn, {
      objectName: "Test",
      name: "Standard",
      label: "Standard",
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("RecordType", expect.objectContaining({
      fullName: "Test__c.Standard",
      active: true,
    }));
  });
});

describe("generic metadata operations", () => {
  it("readMetadata passes type and names", async () => {
    const { conn, mocks } = createMockConnection();
    await readMetadata(conn, "CustomObject", "Test__c");
    expect(mocks.metadataRead).toHaveBeenCalledWith("CustomObject", "Test__c");
  });

  it("updateMetadata passes type and payload", async () => {
    const { conn, mocks } = createMockConnection();
    await updateMetadata(conn, "Profile", { fullName: "Admin" });
    expect(mocks.metadataUpdate).toHaveBeenCalledWith("Profile", { fullName: "Admin" });
  });

  it("deleteMetadata passes type and names", async () => {
    const { conn, mocks } = createMockConnection();
    await deleteMetadata(conn, "CustomObject", "Test__c");
    expect(mocks.metadataDelete).toHaveBeenCalledWith("CustomObject", "Test__c");
  });

  it("listMetadata passes type query", async () => {
    const { conn, mocks } = createMockConnection();
    await listMetadata(conn, "CustomObject");
    expect(mocks.metadataList).toHaveBeenCalledWith({ type: "CustomObject" });
  });
});
