/**
 * Functional Test Runner — Prints the test plan for Claude Code to execute
 * via Chrome browser automation.
 *
 * Usage: npx tsx src/run-functional-tests.ts [objectApiName]
 *
 * When Claude Code runs this, it reads the output and executes each step
 * using the chrome browser tools (navigate, read_page, find, form_input, computer).
 */

import {
  schoolFunctionalConfig,
  generateTestSteps,
  type FunctionalTestConfig,
} from "./skills/functional-test";

const objectArg = process.argv[2] || "School__c";

// Select config based on object
let config: FunctionalTestConfig;

switch (objectArg) {
  case "School__c":
  case "School":
    config = schoolFunctionalConfig;
    break;
  default:
    console.error(`No functional test config found for: ${objectArg}`);
    console.error("Available: School__c");
    process.exit(1);
}

const steps = generateTestSteps(config);

console.log("╔══════════════════════════════════════════════════════╗");
console.log(`║  Functional Test Plan: ${config.objectLabel} (${config.objectApiName})`);
console.log(`║  Instance: ${config.instanceUrl}`);
console.log(`║  Steps: ${steps.length}`);
console.log("╚══════════════════════════════════════════════════════╝\n");

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  console.log(`── Step ${i + 1}/${steps.length}: ${step.name} ──`);
  console.log(`   ${step.description}\n`);

  console.log("   Actions:");
  for (const action of step.actions) {
    console.log(`     → ${action}`);
  }

  console.log("\n   Verify:");
  for (const check of step.verify) {
    console.log(`     ✓ ${check}`);
  }

  console.log("");
}

console.log("══════════════════════════════════════════════════════");
console.log("  To execute: Claude Code will use chrome browser tools");
console.log("  to perform each action and verify each check.");
console.log("══════════════════════════════════════════════════════\n");
