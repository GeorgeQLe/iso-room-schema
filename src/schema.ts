export const layoutSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://iso-room.dev/schema/layout-v1.schema.json",
  title: "Isometric Room Layout v1",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion", "metadata", "grid", "assets", "rooms", "floors", "walls",
    "openings", "entities", "zones", "spawnPoints", "navigation",
  ],
  properties: {
    schemaVersion: { const: "1.0.0" },
    metadata: {
      type: "object", additionalProperties: false, required: ["id", "title"],
      properties: {
        id: { $ref: "#/$defs/id" }, title: { type: "string", minLength: 1 },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        author: { type: "string" }, description: { type: "string" },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
    grid: {
      type: "object", additionalProperties: false,
      required: ["width", "height", "tileWidth", "tileHeight"],
      properties: {
        width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 },
        tileWidth: { type: "number", exclusiveMinimum: 0 },
        tileHeight: { type: "number", exclusiveMinimum: 0 },
      },
    },
    theme: { type: "string" },
    assets: { type: "array", items: { $ref: "#/$defs/asset" } },
    rooms: { type: "array", items: { $ref: "#/$defs/room" }, minItems: 1 },
    floors: { type: "array", items: { $ref: "#/$defs/floor" }, minItems: 1 },
    walls: { type: "array", items: { $ref: "#/$defs/wall" } },
    openings: { type: "array", items: { $ref: "#/$defs/opening" } },
    entities: { type: "array", items: { $ref: "#/$defs/entity" } },
    zones: { type: "array", items: { $ref: "#/$defs/zone" } },
    spawnPoints: { type: "array", items: { $ref: "#/$defs/spawn" } },
    navigation: {
      type: "object", additionalProperties: false, required: ["allowDiagonal"],
      properties: {
        allowDiagonal: { type: "boolean" },
        preventCornerCutting: { type: "boolean" },
        blockedZoneIds: { type: "array", items: { $ref: "#/$defs/id" }, uniqueItems: true },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
    extensions: { $ref: "#/$defs/extensions" },
  },
  $defs: {
    id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$" },
    extensions: {
      type: "object",
      propertyNames: { pattern: "^[a-z0-9]+(?:[.-][a-z0-9]+)+$" },
      additionalProperties: true,
    },
    point: {
      type: "object", additionalProperties: false, required: ["x", "y"],
      properties: { x: { type: "integer" }, y: { type: "integer" } },
    },
    size: {
      type: "object", additionalProperties: false, required: ["width", "height"],
      properties: {
        width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 },
      },
    },
    room: {
      type: "object", additionalProperties: false, required: ["id", "name", "floorRegionIds"],
      properties: {
        id: { $ref: "#/$defs/id" }, name: { type: "string", minLength: 1 },
        floorRegionIds: { type: "array", items: { $ref: "#/$defs/id" }, minItems: 1, uniqueItems: true },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
    floor: {
      type: "object", additionalProperties: false, required: ["id", "roomId", "tiles"],
      properties: {
        id: { $ref: "#/$defs/id" }, roomId: { $ref: "#/$defs/id" },
        tiles: { type: "array", items: { $ref: "#/$defs/point" }, minItems: 1 },
        material: { type: "string" }, elevation: { type: "number" },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
    wall: {
      type: "object", additionalProperties: false, required: ["id", "roomId", "tile", "direction"],
      properties: {
        id: { $ref: "#/$defs/id" }, roomId: { $ref: "#/$defs/id" },
        tile: { $ref: "#/$defs/point" },
        direction: { enum: ["north", "east", "south", "west"] },
        material: { type: "string" }, height: { type: "number", exclusiveMinimum: 0 },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
    opening: {
      type: "object", additionalProperties: false, required: ["id", "wallId", "kind"],
      properties: {
        id: { $ref: "#/$defs/id" }, wallId: { $ref: "#/$defs/id" },
        kind: { enum: ["door", "window"] },
        offset: { type: "number", minimum: 0, maximum: 1 },
        width: { type: "number", exclusiveMinimum: 0, maximum: 1 },
        passable: { type: "boolean" }, extensions: { $ref: "#/$defs/extensions" },
      },
    },
    asset: {
      type: "object", additionalProperties: false, required: ["id", "name", "kind", "footprint"],
      properties: {
        id: { $ref: "#/$defs/id" }, name: { type: "string", minLength: 1 },
        kind: { enum: ["sprite", "model", "procedural"] }, source: { type: "string" },
        footprint: { $ref: "#/$defs/size" }, collision: { type: "boolean" },
        anchors: {
          type: "object", additionalProperties: false, required: ["x", "y"],
          properties: { x: { type: "number" }, y: { type: "number" } },
        },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
    entity: {
      type: "object", additionalProperties: false,
      required: ["id", "name", "assetId", "roomId", "position", "footprint", "rotation", "elevation", "collision"],
      properties: {
        id: { $ref: "#/$defs/id" }, name: { type: "string", minLength: 1 },
        assetId: { $ref: "#/$defs/id" }, roomId: { $ref: "#/$defs/id" },
        position: { $ref: "#/$defs/point" }, footprint: { $ref: "#/$defs/size" },
        rotation: { enum: [0, 90, 180, 270] }, elevation: { type: "number" },
        collision: { type: "boolean" }, layer: { type: "string" },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
    zone: {
      type: "object", additionalProperties: false, required: ["id", "name", "roomId", "tiles"],
      properties: {
        id: { $ref: "#/$defs/id" }, name: { type: "string", minLength: 1 },
        roomId: { $ref: "#/$defs/id" },
        tiles: { type: "array", items: { $ref: "#/$defs/point" }, minItems: 1 },
        accessible: { type: "boolean" }, extensions: { $ref: "#/$defs/extensions" },
      },
    },
    spawn: {
      type: "object", additionalProperties: false, required: ["id", "name", "roomId", "position"],
      properties: {
        id: { $ref: "#/$defs/id" }, name: { type: "string", minLength: 1 },
        roomId: { $ref: "#/$defs/id" }, position: { $ref: "#/$defs/point" },
        rotation: { enum: [0, 90, 180, 270] },
        extensions: { $ref: "#/$defs/extensions" },
      },
    },
  },
} as const;
