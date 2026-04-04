---
name: activation
description: Manage Data Cloud activations — publish segments to external systems like Marketing Cloud, Google Ads, Meta, S3. Use when activating segments, configuring activation targets, or publishing data to downstream platforms.
---

# Data Cloud Activation

**Module:** `src/data-cloud.ts`

Activations publish segments to external systems. The flow is:

```
Segment → Activation Target (destination config) → Activation (publish)
```

## Concepts

- **Activation Platform**: The external system type (Marketing Cloud, Google Ads, Meta, S3, etc.)
- **Activation Target**: A specific account/instance of a platform with auth credentials (1 platform → N targets)
- **Activation**: The actual publishing of a segment to a target with field mappings

## Usage

```typescript
import {
  listActivationTargets,
  createActivationTarget,
  listActivations,
  createActivation,
  listActivationPlatforms,
} from "./data-cloud";

// List available platforms (metadata)
const platforms = await listActivationPlatforms(conn);

// List existing targets
const targets = await listActivationTargets(conn);

// Create a target
const target = await createActivationTarget(conn, {
  name: "MyMarketingTarget",
  activationPlatformName: "MarketingCloud",
});

// Create an activation (publish segment to target)
const activation = await createActivation(conn, {
  activationTargetName: "MyMarketingTarget",
  segmentName: "Active_Schools_Profile",
  contactPointPath: {
    fieldApiName: "Email__c",
    objectApiName: "SchoolProfileDMO__dlm",
  },
});

// List all activations
const activations = await listActivations(conn);
```

## API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| List targets | GET | `/ssot/activation-targets` |
| Get target | GET | `/ssot/activation-targets/{id}` |
| Create target | POST | `/ssot/activation-targets` |
| Delete target | DELETE | `/ssot/activation-targets/{id}` |
| List activations | GET | `/ssot/activations` |
| Get activation | GET | `/ssot/activations/{id}` |
| Create activation | POST | `/ssot/activations` |
| Delete activation | DELETE | `/ssot/activations/{id}` |

## Built-in Activation Platforms

Marketing Cloud, Google Ads, Meta, LinkedIn, Amazon S3, Azure Blob, Sales Cloud, Service Cloud, B2C Commerce Cloud

## Gotchas

- Deleting a target severs ALL segment connections using it
- Activation requires a published segment with data
- Contact point mapping varies by target type (Email, Phone, MAID, OTT)
- `ActivationPlatform` metadata type exists for deployment/packaging
- Custom platforms can be built via External Activation Platforms (ISV toolkit)
