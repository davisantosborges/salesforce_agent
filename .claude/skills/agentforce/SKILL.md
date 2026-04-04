---
name: agentforce
description: Create Agentforce agent components — topics (GenAiPlugin), actions (GenAiFunction), planners, and Apex invocable methods. Use when building AI agents, creating agent topics/actions, or wiring platform events to Agentforce.
---

# Agentforce Integration

**Full reference:** [docs/AGENTFORCE_DEVELOPER_REFERENCE.md](../../../docs/AGENTFORCE_DEVELOPER_REFERENCE.md) — CLI commands, metadata types, Agent Script syntax, API endpoints, version history

**Module:** `src/data-cloud.ts` (Agentforce metadata), Apex via Tooling API

## Concepts

```
Bot → GenAiPlanner (ReAct reasoning) → GenAiPlugin (topic) → GenAiFunction (action) → Apex/Flow
```

- **GenAiPlugin** (Topic): Category of actions with instructions for when/how the agent uses them
- **GenAiFunction** (Action): Individual operation pointing to Apex `@InvocableMethod` or Flow
- **GenAiPlanner**: Orchestrator connecting topics + actions to an agent (uses ReAct reasoning)

## What's Deployed

- **Apex**: `SchoolActionInvocable` — `@InvocableMethod` that publishes `School_Action__e`
- **Action**: `Publish_School_Action` — GenAiFunction → Apex
- **Topic**: `School_Management` — GenAiPlugin with 7 instructions for school operations
- **Flow**: User → Agent → Topic → Action → Apex → Platform Event → Event Bus

## Creating Components via Metadata API

### GenAiFunction (Action)
```typescript
await conn.metadata.create("GenAiFunction", {
  fullName: "Publish_School_Action",
  description: "Publishes a School Action platform event...",
  invocationTarget: "SchoolActionInvocable",  // Apex class name
  invocationTargetType: "apex",                // "apex" or "flow"
  isConfirmationRequired: "true",
  masterLabel: "Publish School Action",
});
```

### GenAiPlugin (Topic)
```typescript
await conn.metadata.create("GenAiPlugin", {
  fullName: "School_Management",
  description: "Help users manage schools...\n\nInstructions:\n1. ...",
  developerName: "School_Management",
  genAiFunctions: { functionName: "Publish_School_Action" },
  language: "en_US",
  masterLabel: "School Management",
  pluginType: "Topic",
});
```

### Apex InvocableMethod (via Tooling API)
```typescript
await conn.tooling.create("ApexClass", {
  Body: "public class MyInvocable { @InvocableMethod ... }",
  Name: "MyInvocable",
});
```

## GenAiPlannerBundle (Agent Wiring) — v66.0+

**Works via Metadata API with v66.0!** (failed with v62.0)

```typescript
// GenAiPlannerBundle — creates the agent reasoning container
await conn.metadata.create("GenAiPlannerBundle", {
  fullName: "My_Agent_v1",
  masterLabel: "My Agent",
  description: "Agent description",
  plannerType: "AiCopilot__ReAct",  // required
});
```

**Or use sf CLI (recommended — handles all dependencies):**
```bash
sf agent generate authoring-bundle --no-spec --api-name My_Agent -o myOrg
# Edit the .agent file
sf agent publish authoring-bundle -o myOrg --api-name My_Agent
```

Valid plannerTypes: `AiCopilot__ReAct`, `Atlas__ConcurrentMultiAgentOrchestration`

**Note:** `GenAiPlanner` (old type) still has internal errors via create — use `GenAiPlannerBundle` (v64+) or `sf agent` CLI instead.

## Gotchas

- **API version matters**: GenAiPlannerBundle requires v66.0+, GenAiPlanner is deprecated
- Apex classes deploy via Tooling API (`conn.tooling.create("ApexClass", ...)`)
- GenAiFunction/GenAiPlugin deploy via Metadata API (`conn.metadata.create(...)`)
- `invocationTargetType`: "apex" for `@InvocableMethod`, "flow" for Flows
- `isConfirmationRequired: "true"` — agent asks user to confirm before executing
- Agent Script uses pipe template syntax (`-> |`) not quoted strings for reasoning instructions
- Escalation actions need explicit `description`
- `sf agent publish` creates Bot + BotVersion + GenAiPlannerBundle from a single .agent file
- Topic instructions are critical — they guide the Atlas Reasoning Engine
