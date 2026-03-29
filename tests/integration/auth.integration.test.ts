import { describe, it, expect } from "vitest";
import { HAS_SF_CREDENTIALS, getConnection } from "./setup";

describe.skipIf(!HAS_SF_CREDENTIALS)("Integration: Auth", () => {
  it("connects to real org with access token", async () => {
    const conn = await getConnection();
    expect(conn.instanceUrl).toBeDefined();
    expect(conn.accessToken).toBeDefined();
  });

  it("can call identity()", async () => {
    const conn = await getConnection();
    const identity = await conn.identity();
    expect(identity.username).toBeDefined();
    expect(identity.username).toContain("@");
  });

  it("can describeGlobal()", async () => {
    const conn = await getConnection();
    const result = await conn.describeGlobal();
    expect(result.sobjects.length).toBeGreaterThan(0);
    const accountExists = result.sobjects.some((s: any) => s.name === "Account");
    expect(accountExists).toBe(true);
  });
});
