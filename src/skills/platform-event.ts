/**
 * SKILL: Platform Event Creation & Management
 *
 * Creates and manages Salesforce Platform Events programmatically.
 * Platform Events are event-driven messages used for real-time integrations,
 * automation triggers, and decoupled communication between systems.
 *
 * === WHAT IT CREATES ===
 *
 * 1. Platform Event definition (CustomObject with __e suffix)
 * 2. Custom fields on the event (Text, Number, Checkbox, Date, DateTime, LongTextArea)
 * 3. Publishes test events via REST API
 * 4. Verifies the event exists and fields are correct
 *
 * === PLATFORM EVENT RULES ===
 *
 * - API name ends with __e (not __c)
 * - Uses CustomObject metadata type with eventType + publishBehavior
 * - Supported field types: Text, Number, Checkbox, Date, DateTime, LongTextArea
 * - NO: Picklist, Lookup, MasterDetail, Formula, RichText
 * - NO: SOQL queries on events (use Streaming API / CometD to subscribe)
 * - NO: inline help text on fields
 * - Events retained for 72 hours (HighVolume) or 24 hours (StandardVolume)
 * - Publish via: REST API, Apex EventBus.publish(), Flows
 * - Subscribe via: Apex triggers (after insert), Flows, CometD, Pub/Sub API
 *
 * === PUBLISH BEHAVIOR ===
 *
 * - PublishAfterCommit (default): Event publishes only if transaction succeeds
 * - PublishImmediately: Event publishes regardless of transaction outcome
 *
 * === COMPLEMENTARY QUESTIONS ===
 *
 * If info is missing, ask:
 * - What is the event name and purpose?
 * - What fields should the event carry? (name, type, description for each)
 * - PublishAfterCommit or PublishImmediately?
 * - HighVolume or StandardVolume? (always recommend HighVolume)
 * - What systems/processes will subscribe to this event?
 */

import { Connection } from "jsforce";
import {
  createPlatformEvent,
  createPlatformEventField,
  publishPlatformEvent,
  readMetadata,
  type PlatformEventConfig,
  type PlatformEventFieldConfig,
} from "../metadata";
import { describeObject } from "../tooling";

// ── Types ──

export interface EventFieldDef {
  name: string;
  label: string;
  type: "Text" | "Number" | "Checkbox" | "Date" | "DateTime" | "LongTextArea";
  length?: number;
  precision?: number;
  scale?: number;
  required?: boolean;
  description?: string;
}

export interface CompleteEventConfig {
  /** API name without __e (e.g., "School_Action") */
  name: string;
  label: string;
  pluralLabel: string;
  description?: string;
  eventType?: "HighVolume" | "StandardVolume";
  publishBehavior?: "PublishAfterCommit" | "PublishImmediately";
  fields: EventFieldDef[];
  /** Test event data to publish for verification */
  testData?: Record<string, any>;
}

export interface EventStepResult {
  step: string;
  status: "success" | "error" | "skipped";
  detail: string;
}

export interface CreateEventResult {
  eventName: string;
  steps: EventStepResult[];
  success: boolean;
}

// ── Main Function ──

export async function createCompletePlatformEvent(
  conn: Connection,
  config: CompleteEventConfig
): Promise<CreateEventResult> {
  const steps: EventStepResult[] = [];
  const eventApiName = config.name.endsWith("__e")
    ? config.name
    : `${config.name}__e`;

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Platform Event: ${config.label} (${eventApiName})`);
  console.log(`║  Type: ${config.eventType || "HighVolume"}`);
  console.log(`║  Publish: ${config.publishBehavior || "PublishAfterCommit"}`);
  console.log(`║  Fields: ${config.fields.length}`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Step 1: Create Platform Event
  console.log("── Step 1: Create Platform Event ──\n");
  try {
    const result = await createPlatformEvent(conn, {
      name: config.name,
      label: config.label,
      pluralLabel: config.pluralLabel,
      description: config.description,
      eventType: config.eventType,
      publishBehavior: config.publishBehavior,
    });
    if (result.success) {
      steps.push({ step: "CreateEvent", status: "success", detail: `Created ${eventApiName}` });
      console.log(`  ✓ Created: ${eventApiName}`);
    } else {
      steps.push({ step: "CreateEvent", status: "error", detail: JSON.stringify(result.errors) });
      console.log(`  ✗ Failed: ${JSON.stringify(result.errors)}`);
    }
  } catch (err: any) {
    steps.push({ step: "CreateEvent", status: "error", detail: err.message });
    console.log(`  ✗ Exception: ${err.message}`);
  }

  // Step 2: Create Fields
  console.log("\n── Step 2: Create Fields ──\n");
  for (const field of config.fields) {
    try {
      const result = await createPlatformEventField(conn, {
        eventName: eventApiName,
        fieldName: field.name,
        label: field.label,
        type: field.type,
        length: field.length,
        precision: field.precision,
        scale: field.scale,
        required: field.required,
        description: field.description,
      });
      if (result.success) {
        steps.push({ step: "CreateField", status: "success", detail: `${field.name}__c (${field.type})` });
        console.log(`  ✓ ${field.name}__c (${field.type})`);
      } else {
        steps.push({ step: "CreateField", status: "error", detail: `${field.name}: ${JSON.stringify(result.errors)}` });
        console.log(`  ✗ ${field.name}: ${JSON.stringify(result.errors)}`);
      }
    } catch (err: any) {
      steps.push({ step: "CreateField", status: "error", detail: `${field.name}: ${err.message}` });
      console.log(`  ✗ ${field.name}: ${err.message}`);
    }
  }

  // Step 3: Verify
  console.log("\n── Step 3: Verify ──\n");
  try {
    const desc = await describeObject(conn, eventApiName);
    const customFields = desc.fields.filter((f: any) => f.custom);
    steps.push({
      step: "Verify",
      status: "success",
      detail: `${eventApiName} exists — ${customFields.length} custom fields`,
    });
    console.log(`  ✓ ${eventApiName} exists — ${customFields.length} custom fields`);
    for (const f of customFields) {
      console.log(`    - ${f.name} (${f.type})`);
    }
  } catch (err: any) {
    steps.push({ step: "Verify", status: "error", detail: err.message });
    console.log(`  ✗ Verify error: ${err.message}`);
  }

  // Step 4: Publish Test Event
  if (config.testData) {
    console.log("\n── Step 4: Publish Test Event ──\n");
    try {
      const result = await publishPlatformEvent(conn, eventApiName, config.testData);
      if (result.success || result.id) {
        steps.push({ step: "PublishTest", status: "success", detail: `Published event: ${result.id}` });
        console.log(`  ✓ Published test event: ${result.id}`);
      } else {
        steps.push({ step: "PublishTest", status: "error", detail: JSON.stringify(result) });
        console.log(`  ✗ Publish failed: ${JSON.stringify(result)}`);
      }
    } catch (err: any) {
      steps.push({ step: "PublishTest", status: "error", detail: err.message });
      console.log(`  ✗ Publish error: ${err.message}`);
    }
  }

  const success = steps.every((s) => s.status !== "error");
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Result: ${success ? "SUCCESS" : "PARTIAL"}`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  return { eventName: eventApiName, steps, success };
}

// ── Complementary Questions ──

export function getEventQuestions(
  partial: Partial<CompleteEventConfig>
): string[] {
  const questions: string[] = [];
  if (!partial.name) questions.push("What should the event be named? (e.g., School_Action)");
  if (!partial.label) questions.push("What is the display label?");
  if (!partial.fields || partial.fields.length === 0) {
    questions.push("What fields should the event carry? Supported types: Text, Number, Checkbox, Date, DateTime, LongTextArea");
  }
  if (!partial.publishBehavior) {
    questions.push("Publish behavior? PublishAfterCommit (transactional, recommended) or PublishImmediately?");
  }
  return questions;
}

// ── Modify Existing Event ──

export async function addFieldToEvent(
  conn: Connection,
  eventName: string,
  field: EventFieldDef
): Promise<any> {
  return createPlatformEventField(conn, {
    eventName,
    fieldName: field.name,
    label: field.label,
    type: field.type,
    length: field.length,
    precision: field.precision,
    scale: field.scale,
    required: field.required,
    description: field.description,
  });
}

export async function updateEventProperty(
  conn: Connection,
  eventName: string,
  updates: { label?: string; description?: string; publishBehavior?: "PublishAfterCommit" | "PublishImmediately" }
): Promise<any> {
  const name = eventName.endsWith("__e") ? eventName : `${eventName}__e`;
  return conn.metadata.update("CustomObject", {
    fullName: name,
    ...updates,
  });
}
