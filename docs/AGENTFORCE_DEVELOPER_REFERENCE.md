# Agentforce Developer Reference

> **Important**: This document references the Agentforce Developer Guide as of Spring '26 (v66.0).
> Always verify against the latest official documentation before implementing.

## Official Documentation

| Resource | URL |
|----------|-----|
| **Agentforce Developer Guide** | https://developer.salesforce.com/docs/ai/agentforce/guide |
| **Agentforce Overview** | https://developer.salesforce.com/docs/ai/agentforce/overview |
| **Agent DX (Developer Experience)** | https://developer.salesforce.com/docs/ai/agentforce/guide/agent-dx.html |
| **Agent Script Language** | https://developer.salesforce.com/docs/ai/agentforce/guide/agent-script.html |
| **Agent Metadata Types** | https://developer.salesforce.com/docs/ai/agentforce/references/agents-metadata-tooling/agents-metadata.html |
| **Agent API (Runtime)** | https://developer.salesforce.com/docs/ai/agentforce/references/agent-api/agent-api.html |
| **Agent Testing** | https://developer.salesforce.com/docs/ai/agentforce/guide/agent-testing.html |
| **Create Actions (InvocableMethod)** | https://developer.salesforce.com/docs/ai/agentforce/guide/agent-invocablemethod.html |
| **External Service Actions** | https://developer.salesforce.com/docs/ai/agentforce/guide/agent-external-service.html |
| **Best Practices for Actions** | https://developer.salesforce.com/blogs/2025/07/best-practices-for-building-agentforce-apex-actions |
| **Platform Events + Agents** | https://developer.salesforce.com/blogs/2025/07/integrate-agents-with-platform-events |
| **Metadata API: GenAiPlugin** | https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_genaiplugin.htm |
| **Metadata API: GenAiFunction** | https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_genaifunction.htm |
| **Metadata API: GenAiPlannerBundle** | https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_genaiplannerbundle.htm |
| **Metadata API: Bot** | https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_bot.htm |

## SF CLI Agent Commands

```bash
# --- Agent Creation ---
sf agent generate agent-spec          # Generate YAML spec from org agent
sf agent generate authoring-bundle    # Generate Agent Script (.agent file)
sf agent generate template            # Generate packageable template
sf agent create                       # Create agent from spec YAML

# --- Agent Lifecycle ---
sf agent publish authoring-bundle     # Publish Agent Script → creates Bot + BotVersion + GenAiPlannerBundle
sf agent activate                     # Activate an agent
sf agent deactivate                   # Deactivate an agent

# --- Agent Testing ---
sf agent generate test-spec           # Generate test YAML
sf agent test create                  # Create test in org from spec
sf agent test run                     # Run agent tests
sf agent test results                 # Get test results
sf agent test resume                  # Resume and view results
sf agent test list                    # List available tests

# --- Agent Preview ---
sf agent preview                      # Interactive preview (chat with agent in terminal)
sf agent preview --apex-debug         # With Apex debug logging
sf agent preview --authoring-bundle   # Preview unpublished bundle

# --- Agent Validation ---
sf agent validate                     # Validate Agent Script syntax
```

## Metadata Types (API v66.0+)

| Type | Purpose | Deployable | Notes |
|------|---------|:----------:|-------|
| `Bot` | Top-level agent definition | ✅ | Contains BotVersion child |
| `BotVersion` | Agent version config | ✅ | ConversationVariables |
| `GenAiPlannerBundle` | Reasoning container (v64+) | ✅ | Replaces GenAiPlanner |
| `GenAiPlanner` | **DEPRECATED** (v60-63) | ❌ create | Read/list still work |
| `GenAiPlugin` | Agent topic | ✅ | Instructions + action refs |
| `GenAiFunction` | Agent action | ✅ | Points to Apex/Flow/External Service |
| `AiAuthoringBundle` | Agent Script file | ✅ | Single source of truth for agent |
| `GenAiPromptTemplate` | Prompt templates | ✅ | Used as grounding/actions |
| `ExternalServiceRegistration` | External API definition | ✅ | OpenAPI spec → agent action |
| `BotBlock` | Conversation blocks | ✅ | Legacy Einstein Bot |
| `BotTemplate` | Agent templates | ✅ | For packaging |

## Agent Script (.agent file)

The Agent Script language is the primary way to define agents programmatically. Key syntax:

```yaml
system:
    instructions: "You are an AI agent that..."
    messages:
        welcome: "Hi, how can I help?"
        error: "Something went wrong."

config:
    developer_name: "My_Agent"
    agent_label: "My Agent"

# Topics use pipe template syntax for instructions
topic my_topic:
    label: "My Topic"
    description: "What this topic handles"
    reasoning:
        instructions: ->
            | Multi-line instructions go here.
              Each line is indented with spaces.
        actions:
            my_action: @action.My_Action_Name
            escalate: @utils.escalate
                description: "Escalate to human agent."
            go_to_topic: @utils.transition to @topic.other_topic
```

**Key syntax rules:**
- `reasoning.instructions` uses `->` pipe template (`| ...`), NOT quoted strings
- Actions reference: `@action.GenAiFunctionName` for custom, `@utils.escalate` for built-in
- Topic transitions: `@utils.transition to @topic.topic_name`
- Escalation actions MUST have a `description`

## Agent API (Runtime)

For invoking agents programmatically from external systems:

```
POST /services/data/v66.0/einstein/agent-runtime/sessions
  → Creates a session

POST /services/data/v66.0/einstein/agent-runtime/sessions/{sessionId}/messages
  → Sends a message to the agent

GET /services/data/v66.0/einstein/agent-runtime/sessions/{sessionId}/messages
  → Gets agent responses
```

Requires Client Credential OAuth flow.

## Key Patterns for This Toolkit

### What we implemented:
1. **Apex @InvocableMethod** → deployed via Tooling API (`conn.tooling.create("ApexClass", ...)`)
2. **GenAiFunction** → created via Metadata API (`conn.metadata.create("GenAiFunction", ...)`)
3. **GenAiPlugin** → created via Metadata API (`conn.metadata.create("GenAiPlugin", ...)`)
4. **GenAiPlannerBundle** → created via Metadata API (requires v66.0+) or `sf agent publish authoring-bundle`
5. **Full Agent** → deployed via `sf agent publish authoring-bundle` from Agent Script file

### What could be added:
- **Agent Testing** — `sf agent test run` for automated agent behavior testing
- **Agent Preview** — `sf agent preview` for interactive terminal testing
- **External Service Actions** — OpenAPI spec → agent action without Apex/Flow wrapper
- **MCP Integration** — Model Context Protocol for connecting to external tools (check latest docs)
- **Agent-to-Agent** — Subagent orchestration (`Atlas__ConcurrentMultiAgentOrchestration` planner type)

## Version History

| API Version | What Changed |
|:-----------:|-------------|
| v60.0 | GenAiPlanner, GenAiPlugin, GenAiFunction introduced |
| v64.0 | GenAiPlannerBundle replaces GenAiPlanner |
| v65.0 | AiAuthoringBundle (Agent Script) introduced |
| v66.0 | Current (Spring '26) — full Agentforce DX support |
