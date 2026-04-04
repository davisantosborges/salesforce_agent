---
name: consent
description: Check and manage consent preferences for GDPR/CCPA compliance. Use when checking opt-in/opt-out status, verifying email consent, processing data subject requests, or enforcing privacy preferences.
---

# Consent Management

**Module:** `src/data-cloud.ts`

Consent Management enforces privacy preferences (GDPR, CCPA) across segmentation, activation, and data processing.

## Usage

```typescript
import { getConsentActions, checkConsent, checkMultiConsent } from "./data-cloud";

// List available consent action types
const actions = await getConsentActions(conn);
// Returns: email, solicit, track, geotrack, process, profile, storepiielsewhere, portability, shouldforget

// Check consent for specific action + record IDs
const status = await checkConsent(conn, "email", "003xx000004TxyZ");
// Returns: consent status (opt-in, opt-out, not found)

// Check multiple actions at once
const multi = await checkMultiConsent(conn, "003xx000004TxyZ", ["email", "track", "process"]);
```

## Consent Actions

| Action | Purpose |
|--------|---------|
| `email` | Can we send marketing emails? |
| `solicit` | Can we solicit/market to this person? |
| `track` | Can we track behavior/interactions? |
| `geotrack` | Can we track geolocation? |
| `process` | Can we process their data? |
| `profile` | Can we build a profile? |
| `storepiielsewhere` | Can we store PII in external systems? |
| `portability` | Has data portability been requested? |
| `shouldforget` | Has right-to-be-forgotten been requested? |

## API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| List actions | GET | `/consent/action` |
| Check single action | GET | `/consent/action/{type}?ids={ids}` |
| Check multi actions | GET | `/consent/multiaction?ids={ids}&actions={actions}` |

## How It Affects Data Cloud

- **Segmentation**: Opted-out customers excluded from segments
- **Activation**: Suppressed customers not sent to marketing platforms
- **Processing**: Honors "right to be forgotten" requests
- **Profiling**: Respects opt-out from profile building

## Gotchas

- Uses `/consent/` path (NOT `/ssot/consent/`)
- IDs are passed as query parameters, not request body
- Multiple IDs are comma-separated
- Returns `IDS_NOT_FOUND` if no IDs provided
- Consent records must exist in the org (typically via Contact/Lead consent fields)
