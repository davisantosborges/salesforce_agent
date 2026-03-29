import { describe, it, expect, vi, beforeEach } from "vitest";

// We must reset modules for each test since auth.ts reads env at import time
describe("getCredentialsFromEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear all SF_ env vars so dotenv doesn't pollute
    vi.stubEnv("SF_LOGIN_URL", "");
    vi.stubEnv("SF_USERNAME", "");
    vi.stubEnv("SF_PASSWORD", "");
    vi.stubEnv("SF_SECURITY_TOKEN", "");
    vi.stubEnv("SF_ACCESS_TOKEN", "");
    vi.stubEnv("SF_INSTANCE_URL", "");
    vi.stubEnv("SF_REFRESH_TOKEN", "");
  });

  it("returns credentials from env vars", async () => {
    vi.stubEnv("SF_LOGIN_URL", "https://test.salesforce.com");
    vi.stubEnv("SF_USERNAME", "user@test.com");
    vi.stubEnv("SF_PASSWORD", "pass123");
    vi.stubEnv("SF_SECURITY_TOKEN", "token456");

    const { getCredentialsFromEnv } = await import("../../src/auth");
    const creds = getCredentialsFromEnv();
    expect(creds.username).toBe("user@test.com");
    expect(creds.password).toBe("pass123");
    expect(creds.securityToken).toBe("token456");
  });

  it("defaults loginUrl to login.salesforce.com", async () => {
    vi.stubEnv("SF_USERNAME", "user@test.com");
    vi.stubEnv("SF_PASSWORD", "pass123");

    const { getCredentialsFromEnv } = await import("../../src/auth");
    const creds = getCredentialsFromEnv();
    expect(creds.loginUrl).toBe("https://login.salesforce.com");
  });

  it("defaults security token to empty string", async () => {
    vi.stubEnv("SF_USERNAME", "user@test.com");
    vi.stubEnv("SF_PASSWORD", "pass123");

    const { getCredentialsFromEnv } = await import("../../src/auth");
    const creds = getCredentialsFromEnv();
    expect(creds.securityToken).toBe("");
  });

  it("throws when username is missing", async () => {
    vi.stubEnv("SF_PASSWORD", "pass123");

    const { getCredentialsFromEnv } = await import("../../src/auth");
    expect(() => getCredentialsFromEnv()).toThrow("SF_USERNAME and SF_PASSWORD must be set");
  });

  it("throws when password is missing", async () => {
    vi.stubEnv("SF_USERNAME", "user@test.com");

    const { getCredentialsFromEnv } = await import("../../src/auth");
    expect(() => getCredentialsFromEnv()).toThrow("SF_USERNAME and SF_PASSWORD must be set");
  });
});
