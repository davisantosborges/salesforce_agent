# Salesforce Interaction Toolkit

A TypeScript toolkit for configuring Salesforce orgs programmatically. Uses Metadata API, Tooling API, and browser automation to create custom objects, Data Cloud configurations, and Calculated Insights.

## Project Structure

```
src/
  auth.ts                         # Connection: access token (auto-refresh), sf CLI, SOAP
  metadata.ts                     # 14 Metadata API functions (objects, fields, tabs, layouts, permissions...)
  tooling.ts                      # Tooling API (describe, query, Apex)
  data-cloud.ts                   # Data Cloud: DLO CRUD, CIO CRUD, /ssot/ API, Query V2
  index.ts                        # Public API exports

  skills/
    create-custom-object.ts       # Full object creation: 10 steps + verify + test + optional app
    data-cloud-replication.ts     # CRM Connector → DLO → DMO → CIO (6-phase workflow)
    data-cloud-transform.ts       # SQL builder for Calculated Insights (MktCalcInsightObjectDef)
    functional-test.ts            # Browser-based UI test specifications

  create-school.ts                # Reference: School__c object creation
  create-school-summary.ts        # Reference: School City Summary CIO
  verify-school.ts                # Reference: School__c verification report
  run-functional-tests.ts         # Print browser test plan
  run-dc-replication.ts           # Data Cloud replication pre-flight + plan

tests/
  helpers/                        # Mock connection, test configs, cleanup registry
  unit/                           # 70 tests (mocked, <1s)
  integration/                    # 29 tests (real org, ~14s)
```

## Commands

```bash
npm install                       # Install dependencies
npm test                          # All tests (unit + integration)
npm run test:unit                 # Unit only — mocked, no org needed (<1s)
npm run test:integration          # Integration — real org, auto-cleanup (~14s)
npm run test:functional           # Print browser test plan for Claude Code
npm run test:coverage             # With coverage report

npx tsx src/create-school.ts      # Create School__c with all components
npx tsx src/create-school-summary.ts  # Create School City Summary CIO
npx tsx src/verify-school.ts      # Full verification report
npx tsx src/run-dc-replication.ts School__c  # Data Cloud replication plan
npx tsx src/run-functional-tests.ts School__c  # Browser test plan
```

## Auth

Uses OAuth access token + refresh token. Token auto-refreshes via `SF_REFRESH_TOKEN`.

```bash
cp .env.example .env
# Fill: SF_ACCESS_TOKEN, SF_INSTANCE_URL, SF_REFRESH_TOKEN
```

If token is fully expired, get a new one:
1. Open in browser: `https://<instance>/services/oauth2/authorize?response_type=token&client_id=PlatformCLI&redirect_uri=http://localhost:1717/OauthRedirect`
2. Click Allow, copy the redirect URL
3. Extract `access_token`, `refresh_token`, `instance_url` into `.env`

SOAP API login is **disabled** in this org. Use access token auth only.

## Skills

### Create Custom Object (`src/skills/create-custom-object.ts`)

Creates a fully usable Salesforce custom object in one call:

```typescript
const result = await createCompleteCustomObject(conn, {
  objectName: "School",
  label: "School",
  pluralLabel: "Schools",
  fields: [
    { name: "City", label: "City", type: "Text", length: 80, section: "Address" },
    { name: "Status", label: "Status", type: "Picklist", picklistValues: ["Active", "Inactive"], required: true },
  ],
  layoutSections: ["Info", "Address"],
  validationRules: [{ name: "Rule1", formula: "ISBLANK(City__c)", message: "City required" }],
  createApp: { name: "School_Management", label: "School Management" },  // optional
});
```

**Creates in order:** Object → Fields → Layout → ListView → CompactLayout → Tab → PermissionSet → Admin Profile FLS → Validation Rules → Lightning App

### Data Cloud Replication (`src/skills/data-cloud-replication.ts`)

6-phase workflow to replicate CRM objects into Data Cloud:
1. Pre-flight (API)
2. Create CRM Data Stream (Browser — UI required)
3. Create DMO & Map Fields (Browser — UI required)
4. **Create Calculated Insights (API — fully programmatic!)**
5. Verify
6. Test

### Data Cloud Transform (`src/skills/data-cloud-transform.ts`)

Creates Calculated Insights (CIOs) from a dimensions + measures config:

```typescript
const result = await createDataCloudTransform(conn, {
  name: "School_City_Summary",
  label: "School City Summary",
  sourceTable: "School_c_Home__dll",
  dimensions: [{ sourceField: "City_c__c", alias: "city" }],
  measures: [
    { function: "COUNT", sourceField: "*", alias: "school_count" },
    { function: "SUM", sourceField: "Number_of_Students_c__c", alias: "total_students" },
  ],
});
```

### Functional Tests (`src/skills/functional-test.ts`)

Browser-based UI tests executed by Claude Code via chrome automation. 8 steps for School__c: tab navigation, list view, record form, record CRUD, 2 validation rules.

### Platform Events (`src/skills/platform-event.ts`)

Creates and manages Platform Events (event-driven messaging):

```typescript
const result = await createCompletePlatformEvent(conn, {
  name: "School_Action",
  label: "School Action",
  pluralLabel: "School Actions",
  eventType: "HighVolume",
  publishBehavior: "PublishAfterCommit",
  fields: [
    { name: "Action_Type", label: "Action Type", type: "Text", length: 50, required: true },
    { name: "Payload", label: "Payload", type: "LongTextArea", description: "JSON data" },
    { name: "Is_Async", label: "Is Async", type: "Checkbox" },
  ],
  testData: { Action_Type__c: "Create", Payload__c: '{"key":"value"}' },
});
```

**Creates:** Event (__e suffix) → Fields → Verify → Publish test event

**Platform Event rules:**
- API name ends with `__e` (not `__c`)
- Supported field types: Text, Number, Checkbox, Date, DateTime, LongTextArea
- NOT supported: Picklist, Lookup, Formula, RichText
- Checkbox fields auto-set `defaultValue: "false"`
- Publish via REST: `POST /services/data/v62.0/sobjects/EventName__e`
- Subscribe via: Apex triggers (after insert), Flows, CometD, Pub/Sub API
- Retention: 72h (HighVolume), 24h (StandardVolume)

**Deployed: `School_Action__e`** — 8 fields (Action_Type, School_Id, School_Code, Payload, Requested_By, Priority, Correlation_Id, Is_Async). Designed as action endpoint for Agentforce/automations.

## Data Cloud Object Hierarchy

```
Data Source → Data Stream → DSO → DLO (__dll) → DMO (__dlm) → CIO
```

| Object | Nature | API Creatable? | How |
|--------|--------|:-:|------|
| DLO | Physical (Parquet/S3) | ❌ direct | Auto-created by Data Stream deploy (UI) |
| DMO | Virtual view | ❌ direct | Byproduct of field mapping (UI) |
| CIO | Derived/computed | ✅ **Yes** | `MktCalcInsightObjectDef` metadata |

### Key Metadata Types

| Type | Purpose | API Create? |
|------|---------|:-:|
| `MktCalcInsightObjectDef` | Calculated Insights (SQL aggregations) | ✅ |
| `MktDataTranObject` | DLO metadata definitions | ✅ (metadata only, no __dll) |
| `DataStreamDefinition` | Data stream config | ✅ (provisions DLO on deploy) |
| `ObjectSourceTargetMap` | DLO→DMO field mappings | ✅ |
| `CustomObject`, `CustomField`, `CustomTab`, `Layout`, `ListView`, `CompactLayout`, `PermissionSet`, `ValidationRule`, `RecordType` | CRM metadata | ✅ |

### CIO SQL Conventions

- Tables: `__dll` for DLOs, `__dlm` for DMOs
- Fields prefixed: `School_c_Home__dll.City_c__c`
- Aliases end with `__c`: `as city__c`
- Functions: COUNT, SUM, AVG, MIN, MAX

## Key Patterns & Gotchas

### CRM Metadata
- **FLS required after field creation**: `conn.metadata.update("Profile", { fullName: "Admin", fieldPermissions: [...] })`
- **Required picklist fields** cannot have FLS deployed — filter them from permission set and profile
- **ListView Name column** = `NAME` (not `Name` or `FULL_NAME`)
- **Number fields** need explicit `scale: 0`
- **LongTextArea fields** need `visibleLines` property
- **Custom tab format in apps**: `School__c` not `standard-School__c`
- **Standard Lightning apps** (`standard__LightningSales`) are read-only — create custom apps instead

### Data Cloud
- **DLOs/DMOs cannot be created via API** — only via UI data stream deploy
- **MktDataTranObject** creates metadata only, NOT provisioned __dll storage
- **MktDataTranObject required fields**: `connector`, `dataSource`, `dataSourceObject`, `objectCategory` (format: `Salesforce_SFDCReferenceModel_0_93.Related`)
- **CIOs are the correct way** to do SQL transforms (not /ssot/data-transforms)
- **CRM Connector** data stream creation requires browser (UI only)
- Initial data stream sync takes 5-15 minutes
- `/ssot/data-transforms` batch API (STL nodes) works but requires provisioned __dll targets

### Testing
- **Unit tests**: Use `createMockConnection()` from `tests/helpers/mock-connection.ts`
- **Integration tests**: Use `describe.skipIf(!HAS_SF_CREDENTIALS)` — skip gracefully without .env
- **Integration cleanup**: `TestCleanupRegistry` tracks & deletes in reverse dependency order
- **Auth unit tests** need `vi.resetModules()` + `vi.stubEnv()` because auth.ts reads env at import time
