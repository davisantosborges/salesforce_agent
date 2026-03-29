import { vi } from "vitest";

/**
 * Creates a mock jsforce Connection with all commonly used methods stubbed.
 */
export function createMockConnection(overrides?: Partial<MockOverrides>) {
  const metadataCreate = vi.fn().mockResolvedValue({ success: true, fullName: "test" });
  const metadataRead = vi.fn().mockResolvedValue({ fullName: "test" });
  const metadataUpdate = vi.fn().mockResolvedValue({ success: true, fullName: "test" });
  const metadataDelete = vi.fn().mockResolvedValue({ success: true, fullName: "test" });
  const metadataList = vi.fn().mockResolvedValue([]);

  const sobjectCreate = vi.fn().mockResolvedValue({ success: true, id: "001000000000001" });
  const sobjectRetrieve = vi.fn().mockResolvedValue({ Id: "001000000000001", Name: "Test" });
  const sobjectUpdate = vi.fn().mockResolvedValue({ success: true });
  const sobjectDestroy = vi.fn().mockResolvedValue({ success: true });

  const conn: any = {
    instanceUrl: "https://test.salesforce.com",
    accessToken: "mock-token",

    metadata: {
      create: overrides?.metadataCreate ?? metadataCreate,
      read: overrides?.metadataRead ?? metadataRead,
      update: overrides?.metadataUpdate ?? metadataUpdate,
      delete: overrides?.metadataDelete ?? metadataDelete,
      list: overrides?.metadataList ?? metadataList,
    },

    tooling: {
      query: vi.fn().mockResolvedValue({ records: [], totalSize: 0 }),
      executeAnonymous: vi.fn().mockResolvedValue({ success: true, compiled: true }),
    },

    describe: vi.fn().mockResolvedValue({
      name: "Test__c",
      label: "Test",
      fields: [
        { name: "Id", type: "id", custom: false },
        { name: "Name", type: "string", custom: false },
      ],
      createable: true,
      updateable: true,
      deletable: true,
    }),

    describeGlobal: vi.fn().mockResolvedValue({
      sobjects: [{ name: "Account", custom: false }, { name: "Test__c", custom: true }],
    }),

    identity: vi.fn().mockResolvedValue({
      username: "test@test.com",
      display_name: "Test User",
    }),

    query: vi.fn().mockResolvedValue({ records: [], totalSize: 0 }),

    request: vi.fn().mockResolvedValue({}),

    sobject: vi.fn().mockReturnValue({
      create: overrides?.sobjectCreate ?? sobjectCreate,
      retrieve: overrides?.sobjectRetrieve ?? sobjectRetrieve,
      update: overrides?.sobjectUpdate ?? sobjectUpdate,
      destroy: overrides?.sobjectDestroy ?? sobjectDestroy,
    }),

    login: vi.fn().mockResolvedValue({}),
  };

  return {
    conn,
    mocks: {
      metadataCreate,
      metadataRead,
      metadataUpdate,
      metadataDelete,
      metadataList,
      sobjectCreate,
      sobjectRetrieve,
      sobjectUpdate,
      sobjectDestroy,
    },
  };
}

interface MockOverrides {
  metadataCreate: ReturnType<typeof vi.fn>;
  metadataRead: ReturnType<typeof vi.fn>;
  metadataUpdate: ReturnType<typeof vi.fn>;
  metadataDelete: ReturnType<typeof vi.fn>;
  metadataList: ReturnType<typeof vi.fn>;
  sobjectCreate: ReturnType<typeof vi.fn>;
  sobjectRetrieve: ReturnType<typeof vi.fn>;
  sobjectUpdate: ReturnType<typeof vi.fn>;
  sobjectDestroy: ReturnType<typeof vi.fn>;
}
