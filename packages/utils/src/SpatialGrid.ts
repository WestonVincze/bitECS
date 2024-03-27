import { type Uint32SparseSet, createUint32SparseSet, sparseSetAdd, sparseSetRemove } from "./Uint32SparseSet"

export type Cell = Uint32SparseSet

export interface SpatialGrid {
    cellSize: number
    cells: Cell[]
    width: number
    height: number
}

type SpatialGridBase = {
    cellSize: number
    defaultCellLength?: number
}

type SpatialGridOptionsGrid = {
    gridWidth: number
    gridHeight: number
}

type SpatialGridOptionsCell = {
    cellsHigh: number
    cellsWide: number
}

type SpatialGridOptions = SpatialGridBase & (SpatialGridOptionsCell | SpatialGridOptionsGrid)

export function createSpatialGrid(options: SpatialGridOptions): SpatialGrid {
    const {
        cellsHigh,
        cellsWide,
        gridWidth,
        gridHeight,
        cellSize,
        defaultCellLength = 10,
    } = options as (SpatialGridBase & SpatialGridOptionsCell & SpatialGridOptionsGrid)
    
    let w: number
    let h: number
    
    if (cellsHigh !== undefined && cellsWide !== undefined) {
        w = cellsWide
        h = cellsHigh
    } else if (gridWidth !== undefined && gridHeight !== undefined) {
        w = Math.ceil(gridWidth / cellSize)
        h = Math.ceil(gridHeight / cellSize)
    } else {
        throw new Error('Invalid spatial grid options')
    }
    
    const cells: Cell[] = Array(w * h)
    .fill(null)
    .map(() => createUint32SparseSet(defaultCellLength))
    
    return {
        cellSize,
        cells,
        width: w,
        height: h,
    }
}
export function spatialGridXtoCell(grid: SpatialGrid, x: number): number {
    return Math.floor(x / grid.cellSize)
}

export function spatialGridIndexOf(grid: SpatialGrid, x: number, y: number): number {
    return x + grid.width * y
}

export function spatialGridGetCell(grid: SpatialGrid, x: number, y: number): Cell {
    return grid.cells[spatialGridIndexOf(grid, x, y)]
}

export function spatialGridGetCellX(grid: SpatialGrid, i: number): number {
    return i % grid.width
}

export function spatialGridGetCellY(grid: SpatialGrid, i: number): number {
    return Math.floor(i / grid.width)
}

export function spatialGridInBounds(grid: SpatialGrid, x: number, y: number): boolean {
    return x >= 0 && x < grid.width && y >= 0 && y < grid.height
}

export function spatialGridAdd(grid: SpatialGrid, x: number, y: number, id: number): number {
    const cx: number = spatialGridXtoCell(grid, x)
    const cy: number = spatialGridXtoCell(grid, y)
    const cellIndex: number = spatialGridIndexOf(grid, cx, cy)
    if (!grid.cells[cellIndex]) {
        throw new Error(`Cell index ${cellIndex} out of bounds of grid`)
    }
    sparseSetAdd(grid.cells[cellIndex], id)
    return cellIndex
}

export function spatialGridRemove(grid: SpatialGrid, cellIndex: number, id: number): void {
    if (!grid.cells[cellIndex]) return
    sparseSetRemove(grid.cells[cellIndex], id)
}

export function spatialGridRefresh(grid: SpatialGrid, x: number, y: number, cellIndex: number, id: number): number {
    spatialGridRemove(grid, cellIndex, id)
    return spatialGridAdd(grid, x, y, id)
}

export function spatialGridBroadphaseRadius(grid: SpatialGrid, cellIndex: number, radius = 3): number[] {
    const x: number = spatialGridGetCellX(grid, cellIndex)
    const y: number = spatialGridGetCellY(grid, cellIndex)
    const startGridX: number = Math.ceil(x - radius / 2)
    const startGridY: number = Math.ceil(y - radius / 2)
    const endGridX: number = Math.floor(x + radius / 2)
    const endGridY: number = Math.floor(y + radius / 2)
    const nearby: number[] = []
    for (let xi = startGridX; xi <= endGridX; xi++) {
        for (let yi = startGridY; yi <= endGridY; yi++) {
            if (!spatialGridInBounds(grid, xi, yi)) continue
            spatialGridGetCell(grid, xi, yi).dense.forEach((id: number) => nearby.push(id))
        }
    }
    return nearby
}

export function spatialGridBroadphasePosition(grid: SpatialGrid, x: number, y: number, r: number): number[] {
    const cx: number = spatialGridXtoCell(grid, x)
    const cy: number = spatialGridXtoCell(grid, y)
    const cellIndex: number = spatialGridIndexOf(grid, cx, cy)
    return spatialGridBroadphaseRadius(grid, cellIndex, r)
}

export function spatialGridBroadphaseView(grid: SpatialGrid, x: number, y: number, cellsWide: number, cellsHigh: number): number[] {
    const cx: number = spatialGridXtoCell(grid, x)
    const cy: number = spatialGridXtoCell(grid, y)
    const startGridX: number = Math.ceil(cx - cellsWide / 2)
    const startGridY: number = Math.ceil(cy - cellsHigh / 2)
    const endGridX: number = Math.floor(cx + cellsWide / 2)
    const endGridY: number = Math.floor(cy + cellsHigh / 2)
    const nearby: number[] = []
    for (let xi = startGridX; xi <= endGridX; xi++) {
        for (let yi = startGridY; yi <= endGridY; yi++) {
            if (!spatialGridInBounds(grid, xi, yi)) continue
            spatialGridGetCell(grid, xi, yi).dense.forEach((id: number) => nearby.push(id))
        }
    }
    return nearby
}

export function spatialGridBroadphaseCell(grid: SpatialGrid, x: number, y: number, cellsWide: number, cellsHigh: number): Cell[] {
    const cx: number = spatialGridXtoCell(grid, x)
    const cy: number = spatialGridXtoCell(grid, y)
    const startGridX: number = Math.ceil(cx - cellsWide / 2)
    const startGridY: number = Math.ceil(cy - cellsHigh / 2)
    const endGridX: number = Math.floor(cx + cellsWide / 2)
    const endGridY: number = Math.floor(cy + cellsHigh / 2)
    const cells: Cell[] = []
    for (let xi = startGridX; xi <= endGridX; xi++) {
        for (let yi = startGridY; yi <= endGridY; yi++) {
            if (!spatialGridInBounds(grid, xi, yi)) continue
            const cell = spatialGridGetCell(grid, xi, yi)
            if (cell.dense.length) cells.push(cell)
        }
    }
    return cells
}