import { parseLayout } from "./parse.js";
import { serializeCanonical } from "./canonical.js";
import type { LayoutDocument } from "./types.js";
import { validateLayout } from "./validate.js";

export interface ConformanceAdapter {
  name: string;
  importLayout(document: LayoutDocument): LayoutDocument | Promise<LayoutDocument>;
  exportLayout(): LayoutDocument | Promise<LayoutDocument>;
}
export interface ConformanceCaseResult { name: string; passed: boolean; message?: string }
export interface ConformanceReport { adapter: string; passed: boolean; cases: ConformanceCaseResult[] }

/** Run portable import/export and determinism checks against a downstream renderer. */
export async function runConformance(
  adapter: ConformanceAdapter,
  fixtures: readonly LayoutDocument[],
): Promise<ConformanceReport> {
  const cases: ConformanceCaseResult[] = [];
  for (const [index, fixture] of fixtures.entries()) {
    const name = fixture.metadata.id || `fixture-${index}`;
    try {
      const imported = await adapter.importLayout(structuredClone(fixture));
      const exported = await adapter.exportLayout();
      const valid = validateLayout(exported);
      if (!valid.valid) throw new Error(valid.errors.map((item) => item.message).join("; "));
      if (serializeCanonical(imported) !== serializeCanonical(exported)) throw new Error("semantic round trip changed the document");
      if (!parseLayout(serializeCanonical(exported)).success) throw new Error("canonical export cannot be parsed");
      cases.push({ name, passed: true });
    } catch (error) {
      cases.push({ name, passed: false, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { adapter: adapter.name, passed: cases.every((item) => item.passed), cases };
}
