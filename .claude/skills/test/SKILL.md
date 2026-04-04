---
name: test
description: Run and write automated tests — Vitest unit tests, integration tests against real Salesforce org, and browser functional tests. Use when running tests, writing new tests, or debugging test failures.
---

# Testing

## Commands

```bash
npm test                  # All 103 unit + 29 integration tests
npm run test:unit         # Unit only (<1s, no org needed)
npm run test:integration  # Integration (needs .env, ~14s)
npm run test:functional   # Browser test plan for Claude Code
npm run test:coverage     # With coverage report
npm run test:watch        # Interactive watch mode
```

## Structure

```
tests/
  helpers/
    mock-connection.ts    # createMockConnection() — mock jsforce Connection
    test-config.ts        # Reusable test configs
    cleanup.ts            # TestCleanupRegistry + generateTestName()
  unit/                   # 103 tests: metadata, tooling, auth, skills, data-cloud, agentforce
  integration/            # 29 tests: real org CRUD, auto-cleanup
```

## Writing Unit Tests

Use `createMockConnection()` — returns `{ conn, mocks }` with all jsforce methods as `vi.fn()`:

```typescript
import { createMockConnection } from "../helpers/mock-connection";
const { conn, mocks } = createMockConnection();
await someFunction(conn, config);
expect(mocks.metadataCreate).toHaveBeenCalledWith("CustomObject", expect.objectContaining({ ... }));
```

## Writing Integration Tests

Use `describe.skipIf(!HAS_SF_CREDENTIALS)` and `TestCleanupRegistry`:

```typescript
import { HAS_SF_CREDENTIALS, getConnection } from "./setup";
import { TestCleanupRegistry, generateTestName } from "../helpers/cleanup";

const registry = new TestCleanupRegistry();
describe.skipIf(!HAS_SF_CREDENTIALS)("Integration: ...", () => {
  afterAll(async () => { await registry.cleanupAll(await getConnection()); });
  // tests...
});
```

## Patterns

- Auth tests need `vi.resetModules()` + `vi.stubEnv()` (auth.ts reads env at import)
- Integration test objects use `ZZTest_<timestamp>` prefix
- Cleanup deletes in reverse dependency order
