---
name: identity-resolution
description: Manage Data Cloud Identity Resolution — match rules, reconciliation rules, unified profiles. Use when deduplicating records, creating unified customer profiles, configuring match/reconciliation rulesets, or working with Unified Individual DMO.
---

# Identity Resolution

**Module:** `src/data-cloud.ts`

Identity Resolution matches and links fragmented customer records from multiple sources into unified profiles.

## Concepts

```
Source Records (Individual DMO + Contact Points) → Match Rules → Unified Individual → Unified Links
```

- **Match Rules**: Exact, ExactNormalized (handles variations), Fuzzy (phonetic/probabilistic)
- **Reconciliation Rules**: SourcePriority, LastUpdated, MostFrequent
- **Rulesets**: Collection of match + reconciliation rules (max 2 per data space)
- **Unified Individual**: Consolidated profile linking all matching source records
- **Unified Links**: Bridge objects connecting source records to unified profiles

## Usage

```typescript
import {
  listIdentityResolutions,
  getIdentityResolution,
  createIdentityResolution,
  runIdentityResolution,
} from "./data-cloud";

// List existing rulesets
const rulesets = await listIdentityResolutions(conn);

// Create a ruleset
const result = await createIdentityResolution(conn, {
  name: "School_Identity_Rules",
  matchRules: [
    { fieldName: "Email__c", objectName: "ssot__Individual__dlm", matchType: "ExactNormalized" },
    { fieldName: "ssot__PersonName__c", objectName: "ssot__Individual__dlm", matchType: "Fuzzy" },
  ],
  reconciliationRules: [
    { fieldName: "ssot__PersonName__c", strategy: "LastUpdated" },
  ],
});

// Trigger execution (async — initial run takes up to 24 hours)
await runIdentityResolution(conn, rulesetId);
```

## Prerequisites

1. **Individual DMO** must be mapped with data
2. **At least one Contact Point DMO** (Email, Phone, Address) OR Party Identification
3. IDs must be **unique within each source**
4. Contact Point DMOs need a **"party" foreign key** linking to Individual

## API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| List rulesets | GET | `/ssot/identity-resolutions` |
| Get ruleset | GET | `/ssot/identity-resolutions/{id}` |
| Create ruleset | POST | `/ssot/identity-resolutions` |
| Run now | POST | `/ssot/identity-resolutions/{id}/run` |

## Match Types

| Type | Use When | Example |
|------|----------|---------|
| **Exact** | Stable identifiers | Loyalty ID, Customer ID |
| **ExactNormalized** | Fields with formatting variations | Email (casing), Phone (punctuation) |
| **Fuzzy** | Human-entered fields with typos | Name (David/Dave), Address |

## Gotchas

- No Metadata API type — REST API only (`/ssot/identity-resolutions`)
- Initial processing takes up to **24 hours**, subsequent runs are daily
- Max **2 rulesets per data space**
- Unified profiles are mutable — they evolve as data/rules change
- Unified Individual is NOT a golden record — it's a linked key ring of source records
- Deploy across orgs via **Data Kits** (not direct metadata)
