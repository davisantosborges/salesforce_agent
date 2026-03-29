export { login, loginWithAccessToken, loginWithSfCli, loginWithPassword, getCredentialsFromEnv } from "./auth";
export type { SalesforceCredentials } from "./auth";

export {
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
} from "./metadata";
export type {
  CustomObjectConfig,
  CustomFieldConfig,
  PermissionSetConfig,
  CustomTabConfig,
  LayoutConfig,
  LayoutSection,
  ListViewConfig,
  CompactLayoutConfig,
  ValidationRuleConfig,
  RecordTypeConfig,
} from "./metadata";

export {
  toolingQuery,
  describeObject,
  describeGlobal,
  executeAnonymous,
  getApexClasses,
  getApexTriggers,
  getCustomFields,
  getValidationRules,
} from "./tooling";

export {
  createDataLakeObject,
  readDataLakeObject,
  listDataLakeObjects,
  deleteDataLakeObject,
  createDataTransform,
  listDataTransforms,
  getDataTransform,
  queryDataCloud,
  mapTypeToDloDatatype,
  buildFieldsFromSchema,
} from "./data-cloud";
export type {
  DloFieldDatatype,
  DloFieldConfig,
  DloConfig,
  DataTransformConfig,
} from "./data-cloud";
