import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  migrateLayout, parseLayout, runConformance, serializeCanonical, validateLayout,
  type LayoutDocument,
} from "../src/index.js";

const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url));
const load = async (group: "valid" | "invalid", name: string) =>
  JSON.parse(await readFile(`${fixtures}${group}/${name}`, "utf8")) as unknown;

describe("schema conformance", () => {
  it("accepts every valid fixture with a deterministic round trip", async () => {
    for (const name of await readdir(`${fixtures}valid`)) {
      const input = await load("valid", name);
      const parsed = parseLayout(input);
      expect(parsed.validation.errors, name).toEqual([]);
      expect(parsed.success).toBe(true);
      expect(serializeCanonical(JSON.parse(serializeCanonical(parsed.document))))
        .toBe(serializeCanonical(parsed.document));
    }
  });

  it("rejects every invalid fixture with actionable errors", async () => {
    for (const name of await readdir(`${fixtures}invalid`)) {
      const result = validateLayout(await load("invalid", name));
      expect(result.valid, name).toBe(false);
      expect(result.errors[0]?.code, name).toBeTruthy();
      expect(result.errors[0]?.path, name).toMatch(/^\//);
    }
  });

  it("keeps v1 migration idempotent", async () => {
    const input = await load("valid", "basic-room.json");
    const result = migrateLayout(input);
    expect(result.changes).toEqual([]);
    expect(result.toVersion).toBe("1.0.0");
  });

  it("runs a downstream adapter without repository-relative fixture access", async () => {
    const fixture = await load("valid", "basic-room.json") as LayoutDocument;
    let current = fixture;
    const report = await runConformance({
      name: "memory",
      importLayout(document) { current = document; return document; },
      exportLayout() { return current; },
    }, [fixture]);
    expect(report.passed).toBe(true);
  });
});
