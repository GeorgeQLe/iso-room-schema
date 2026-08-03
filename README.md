# iso-room-schema

Renderer-neutral TypeScript types, JSON Schema, validation, migration plumbing,
canonical serialization, fixtures, and a downstream conformance runner for
single-level tile-based isometric room games.

```ts
import {
  parseLayout,
  serializeCanonical,
  validateLayout,
  type LayoutDocument,
} from "iso-room-schema";

const parsed = parseLayout(json);
if (!parsed.success) console.error(parsed.validation.errors);
else console.log(serializeCanonical(parsed.document));
```

## Portable format

Floors are connected four-neighbor tile regions. Walls occupy tile edges and openings
reference walls. Entities carry their logical footprint, quarter-turn rotation,
elevation, collision flag, asset reference, and room. Renderer details belong only
under reverse-DNS-like extension keys such as `pixi.iso-room` and `three.iso-room`.

Package exports expose the schema at `iso-room-schema/schema` and fixtures through
`iso-room-schema/fixtures/valid/basic-room.json`, so consumers never need repository
paths. `runConformance` accepts in-memory fixtures and an engine adapter.

## Versioning and migration

The package follows SemVer. `migrateLayout` dispatches by `schemaVersion`; v1.0.0 is
the only supported version, so its migration is an idempotent clone. Future versions
add transforms without changing renderer contracts.

## Scope

This project deliberately excludes rendering, editor UI, networking, multiplayer,
collaboration, multiple levels, stairs, roofs, terrain, and product-specific
business concepts.

Run `pnpm test`, `pnpm build`, and `pnpm docs`. Generated TypeDoc output is complete
for every public API exported from `src/index.ts`.
