/**
 * Constants for PriceGraph component
 * Arcade-optimized for 500× leverage trading game
 */

import type { GraphColors, ArcadeGraphConfig, BufferConfig } from './types'

/**
 * Game duration in milliseconds (2.5 minutes)
 */
export const GAME_DURATION_MS = 150_000

/**
 * Bucket interval in milliseconds (250ms)
 * Smooth enough for readability, still feels live
 * ~240–720 buckets per match (for 1-3 minute games)
 */
export const BUCKET_INTERVAL_MS = 250

/**
 * Arcade graph configuration
 */
export const ARCADE_GRAPH_CONFIG: ArcadeGraphConfig = {
	bucketIntervalMs: BUCKET_INTERVAL_MS,
	visualMultiplier: 100, // Reduced from 200 to keep graph more centered
	emaPeriod: 4, // Light smoothing over 4 buckets (1 second)
	leverage: 500, // Fixed leverage for liquidation calculation
	maxBuckets: Math.ceil(GAME_DURATION_MS / BUCKET_INTERVAL_MS), // 600 buckets for 2.5 min
	updateThrottleMs: BUCKET_INTERVAL_MS, // Update every bucket
	autoScalePadding: 1.5, // Increased from 1.2 to 50% padding for better centering
	maxVisualRange: 100, // Increased clamp range to allow more movement
}

/**
 * Color palette matching the game's Tron-style theme
 * Green = longs winning, Red = shorts winning
 */
export const GRAPH_COLORS: GraphColors = {
  // Line styling - momentum reactive
  lineColorGreen: '#00ff88', // Bright green (longs winning)
  lineColorRed: '#ff4466', // Bright red (shorts winning)
  lineWidth: 3,
  lineWidthHighMomentum: 5, // Thicker when |velocity| is high

  // Area gradient (for optional area series)
  areaTopColor: 'rgba(0, 243, 255, 0.4)',
  areaBottomColor: 'rgba(0, 243, 255, 0.05)',

  // Grid lines
  gridLineColor: 'rgba(0, 243, 255, 0.08)',

  // Axis styling
  axisColor: 'rgba(0, 243, 255, 0.2)',
  textColor: 'rgba(0, 243, 255, 0.6)',

  // Background (transparent to show game background)
  background: 'transparent',

  // Zero line (center)
  zeroLineColor: 'rgba(255, 255, 255, 0.3)',

  // Liquidation bands
  liquidationBandColor: 'rgba(255, 68, 102, 0.15)',
}

/**
 * Buffer configuration
 * Max size accommodates 3+ minutes of 250ms bucket updates
 */
export const BUFFER_CONFIG: BufferConfig = {
  maxSize: Math.ceil((GAME_DURATION_MS * 1.2) / BUCKET_INTERVAL_MS), // 720 buckets for 3 min
}

/**
 * Legacy graph configuration (kept for compatibility)
 */
export const GRAPH_CONFIG = {
  maxVisiblePoints: ARCADE_GRAPH_CONFIG.maxBuckets,
  updateThrottleMs: ARCADE_GRAPH_CONFIG.updateThrottleMs,
}

/**
 * Calculate liquidation threshold in display units
 * For 500× leverage: liquidationMove ≈ 1/500 = 0.2%
 */
export function getLiquidationDisplayValue(
  visualMultiplier: number = ARCADE_GRAPH_CONFIG.visualMultiplier
): number {
  const liquidationMovePct = (1 / ARCADE_GRAPH_CONFIG.leverage) * 100 // 0.2%
  return liquidationMovePct * visualMultiplier // Display units
}

/**
 * Calculate EMA alpha from period
 * alpha = 2 / (period + 1)
 */
export function getEmaAlpha(period: number = ARCADE_GRAPH_CONFIG.emaPeriod): number {
  return 2 / (period + 1)
}

/**
 * Calculate graph dimensions based on viewport
 */
export function getGraphDimensions(viewportWidth: number, viewportHeight: number) {
  return {
    height: Math.max(80, Math.min(120, viewportHeight * 0.12)),
    marginBottom: 4,
  }
}
