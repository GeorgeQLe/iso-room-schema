import { SCHEMA_VERSION, type LayoutDocument, type MigrationResult } from "./types.js";

/**
 * Migrate a document to the current version.
 * v1 intentionally has no legacy transforms; this dispatcher is the stable extension point.
 */
export function migrateLayout(input: unknown): MigrationResult {
  if (!input || typeof input !== "object") throw new Error("Layout must be an object");
  const version = (input as { schemaVersion?: unknown }).schemaVersion;
  if (version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion ${String(version)}; supported: ${SCHEMA_VERSION}`);
  }
  return {
    fromVersion: SCHEMA_VERSION,
    toVersion: SCHEMA_VERSION,
    document: structuredClone(input) as LayoutDocument,
    changes: [],
  };
}
