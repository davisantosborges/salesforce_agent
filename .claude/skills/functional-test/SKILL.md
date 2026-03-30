---
name: functional-test
description: Run browser-based functional UI tests for Salesforce objects via Chrome automation. Use when testing Salesforce UI — tabs, forms, validation rules, record CRUD, list views.
---

# Functional Tests (Browser)

**Tool:** `src/skills/functional-test.ts`
**Runner:** `src/run-functional-tests.ts`

## Running

```bash
npx tsx src/run-functional-tests.ts School__c
```

Prints the test plan. Then execute each step using chrome tools: `navigate`, `find`, `form_input`, `computer`, `read_page`, `screenshot`.

## School__c Tests (8 steps)

1. Tab navigation
2. List view columns
3. Record form (sections + required fields)
4. Create record (13 fields, save, verify)
5. Validation: School Code required when Active
6. Validation: Students ≤ Max Capacity
7. Edit record
8. Delete record

## Adding Tests for New Objects

1. Create `FunctionalTestConfig` in `src/skills/functional-test.ts`
2. Add to switch in `src/run-functional-tests.ts`
3. Include: `expectedSections`, `requiredFields`, `testRecordData`, `validationTests`
