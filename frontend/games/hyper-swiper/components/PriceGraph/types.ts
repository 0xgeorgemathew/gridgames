/**
 * Type definitions for PriceGraph component
 */

import type { IChartApi, ISeriesApi, SeriesType, Time } from 'lightweight-charts'

/**
 * Single price data point for the chart
 */
export interface PriceDataPoint {
  time: Time // Lightweight Charts Time type (number | string | { year, month, day })
  value: number // BTC price
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
  lineColor: string
  lineWidth: number
  areaTopColor: string
  areaBottomColor: string
  gridLineColor: string
  axisColor: string
  textColor: string
  background: string
}
