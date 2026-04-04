/**
 * Reference: Push school data into Data Cloud via Ingestion API.
 *
 * Requires:
 * - SF token with cdp_ingest_api scope (from DataCloudIngestionApp Connected App)
 * - SchoolDataConnector + SchoolProfile data stream deployed
 *
 * Usage: SF_CDP_TOKEN=<token> npx tsx src/ingest-school-data.ts
 *
 * To get a token with cdp_ingest_api scope:
 * 1. Open: https://<instance>/services/oauth2/authorize?response_type=token&client_id=<consumer_key>&redirect_uri=https://login.salesforce.com/services/oauth2/callback
 * 2. Allow access, copy access_token from redirect URL
 * 3. Set SF_CDP_TOKEN env var
 */

import dotenv from "dotenv";
import { exchangeDCToken, ingestData } from "./data-cloud";

dotenv.config({ path: ".env" });

const CONNECTOR = "SchoolDataConnector";
const OBJECT = "SchoolProfile";

const testSchools = [
  { SchoolId: "SCH-001", SchoolCode: "HS-001", SchoolName: "Lincoln High School", SchoolType: "High School", Status: "Active", NumberOfStudents: 1200, NumberOfTeachers: 80, MaxCapacity: 1500, Phone: "+1-555-0101", Email: "info@lincoln.edu", City: "Springfield", State: "IL", Country: "USA", PostalCode: "62701", PrincipalName: "James Wilson", LastModified: new Date().toISOString() },
  { SchoolId: "SCH-002", SchoolCode: "ES-001", SchoolName: "Oakwood Elementary", SchoolType: "Elementary", Status: "Active", NumberOfStudents: 450, NumberOfTeachers: 25, MaxCapacity: 500, Phone: "+1-555-0102", Email: "info@oakwood.edu", City: "Springfield", State: "IL", Country: "USA", PostalCode: "62702", PrincipalName: "Sarah Chen", LastModified: new Date().toISOString() },
  { SchoolId: "SCH-003", SchoolCode: "MS-001", SchoolName: "Riverside Middle School", SchoolType: "Middle School", Status: "Active", NumberOfStudents: 800, NumberOfTeachers: 50, MaxCapacity: 900, Phone: "+1-555-0103", Email: "info@riverside.edu", City: "Chicago", State: "IL", Country: "USA", PostalCode: "60601", PrincipalName: "Maria Garcia", LastModified: new Date().toISOString() },
  { SchoolId: "SCH-004", SchoolCode: "HS-002", SchoolName: "Westlake High", SchoolType: "High School", Status: "Inactive", NumberOfStudents: 0, NumberOfTeachers: 0, MaxCapacity: 1000, Phone: "+1-555-0104", City: "Chicago", State: "IL", Country: "USA", PostalCode: "60602", LastModified: new Date().toISOString() },
  { SchoolId: "SCH-005", SchoolCode: "UNI-001", SchoolName: "State University", SchoolType: "University", Status: "Active", NumberOfStudents: 5000, NumberOfTeachers: 300, MaxCapacity: 6000, Phone: "+1-555-0105", Email: "admin@stateuni.edu", City: "Champaign", State: "IL", Country: "USA", PostalCode: "61820", PrincipalName: "Dr. Robert Lee", LastModified: new Date().toISOString() },
];

async function main() {
  const sfToken = process.env.SF_CDP_TOKEN || process.env.SF_ACCESS_TOKEN;
  const instanceUrl = process.env.SF_INSTANCE_URL;

  if (!sfToken || !instanceUrl) {
    console.error("Set SF_CDP_TOKEN (token with cdp_ingest_api scope) and SF_INSTANCE_URL");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Ingestion API: Push School Data             ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Step 1: DC Token Exchange
  console.log("── Step 1: DC Token Exchange ──\n");
  try {
    const dcToken = await exchangeDCToken(instanceUrl, sfToken);
    console.log(`  ✓ DC Token obtained`);
    console.log(`  DC URL: ${dcToken.instanceUrl}`);
    console.log(`  Expires: ${dcToken.expiresIn}s\n`);

    // Step 2: Push data
    console.log("── Step 2: Push Data ──\n");
    const result = await ingestData(dcToken, CONNECTOR, OBJECT, testSchools);
    console.log(`  ✓ Ingested ${testSchools.length} records`);
    console.log(`  Result: ${JSON.stringify(result)}`);
    console.log(`  Records will be available after ~3 minutes\n`);

    console.log("✅ Success!");
  } catch (err: any) {
    console.error("✗ Error:", err.message);
    process.exit(1);
  }
}

main();
