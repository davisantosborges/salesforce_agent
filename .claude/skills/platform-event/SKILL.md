---
name: platform-event
description: Create and manage Salesforce Platform Events for event-driven messaging. Use when creating events (__e), publishing messages, setting up action endpoints, or working with Agentforce event triggers.
---

# Platform Events

**Tool:** `src/skills/platform-event.ts`
**Reference:** `src/create-school-event.ts`

## Usage

```typescript
import { createCompletePlatformEvent } from "./skills/platform-event";

const result = await createCompletePlatformEvent(conn, {
  name: "School_Action",
  label: "School Action",
  pluralLabel: "School Actions",
  eventType: "HighVolume",
  publishBehavior: "PublishAfterCommit",
  fields: [
    { name: "Action_Type", label: "Action Type", type: "Text", length: 50, required: true },
    { name: "Payload", label: "Payload", type: "LongTextArea" },
    { name: "Is_Async", label: "Is Async", type: "Checkbox" },
  ],
  testData: { Action_Type__c: "Create", Payload__c: '{"key":"value"}' },
});
```

## Publish

```typescript
import { publishPlatformEvent } from "./metadata";
await publishPlatformEvent(conn, "School_Action__e", { Action_Type__c: "StatusChange", Payload__c: "{}" });
```

## Modify

```typescript
import { addFieldToEvent, updateEventProperty } from "./skills/platform-event";
await addFieldToEvent(conn, "School_Action__e", { name: "New_Field", label: "New", type: "Text", length: 100 });
await updateEventProperty(conn, "School_Action__e", { publishBehavior: "PublishImmediately" });
```

## Rules

- API name ends with `__e`, uses `CustomObject` metadata type
- Supported types: **Text, Number, Checkbox, Date, DateTime, LongTextArea**
- NOT supported: Picklist, Lookup, Formula, RichText
- Checkbox needs `defaultValue: "false"` (auto-set by tool)
- Publish: `POST /services/data/v62.0/sobjects/EventName__e`
- Subscribe: Apex triggers (after insert), Flows, CometD, Pub/Sub API
- Retention: 72h (HighVolume), 24h (StandardVolume)

## Deployed: School_Action__e

8 fields: Action_Type, School_Id, School_Code, Payload, Requested_By, Priority, Correlation_Id, Is_Async
