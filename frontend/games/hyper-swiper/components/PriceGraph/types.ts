/**
 * Type definitions for PriceGraph component
 * Arcade-optimized for 500× leverage trading game
 */

import type { IChartApi, ISeriesApi, SeriesType, Time } from 'lightweight-charts'

/**
 * Raw aggTrade message from Binance WebSocket
 */
export interface AggTradeMessage {
  p: string // Price
  q: string // Quantity
  T: number // Trade time (ms)
  m: boolean // Is buyer maker (true = sell taker, false = buy taker)
}

/**
 * Processed trade data
 */
export interface TradeData {
  price: number
  quantity: number
  tradeTime: number
  isSell: boolean // true = sell taker, false = buy taker
}

/**
 * Micro-bucket for 250ms aggregation (OHLCV + delta)
 */
export interface PriceBucket {
  bucketTime: number // Start time of bucket (ms)
  open: number
  high: number
  low: number
  close: number
  totalVolume: number
  buyVolume: number
  sellVolume: number
  delta: number // buyVolume - sellVolume
}

/**
 * Display-ready bucket with all transformations applied
 */
export interface DisplayBucket {
  time: Time // For Lightweight Charts
  rawClose: number // Original BTC price
  priceChangePct: number // % change from start price
  displayValue: number // priceChangePct * visualMultiplier
  smoothedValue: number // EMA smoothed displayValue
  velocity: number // Current - previous displayValue
  totalVolume: number
  delta: number
  isAboveZero: boolean
}

/**
 * Single price data point for the chart (legacy compatibility)
 */
export interface PriceDataPoint {
  time: Time // Lightweight Charts Time type (number | string | { year, month, day })
  value: number // Display value (transformed, not raw BTC price)
}

/**
 * Configuration for the ring buffer
 */
export interface BufferConfig {
  maxSize: number
}

/**
 * Configuration for the price graph chart
 */
export interface GraphConfig {
  maxVisiblePoints: number
  updateThrottleMs: number
}

/**
 * Chart instance references
 */
export interface ChartRefs {
  chart: IChartApi | null
  series: ISeriesApi<SeriesType> | null
}

/**
 * Viewport layout dimensions
 */
export interface ViewportLayout {
  graph: {
    top: number
    height: number
  }
  game: {
    top: number
    height: number
  }
  hud: {
    top: number
    height: number
  }
}

/**
 * Color configuration for the graph
 */
export interface GraphColors {
  lineColorGreen: string // Above zero (longs winning)
  lineColorRed: string // Below zero (shorts winning)
  lineWidth: number
  lineWidthHighMomentum: number // Thicker when |velocity| is high
  areaTopColor: string
  areaBottomColor: string
  gridLineColor: string
  axisColor: string
  textColor: string
  background: string
  zeroLineColor: string
  liquidationBandColor: string
}

/**
 * Arcade graph configuration
 */
export interface ArcadeGraphConfig {
  /** Bucket interval in ms (250ms recommended) */
  bucketIntervalMs: number
  /** Visual multiplier for arcade feel (100-300) */
  visualMultiplier: number
  /** EMA smoothing period (3-5 buckets) */
  emaPeriod: number
  /** Leverage for liquidation calculation */
  leverage: number
  /** Max buckets to keep (match duration / bucket interval) */
  maxBuckets: number
  /** Update throttle in ms */
  updateThrottleMs: number
  /** Auto-scale padding factor (1.2 = 20% padding) */
  autoScalePadding: number
  /** Max visual range for clamping outliers */
  maxVisualRange: number
}

/**
 * Momentum styling state
 */
export interface MomentumStyle {
  lineWidth: number
  glowIntensity: number
  pulseEffect: boolean
}
