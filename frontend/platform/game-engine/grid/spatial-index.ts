// =============================================================================
// GRID SPATIAL INDEX
// Efficient spatial queries for grid entities
// =============================================================================

import type {
  GridSpec,
  GridCell,
  GridEntityRef,
  GridSpatialIndex,
  GridOccupancy,
  GridModel,
} from './types'
import { cellKey, isCellInBounds } from './types'

/**
 * Implementation of spatial index for grid queries
 */
export class GridSpatialIndexImpl implements GridSpatialIndex {
  private occupancy: GridOccupancy
  private entityPositions: Map<string, GridCell>
  private spec: GridSpec
  private typeIndex: Map<string, Set<string>> = new Map()

  constructor(model: GridModel) {
    this.occupancy = model.occupancy
    this.entityPositions = model.entityPositions
    this.spec = model.spec
    this.rebuildTypeIndex()
  }

  /**
   * Update the spatial index with new model state
   */
  update(model: GridModel): void {
    this.occupancy = model.occupancy
    this.entityPositions = model.entityPositions
    this.spec = model.spec
    this.rebuildTypeIndex()
  }

  /**
   * Rebuild the type index for efficient type queries
   */
  private rebuildTypeIndex(): void {
    this.typeIndex.clear()
    for (const entry of this.occupancy.values()) {
      const type = entry.entity.type
      if (!this.typeIndex.has(type)) {
        this.typeIndex.set(type, new Set())
      }
      this.typeIndex.get(type)!.add(entry.entity.id)
    }
  }

  /**
   * Get all entities in a cell
   */
  getAt(cell: GridCell): GridEntityRef[] {
    if (!isCellInBounds(cell, this.spec)) {
      return []
    }
    const key = cellKey(cell)
    const entry = this.occupancy.get(key)
    return entry ? [entry.entity] : []
  }

  /**
   * Get all entities in a rectangular region
   */
  getInRegion(topLeft: GridCell, bottomRight: GridCell): GridEntityRef[] {
    const entities: GridEntityRef[] = []
    for (let col = topLeft.col; col <= bottomRight.col; col++) {
      for (let row = topLeft.row; row <= bottomRight.row; row++) {
        const cell = { col, row }
        const key = cellKey(cell)
        const entry = this.occupancy.get(key)
        if (entry) {
          entities.push(entry.entity)
        }
      }
    }
    return entities
  }

  /**
   * Get all entities of a specific type
   */
  getByType(type: string): GridEntityRef[] {
    const ids = this.typeIndex.get(type)
    if (!ids) return []

    const entities: GridEntityRef[] = []
    for (const id of ids) {
      const cell = this.entityPositions.get(id)
      if (cell) {
        const key = cellKey(cell)
        const entry = this.occupancy.get(key)
        if (entry && entry.entity.id === id) {
          entities.push(entry.entity)
        }
      }
    }
    return entities
  }

  /**
   * Get the cell for an entity
   */
  getCellForEntity(entityId: string): GridCell | undefined {
    return this.entityPositions.get(entityId)
  }

  /**
   * Get all entities in the grid
   */
  getAllEntities(): GridEntityRef[] {
    return Array.from(this.occupancy.values()).map((e) => e.entity)
  }

  /**
   * Get count of entities by type
   */
  getCountByType(type: string): number {
    return this.typeIndex.get(type)?.size ?? 0
  }

  /**
   * Check if a cell is occupied
   */
  isOccupied(cell: GridCell): boolean {
    const key = cellKey(cell)
    return this.occupancy.has(key)
  }

  /**
   * Find nearest entity of a type to a cell
   */
  findNearest(cell: GridCell, type: string, maxDistance?: number): GridEntityRef | null {
    const entities = this.getByType(type)
    if (entities.length === 0) return null

    let nearest: GridEntityRef | null = null
    let minDist = Infinity

    for (const entity of entities) {
      const entityCell = this.getCellForEntity(entity.id)
      if (!entityCell) continue

      const dist = Math.abs(entityCell.col - cell.col) + Math.abs(entityCell.row - cell.row)
      if (dist < minDist && (maxDistance === undefined || dist <= maxDistance)) {
        minDist = dist
        nearest = entity
      }
    }

    return nearest
  }

  /**
   * Get cells in a radius around a center cell
   */
  getCellsInRadius(center: GridCell, radius: number): GridCell[] {
    const cells: GridCell[] = []
    for (let col = center.col - radius; col <= center.col + radius; col++) {
      for (let row = center.row - radius; row <= center.row + radius; row++) {
        const cell = { col, row }
        if (isCellInBounds(cell, this.spec)) {
          const dist = Math.sqrt(Math.pow(col - center.col, 2) + Math.pow(row - center.row, 2))
          if (dist <= radius) {
            cells.push(cell)
          }
        }
      }
    }
    return cells
  }
}

/**
 * Create a spatial index from a grid model
 */
export function createSpatialIndex(model: GridModel): GridSpatialIndexImpl {
  return new GridSpatialIndexImpl(model)
}
