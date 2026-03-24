// =============================================================================
// GRID MODULE TYPES
// Serializable grid model for spatial gameplay
// =============================================================================

// =============================================================================
// GRID SPECIFICATION
// =============================================================================

/**
 * Grid specification defining dimensions and cell size
 */
export interface GridSpec {
  /** Number of columns */
  columns: number
  /** Number of rows */
  rows: number
  /** Width of each cell in pixels */
  cellWidth: number
  /** Height of each cell in pixels */
  cellHeight: number
  /** Total grid width in pixels */
  width: number
  /** Total grid height in pixels */
  height: number
}

/**
 * Grid cell position (integer coordinates)
 */
export interface GridCell {
  /** Column index (0-based) */
  col: number
  /** Row index (0-based) */
  row: number
}

/**
 * Normalized position (0.0 to 1.0)
 */
export interface NormalizedPosition {
  /** X position as fraction of width */
  x: number
  /** Y position as fraction of height */
  y: number
}

/**
 * Pixel position
 */
export interface PixelPosition {
  /** X position in pixels */
  x: number
  /** Y position in pixels */
  y: number
}

// =============================================================================
// GRID OCCUPANCY
// =============================================================================

/**
 * Reference to an entity in the grid
 */
export interface GridEntityRef {
  /** Unique entity identifier */
  id: string
  /** Entity type for categorization */
  type: string
  /** Entity data (optional) */
  data?: unknown
}

/**
 * Occupancy entry for a grid cell
 */
export interface GridOccupancyEntry {
  /** Cell position */
  cell: GridCell
  /** Entity occupying this cell */
  entity: GridEntityRef
  /** Timestamp when occupied */
  occupiedAt: number
}

/**
 * Grid occupancy map - maps cell keys to occupancy entries
 */
export type GridOccupancy = Map<string, GridOccupancyEntry>

// =============================================================================
// GRID LANES
// =============================================================================

/**
 * Lane definition for spawn/track zones
 */
export interface GridLane {
  /** Lane identifier */
  id: string
  /** Column range (inclusive) */
  columns: {
    start: number
    end: number
  }
  /** Row range (inclusive) */
  rows?: {
    start: number
    end: number
  }
  /** Lane type for categorization */
  type?: string
}

/**
 * Spawn point configuration
 */
export interface GridSpawnPoint {
  /** Lane to spawn in */
  laneId: string
  /** Normalized position within lane (0.0 to 1.0) */
  position: number
  /** Direction entity should move */
  direction?: 'up' | 'down' | 'left' | 'right'
}

// =============================================================================
// GRID SPATIAL INDEX
// =============================================================================

/**
 * Spatial index for efficient grid queries
 */
export interface GridSpatialIndex {
  /** Get all entities in a cell */
  getAt(cell: GridCell): GridEntityRef[]
  /** Get all entities in a rectangular region */
  getInRegion(topLeft: GridCell, bottomRight: GridCell): GridEntityRef[]
  /** Get all entities of a type */
  getByType(type: string): GridEntityRef[]
  /** Get the cell for an entity */
  getCellForEntity(entityId: string): GridCell | undefined
}

// =============================================================================
// GRID MODEL
// =============================================================================

/**
 * Serializable grid model
 */
export interface GridModel {
  /** Grid specification */
  spec: GridSpec
  /** Lane definitions */
  lanes: GridLane[]
  /** Current occupancy state */
  occupancy: GridOccupancy
  /** Entity position index (entity ID -> cell) */
  entityPositions: Map<string, GridCell>
}

/**
 * Grid model state for serialization
 */
export interface GridModelState {
  spec: GridSpec
  lanes: GridLane[]
  occupancy: Array<[string, GridOccupancyEntry]>
  entityPositions: Array<[string, GridCell]>
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a cell key for map storage
 */
export function cellKey(cell: GridCell): string {
  return `${cell.col},${cell.row}`
}

/**
 * Parse a cell key back to cell coordinates
 */
export function parseCellKey(key: string): GridCell {
  const [col, row] = key.split(',').map(Number)
  return { col, row }
}

/**
 * Check if a cell is within grid bounds
 */
export function isCellInBounds(cell: GridCell, spec: GridSpec): boolean {
  return cell.col >= 0 && cell.col < spec.columns && cell.row >= 0 && cell.row < spec.rows
}

/**
 * Convert normalized position to pixel position
 */
export function normalizedToPixel(pos: NormalizedPosition, spec: GridSpec): PixelPosition {
  return {
    x: pos.x * spec.width,
    y: pos.y * spec.height,
  }
}

/**
 * Convert pixel position to cell
 */
export function pixelToCell(pos: PixelPosition, spec: GridSpec): GridCell {
  return {
    col: Math.floor(pos.x / spec.cellWidth),
    row: Math.floor(pos.y / spec.cellHeight),
  }
}

/**
 * Convert cell to pixel position (center of cell)
 */
export function cellToPixel(cell: GridCell, spec: GridSpec): PixelPosition {
  return {
    x: cell.col * spec.cellWidth + spec.cellWidth / 2,
    y: cell.row * spec.cellHeight + spec.cellHeight / 2,
  }
}

/**
 * Convert normalized position to cell
 */
export function normalizedToCell(pos: NormalizedPosition, spec: GridSpec): GridCell {
  return pixelToCell(normalizedToPixel(pos, spec), spec)
}

/**
 * Create a grid specification
 */
export function createGridSpec(
  columns: number,
  rows: number,
  cellWidth: number,
  cellHeight: number
): GridSpec {
  return {
    columns,
    rows,
    cellWidth,
    cellHeight,
    width: columns * cellWidth,
    height: rows * cellHeight,
  }
}

/**
 * Create an empty grid model
 */
export function createGridModel(spec: GridSpec, lanes: GridLane[] = []): GridModel {
  return {
    spec,
    lanes,
    occupancy: new Map(),
    entityPositions: new Map(),
  }
}

/**
 * Serialize grid model for transport
 */
export function serializeGridModel(model: GridModel): GridModelState {
  return {
    spec: model.spec,
    lanes: model.lanes,
    occupancy: Array.from(model.occupancy.entries()),
    entityPositions: Array.from(model.entityPositions.entries()),
  }
}

/**
 * Deserialize grid model from transport
 */
export function deserializeGridModel(state: GridModelState): GridModel {
  return {
    spec: state.spec,
    lanes: state.lanes,
    occupancy: new Map(state.occupancy),
    entityPositions: new Map(state.entityPositions),
  }
}
