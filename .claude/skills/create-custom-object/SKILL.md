---
name: create-custom-object
description: Create Salesforce custom objects with all supporting components — fields, tab, layout, list view, permissions, validation rules, and Lightning app. Use when creating new objects, adding fields, or setting up a complete custom object.
---

# Create Custom Object

**Tool:** `src/skills/create-custom-object.ts`
**Reference:** `src/create-school.ts`

## Usage

```typescript
import { login } from "./auth";
import { createCompleteCustomObject } from "./skills/create-custom-object";

const conn = await login();
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
  createApp: { name: "School_Management", label: "School Management" },
});
```

Or run: `npx tsx src/create-school.ts`

## Creates (in order)

Object → Fields → Layout → ListView → CompactLayout → Tab → PermissionSet → Admin Profile FLS → Validation Rules → Lightning App

## Gotchas

- **FLS required**: Always updates Admin Profile after field creation — fields invisible without it
- **Required picklist fields**: Cannot have FLS deployed — auto-filtered
- **Number fields**: Need explicit `scale: 0`
- **LongTextArea**: Needs `visibleLines`
- **ListView Name column**: `NAME` (not `Name` or `FULL_NAME`)
- **Tab format in apps**: `School__c` (not `standard-School__c`)
- **Standard Lightning apps**: Read-only — create custom apps instead
- **Checkbox fields**: Need `defaultValue: "false"`
