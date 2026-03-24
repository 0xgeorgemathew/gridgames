// =============================================================================
// GRAPH MODULE TYPES
// Optional snake-graph state model for price visualization
// =============================================================================

// =============================================================================
// SNAKE GRAPH STATE
// =============================================================================

/**
 * A point in the snake graph trail
 */
export interface SnakeGraphPoint {
  /** Timestamp when point was recorded */
  time: number
  /** Raw price value */
  price: number
  /** Price as percentage from baseline */
  pct: number
  /** X position in pixels (calculated) */
  x?: number
  /** Y position in pixels (calculated) */
  y?: number
}

/**
 * Animation state for the snake graph
 */
export interface SnakeGraphAnimationState {
  /** Currently displayed price (smoothed) */
  currentDisplayedPrice: number | null
  /** Current zoom level */
  currentZoom: number | null
  /** Current center percentage */
  currentCenterPct: number | null
  /** Whether graph is animating */
  isAnimating: boolean
  /** Whether graph has exploded (game over animation) */
  graphExploded: boolean
}

/**
 * Configuration for snake graph rendering
 */
export interface SnakeGraphConfig {
  /** Speed factor relative to background scroll */
  scrollSpeedFactor: number
  /** Price smoothing half-life in ms */
  priceHalfLifeMs: number
  /** Zoom smoothing half-life in ms */
  zoomHalfLifeMs: number
  /** Center tracking half-life in ms */
  centerHalfLifeMs: number
  /** Time window for high/low evaluation in ms */
  windowMs: number
  /** Target view ratio for price range */
  targetViewRatio: number
  /** Minimum spacing between points in pixels */
  minPointSpacingPx: number
  /** Maximum zoom (amplification) */
  maxZoom: number
  /** Minimum zoom (dampening) */
  minZoom: number
  /** Height of the ribbon trail */
  ribbonHeight: number
  /** Loss threshold for styling (percentage) */
  lossThreshold?: number
  /** Profit threshold for styling (percentage) */
  profitThreshold?: number
}

/**
 * Default snake graph configuration
 */
export const DEFAULT_SNAKE_GRAPH_CONFIG: SnakeGraphConfig = {
  scrollSpeedFactor: 0.6,
  priceHalfLifeMs: 300,
  zoomHalfLifeMs: 2500,
  centerHalfLifeMs: 3500,
  windowMs: 30000,
  targetViewRatio: 0.65,
  minPointSpacingPx: 2.5,
  maxZoom: 9000,
  minZoom: 40,
  ribbonHeight: 45,
  lossThreshold: -10,
  profitThreshold: 10,
}

// =============================================================================
// SNAKE GRAPH MODEL
// =============================================================================

/**
 * Serializable snake graph state
 */
export interface SnakeGraphState {
  /** History of price points */
  history: SnakeGraphPoint[]
  /** Animation state */
  animation: SnakeGraphAnimationState
  /** Baseline price (first price) */
  startPrice: number | null
  /** Configuration */
  config: SnakeGraphConfig
}

/**
 * Snake graph update arguments
 */
export interface SnakeGraphUpdateArgs {
  /** Delta time in ms */
  delta: number
  /** Current price data */
  priceData: { price: number } | null
  /** Whether game is playing */
  isPlaying: boolean
  /** First/baseline price */
  firstPrice: number | null
  /** Viewport width */
  width: number
  /** Viewport height */
  height: number
  /** Pixels per millisecond */
  pixelsPerMs: number
  /** HUD height offset */
  hudHeight?: number
}

/**
 * Snake graph render context
 */
export interface SnakeGraphRenderContext {
  /** Graphics object to render to */
  graphics: unknown
  /** Current head X position */
  headX: number
  /** Current head Y position */
  headY: number
  /** Current core color */
  coreColor: number
}

// =============================================================================
// SNAKE GRAPH SERIALIZATION
// =============================================================================

/**
 * Serializable snake graph state for transport
 */
export interface SnakeGraphStateTransport {
  history: Array<{
    time: number
    price: number
    pct: number
  }>
  animation: {
    currentDisplayedPrice: number | null
    currentZoom: number | null
    currentCenterPct: number | null
    isAnimating: boolean
    graphExploded: boolean
  }
  startPrice: number | null
}

/**
 * Create initial snake graph state
 */
export function createSnakeGraphState(
  config: SnakeGraphConfig = DEFAULT_SNAKE_GRAPH_CONFIG
): SnakeGraphState {
  return {
    history: [],
    animation: {
      currentDisplayedPrice: null,
      currentZoom: null,
      currentCenterPct: null,
      isAnimating: false,
      graphExploded: false,
    },
    startPrice: null,
    config,
  }
}

/**
 * Reset snake graph state
 */
export function resetSnakeGraphState(state: SnakeGraphState): void {
  state.history = []
  state.animation.currentDisplayedPrice = null
  state.animation.currentZoom = null
  state.animation.currentCenterPct = null
  state.animation.isAnimating = false
  state.animation.graphExploded = false
  state.startPrice = null
}

/**
 * Serialize snake graph state for transport
 */
export function serializeSnakeGraphState(state: SnakeGraphState): SnakeGraphStateTransport {
  return {
    history: state.history.map((p) => ({
      time: p.time,
      price: p.price,
      pct: p.pct,
    })),
    animation: {
      currentDisplayedPrice: state.animation.currentDisplayedPrice,
      currentZoom: state.animation.currentZoom,
      currentCenterPct: state.animation.currentCenterPct,
      isAnimating: state.animation.isAnimating,
      graphExploded: state.animation.graphExploded,
    },
    startPrice: state.startPrice,
  }
}

/**
 * Deserialize snake graph state from transport
 */
export function deserializeSnakeGraphState(
  transport: SnakeGraphStateTransport,
  config: SnakeGraphConfig = DEFAULT_SNAKE_GRAPH_CONFIG
): SnakeGraphState {
  return {
    history: transport.history.map((p) => ({
      time: p.time,
      price: p.price,
      pct: p.pct,
    })),
    animation: { ...transport.animation },
    startPrice: transport.startPrice,
    config,
  }
}

// =============================================================================
// SNAKE GRAPH CALCULATIONS
// =============================================================================

/**
 * Calculate percentage change from baseline
 */
export function calculatePercentage(price: number, baseline: number): number {
  return ((price - baseline) / baseline) * 100
}

/**
 * Apply exponential smoothing
 */
export function smoothValue(
  current: number,
  target: number,
  halfLifeMs: number,
  deltaMs: number
): number {
  const t = 1 - Math.pow(0.5, deltaMs / Math.max(1, halfLifeMs))
  return current + (target - current) * t
}

/**
 * Calculate zoom level based on price range
 */
export function calculateZoom(
  range: number,
  targetViewRatio: number,
  graphHeight: number,
  minZoom: number,
  maxZoom: number
): number {
  if (range < 0.001) range = 0.001
  const naturalZoom = (targetViewRatio * graphHeight) / range
  return Math.max(minZoom, Math.min(maxZoom, naturalZoom))
}

/**
 * Cull old points from history
 */
export function cullOldPoints(
  history: SnakeGraphPoint[],
  maxAgeMs: number,
  now: number
): SnakeGraphPoint[] {
  return history.filter((p) => now - p.time <= maxAgeMs)
}

/**
 * Get window min/max from history
 */
export function getWindowBounds(
  history: SnakeGraphPoint[],
  windowStart: number,
  currentPct: number
): { min: number; max: number } {
  let min = currentPct
  let max = currentPct

  for (const p of history) {
    if (p.time >= windowStart) {
      if (p.pct < min) min = p.pct
      if (p.pct > max) max = p.pct
    }
  }

  return { min, max }
}
