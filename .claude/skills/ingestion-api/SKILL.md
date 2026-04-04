---
name: ingestion-api
description: Push data into Data Cloud via Ingestion API — DC token exchange, streaming JSON ingestion, bulk CSV upload. Use when loading data into Data Cloud DLOs, pushing records via API, or setting up Ingestion API connectors.
---

# Ingestion API

**Module:** `src/data-cloud.ts` (exchangeDCToken, ingestData, deleteIngestionData)
**Reference:** `src/ingest-school-data.ts`
**Schema:** `schemas/school-ingestion-schema.yaml`

## Prerequisites

1. **Ingestion API Connector** created in Setup (UI — one-time)
2. **OpenAPI schema** uploaded to connector (UI — one-time)
3. **Data Stream** deployed with correct category (UI — one-time)
4. **Connected App** with `cdp_ingest_api` + `api` OAuth scopes
5. **SF token** obtained via OAuth with the Connected App (not PlatformCLI)

## Usage

```typescript
import { exchangeDCToken, ingestData } from "./data-cloud";

// Step 1: Exchange SF token for DC token
const dcToken = await exchangeDCToken(instanceUrl, sfAccessToken);
// Returns: { accessToken, instanceUrl: "https://xxx.c360a.salesforce.com", expiresIn }

// Step 2: Push records
const result = await ingestData(dcToken, "SchoolDataConnector", "SchoolProfile", [
  { SchoolId: "SCH-001", SchoolName: "Lincoln High", Status: "Active", City: "Springfield", LastModified: new Date().toISOString() },
]);
// Returns: { accepted: true } (202 — async processing ~3 min)
```

## DC Token Exchange

```
POST {instance_url}/services/a360/token
  grant_type=urn:salesforce:grant-type:external:cdp
  subject_token={sf_token_with_cdp_scope}
  subject_token_type=urn:ietf:params:oauth:token-type:access_token
```

## Gotchas

- **PlatformCLI tokens DON'T work** — need Connected App with `cdp_ingest_api` scope
- DC `instance_url` in response may lack `https://` — function auto-fixes this
- Streaming: JSON, max 200KB per request, async processing ~3 minutes
- Bulk: CSV, max 150MB per file, uses Bulk API 2.0 pattern
- Records must match the OpenAPI schema exactly (field names, types)
- `LastModified` field format: ISO 8601 (`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`)
- Connected App: DataCloudIngestionApp (created in org)

## Deployed in Org

- **Connector:** SchoolDataConnector
- **Schema:** SchoolProfile (18 fields)
- **Data Stream:** SchoolDataConnector-SchoolProfile (Profile category, Active)
- **DMO:** SchoolProfileDMO (18 fields mapped)
- **DC Tenant:** `https://gvrg0ztdg8ywmzjwmmzd19ldgq.c360a.salesforce.com`
