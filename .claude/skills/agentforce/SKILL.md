---
name: agentforce
description: Create Agentforce agent components — topics (GenAiPlugin), actions (GenAiFunction), planners, and Apex invocable methods. Use when building AI agents, creating agent topics/actions, or wiring platform events to Agentforce.
---

# Agentforce Integration

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

## GenAiPlanner (Agent Wiring)

**⚠️ GenAiPlanner create/update has internal errors via API in this org.**
Use Agentforce Studio UI to assign topics to agents:
1. Open Agentforce Studio
2. Edit or create an agent
3. Add the "School Management" topic
4. The Publish School Action will be available automatically

Required fields: `fullName`, `masterLabel`, `description`, `plannerType: "AiCopilot__ReAct"`, `genAiPlugins[]`, `genAiFunctions[]`

## Gotchas

- Apex classes deploy via Tooling API (`conn.tooling.create("ApexClass", ...)`)
- GenAiFunction/GenAiPlugin deploy via Metadata API (`conn.metadata.create(...)`)
- GenAiPlanner may fail with internal errors — use UI as fallback
- `invocationTargetType`: "apex" for `@InvocableMethod`, "flow" for Flows
- `isConfirmationRequired: "true"` — agent asks user to confirm before executing
- Topic instructions are critical — they guide the Atlas Reasoning Engine
