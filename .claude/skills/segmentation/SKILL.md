---
name: segmentation
description: Create Data Cloud segments (MarketSegmentDefinition) for audience definition. Use when creating segments, filtering DMO records, defining audiences, or working with segmentation criteria.
---

# Data Cloud Segmentation

**Tool:** `src/skills/segmentation.ts`
**Reference:** `src/create-school-segment.ts`

## Usage

```typescript
import { createDataCloudSegment } from "./skills/segmentation";

const result = await createDataCloudSegment(conn, {
  name: "Active_Schools",
  label: "Active Schools",
  segmentOn: "SchoolCustom__dlm",
  filter: {
    field: "Status_c__c",
    operator: "equals",
    value: "Active",
    dataType: "TEXT",
  },
});
```

## Prerequisites

- DMO must be category **"Profile" or "Engagement"** (NOT "Other")
- Data stream must be synced with records
- DMO must be provisioned in `/ssot/data-model-objects`

## Filter Operators

- Text: `equals`, `not equals`, `contains`, `starts with`
- Number: `equals`, `greater than`, `less than`, `greater than or equal`, `less than or equal`
- Boolean: `equals`
- Date: `equals`, `greater than`, `less than`

## Metadata Structure

```json
{
  "fullName": "Active_Schools",
  "masterLabel": "Active Schools",
  "segmentOn": "SchoolCustom__dlm",
  "segmentType": "UI",
  "includeCriteria": "{JSON filter expression}"
}
```

## Gotchas

- `segmentOn` must be a DMO with __dlm suffix and Profile/Engagement category
- `includeCriteria` is a **JSON string** (stringified filter object)
- Category "Other" DMOs **cannot** be used for segmentation
- To change DLO category: update `MktDataTranObject.objectCategory` then redeploy data stream
- Publishing requires the DMO to be fully provisioned
