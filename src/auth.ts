import { Connection } from "jsforce";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export interface SalesforceCredentials {
  loginUrl: string;
  username: string;
  password: string;
  securityToken: string;
}

/**
 * Refresh the access token using the refresh token.
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = process.env.SF_REFRESH_TOKEN;
  const loginUrl = process.env.SF_LOGIN_URL || "https://login.salesforce.com";

  if (!refreshToken) {
    throw new Error("SF_REFRESH_TOKEN not set — cannot refresh");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: "PlatformCLI",
    refresh_token: refreshToken,
  });

  const resp = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    body: params,
  });

  const data: any = await resp.json();
  if (data.access_token) {
    // Update env for current process
    process.env.SF_ACCESS_TOKEN = data.access_token;
    console.log("Refreshed access token");
    return data.access_token;
  }

  throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
}

/**
 * Login using access token + instance URL (preferred — bypasses SOAP API restriction).
 * Auto-refreshes if the token is expired.
 */
export async function loginWithAccessToken(
  accessToken?: string,
  instanceUrl?: string
): Promise<Connection> {
  let token = accessToken || process.env.SF_ACCESS_TOKEN;
  const url = instanceUrl || process.env.SF_INSTANCE_URL;

  if (!token || !url) {
    throw new Error("SF_ACCESS_TOKEN and SF_INSTANCE_URL must be set in .env");
  }

  const conn = new Connection({ instanceUrl: url, accessToken: token });

  // Verify the token works, refresh if expired
  try {
    const identity = await conn.identity();
    console.log(`Logged in as ${identity.username} (via access token)`);
    console.log(`Instance URL: ${url}`);
    return conn;
  } catch {
    // Token expired — try refreshing
    console.log("Access token expired, refreshing...");
    token = await refreshAccessToken();
    const freshConn = new Connection({ instanceUrl: url, accessToken: token });
    const identity = await freshConn.identity();
    console.log(`Logged in as ${identity.username} (via refreshed token)`);
    console.log(`Instance URL: ${url}`);
    return freshConn;
  }
}

/**
 * Login using sf CLI access token.
 * Requires: sf org login web -a <alias> to have been run first.
 */
export async function loginWithSfCli(
  aliasOrUsername?: string
): Promise<Connection> {
  const target =
    aliasOrUsername || process.env.SF_CLI_ALIAS || process.env.SF_USERNAME;

  let cmd = "sf org display --json";
  if (target) cmd += ` -o ${target}`;

  const result = execSync(cmd, { encoding: "utf-8" });
  const parsed = JSON.parse(result);

  if (parsed.status !== 0) {
    throw new Error(`sf org display failed: ${JSON.stringify(parsed)}`);
  }

  const conn = new Connection({
    instanceUrl: parsed.result.instanceUrl,
    accessToken: parsed.result.accessToken,
  });

  console.log(`Logged in as ${parsed.result.username} (via sf CLI)`);
  console.log(`Instance URL: ${parsed.result.instanceUrl}`);

  return conn;
}

/**
 * Login using username/password via SOAP API.
 * Only works if SOAP API login is enabled in the org.
 */
export async function loginWithPassword(
  creds?: SalesforceCredentials
): Promise<Connection> {
  const { loginUrl, username, password, securityToken } =
    creds ?? getCredentialsFromEnv();

  const conn = new Connection({ loginUrl });
  await conn.login(username, password + securityToken);

  console.log(`Logged in as ${username} (via SOAP)`);
  console.log(`Instance URL: ${conn.instanceUrl}`);

  return conn;
}

/**
 * Auto-detect best auth method: access token > sf CLI > password.
 */
export async function login(): Promise<Connection> {
  // 1. Try access token
  if (process.env.SF_ACCESS_TOKEN && process.env.SF_INSTANCE_URL) {
    try {
      return await loginWithAccessToken();
    } catch {
      console.log("Access token auth failed, trying next method...");
    }
  }

  // 2. Try sf CLI
  try {
    return await loginWithSfCli();
  } catch {
    console.log("sf CLI auth not available, trying password login...");
  }

  // 3. Fall back to SOAP password
  return loginWithPassword();
}

export function getCredentialsFromEnv(): SalesforceCredentials {
  const loginUrl = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const securityToken = process.env.SF_SECURITY_TOKEN || "";

  if (!username || !password) {
    throw new Error(
      "SF_USERNAME and SF_PASSWORD must be set in .env file. See .env.example"
    );
  }

  return { loginUrl, username, password, securityToken };
}
