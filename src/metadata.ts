import { Connection } from "jsforce";

// --- Custom Object ---

export interface CustomObjectConfig {
  fullName: string;
  label: string;
  pluralLabel: string;
  description?: string;
  nameFieldLabel?: string;
  nameFieldType?: "Text" | "AutoNumber";
  nameFieldFormat?: string; // e.g. "OBJ-{0000}" for AutoNumber
  sharingModel?: string;
  deploymentStatus?: string;
}

export async function createCustomObject(
  conn: Connection,
  config: CustomObjectConfig
): Promise<any> {
  const metadata: any = {
    fullName: config.fullName.endsWith("__c")
      ? config.fullName
      : `${config.fullName}__c`,
    label: config.label,
    pluralLabel: config.pluralLabel,
    description: config.description || "",
    nameField: {
      label: config.nameFieldLabel || `${config.label} Name`,
      type: config.nameFieldType || "Text",
    },
    sharingModel: config.sharingModel || "ReadWrite",
    deploymentStatus: config.deploymentStatus || "Deployed",
  };

  if (config.nameFieldType === "AutoNumber" && config.nameFieldFormat) {
    metadata.nameField.displayFormat = config.nameFieldFormat;
  }

  const result = await conn.metadata.create("CustomObject", metadata);
  return result;
}

// --- Custom Field ---

export interface CustomFieldConfig {
  objectName: string;
  fieldName: string;
  label: string;
  type: string; // Text, Number, Checkbox, Picklist, Lookup, etc.
  length?: number;
  precision?: number;
  scale?: number;
  required?: boolean;
  unique?: boolean;
  description?: string;
  referenceTo?: string; // for Lookup/MasterDetail
  relationshipName?: string;
  picklistValues?: string[];
  defaultValue?: string;
  formula?: string;
  visibleLines?: number;
}

export async function createCustomField(
  conn: Connection,
  config: CustomFieldConfig
): Promise<any> {
  const fullName = `${config.objectName}.${config.fieldName}${config.fieldName.endsWith("__c") ? "" : "__c"}`;

  const metadata: any = {
    fullName,
    label: config.label,
    type: config.type,
    description: config.description || "",
    required: config.required || false,
    unique: config.unique || false,
  };

  if (config.length) metadata.length = config.length;
  if (config.precision != null) metadata.precision = config.precision;
  if (config.scale != null) metadata.scale = config.scale;
  if (config.defaultValue) metadata.defaultValue = config.defaultValue;
  if (config.formula) metadata.formula = config.formula;

  // LongTextArea and RichTextArea require visibleLines
  if (config.type === "LongTextArea" || config.type === "Html") {
    metadata.visibleLines = config.visibleLines || 6;
  }

  // TextArea requires visibleLines if specified
  if (config.type === "TextArea" && config.visibleLines) {
    metadata.visibleLines = config.visibleLines;
  }

  if (config.referenceTo) {
    metadata.referenceTo = config.referenceTo;
    metadata.relationshipName =
      config.relationshipName || config.fieldName.replace("__c", "");
  }

  if (config.picklistValues && config.picklistValues.length > 0) {
    metadata.valueSet = {
      valueSetDefinition: {
        value: config.picklistValues.map((v, i) => ({
          fullName: v,
          label: v,
          default: i === 0,
        })),
      },
    };
  }

  const result = await conn.metadata.create("CustomField", metadata);
  return result;
}

// --- Permission Set ---

export interface PermissionSetConfig {
  name: string;
  label: string;
  description?: string;
  objectPermissions?: Array<{
    object: string;
    allowCreate?: boolean;
    allowRead?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
  }>;
  fieldPermissions?: Array<{
    field: string; // ObjectName.FieldName
    readable?: boolean;
    editable?: boolean;
  }>;
}

export async function createPermissionSet(
  conn: Connection,
  config: PermissionSetConfig
): Promise<any> {
  const metadata: any = {
    fullName: config.name,
    label: config.label,
    description: config.description || "",
  };

  if (config.objectPermissions) {
    metadata.objectPermissions = config.objectPermissions.map((op) => ({
      object: op.object,
      allowCreate: op.allowCreate ?? false,
      allowRead: op.allowRead ?? true,
      allowEdit: op.allowEdit ?? false,
      allowDelete: op.allowDelete ?? false,
    }));
  }

  if (config.fieldPermissions) {
    metadata.fieldPermissions = config.fieldPermissions.map((fp) => ({
      field: fp.field,
      readable: fp.readable ?? true,
      editable: fp.editable ?? false,
    }));
  }

  const result = await conn.metadata.create("PermissionSet", metadata);
  return result;
}

// --- Custom Tab ---

export interface CustomTabConfig {
  objectName: string; // e.g. "School__c"
  motif?: string; // Icon style e.g. "Custom52: Lock"
  customObjectName?: string;
}

export async function createCustomTab(
  conn: Connection,
  config: CustomTabConfig
): Promise<any> {
  const objName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;

  const metadata: any = {
    fullName: objName,
    customObject: true,
    motif: config.motif || "Custom52: Lock",
  };

  const result = await conn.metadata.create("CustomTab", metadata);
  return result;
}

// --- Page Layout ---

export interface LayoutSection {
  label: string;
  style: "TwoColumnsLeftToRight" | "OneColumn" | "TwoColumnsTopToBottom";
  fields: Array<{
    name: string;
    behavior?: "Required" | "Edit" | "Readonly";
  }>;
}

export interface LayoutConfig {
  objectName: string;
  layoutName?: string;
  sections: LayoutSection[];
}

export async function createLayout(
  conn: Connection,
  config: LayoutConfig
): Promise<any> {
  const objName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;
  const layoutFullName = `${objName}-${config.layoutName || objName.replace("__c", "") + " Layout"}`;

  const layoutSections = config.sections.map((section) => {
    const columns = section.style === "OneColumn" ? 1 : 2;
    const layoutColumns: any[] = [];

    if (columns === 1) {
      layoutColumns.push({
        layoutItems: section.fields.map((f) => ({
          field: f.name,
          behavior: f.behavior || "Edit",
        })),
      });
    } else {
      const mid = Math.ceil(section.fields.length / 2);
      const left = section.fields.slice(0, mid);
      const right = section.fields.slice(mid);

      layoutColumns.push({
        layoutItems: left.map((f) => ({
          field: f.name,
          behavior: f.behavior || "Edit",
        })),
      });
      layoutColumns.push({
        layoutItems: right.length > 0
          ? right.map((f) => ({
              field: f.name,
              behavior: f.behavior || "Edit",
            }))
          : [{ field: "", behavior: "Readonly" }],
      });
    }

    return {
      label: section.label,
      style: section.style,
      layoutColumns,
    };
  });

  const metadata: any = {
    fullName: layoutFullName,
    layoutSections: layoutSections,
  };

  const result = await conn.metadata.create("Layout", metadata);
  return result;
}

export async function updateLayout(
  conn: Connection,
  config: LayoutConfig
): Promise<any> {
  const objName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;
  const layoutFullName = `${objName}-${config.layoutName || objName.replace("__c", "") + " Layout"}`;

  const layoutSections = config.sections.map((section) => {
    const columns = section.style === "OneColumn" ? 1 : 2;
    const layoutColumns: any[] = [];

    if (columns === 1) {
      layoutColumns.push({
        layoutItems: section.fields.map((f) => ({
          field: f.name,
          behavior: f.behavior || "Edit",
        })),
      });
    } else {
      const mid = Math.ceil(section.fields.length / 2);
      const left = section.fields.slice(0, mid);
      const right = section.fields.slice(mid);

      layoutColumns.push({
        layoutItems: left.map((f) => ({
          field: f.name,
          behavior: f.behavior || "Edit",
        })),
      });
      layoutColumns.push({
        layoutItems: right.length > 0
          ? right.map((f) => ({
              field: f.name,
              behavior: f.behavior || "Edit",
            }))
          : [{ field: "", behavior: "Readonly" }],
      });
    }

    return {
      label: section.label,
      style: section.style,
      layoutColumns,
    };
  });

  const metadata: any = {
    fullName: layoutFullName,
    layoutSections: layoutSections,
  };

  return conn.metadata.update("Layout", metadata);
}

// --- List View ---

export interface ListViewConfig {
  objectName: string;
  viewName: string;
  label: string;
  columns: string[]; // field API names
  filterScope?: "Everything" | "Mine" | "Queue" | "Team";
  filters?: Array<{
    field: string;
    operation: "equals" | "notEqual" | "contains" | "greaterThan" | "lessThan";
    value: string;
  }>;
}

export async function createListView(
  conn: Connection,
  config: ListViewConfig
): Promise<any> {
  const objName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;

  const metadata: any = {
    fullName: `${objName}.${config.viewName}`,
    label: config.label,
    columns: config.columns,
    filterScope: config.filterScope || "Everything",
  };

  if (config.filters && config.filters.length > 0) {
    metadata.filters = config.filters.map((f) => ({
      field: f.field,
      operation: f.operation,
      value: f.value,
    }));
  }

  const result = await conn.metadata.create("ListView", metadata);
  return result;
}

// --- Compact Layout ---

export interface CompactLayoutConfig {
  objectName: string;
  name: string;
  label: string;
  fields: string[]; // up to 10 field API names
}

export async function createCompactLayout(
  conn: Connection,
  config: CompactLayoutConfig
): Promise<any> {
  const objName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;

  const metadata: any = {
    fullName: `${objName}.${config.name}`,
    label: config.label,
    fields: config.fields.slice(0, 10),
  };

  const result = await conn.metadata.create("CompactLayout", metadata);
  return result;
}

// --- Validation Rule ---

export interface ValidationRuleConfig {
  objectName: string;
  ruleName: string;
  active?: boolean;
  errorConditionFormula: string;
  errorMessage: string;
  errorDisplayField?: string;
  description?: string;
}

export async function createValidationRule(
  conn: Connection,
  config: ValidationRuleConfig
): Promise<any> {
  const objName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;

  const metadata: any = {
    fullName: `${objName}.${config.ruleName}`,
    active: config.active ?? true,
    errorConditionFormula: config.errorConditionFormula,
    errorMessage: config.errorMessage,
    description: config.description || "",
  };

  if (config.errorDisplayField) {
    metadata.errorDisplayField = config.errorDisplayField;
  }

  const result = await conn.metadata.create("ValidationRule", metadata);
  return result;
}

// --- Record Type ---

export interface RecordTypeConfig {
  objectName: string;
  name: string;
  label: string;
  description?: string;
  active?: boolean;
}

export async function createRecordType(
  conn: Connection,
  config: RecordTypeConfig
): Promise<any> {
  const objName = config.objectName.endsWith("__c")
    ? config.objectName
    : `${config.objectName}__c`;

  const metadata: any = {
    fullName: `${objName}.${config.name}`,
    label: config.label,
    active: config.active ?? true,
    description: config.description || "",
  };

  const result = await conn.metadata.create("RecordType", metadata);
  return result;
}

// --- Generic Metadata Deploy ---

export async function readMetadata(
  conn: Connection,
  type: string,
  fullNames: string | string[]
): Promise<any> {
  return conn.metadata.read(type as any, fullNames);
}

export async function updateMetadata(
  conn: Connection,
  type: string,
  metadata: any
): Promise<any> {
  return conn.metadata.update(type, metadata);
}

export async function deleteMetadata(
  conn: Connection,
  type: string,
  fullNames: string | string[]
): Promise<any> {
  return conn.metadata.delete(type, fullNames);
}

export async function listMetadata(
  conn: Connection,
  type: string,
  folder?: string
): Promise<any[]> {
  const query: any = { type };
  if (folder) query.folder = folder;
  return conn.metadata.list(query);
}
