import type { Connection } from "jsforce";

interface TrackedComponent {
  type: string;
  fullName: string;
}

/**
 * Tracks created metadata components and deletes them in reverse dependency order.
 */
export class TestCleanupRegistry {
  private components: TrackedComponent[] = [];

  register(type: string, fullName: string) {
    this.components.push({ type, fullName });
  }

  async cleanupAll(conn: Connection) {
    // Delete in reverse dependency order
    const deleteOrder = [
      "ValidationRule",
      "RecordType",
      "PermissionSet",
      "CustomTab",
      "CompactLayout",
      "ListView",
      "Layout",
      "CustomField",
      "CustomObject",
    ];

    const grouped = new Map<string, string[]>();
    for (const comp of this.components) {
      if (!grouped.has(comp.type)) {
        grouped.set(comp.type, []);
      }
      grouped.get(comp.type)!.push(comp.fullName);
    }

    for (const type of deleteOrder) {
      const names = grouped.get(type);
      if (!names || names.length === 0) continue;

      for (const name of names) {
        try {
          await conn.metadata.delete(type as any, name);
        } catch {
          // Ignore cleanup errors — component may already be deleted
        }
      }
    }

    this.components = [];
  }
}

/**
 * Generate a unique test object name to prevent collisions.
 */
export function generateTestName(prefix = "ZZTest"): string {
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}`;
}
