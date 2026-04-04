# Salesforce Interaction Toolkit

A TypeScript toolkit for configuring Salesforce orgs programmatically using Metadata API, Tooling API, REST API, and browser automation. Built to test Claude Code's ability to act as a Salesforce configuration agent.

## What it does

- **CRM Configuration** — custom objects, fields, tabs, layouts, permissions, validation rules, Lightning apps, platform events
- **Data Cloud** — CRM Connector replication, Ingestion API, Calculated Insights (CIO), segmentation, activation, identity resolution, consent management, Data Kits
- **Agentforce** — AI agent with topics, actions, Apex invocable methods, Agent Script deployment
- **Testing** — 115 unit tests, 29 integration tests, 8 browser-based functional tests
- **14 Claude Code skills** as `/slash-commands` with auto-discovery

## Quick Start

```bash
npm install
```

Then use the **setup skill** — Claude Code will guide you interactively:

```
/setup-salesforce
```

This walks you through:
1. Connecting to your Salesforce org (OAuth token)
2. Creating the `.env` file with credentials
3. Authenticating `sf` CLI (for Agentforce)
4. Setting up Data Cloud Ingestion API (optional)
5. Running tests to verify everything works

Or do it manually:

```bash
cp .env.example .env
# Fill: SF_ACCESS_TOKEN, SF_INSTANCE_URL, SF_REFRESH_TOKEN
npm run test:auth    # Verify connection
npm test             # Run all tests
```

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

## Skills (14 slash commands)

| Skill | Command | API |
|-------|:-------:|:---:|
| **Setup** | `/setup-salesforce` | Interactive guide |
| Custom Object | `/create-custom-object` | Metadata |
| Platform Event | `/platform-event` | Metadata + REST |
| Data Cloud | `/data-cloud` | Metadata + Browser |
| Ingestion API | `/ingestion-api` | REST (DC token) |
| Segmentation | `/segmentation` | Metadata + REST |
| Activation | `/activation` | REST |
| Identity Resolution | `/identity-resolution` | REST |
| Data Kits | `/data-kits` | Metadata |
| Consent | `/consent` | REST |
| Agentforce | `/agentforce` | Metadata + Tooling + CLI |
| Functional Test | `/functional-test` | Browser |
| Testing | `/test` | Vitest |

## Auth

Uses OAuth access token with auto-refresh. SOAP login is **disabled** in this org.

```bash
cp .env.example .env
# Fill: SF_ACCESS_TOKEN, SF_INSTANCE_URL, SF_REFRESH_TOKEN
```

Token auto-refreshes. If fully expired, get a new one via OAuth browser flow (see CLAUDE.md).

## Testing

```bash
npm test                          # All 115 unit + 29 integration tests
npm run test:unit                 # Unit only (<1s, no org needed)
npm run test:integration          # Integration (needs .env, ~14s)
npm run test:functional           # Browser test plan for Claude Code
npm run test:coverage             # With coverage report
```

## Reference Scripts

```bash
npx tsx src/create-school.ts              # School__c + 17 fields + all components
npx tsx src/create-school-event.ts        # School_Action__e platform event (8 fields)
npx tsx src/create-school-summary.ts      # School City Summary CIO
npx tsx src/create-school-segment.ts      # Active Schools segment
npx tsx src/ingest-school-data.ts         # Push 5 schools via Ingestion API
npx tsx src/verify-school.ts              # Full verification report
```

## Project Structure

```
src/
  auth.ts                         # OAuth (access token, refresh, sf CLI, SOAP)
  metadata.ts                     # 14+ Metadata API functions
  tooling.ts                      # Tooling API (describe, query, Apex)
  data-cloud.ts                   # Data Cloud (DLO, CIO, segments, activation, IR, consent, kits, agents)
  index.ts                        # Public API exports
  skills/                         # TypeScript skill tools
  create-school*.ts               # Reference scripts
.claude/skills/                   # Claude Code skill docs (13 SKILL.md files)
force-app/                        # Agentforce DX (Agent Script + Bot metadata)
schemas/                          # OpenAPI schemas (Ingestion API)
tests/                            # Unit (115) + integration (29) + helpers
```

## Deployed in Org

| Component | Type |
|-----------|------|
| School__c | Custom object (17 fields, tab, layout, permissions) |
| School Management | Lightning app |
| School_Action__e | Platform event (8 fields) |
| School_c_Home | CRM Connector data stream + DLO |
| SchoolDataConnector | Ingestion API connector + Profile DLO + DMO |
| School_City_Summary | Calculated Insight (CIO) |
| Active_Schools_Profile | Segment |
| SchoolActionInvocable | Apex @InvocableMethod |
| Publish_School_Action | GenAiFunction (agent action) |
| School_Management | GenAiPlugin (agent topic) |
| School_Management_Agent | Agentforce bot (Agent Script) |
| School_Data_Kit | Data Kit |
| DataCloudIngestionApp | Connected App (cdp_ingest_api) |

## Key Patterns Discovered

- **FLS required** after field creation via Metadata API
- **DLOs/DMOs cannot be created via API** — only via UI data stream deploy
- **CIOs (MktCalcInsightObjectDef)** are the correct API for SQL transforms
- **GenAiPlannerBundle** requires API v66.0+ (v62 doesn't support it)
- **DC Token Exchange** needed for Ingestion API (`/services/a360/token`)
- **Segmentation** requires DMO category "Profile" or "Engagement" (not "Other")
- **Agent Script** (`.agent` file) + `sf agent publish` creates all agent metadata from one file

## API Version

**v66.0** (Spring '26) throughout.
