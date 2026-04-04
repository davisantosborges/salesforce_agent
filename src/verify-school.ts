/**
 * Verify School__c creation — equivalent to sf CLI metadata checks.
 */
import { login } from "./auth";

async function main() {
  const conn = await login();

  console.log("═══════════════════════════════════════════");
  console.log("  School__c — Metadata Verification Report");
  console.log("═══════════════════════════════════════════\n");

  // 1. Object describe
  console.log("── 1. Object Describe ──\n");
  const desc: any = await conn.request({
    method: "GET",
    url: "/services/data/v66.0/sobjects/School__c/describe",
  });
  console.log(`  Label:        ${desc.label}`);
  console.log(`  Plural:       ${desc.labelPlural}`);
  console.log(`  API Name:     ${desc.name}`);
  console.log(`  Createable:   ${desc.createable}`);
  console.log(`  Updateable:   ${desc.updateable}`);
  console.log(`  Deletable:    ${desc.deletable}`);
  console.log(`  Searchable:   ${desc.searchable}`);
  console.log(`  Total fields: ${desc.fields.length}`);

  // 2. Custom fields
  console.log("\n── 2. Custom Fields ──\n");
  const customFields = desc.fields.filter((f: any) => f.custom);
  for (const f of customFields) {
    const req = f.nillable ? "" : " (required)";
    console.log(`  ${f.name.padEnd(30)} ${f.type.padEnd(12)} ${f.label}${req}`);
  }
  console.log(`\n  Total custom fields: ${customFields.length}`);

  // 3. Record types
  console.log("\n── 3. Record Types ──\n");
  if (desc.recordTypeInfos && desc.recordTypeInfos.length > 0) {
    for (const rt of desc.recordTypeInfos) {
      console.log(`  ${rt.name} (${rt.active ? "Active" : "Inactive"}) — ${rt.recordTypeId}`);
    }
  } else {
    console.log("  (Master record type only)");
  }

  // 4. Tab
  console.log("\n── 4. Custom Tab ──\n");
  const tabMeta = await conn.metadata.read("CustomTab" as any, "School__c");
  if (tabMeta && tabMeta.fullName) {
    console.log(`  Tab:     ${tabMeta.fullName}`);
    console.log(`  Motif:   ${(tabMeta as any).motif || "default"}`);
  } else {
    console.log("  ✗ No tab found");
  }

  // 5. List views
  console.log("\n── 5. List Views ──\n");
  const lvResult: any = await conn.request({
    method: "GET",
    url: `/services/data/v66.0/sobjects/School__c/listviews`,
  });
  for (const lv of lvResult.listviews) {
    console.log(`  ${lv.label} (${lv.developerName}) — ${lv.soqlCompatible ? "SOQL" : "non-SOQL"}`);
  }

  // 6. Compact layout
  console.log("\n── 6. Compact Layouts ──\n");
  const compactMeta = await conn.metadata.read("CompactLayout" as any, "School__c.School_Compact");
  if (compactMeta && compactMeta.fullName) {
    console.log(`  Name:   ${(compactMeta as any).label}`);
    const fields = Array.isArray((compactMeta as any).fields) ? (compactMeta as any).fields : [(compactMeta as any).fields];
    console.log(`  Fields: ${fields.join(", ")}`);
  } else {
    console.log("  (Default compact layout)");
  }

  // 7. Page layout
  console.log("\n── 7. Page Layout ──\n");
  const layoutMeta: any = await conn.metadata.read("Layout" as any, "School__c-School Layout");
  if (layoutMeta && layoutMeta.fullName) {
    console.log(`  Layout: ${layoutMeta.fullName}`);
    const sections = Array.isArray(layoutMeta.layoutSections) ? layoutMeta.layoutSections : [layoutMeta.layoutSections];
    for (const s of sections) {
      if (!s) continue;
      const cols = Array.isArray(s.layoutColumns) ? s.layoutColumns : [s.layoutColumns];
      let fieldCount = 0;
      for (const col of cols) {
        if (!col || !col.layoutItems) continue;
        const items = Array.isArray(col.layoutItems) ? col.layoutItems : [col.layoutItems];
        fieldCount += items.filter((i: any) => i.field).length;
      }
      console.log(`  Section: ${s.label || "(unnamed)"} — ${fieldCount} fields (${s.style})`);
    }
  } else {
    console.log("  ✗ Layout not found");
  }

  // 8. Validation rules
  console.log("\n── 8. Validation Rules ──\n");
  const vrResult: any = await conn.tooling.query(
    "SELECT ValidationName, Active, ErrorMessage FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = 'School__c'"
  );
  for (const vr of vrResult.records) {
    console.log(`  ${vr.Active ? "✓" : "✗"} ${vr.ValidationName}`);
    console.log(`    Message: ${vr.ErrorMessage}`);
  }

  // 9. Permission set
  console.log("\n── 9. Permission Set ──\n");
  const psMeta: any = await conn.metadata.read("PermissionSet" as any, "School_Access");
  if (psMeta && psMeta.fullName) {
    console.log(`  Name:  ${psMeta.fullName}`);
    console.log(`  Label: ${psMeta.label}`);
    const objPerms = Array.isArray(psMeta.objectPermissions) ? psMeta.objectPermissions : [psMeta.objectPermissions];
    for (const op of objPerms) {
      if (!op) continue;
      console.log(`  Object: ${op.object} — C:${op.allowCreate} R:${op.allowRead} U:${op.allowEdit} D:${op.allowDelete}`);
    }
    const fieldPerms = Array.isArray(psMeta.fieldPermissions) ? psMeta.fieldPermissions : psMeta.fieldPermissions ? [psMeta.fieldPermissions] : [];
    console.log(`  Field permissions: ${fieldPerms.length}`);
  } else {
    console.log("  ✗ Permission set not found");
  }

  // 10. Record count
  console.log("\n── 10. Record Count ──\n");
  const countResult: any = await conn.query("SELECT COUNT() FROM School__c");
  console.log(`  Total records: ${countResult.totalSize}`);

  console.log("\n═══════════════════════════════════════════");
  console.log("  Verification complete");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
