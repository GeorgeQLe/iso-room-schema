/** Current portable document version. */
export const SCHEMA_VERSION = "1.0.0" as const;

export type ExtensionMap = Record<string, unknown>;
export type Rotation = 0 | 90 | 180 | 270;
export type EdgeDirection = "north" | "east" | "south" | "west";

export interface GridPoint { x: number; y: number }
export interface GridSize { width: number; height: number }
export interface Tile extends GridPoint {}

export interface DocumentMetadata {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  description?: string;
  extensions?: ExtensionMap;
}

export interface GridDefinition {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
}

export interface FloorRegion {
  id: string;
  roomId: string;
  tiles: Tile[];
  material?: string;
  elevation?: number;
  extensions?: ExtensionMap;
}

export interface Room {
  id: string;
  name: string;
  floorRegionIds: string[];
  extensions?: ExtensionMap;
}

export interface WallEdge {
  id: string;
  roomId: string;
  tile: Tile;
  direction: EdgeDirection;
  material?: string;
  height?: number;
  extensions?: ExtensionMap;
}

export interface Opening {
  id: string;
  wallId: string;
  kind: "door" | "window";
  offset?: number;
  width?: number;
  passable?: boolean;
  extensions?: ExtensionMap;
}

export interface AssetDefinition {
  id: string;
  name: string;
  kind: "sprite" | "model" | "procedural";
  source?: string;
  footprint: GridSize;
  collision?: boolean;
  anchors?: { x: number; y: number };
  extensions?: ExtensionMap;
}

export interface PlacedEntity {
  id: string;
  name: string;
  assetId: string;
  roomId: string;
  position: GridPoint;
  footprint: GridSize;
  rotation: Rotation;
  elevation: number;
  collision: boolean;
  layer?: string;
  extensions?: ExtensionMap;
}

export interface Zone {
  id: string;
  name: string;
  roomId: string;
  tiles: Tile[];
  accessible?: boolean;
  extensions?: ExtensionMap;
}

export interface SpawnPoint {
  id: string;
  name: string;
  roomId: string;
  position: GridPoint;
  rotation?: Rotation;
  extensions?: ExtensionMap;
}

export interface NavigationSettings {
  allowDiagonal: boolean;
  preventCornerCutting?: boolean;
  blockedZoneIds?: string[];
  extensions?: ExtensionMap;
}

export interface LayoutDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  metadata: DocumentMetadata;
  grid: GridDefinition;
  theme?: string;
  assets: AssetDefinition[];
  rooms: Room[];
  floors: FloorRegion[];
  walls: WallEdge[];
  openings: Opening[];
  entities: PlacedEntity[];
  zones: Zone[];
  spawnPoints: SpawnPoint[];
  navigation: NavigationSettings;
  extensions?: ExtensionMap;
}

export type ValidationSeverity = "error" | "warning";
export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: ValidationSeverity;
  relatedIds?: string[];
}
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
export interface ParseResult {
  success: boolean;
  document?: LayoutDocument;
  validation: ValidationResult;
}

export interface MigrationResult {
  fromVersion: string;
  toVersion: typeof SCHEMA_VERSION;
  document: LayoutDocument;
  changes: string[];
}
