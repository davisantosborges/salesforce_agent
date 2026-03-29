import { login } from "./auth";
import { describeGlobal } from "./tooling";

async function main() {
  try {
    const conn = await login();

    // Quick sanity check — list available objects
    const global = await describeGlobal(conn);
    console.log(`\nOrg has ${global.sobjects.length} objects`);

    // Show a few custom objects
    const customObjects = global.sobjects
      .filter((s: any) => s.custom)
      .map((s: any) => s.name);
    console.log(`Custom objects (${customObjects.length}):`);
    customObjects.slice(0, 10).forEach((name: string) => {
      console.log(`  - ${name}`);
    });
    if (customObjects.length > 10) {
      console.log(`  ... and ${customObjects.length - 10} more`);
    }

    console.log("\nAuth test passed!");
  } catch (err: any) {
    console.error("Auth test failed:", err.message);
    process.exit(1);
  }
}

main();
