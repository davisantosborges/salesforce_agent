---
name: data-kits
description: Package Data Cloud configurations for multi-org deployment using Data Kits. Use when packaging DC metadata, deploying across orgs, creating DataPackageKitDefinition, or setting up CI/CD for Data Cloud.
---

# Data Kits

**Module:** `src/data-cloud.ts`

Data Kits are containers that package Data Cloud metadata for deployment across orgs.

## Usage

```typescript
import { createDataKit, readDataKit, listDataKits, deleteDataKit } from "./data-cloud";

// Create a Data Kit
const result = await createDataKit(conn, {
  fullName: "School_Data_Kit",
  label: "School Data Kit",
  description: "School DC config for multi-org deployment",
  versionNumber: "1.0",
});

// Read back
const kit = await readDataKit(conn, "School_Data_Kit");

// List all kits
const kits = await listDataKits(conn);
```

## What Can Be Packaged

| Component | Packageable? |
|-----------|:------------:|
| Data Streams | ✅ |
| DLOs | ✅ |
| DMOs + Field Mappings | ✅ |
| Calculated Insights | ✅ |
| Segments | ✅ |
| Activations | ✅ |
| Identity Resolution | ✅ |
| Data Stream Templates | ✅ |
| **Connector credentials** | ❌ (re-auth required) |
| **Mixed DC + Platform metadata** | ❌ (separate packages) |

## Deployment Workflow

```bash
# 1. Create Data Kit in source org (via API or UI)
# 2. Add components to kit (UI: Data Cloud Setup > Data Kits)
# 3. Download manifest
sf project retrieve start --manifest manifest/package.xml

# 4. Deploy to target org
sf project deploy start --manifest package.xml
```

## Metadata Types

| Type | Purpose |
|------|---------|
| `DataPackageKitDefinition` | Top-level kit container |
| `DataPackageKitObject` | Individual objects within a kit |
| `DataStreamTemplate` | Data stream templates in kits |

## Required Fields for Creation

- `fullName` — API name
- `developerName` — Same as fullName (required, not auto-derived)
- `masterLabel` — Display label
- `versionNumber` — e.g., "1.0"

## Gotchas

- `developerName` is required — unlike most metadata types, it's not auto-derived from `fullName`
- DC metadata and Platform metadata CANNOT be in the same package (Winter '25+)
- Components added to kit via UI after creation (not via metadata.create)
- Connector credentials NOT included — re-authorize in target org after deploy
- Many DC components can ONLY be deployed inside a Data Kit (not standalone)
- `dataKitSource: "EXTERNAL"` and `dataKitType: "NONE"` set automatically
