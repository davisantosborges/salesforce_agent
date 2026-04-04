# Salesforce Interaction Toolkit

TypeScript toolkit for configuring Salesforce orgs via Metadata API, Tooling API, and browser automation. API version: **v66.0** (Spring '26).

## Commands

```bash
npm test                    # 103 unit + 29 integration tests
npm run test:unit           # Unit only (<1s, no org)
npm run test:integration    # Real org (~14s, needs .env)
npm run test:functional     # Browser test plan
```

## Auth

OAuth access token with auto-refresh. SOAP login **disabled** in this org.

```bash
cp .env.example .env   # Fill: SF_ACCESS_TOKEN, SF_INSTANCE_URL, SF_REFRESH_TOKEN
```

## Skills

Skills are in `.claude/skills/` — use as `/slash-commands` or they auto-load when relevant.

| Skill | Command | TypeScript Tool |
|-------|---------|-----------------|
| Custom Object | `/create-custom-object` | `src/skills/create-custom-object.ts` |
| Data Cloud | `/data-cloud` | `src/skills/data-cloud-*.ts` |
| Segmentation | `/segmentation` | `src/skills/segmentation.ts` |
| Activation | `/activation` | `src/data-cloud.ts` |
| Ingestion API | `/ingestion-api` | `src/data-cloud.ts` |
| Platform Event | `/platform-event` | `src/skills/platform-event.ts` |
| Agentforce | `/agentforce` | `src/data-cloud.ts` + `force-app/` |
| Functional Test | `/functional-test` | `src/skills/functional-test.ts` |
| Testing | `/test` | `tests/` |

## Reference Scripts

```bash
npx tsx src/create-school.ts              # School__c + all components
npx tsx src/create-school-summary.ts      # Data Cloud CIO
npx tsx src/create-school-event.ts        # School_Action__e platform event
npx tsx src/create-school-segment.ts      # Data Cloud segment
npx tsx src/ingest-school-data.ts         # Ingestion API data push
npx tsx src/verify-school.ts              # Verification report
```

## Project Structure

```
src/
  auth.ts, metadata.ts, tooling.ts, data-cloud.ts  # Core modules
  skills/                                            # TypeScript tools
  create-school*.ts, verify-school.ts, run-*.ts      # Reference scripts
.claude/skills/                                      # Claude Code skill docs (10 skills)
force-app/                                           # Agentforce DX (Agent Script + metadata)
schemas/                                             # OpenAPI schemas (Ingestion API)
tests/unit/, tests/integration/, tests/helpers/      # Test framework
```
