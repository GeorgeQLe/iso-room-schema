import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { layoutSchema } from "./schema.js";
import type {
  FloorRegion, GridPoint, LayoutDocument, PlacedEntity, ValidationIssue, ValidationResult,
} from "./types.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const structuralValidator = ajv.compile(layoutSchema);
const key = ({ x, y }: GridPoint) => `${x},${y}`;
const issue = (
  code: string, message: string, path: string, relatedIds?: string[],
): ValidationIssue => ({ code, message, path, severity: "error", ...(relatedIds ? { relatedIds } : {}) });

function structuralIssue(error: ErrorObject): ValidationIssue {
  const suffix = error.params && "missingProperty" in error.params
    ? `/${String(error.params.missingProperty)}` : "";
  return issue(
    `schema.${error.keyword}`,
    `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    `${error.instancePath || ""}${suffix}` || "/",
  );
}

function connected(floor: FloorRegion): boolean {
  const tiles = new Set(floor.tiles.map(key));
  const first = floor.tiles[0];
  if (!first) return false;
  const seen = new Set([key(first)]);
  const queue = [first];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i]!;
    for (const next of [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
    ]) {
      const nextKey = key(next);
      if (tiles.has(nextKey) && !seen.has(nextKey)) {
        seen.add(nextKey);
        queue.push(next);
      }
    }
  }
  return seen.size === tiles.size;
}

function footprintTiles(entity: PlacedEntity): string[] {
  const rotated = entity.rotation === 90 || entity.rotation === 270;
  const width = rotated ? entity.footprint.height : entity.footprint.width;
  const height = rotated ? entity.footprint.width : entity.footprint.height;
  return Array.from({ length: width * height }, (_, index) =>
    `${entity.position.x + (index % width)},${entity.position.y + Math.floor(index / width)}`);
}

function semanticIssues(doc: LayoutDocument): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const rooms = new Set(doc.rooms.map((room) => room.id));
  const assets = new Set(doc.assets.map((asset) => asset.id));
  const walls = new Map(doc.walls.map((wall) => [wall.id, wall]));
  const floorTiles = new Set(doc.floors.flatMap((floor) => floor.tiles.map(key)));
  const allCollections = [
    doc.assets, doc.rooms, doc.floors, doc.walls, doc.openings, doc.entities, doc.zones, doc.spawnPoints,
  ];
  const ids = new Set<string>();
  for (const collection of allCollections) {
    for (const item of collection) {
      if (ids.has(item.id)) errors.push(issue("id.duplicate", `Duplicate id '${item.id}'`, "/", [item.id]));
      ids.add(item.id);
    }
  }
  doc.floors.forEach((floor, index) => {
    if (!rooms.has(floor.roomId)) errors.push(issue("reference.room", `Unknown room '${floor.roomId}'`, `/floors/${index}/roomId`));
    if (!connected(floor)) errors.push(issue("floor.disconnected", `Floor '${floor.id}' must be one connected region`, `/floors/${index}/tiles`, [floor.id]));
    floor.tiles.forEach((tile, tileIndex) => {
      if (tile.x < 0 || tile.y < 0 || tile.x >= doc.grid.width || tile.y >= doc.grid.height) {
        errors.push(issue("grid.bounds", `Tile ${key(tile)} is outside the grid`, `/floors/${index}/tiles/${tileIndex}`));
      }
    });
  });
  doc.rooms.forEach((room, index) => {
    for (const regionId of room.floorRegionIds) {
      const floor = doc.floors.find((candidate) => candidate.id === regionId);
      if (!floor || floor.roomId !== room.id) errors.push(issue("reference.floor", `Room '${room.id}' references invalid floor '${regionId}'`, `/rooms/${index}/floorRegionIds`));
    }
  });
  doc.openings.forEach((opening, index) => {
    const wall = walls.get(opening.wallId);
    if (!wall) errors.push(issue("reference.wall", `Unknown wall '${opening.wallId}'`, `/openings/${index}/wallId`));
    if (opening.kind === "window" && opening.passable) errors.push(issue("opening.windowPassable", "Windows cannot be passable", `/openings/${index}/passable`));
  });
  const wallEdges = new Map<string, string>();
  doc.walls.forEach((wall, index) => {
    const edge = `${wall.roomId}:${key(wall.tile)}:${wall.direction}`;
    const duplicate = wallEdges.get(edge);
    if (duplicate) errors.push(issue("wall.duplicateEdge", `Walls '${duplicate}' and '${wall.id}' occupy the same edge`, `/walls/${index}`, [duplicate, wall.id]));
    wallEdges.set(edge, wall.id);
    if (!rooms.has(wall.roomId)) errors.push(issue("reference.room", `Unknown room '${wall.roomId}'`, `/walls/${index}/roomId`));
    if (!floorTiles.has(key(wall.tile))) errors.push(issue("wall.offFloor", `Wall '${wall.id}' is anchored outside the floor`, `/walls/${index}/tile`, [wall.id]));
  });
  const openingWalls = new Map<string, string>();
  doc.openings.forEach((opening, index) => {
    const previous = openingWalls.get(opening.wallId);
    if (previous) errors.push(issue("opening.overlap", `Openings '${previous}' and '${opening.id}' share wall '${opening.wallId}'`, `/openings/${index}`, [previous, opening.id]));
    openingWalls.set(opening.wallId, opening.id);
  });
  const occupied = new Map<string, string>();
  doc.entities.forEach((entity, index) => {
    if (!rooms.has(entity.roomId)) errors.push(issue("reference.room", `Unknown room '${entity.roomId}'`, `/entities/${index}/roomId`));
    if (!assets.has(entity.assetId)) errors.push(issue("reference.asset", `Unknown asset '${entity.assetId}'`, `/entities/${index}/assetId`));
    for (const tile of footprintTiles(entity)) {
      if (!floorTiles.has(tile)) errors.push(issue("entity.offFloor", `Entity '${entity.id}' occupies non-floor tile ${tile}`, `/entities/${index}/position`, [entity.id]));
      const other = occupied.get(tile);
      if (entity.collision && other) errors.push(issue("entity.collision", `Entity '${entity.id}' collides with '${other}' at ${tile}`, `/entities/${index}/position`, [other, entity.id]));
      if (entity.collision) occupied.set(tile, entity.id);
    }
  });
  doc.zones.forEach((zone, index) => {
    const missing = zone.tiles.filter((tile) => !floorTiles.has(key(tile)));
    if (missing.length) errors.push(issue("zone.inaccessible", `Zone '${zone.id}' includes non-floor tiles`, `/zones/${index}/tiles`, [zone.id]));
  });
  doc.spawnPoints.forEach((spawn, index) => {
    if (!floorTiles.has(key(spawn.position)) || occupied.has(key(spawn.position))) {
      errors.push(issue("navigation.spawnBlocked", `Spawn '${spawn.id}' is not on a walkable tile`, `/spawnPoints/${index}/position`, [spawn.id]));
    }
  });
  if (doc.spawnPoints.length > 0) {
    const walkable = new Set([...floorTiles].filter((tile) => !occupied.has(tile)));
    const start = key(doc.spawnPoints[0]!.position);
    const reached = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
      const [x = 0, y = 0] = queue[i]!.split(",").map(Number);
      for (const neighbor of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
        if (walkable.has(neighbor) && !reached.has(neighbor)) { reached.add(neighbor); queue.push(neighbor); }
      }
    }
    if ([...walkable].some((tile) => !reached.has(tile))) {
      errors.push(issue("navigation.disconnected", "Walkable floor contains regions unreachable from the first spawn", "/navigation"));
    }
  }
  return errors;
}

/** Validate JSON shape plus renderer-neutral cross-reference and navigation rules. */
export function validateLayout(input: unknown): ValidationResult {
  const structurallyValid = structuralValidator(input);
  const errors = structurallyValid
    ? semanticIssues(input as LayoutDocument)
    : (structuralValidator.errors ?? []).map(structuralIssue);
  return { valid: errors.length === 0, errors, warnings: [] };
}
