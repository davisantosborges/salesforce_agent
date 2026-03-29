/**
 * Reference: Create a School_Action__e Platform Event.
 *
 * This event will be used as an action endpoint for automations,
 * Agentforce actions, and external integrations.
 *
 * Fields:
 * - Action_Type: What action to perform (Create, Update, Delete, Enroll, etc.)
 * - School_Id: The School__c record ID
 * - School_Code: The school code for matching
 * - Payload: JSON payload with action-specific data
 * - Requested_By: Who/what triggered the action
 * - Priority: Action priority (High, Medium, Low)
 *
 * Usage: npx tsx src/create-school-event.ts
 */

import { login } from "./auth";
import { createCompletePlatformEvent } from "./skills/platform-event";
import type { CompleteEventConfig } from "./skills/platform-event";

const schoolActionConfig: CompleteEventConfig = {
  name: "School_Action",
  label: "School Action",
  pluralLabel: "School Actions",
  description:
    "Platform event for school-related actions. Used as an action endpoint for Agentforce, automations, and external integrations.",
  eventType: "HighVolume",
  publishBehavior: "PublishAfterCommit",

  fields: [
    {
      name: "Action_Type",
      label: "Action Type",
      type: "Text",
      length: 50,
      required: true,
      description: "Action to perform: Create, Update, Delete, Enroll, Transfer, StatusChange",
    },
    {
      name: "School_Id",
      label: "School ID",
      type: "Text",
      length: 18,
      description: "Salesforce record ID of the School__c record",
    },
    {
      name: "School_Code",
      label: "School Code",
      type: "Text",
      length: 20,
      description: "School code for matching when ID is not available",
    },
    {
      name: "Payload",
      label: "Payload",
      type: "LongTextArea",
      length: 131072,
      description: "JSON payload with action-specific data (field values, parameters, etc.)",
    },
    {
      name: "Requested_By",
      label: "Requested By",
      type: "Text",
      length: 100,
      description: "User, agent, or system that triggered the action",
    },
    {
      name: "Priority",
      label: "Priority",
      type: "Text",
      length: 10,
      description: "Action priority: High, Medium, Low",
    },
    {
      name: "Correlation_Id",
      label: "Correlation ID",
      type: "Text",
      length: 50,
      description: "Unique ID for tracking the action across systems",
    },
    {
      name: "Is_Async",
      label: "Is Async",
      type: "Checkbox",
      description: "Whether this action should be processed asynchronously",
    },
  ],

  testData: {
    Action_Type__c: "StatusChange",
    School_Code__c: "DC-TEST-001",
    Payload__c: JSON.stringify({
      newStatus: "Active",
      previousStatus: "Under Review",
      reason: "Accreditation approved",
    }),
    Requested_By__c: "Claude Code Agent",
    Priority__c: "High",
    Correlation_Id__c: `evt-${Date.now().toString(36)}`,
    Is_Async__c: false,
  },
};

async function main() {
  const conn = await login();
  const result = await createCompletePlatformEvent(conn, schoolActionConfig);

  console.log("── Step Details ──\n");
  for (const step of result.steps) {
    const icon = step.status === "success" ? "✅" : step.status === "error" ? "❌" : "⏭️";
    console.log(`${icon} ${step.step}: ${step.detail}`);
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
