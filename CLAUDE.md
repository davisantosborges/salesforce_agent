# Salesforce Interaction Toolkit

TypeScript toolkit for configuring Salesforce orgs programmatically via Metadata API, Tooling API, REST API, and browser automation. API version: **v66.0** (Spring '26).

## Commands

```bash
npm test                    # 115 unit + 29 integration tests
npm run test:unit           # Unit only (<1s, no org)
npm run test:integration    # Real org (~14s, needs .env)
npm run test:functional     # Browser test plan
```

## Auth

OAuth access token with auto-refresh. SOAP login **disabled** in this org.

```bash
cp .env.example .env   # Fill: SF_ACCESS_TOKEN, SF_INSTANCE_URL, SF_REFRESH_TOKEN
```

## Skills (14)

Skills are in `.claude/skills/` — use as `/slash-commands` or they auto-load when relevant.

| Skill | Command | What |
|-------|---------|------|
| **Setup** | `/setup-salesforce` | **Connect org, auth, .env, sf CLI, DC token** |
| Custom Object | `/create-custom-object` | Objects + fields + tabs + layouts + permissions |
| Platform Event | `/platform-event` | Event creation + publish + modify |
| Data Cloud | `/data-cloud` | CRM Connector → DLO → DMO → CIO |
| Ingestion API | `/ingestion-api` | DC token exchange + data push |
| Segmentation | `/segmentation` | MarketSegmentDefinition + filters |
| Activation | `/activation` | Publish segments to external systems |
| Identity Resolution | `/identity-resolution` | Match rules + unified profiles |
| Data Kits | `/data-kits` | Package DC configs for multi-org |
| Consent | `/consent` | GDPR/CCPA privacy compliance |
| Agentforce | `/agentforce` | Topics + actions + Agent Script |
| Functional Test | `/functional-test` | Browser UI tests via Chrome |
| Testing | `/test` | Vitest unit + integration |

## Pipeline

```
Custom Object → Platform Event → Data Cloud → Agentforce Agent
                                    │
                    Ingest → DLO → DMO → Identity Resolution
                                    │         │
                                   CIO    Unified Profile
                                    │         │
                                 Segment → Activation
                                    │
                              Consent Filter
                                    │
                               Data Kit (deploy)
```

## Reference Scripts

```bash
npx tsx src/create-school.ts              # School__c + all components
npx tsx src/create-school-event.ts        # School_Action__e platform event
npx tsx src/create-school-summary.ts      # Data Cloud CIO
npx tsx src/create-school-segment.ts      # Data Cloud segment
npx tsx src/ingest-school-data.ts         # Ingestion API data push
npx tsx src/verify-school.ts              # Verification report
```

## Project Structure

```
src/
  auth.ts, metadata.ts, tooling.ts, data-cloud.ts   # Core modules
  skills/                                             # TypeScript tools
  create-school*.ts, verify-school.ts, run-*.ts       # Reference scripts
.claude/skills/                                       # Claude Code skill docs (13)
force-app/                                            # Agentforce DX (Agent Script)
schemas/                                              # OpenAPI schemas (Ingestion API)
tests/unit/, tests/integration/, tests/helpers/       # Test framework (115 + 29)
```
