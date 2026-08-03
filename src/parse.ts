import { migrateLayout } from "./migrate.js";
import type { ParseResult } from "./types.js";
import { validateLayout } from "./validate.js";

/** Parse JSON text or an unknown object, migrate it, and validate the result. */
export function parseLayout(input: string | unknown): ParseResult {
  let value: unknown;
  try {
    value = typeof input === "string" ? JSON.parse(input) : structuredClone(input);
    const migrated = migrateLayout(value);
    const validation = validateLayout(migrated.document);
    return validation.valid
      ? { success: true, document: migrated.document, validation }
      : { success: false, validation };
  } catch (error) {
    return {
      success: false,
      validation: {
        valid: false,
        errors: [{
          code: "parse.invalid",
          message: error instanceof Error ? error.message : "Unable to parse layout",
          path: "/",
          severity: "error",
        }],
        warnings: [],
      },
    };
  }
}
