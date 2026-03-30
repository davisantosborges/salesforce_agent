import { describe, it, expect } from "vitest";
import { createMockConnection } from "../helpers/mock-connection";
import {
  createDataLakeObject,
  readDataLakeObject,
  listDataLakeObjects,
  deleteDataLakeObject,
  listDataTransforms,
  queryDataCloud,
  createCalculatedInsight,
  readCalculatedInsight,
  listCalculatedInsights,
  deleteCalculatedInsight,
  createSegment,
  readSegment,
  listSegments,
  deleteSegment,
  buildSegmentFilter,
  mapTypeToDloDatatype,
  buildFieldsFromSchema,
} from "../../src/data-cloud";
import { buildCioExpression } from "../../src/skills/data-cloud-transform";

describe("createDataLakeObject", () => {
  it("creates DLO with correct MktDataTranObject payload", async () => {
    const { conn, mocks } = createMockConnection();
    await createDataLakeObject(conn, {
      fullName: "Test_Summary",
      label: "Test Summary",
      fields: [
        { name: "City", label: "City", datatype: "S" },
        { name: "Count", label: "Count", datatype: "N" },
      ],
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("MktDataTranObject", expect.objectContaining({
      fullName: "Test_Summary",
      masterLabel: "Test Summary",
      creationType: "Custom",
      connector: "SalesforceDotCom_Home",
      dataSource: "Salesforce_Home",
      dataSourceObject: "Test_Summary",
      objectCategory: "Salesforce_SFDCReferenceModel_0_93.Related",
    }));
  });

  it("builds MktDataTranField with correct structure", async () => {
    const { conn, mocks } = createMockConnection();
    await createDataLakeObject(conn, {
      fullName: "Test",
      label: "Test",
      fields: [
        { name: "Email_Field", label: "Email", datatype: "E", isPrimaryKey: true },
      ],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.mktDataTranFields[0]).toEqual(expect.objectContaining({
      fullName: "Email_Field",
      datatype: "E",
      masterLabel: "Email",
      primaryIndexOrder: "1",
      sequence: "0",
    }));
  });

  it("adds dateFormat for Date fields", async () => {
    const { conn, mocks } = createMockConnection();
    await createDataLakeObject(conn, {
      fullName: "Test",
      label: "Test",
      fields: [{ name: "Start", label: "Start Date", datatype: "D" }],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.mktDataTranFields[0].dateFormat).toBe("yyyy-MM-dd");
  });

  it("adds dateFormat for DateTime fields", async () => {
    const { conn, mocks } = createMockConnection();
    await createDataLakeObject(conn, {
      fullName: "Test",
      label: "Test",
      fields: [{ name: "Modified", label: "Modified", datatype: "F" }],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.mktDataTranFields[0].dateFormat).toBe("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  });

  it("sets sequence based on field order", async () => {
    const { conn, mocks } = createMockConnection();
    await createDataLakeObject(conn, {
      fullName: "Test",
      label: "Test",
      fields: [
        { name: "A", label: "A", datatype: "S" },
        { name: "B", label: "B", datatype: "S" },
        { name: "C", label: "C", datatype: "N" },
      ],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.mktDataTranFields[0].sequence).toBe("0");
    expect(call.mktDataTranFields[1].sequence).toBe("1");
    expect(call.mktDataTranFields[2].sequence).toBe("2");
  });

  it("uses custom connector and dataSource when provided", async () => {
    const { conn, mocks } = createMockConnection();
    await createDataLakeObject(conn, {
      fullName: "Test",
      label: "Test",
      connector: "CustomConnector",
      dataSource: "CustomSource",
      dataSourceObject: "CustomObj",
      fields: [{ name: "F", label: "F", datatype: "S" }],
    });
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(call.connector).toBe("CustomConnector");
    expect(call.dataSource).toBe("CustomSource");
    expect(call.dataSourceObject).toBe("CustomObj");
  });
});

describe("readDataLakeObject", () => {
  it("reads MktDataTranObject metadata", async () => {
    const { conn, mocks } = createMockConnection();
    await readDataLakeObject(conn, "School_c_Home");
    expect(mocks.metadataRead).toHaveBeenCalledWith("MktDataTranObject", "School_c_Home");
  });
});

describe("listDataLakeObjects", () => {
  it("lists MktDataTranObject types", async () => {
    const { conn, mocks } = createMockConnection();
    mocks.metadataList.mockResolvedValue([{ fullName: "A" }, { fullName: "B" }]);
    const result = await listDataLakeObjects(conn);
    expect(mocks.metadataList).toHaveBeenCalledWith([{ type: "MktDataTranObject" }]);
    expect(result).toHaveLength(2);
  });
});

describe("deleteDataLakeObject", () => {
  it("deletes MktDataTranObject", async () => {
    const { conn, mocks } = createMockConnection();
    await deleteDataLakeObject(conn, "Test_Summary");
    expect(mocks.metadataDelete).toHaveBeenCalledWith("MktDataTranObject", "Test_Summary");
  });
});

describe("listDataTransforms", () => {
  it("calls /ssot/data-transforms endpoint", async () => {
    const { conn } = createMockConnection();
    await listDataTransforms(conn);
    expect(conn.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "GET",
      url: "/services/data/v62.0/ssot/data-transforms",
    }));
  });
});

describe("queryDataCloud", () => {
  it("calls /ssot/queryv2 with SQL", async () => {
    const { conn } = createMockConnection();
    await queryDataCloud(conn, "SELECT * FROM Test__dll LIMIT 5");
    expect(conn.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      url: "/services/data/v62.0/ssot/queryv2",
      body: JSON.stringify({ sql: "SELECT * FROM Test__dll LIMIT 5" }),
    }));
  });
});

describe("mapTypeToDloDatatype", () => {
  it("maps common types correctly", () => {
    expect(mapTypeToDloDatatype("text")).toBe("S");
    expect(mapTypeToDloDatatype("string")).toBe("S");
    expect(mapTypeToDloDatatype("number")).toBe("N");
    expect(mapTypeToDloDatatype("date")).toBe("D");
    expect(mapTypeToDloDatatype("datetime")).toBe("F");
    expect(mapTypeToDloDatatype("email")).toBe("E");
    expect(mapTypeToDloDatatype("phone")).toBe("H");
    expect(mapTypeToDloDatatype("url")).toBe("U");
  });

  it("defaults to S for unknown types", () => {
    expect(mapTypeToDloDatatype("unknown")).toBe("S");
  });

  it("is case-insensitive", () => {
    expect(mapTypeToDloDatatype("NUMBER")).toBe("N");
    expect(mapTypeToDloDatatype("DateTime")).toBe("F");
  });
});

describe("buildFieldsFromSchema", () => {
  it("builds DloFieldConfig array from schema", () => {
    const fields = buildFieldsFromSchema({
      City: { type: "text", label: "City" },
      Count: { type: "number", label: "Count", primaryKey: true },
    });
    expect(fields).toHaveLength(2);
    expect(fields[0]).toEqual({ name: "City", label: "City", datatype: "S", isPrimaryKey: undefined });
    expect(fields[1]).toEqual({ name: "Count", label: "Count", datatype: "N", isPrimaryKey: true });
  });
});

// ── Calculated Insights ──

describe("createCalculatedInsight", () => {
  it("creates MktCalcInsightObjectDef with correct payload", async () => {
    const { conn, mocks } = createMockConnection();
    await createCalculatedInsight(conn, {
      fullName: "School_City_Summary",
      label: "School City Summary",
      description: "Test insight",
      expression: "SELECT COUNT(*) as count__c FROM School_c_Home__dll",
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("MktCalcInsightObjectDef", expect.objectContaining({
      fullName: "School_City_Summary",
      creationType: "Custom",
      masterLabel: "School City Summary",
      description: "Test insight",
      expression: "SELECT COUNT(*) as count__c FROM School_c_Home__dll",
    }));
  });
});

describe("readCalculatedInsight", () => {
  it("reads MktCalcInsightObjectDef", async () => {
    const { conn, mocks } = createMockConnection();
    await readCalculatedInsight(conn, "School_City_Summary");
    expect(mocks.metadataRead).toHaveBeenCalledWith("MktCalcInsightObjectDef", "School_City_Summary");
  });
});

describe("listCalculatedInsights", () => {
  it("lists MktCalcInsightObjectDef types", async () => {
    const { conn, mocks } = createMockConnection();
    mocks.metadataList.mockResolvedValue([{ fullName: "CI_A" }]);
    const result = await listCalculatedInsights(conn);
    expect(mocks.metadataList).toHaveBeenCalledWith([{ type: "MktCalcInsightObjectDef" }]);
    expect(result).toHaveLength(1);
  });
});

describe("deleteCalculatedInsight", () => {
  it("deletes MktCalcInsightObjectDef", async () => {
    const { conn, mocks } = createMockConnection();
    await deleteCalculatedInsight(conn, "School_City_Summary");
    expect(mocks.metadataDelete).toHaveBeenCalledWith("MktCalcInsightObjectDef", "School_City_Summary");
  });
});

// ── CIO SQL Builder ──

describe("buildCioExpression", () => {
  it("builds correct SQL with dimensions and measures", () => {
    const sql = buildCioExpression({
      name: "Test",
      label: "Test",
      sourceTable: "School_c_Home__dll",
      dimensions: [
        { sourceField: "City_c__c", alias: "city" },
      ],
      measures: [
        { function: "COUNT", sourceField: "*", alias: "school_count" },
        { function: "SUM", sourceField: "Number_of_Students_c__c", alias: "total_students" },
      ],
    });
    expect(sql).toContain("SELECT");
    expect(sql).toContain("School_c_Home__dll.City_c__c as city__c");
    expect(sql).toContain("COUNT(*) as school_count__c");
    expect(sql).toContain("SUM(School_c_Home__dll.Number_of_Students_c__c) as total_students__c");
    expect(sql).toContain("FROM School_c_Home__dll");
    expect(sql).toContain("GROUP BY School_c_Home__dll.City_c__c");
  });

  it("includes WHERE clause when provided", () => {
    const sql = buildCioExpression({
      name: "Test",
      label: "Test",
      sourceTable: "School_c_Home__dll",
      dimensions: [{ sourceField: "City_c__c", alias: "city" }],
      measures: [{ function: "COUNT", sourceField: "*", alias: "count" }],
      whereClause: "School_c_Home__dll.Status_c__c = 'Active'",
    });
    expect(sql).toContain("WHERE School_c_Home__dll.Status_c__c = 'Active'");
  });

  it("handles measures-only without GROUP BY", () => {
    const sql = buildCioExpression({
      name: "Test",
      label: "Test",
      sourceTable: "School_c_Home__dll",
      dimensions: [],
      measures: [{ function: "COUNT", sourceField: "*", alias: "total" }],
    });
    expect(sql).not.toContain("GROUP BY");
    expect(sql).toContain("COUNT(*) as total__c");
  });
});

// ── Segmentation ──

describe("createSegment", () => {
  it("creates MarketSegmentDefinition with correct payload", async () => {
    const { conn, mocks } = createMockConnection();
    await createSegment(conn, {
      fullName: "Active_Schools",
      label: "Active Schools",
      segmentOn: "SchoolCustom__dlm",
      includeCriteria: {
        filter: {
          type: "TextComparison",
          subject: { objectApiName: "SchoolCustom__dlm", fieldApiName: "Status_c__c" },
          operator: "equals",
          value: "Active",
        },
        containerObjectApiName: "SchoolCustom__dlm",
      },
    });
    expect(mocks.metadataCreate).toHaveBeenCalledWith("MarketSegmentDefinition", expect.objectContaining({
      fullName: "Active_Schools",
      masterLabel: "Active Schools",
      segmentOn: "SchoolCustom__dlm",
      segmentType: "UI",
    }));
    // includeCriteria should be a string
    const call = mocks.metadataCreate.mock.calls[0][1];
    expect(typeof call.includeCriteria).toBe("string");
    expect(JSON.parse(call.includeCriteria).filter.operator).toBe("equals");
  });
});

describe("readSegment", () => {
  it("reads MarketSegmentDefinition", async () => {
    const { conn, mocks } = createMockConnection();
    await readSegment(conn, "Active_Schools");
    expect(mocks.metadataRead).toHaveBeenCalledWith("MarketSegmentDefinition", "Active_Schools");
  });
});

describe("listSegments", () => {
  it("lists MarketSegmentDefinition types", async () => {
    const { conn, mocks } = createMockConnection();
    mocks.metadataList.mockResolvedValue([{ fullName: "Seg_A" }]);
    const result = await listSegments(conn);
    expect(mocks.metadataList).toHaveBeenCalledWith([{ type: "MarketSegmentDefinition" }]);
    expect(result).toHaveLength(1);
  });
});

describe("deleteSegment", () => {
  it("deletes MarketSegmentDefinition", async () => {
    const { conn, mocks } = createMockConnection();
    await deleteSegment(conn, "Active_Schools");
    expect(mocks.metadataDelete).toHaveBeenCalledWith("MarketSegmentDefinition", "Active_Schools");
  });
});

describe("buildSegmentFilter", () => {
  it("builds text comparison filter", () => {
    const criteria = buildSegmentFilter(
      "SchoolCustom__dlm", "Status_c__c", "equals", "Active", "TEXT"
    );
    expect(criteria.filter.type).toBe("TextComparison");
    expect(criteria.filter.subject.objectApiName).toBe("SchoolCustom__dlm");
    expect(criteria.filter.subject.fieldApiName).toBe("Status_c__c");
    expect(criteria.filter.operator).toBe("equals");
    expect(criteria.filter.value).toBe("Active");
    expect(criteria.containerObjectApiName).toBe("SchoolCustom__dlm");
  });

  it("builds number comparison filter", () => {
    const criteria = buildSegmentFilter(
      "SchoolCustom__dlm", "Number_of_Students_c__c", "greater than", 500, "NUMBER"
    );
    expect(criteria.filter.type).toBe("NumberComparison");
    expect(criteria.filter.value).toBe(500);
  });

  it("builds boolean comparison filter", () => {
    const criteria = buildSegmentFilter(
      "SchoolCustom__dlm", "Is_Active__c", "equals", true, "BOOLEAN"
    );
    expect(criteria.filter.type).toBe("BooleanComparison");
  });
});
