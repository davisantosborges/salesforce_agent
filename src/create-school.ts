/**
 * Create School__c custom object with all supporting components.
 * Uses the create-custom-object skill for a complete, verified deployment.
 */
import { login } from "./auth";
import { createCompleteCustomObject } from "./skills/create-custom-object";
import type { CompleteObjectConfig } from "./skills/create-custom-object";

const schoolConfig: CompleteObjectConfig = {
  // --- Object ---
  objectName: "School",
  label: "School",
  pluralLabel: "Schools",
  description:
    "Represents an educational institution. Tracks school information including type, location, enrollment, and contact details.",
  nameFieldLabel: "School Name",
  nameFieldType: "Text",

  // --- Fields ---
  fields: [
    // Core info
    {
      name: "School_Type",
      label: "School Type",
      type: "Picklist",
      required: true,
      picklistValues: [
        "Elementary",
        "Middle School",
        "High School",
        "University",
        "Community College",
        "Vocational",
        "Charter",
        "Private",
        "Other",
      ],
      section: "School Information",
      inCompactLayout: true,
      inListView: true,
    },
    {
      name: "Status",
      label: "Status",
      type: "Picklist",
      required: true,
      picklistValues: ["Active", "Inactive", "Under Review", "Closed"],
      section: "School Information",
      inCompactLayout: true,
      inListView: true,
    },
    {
      name: "School_Code",
      label: "School Code",
      type: "Text",
      length: 20,
      unique: true,
      description: "Unique identifier code for the school",
      section: "School Information",
      inListView: true,
    },
    {
      name: "Founded_Date",
      label: "Founded Date",
      type: "Date",
      section: "School Information",
    },
    {
      name: "Description",
      label: "Description",
      type: "LongTextArea",
      length: 32768,
      section: "School Information",
    },

    // Enrollment
    {
      name: "Number_of_Students",
      label: "Number of Students",
      type: "Number",
      precision: 8,
      scale: 0,
      section: "Enrollment",
      inCompactLayout: true,
      inListView: true,
    },
    {
      name: "Number_of_Teachers",
      label: "Number of Teachers",
      type: "Number",
      precision: 6,
      scale: 0,
      section: "Enrollment",
    },
    {
      name: "Max_Capacity",
      label: "Max Capacity",
      type: "Number",
      precision: 8,
      scale: 0,
      section: "Enrollment",
    },

    // Contact
    {
      name: "Phone",
      label: "Phone",
      type: "Phone",
      section: "Contact Information",
      inCompactLayout: true,
    },
    {
      name: "Email",
      label: "Email",
      type: "Email",
      section: "Contact Information",
    },
    {
      name: "Website",
      label: "Website",
      type: "Url",
      section: "Contact Information",
    },
    {
      name: "Principal_Name",
      label: "Principal / Head of School",
      type: "Text",
      length: 100,
      section: "Contact Information",
      inListView: true,
    },

    // Address
    {
      name: "Street",
      label: "Street",
      type: "TextArea",
      section: "Address",
    },
    {
      name: "City",
      label: "City",
      type: "Text",
      length: 80,
      section: "Address",
      inListView: true,
    },
    {
      name: "State",
      label: "State / Province",
      type: "Text",
      length: 80,
      section: "Address",
    },
    {
      name: "Postal_Code",
      label: "Postal Code",
      type: "Text",
      length: 20,
      section: "Address",
    },
    {
      name: "Country",
      label: "Country",
      type: "Text",
      length: 80,
      section: "Address",
    },
  ],

  // --- Layout ---
  layoutSections: [
    "School Information",
    "Enrollment",
    "Contact Information",
    "Address",
  ],

  // --- Tab ---
  tabMotif: "Custom20: Castle",

  // --- Validation Rules ---
  validationRules: [
    {
      name: "Require_School_Code_When_Active",
      formula:
        'AND(ISPICKVAL(Status__c, "Active"), ISBLANK(School_Code__c))',
      message:
        "School Code is required when the school status is Active.",
      field: "School_Code__c",
      description:
        "Ensures active schools have a school code assigned.",
    },
    {
      name: "Max_Capacity_Greater_Than_Students",
      formula:
        "AND(NOT(ISBLANK(Max_Capacity__c)), NOT(ISBLANK(Number_of_Students__c)), Number_of_Students__c > Max_Capacity__c)",
      message:
        "Number of Students cannot exceed Max Capacity.",
      field: "Number_of_Students__c",
      description:
        "Prevents enrollment exceeding the school's capacity.",
    },
  ],

  // --- Permission Set ---
  permissionSetLabel: "School Management Access",
};

async function main() {
  const conn = await login();
  const result = await createCompleteCustomObject(conn, schoolConfig);

  // Final report
  console.log("\n── Step Details ──\n");
  for (const step of result.steps) {
    const icon =
      step.status === "success" ? "✅" : step.status === "error" ? "❌" : "⏭️";
    console.log(`${icon} ${step.step}: ${step.detail}`);
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
