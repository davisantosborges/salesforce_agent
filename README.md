# Salesforce Interaction Toolkit

A TypeScript toolkit for configuring Salesforce orgs programmatically using Metadata API, Tooling API, and browser automation. Built to test Claude Code's ability to act as a Salesforce configuration agent.

## What it does

- Creates complete custom objects with all supporting components (fields, tabs, layouts, list views, permissions, validation rules, Lightning apps)
- Replicates CRM objects to Data Cloud via CRM Connector
- Verifies configurations through three test layers: unit, integration, and functional (browser)
- Provides reusable skills for repeatable Salesforce configuration workflows

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in .env with your Salesforce credentials (see Auth section)
npm run test:auth    # Verify connection
npm test             # Run all tests
```

## Auth

The toolkit supports three authentication methods (tried in order):

| Method | Env Vars | When to use |
|--------|----------|-------------|
| **Access Token** | `SF_ACCESS_TOKEN`, `SF_INSTANCE_URL`, `SF_REFRESH_TOKEN` | Primary method, auto-refreshes |
| **SF CLI** | `SF_CLI_ALIAS` | When `sf org login web` has been run |
| **SOAP Password** | `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` | Only if SOAP login is enabled |

To get an access token via OAuth:
1. Open the OAuth URL in your browser (see `.env.example` for format)
2. Authorize and copy the redirect URL
3. Extract `access_token`, `refresh_token`, `instance_url` into `.env`

## Project Structure

```
src/
  auth.ts                     # Connection management (token, CLI, SOAP)
  metadata.ts                 # Metadata API (14 functions: objects, fields, tabs, layouts, etc.)
  tooling.ts                  # Tooling API (describe, query, Apex, validation rules)
  index.ts                    # Public API exports

  skills/
    create-custom-object.ts   # Complete object creation workflow (10 steps + verify + test)
    data-cloud-replication.ts # CRM Connector data stream + custom DMO creation
    functional-test.ts        # Browser-based UI test specifications

  create-school.ts            # Reference: School__c object creation
  verify-school.ts            # Reference: School__c verification report
  run-functional-tests.ts     # Print functional test plan for browser execution
  run-dc-replication.ts       # Data Cloud replication pre-flight + plan

tests/
  helpers/
    mock-connection.ts        # Mock jsforce Connection factory
    test-config.ts            # Reusable test object/field configs
    cleanup.ts                # Test metadata cleanup registry
  unit/                       # 48 tests (mocked, <1s)
  integration/                # 29 tests (real org, ~14s)
```

## Skills

### Create Custom Object

Creates a fully usable Salesforce custom object with all supporting components in one call:

```typescript
import { createCompleteCustomObject } from './skills/create-custom-object';

const result = await createCompleteCustomObject(conn, {
  objectName: "School",
  label: "School",
  pluralLabel: "Schools",
  fields: [
    { name: "School_Type", label: "School Type", type: "Picklist",
      picklistValues: ["Elementary", "High School", "University"], required: true },
    { name: "City", label: "City", type: "Text", length: 80 },
    // ...
  ],
  layoutSections: ["School Information", "Contact", "Address"],
  validationRules: [
    { name: "Require_Code", formula: 'ISBLANK(School_Code__c)', message: "Code required" },
  ],
  createApp: {
    name: "School_Management",
    label: "School Management",
  },
});
```

**What it creates** (in dependency order):
1. Custom Object
2. Custom Fields (all types: Text, Number, Picklist, Email, Phone, Date, LongTextArea, Lookup...)
3. Page Layout (organized into sections)
4. List View (with configurable columns)
5. Compact Layout (for mobile/highlights)
6. Custom Tab (with icon)
7. Permission Set (full CRUD + FLS)
8. Admin Profile FLS (makes fields visible)
9. Validation Rules
10. Lightning App (optional)

Then **verifies** all components exist and **tests** with a create/read/update/delete cycle.

### Data Cloud Replication

Replicates a CRM object into Data Cloud:

```bash
npx tsx src/run-dc-replication.ts School__c
```

Runs API pre-flight checks, then prints a 15-step browser execution plan for:
- CRM Connector data stream creation
- Custom DMO creation with auto field mapping
- Data refresh and verification

### Functional Tests

Browser-based UI tests executed by Claude Code via chrome automation:

```bash
npx tsx src/run-functional-tests.ts School__c
```

8 test steps: tab navigation, list view columns, record form, record creation, 2 validation rules, edit, delete.

## Metadata API Functions

| Function | What it does |
|----------|-------------|
| `createCustomObject` | Create object with name field, sharing model |
| `createCustomField` | All field types (Text, Number, Picklist, Lookup, LongTextArea...) |
| `createCustomTab` | Object tab with icon |
| `createLayout` / `updateLayout` | Page layout with sections and field placement |
| `createListView` | List view with columns and filters |
| `createCompactLayout` | Mobile/highlights layout (max 10 fields) |
| `createPermissionSet` | Object CRUD + field-level security |
| `createValidationRule` | Formula-based validation with error messages |
| `createRecordType` | Record type variants |
| `readMetadata` / `updateMetadata` / `deleteMetadata` / `listMetadata` | Generic CRUD |

## Testing

```bash
npm test                  # All 77 tests (unit + integration)
npm run test:unit         # Unit only — mocked, no org needed (<1s)
npm run test:integration  # Integration — real org, auto-cleanup (~14s)
npm run test:functional   # Print browser test plan for Claude Code
npm run test:coverage     # With coverage report
npm run test:watch        # Interactive watch mode
```

### Test Architecture

| Layer | Tests | What | Speed |
|-------|-------|------|-------|
| Unit | 48 | Payload correctness, defaults, error handling | <1s |
| Integration | 29 | Real API CRUD, field types, cleanup | ~14s |
| Functional | 8 | Browser UI: forms, validation, CRUD | ~5min |

Integration tests create `ZZTest_*` objects and clean them up automatically via `TestCleanupRegistry`.

## Key Learnings

These are non-obvious patterns discovered during development:

- **FLS required after field creation**: Fields created via Metadata API need an explicit Admin Profile FLS update to be accessible via REST/SOAP data APIs
- **Number fields need `scale: 0`**: Even for integers, the scale must be explicitly set
- **LongTextArea needs `visibleLines`**: Required property or creation fails
- **ListView Name column = `NAME`**: Not `Name` or `FULL_NAME`
- **Required picklist fields can't have FLS deployed**: Filter them from permission set and profile FLS
- **Custom tab format in apps**: Use `School__c` not `standard-School__c`
- **Standard Lightning apps are read-only**: Create a custom app instead of modifying `standard__LightningSales`
- **Data Cloud CRM Connector is UI-only**: Can't create data streams via API, but can verify via `/ssot/` endpoints
