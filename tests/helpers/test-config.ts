import type { CompleteObjectConfig } from "../../src/skills/create-custom-object";
import type { CustomObjectConfig, CustomFieldConfig } from "../../src/metadata";

export const minimalObjectConfig: CustomObjectConfig = {
  fullName: "ZZTest_Obj",
  label: "ZZ Test Object",
  pluralLabel: "ZZ Test Objects",
  description: "Auto-generated test object",
};

export const textFieldConfig: CustomFieldConfig = {
  objectName: "ZZTest_Obj__c",
  fieldName: "Test_Text",
  label: "Test Text",
  type: "Text",
  length: 100,
};

export const numberFieldConfig: CustomFieldConfig = {
  objectName: "ZZTest_Obj__c",
  fieldName: "Test_Number",
  label: "Test Number",
  type: "Number",
  precision: 8,
  scale: 0,
};

export const picklistFieldConfig: CustomFieldConfig = {
  objectName: "ZZTest_Obj__c",
  fieldName: "Test_Picklist",
  label: "Test Picklist",
  type: "Picklist",
  picklistValues: ["Option A", "Option B", "Option C"],
};

export const emailFieldConfig: CustomFieldConfig = {
  objectName: "ZZTest_Obj__c",
  fieldName: "Test_Email",
  label: "Test Email",
  type: "Email",
};

export const longTextFieldConfig: CustomFieldConfig = {
  objectName: "ZZTest_Obj__c",
  fieldName: "Test_LongText",
  label: "Test Long Text",
  type: "LongTextArea",
  length: 32768,
  visibleLines: 6,
};

export const minimalWorkflowConfig: CompleteObjectConfig = {
  objectName: "ZZTest_Workflow",
  label: "ZZ Test Workflow",
  pluralLabel: "ZZ Test Workflows",
  description: "Auto-generated test object for workflow testing",
  fields: [
    {
      name: "Test_Text",
      label: "Test Text",
      type: "Text",
      length: 100,
      section: "Info",
      inListView: true,
      inCompactLayout: true,
    },
    {
      name: "Test_Status",
      label: "Test Status",
      type: "Picklist",
      picklistValues: ["New", "Active", "Closed"],
      required: true,
      section: "Info",
      inListView: true,
      inCompactLayout: true,
    },
  ],
  layoutSections: ["Info"],
  validationRules: [
    {
      name: "Test_Rule",
      formula: 'AND(ISPICKVAL(Test_Status__c, "Closed"), ISBLANK(Test_Text__c))',
      message: "Test Text is required when status is Closed.",
      field: "Test_Text__c",
    },
  ],
};
