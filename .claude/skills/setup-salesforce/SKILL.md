---
name: setup-salesforce
description: Guide the user through connecting to a Salesforce org for development, testing, or production. Use when the user needs to set up credentials, authenticate, configure .env, or connect sf CLI.
---

# Setup Salesforce Connection

Interactive guide to connect this toolkit to a Salesforce org. Supports development, test (optional), and production (optional) environments.

## Step 1: Identify the Org

Ask the user:
- What is your Salesforce instance URL? (e.g., `https://myorg.develop.my.salesforce.com`)
- Is this a Developer Edition, Sandbox, or Production org?
- Do you need Data Cloud features? (requires DC licenses)
- Do you need Agentforce features? (requires Einstein/Agentforce licenses)

## Step 2: OAuth Access Token

The toolkit uses OAuth access token + refresh token. SOAP login may be disabled.

### Option A: Browser OAuth (recommended)

1. Open this URL in the user's browser (replace `<instance>`):
   ```
   https://<instance>/services/oauth2/authorize?response_type=token&client_id=PlatformCLI&redirect_uri=http://localhost:1717/OauthRedirect
   ```
2. User clicks "Allow"
3. Browser redirects to `localhost:1717/...` (won't load — that's OK)
4. User copies the full redirect URL
5. Extract from the URL fragment:
   - `access_token` → `SF_ACCESS_TOKEN`
   - `instance_url` → `SF_INSTANCE_URL`
   - `refresh_token` (if present) → `SF_REFRESH_TOKEN`

### Option B: sf CLI Web Login

```bash
sf org login web -a <alias> -r <instance_url>
```
Then extract credentials via `sf org display -o <alias> --json`.

### Option C: Username/Password (if SOAP enabled)

Set `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` in `.env`.

## Step 3: Create .env File

```bash
cp .env.example .env
```

Fill in:
```env
SF_ACCESS_TOKEN=<from step 2>
SF_INSTANCE_URL=<org instance URL>
SF_REFRESH_TOKEN=<from step 2, if available>
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=<username>
SF_PASSWORD=<password>
SF_SECURITY_TOKEN=<security token>
```

## Step 4: Verify Connection

```bash
npx tsx src/test-auth.ts
```

Should output: `Logged in as <username>` + list of custom objects.

## Step 5: sf CLI Authentication (for Agentforce)

Required for `sf agent publish` and metadata deployments:

```bash
# Create auth URL file
echo "force://PlatformCLI::<refresh_token>@<instance_hostname>" > /tmp/sf_auth.txt

# Authenticate
sf org login sfdx-url -f /tmp/sf_auth.txt -a <alias>

# Verify
sf org display -o <alias>
```

## Step 6: Data Cloud Ingestion API (optional)

Required only if using the Ingestion API to push data into Data Cloud.

### 6a: Create Connected App with CDP scopes

1. Setup > App Manager > New External Client App
2. Name: `DataCloudIngestionApp`
3. Enable OAuth, add scopes: `cdp_ingest_api`, `api`
4. Set callback URL: `https://login.salesforce.com/services/oauth2/callback`
5. Save → get Consumer Key

### 6b: Get CDP-scoped token

Open in browser (replace `<consumer_key>` and `<instance>`):
```
https://<instance>/services/oauth2/authorize?response_type=token&client_id=<consumer_key>&redirect_uri=https://login.salesforce.com/services/oauth2/callback
```

### 6c: Exchange for DC token

The toolkit handles this automatically via `exchangeDCToken()`.

## Step 7: Run Tests

```bash
npm run test:unit         # Should pass (no org needed)
npm run test:integration  # Needs .env credentials
npm run test:auth         # Quick auth check
```

## Multi-Environment Setup

For test/production orgs, create separate .env files:

```bash
cp .env .env.dev          # Development
cp .env .env.test         # Test/Staging
cp .env .env.prod         # Production
```

Switch environments:
```bash
cp .env.test .env   # Switch to test
cp .env.prod .env   # Switch to production
```

Or use dotenv path:
```typescript
dotenv.config({ path: ".env.test" });
```

## Checklist

- [ ] Instance URL identified
- [ ] Access token obtained (OAuth or sf CLI)
- [ ] `.env` file created with credentials
- [ ] `npx tsx src/test-auth.ts` passes
- [ ] `sf org display -o <alias>` works (for Agentforce)
- [ ] Data Cloud Connected App created (for Ingestion API)
- [ ] `npm run test:unit` passes
- [ ] `npm run test:integration` passes
