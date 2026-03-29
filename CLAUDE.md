# Salesforce Interaction Project

## Running Tests

### Unit + Integration Tests (automated)
```bash
npm test              # All tests
npm run test:unit     # Unit only (no org, <1s)
npm run test:integration  # Integration (needs .env, ~14s)
```

### Functional Tests (browser-based, Claude Code executes)

To run functional tests, follow this procedure:

1. **Ensure Chrome extension is connected** (`/chrome` command)
2. **Ensure logged into Salesforce** in the browser
3. **Run the test plan**: `npx tsx src/run-functional-tests.ts School__c`
4. **Execute each step** using chrome browser tools:
   - Use `navigate` for URL navigation
   - Use `find` to locate buttons and fields by label
   - Use `form_input` to fill form fields
   - Use `computer` with `left_click` for buttons
   - Use `read_page` or `screenshot` to verify
   - Use `get_page_text` to check for error messages
5. **Record results** as pass/fail for each step
6. **Clean up** any test records created

#### Functional Test Spec Location
- Config: `src/skills/functional-test.ts` (FunctionalTestConfig)
- Runner: `src/run-functional-tests.ts`
- School config: `schoolFunctionalConfig` in functional-test.ts

#### Adding Functional Tests for New Objects
1. Create a `FunctionalTestConfig` in `src/skills/functional-test.ts`
2. Add it to the switch in `src/run-functional-tests.ts`
3. Run with: `npx tsx src/run-functional-tests.ts <ObjectApiName>`

## Auth

Token auto-refreshes via `SF_REFRESH_TOKEN`. If expired:
1. Open OAuth URL in browser, paste redirect URL back
2. Or run `! sf org login web -a salesforce-interaction`

## Key Patterns

- Always update Admin Profile FLS after creating fields
- Required picklist fields cannot have FLS deployed — filter them
- ListView Name column = `NAME` (not `Name` or `FULL_NAME`)
- Number fields need explicit `scale: 0`
- LongTextArea fields need `visibleLines`
