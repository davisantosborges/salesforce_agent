import { Connection } from "jsforce";

let cachedConn: Connection | null = null;

export const HAS_SF_CREDENTIALS = !!(
  process.env.SF_ACCESS_TOKEN && process.env.SF_INSTANCE_URL
);

/**
 * Get a shared Connection for integration tests.
 * Automatically refreshes the token if needed.
 */
export async function getConnection(): Promise<Connection> {
  if (cachedConn) return cachedConn;

  const instanceUrl = process.env.SF_INSTANCE_URL!;
  let accessToken = process.env.SF_ACCESS_TOKEN!;

  const conn = new Connection({ instanceUrl, accessToken });

  try {
    await conn.identity();
  } catch {
    // Token expired, try refresh
    const refreshToken = process.env.SF_REFRESH_TOKEN;
    if (!refreshToken) throw new Error("Token expired and no refresh token available");

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "PlatformCLI",
      refresh_token: refreshToken,
    });

    const loginUrl = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
    const resp = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      body: params,
    });
    const data = await resp.json();

    if (!data.access_token) throw new Error("Token refresh failed");

    accessToken = data.access_token;
    process.env.SF_ACCESS_TOKEN = accessToken;
    cachedConn = new Connection({ instanceUrl, accessToken });
    return cachedConn;
  }

  cachedConn = conn;
  return conn;
}
