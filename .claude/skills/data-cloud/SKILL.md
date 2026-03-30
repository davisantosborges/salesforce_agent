---
name: data-cloud
description: Data Cloud replication and Calculated Insight transforms. Use when working with DLOs, DMOs, CIOs, data streams, CRM Connector, MktCalcInsightObjectDef, data lake objects, or SQL aggregations in Data Cloud.
---

# Data Cloud (Replication + Transforms)

**Tools:**
- `src/skills/data-cloud-replication.ts` — CRM Connector replication workflow
- `src/skills/data-cloud-transform.ts` — Calculated Insight creation
- `src/data-cloud.ts` — Data Cloud API module

**References:** `src/run-dc-replication.ts`, `src/create-school-summary.ts`

## Object Hierarchy

```
Data Source → Data Stream → DSO → DLO (__dll) → DMO (__dlm) → CIO
```

| Object | API Creatable? | How |
|--------|:-:|------|
| DLO | ❌ | Auto-created by Data Stream deploy (UI only) |
| DMO | ❌ | Byproduct of ObjectSourceTargetMap field mapping (UI) |
| CIO | ✅ | `MktCalcInsightObjectDef` metadata |

## Calculated Insights (CIO) — SQL Transforms

```typescript
import { createDataCloudTransform } from "./skills/data-cloud-transform";

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

## CIO SQL Conventions

- Tables: `__dll` (DLO) or `__dlm` (DMO)
- Fields prefixed: `School_c_Home__dll.City_c__c`
- Aliases end with `__c`: `as city__c`
- Functions: COUNT, SUM, AVG, MIN, MAX

## Replication (6 phases)

1. Pre-flight (API) → 2. Create Data Stream (Browser) → 3. DMO mapping (Browser) → 4. **CIO (API)** → 5. Verify → 6. Test

## Gotchas

- DLOs/DMOs cannot be created via API — only via UI
- `MktDataTranObject` = metadata only, NOT provisioned __dll storage
- Use `MktCalcInsightObjectDef` for SQL transforms (not `/ssot/data-transforms`)
- `MktDataTranObject` requires: `connector`, `dataSource`, `dataSourceObject`, `objectCategory` (format: `Taxonomy.Category`)
