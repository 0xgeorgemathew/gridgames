/**
 * Hook for aggregating Binance aggTrade data into 250ms buckets
 * Arcade-optimized for 500× leverage trading game
 *
 * Features:
 * - 250ms micro-bucket aggregation (OHLCV + delta)
 * - Normalize to % change from match start price
 * - Visual multiplier for arcade feel
 * - EMA smoothing (light, preserves volatility)
 * - Velocity tracking for momentum-reactive styling
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import type { Time } from 'lightweight-charts'
import type { TradeData, PriceBucket, DisplayBucket, MomentumStyle } from './types'
import { ARCADE_GRAPH_CONFIG, getEmaAlpha, BUFFER_CONFIG } from './constants'

/**
 * EMA calculator class for light smoothing
 */
class EMACalculator {
  private alpha: number
  private value: number | null = null

  constructor(period: number = ARCADE_GRAPH_CONFIG.emaPeriod) {
    this.alpha = getEmaAlpha(period)
  }

  update(newValue: number): number {
    if (this.value === null) {
      this.value = newValue
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value
    }
    return this.value
  }

  reset(): void {
    this.value = null
  }
}

/**
 * Bucket aggregator class
 * Aggregates trades into fixed-time buckets with OHLCV + delta
 */
class BucketAggregator {
  private currentBucket: PriceBucket | null = null
  private buckets: PriceBucket[] = []
  private maxSize: number
  private bucketIntervalMs: number

  constructor(
    maxSize: number = BUFFER_CONFIG.maxSize,
    bucketIntervalMs: number = ARCADE_GRAPH_CONFIG.bucketIntervalMs
  ) {
    this.maxSize = maxSize
    this.bucketIntervalMs = bucketIntervalMs
  }

  /**
   * Add a trade to the appropriate bucket
   */
  addTrade(trade: TradeData): PriceBucket | null {
    const bucketTime = Math.floor(trade.tradeTime / this.bucketIntervalMs) * this.bucketIntervalMs

    // Check if we need to close the current bucket
    if (this.currentBucket && this.currentBucket.bucketTime !== bucketTime) {
      // Close the current bucket
      this.buckets.push(this.currentBucket)
      if (this.buckets.length > this.maxSize) {
        this.buckets.shift()
      }
      this.currentBucket = null
    }

    // Create new bucket or update existing
    if (!this.currentBucket) {
      this.currentBucket = {
        bucketTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        totalVolume: trade.quantity,
        buyVolume: trade.isSell ? 0 : trade.quantity,
        sellVolume: trade.isSell ? trade.quantity : 0,
        delta: trade.isSell ? -trade.quantity : trade.quantity,
      }
    } else {
      // Update existing bucket
      this.currentBucket.high = Math.max(this.currentBucket.high, trade.price)
      this.currentBucket.low = Math.min(this.currentBucket.low, trade.price)
      this.currentBucket.close = trade.price
      this.currentBucket.totalVolume += trade.quantity
      if (trade.isSell) {
        this.currentBucket.sellVolume += trade.quantity
        this.currentBucket.delta -= trade.quantity
      } else {
        this.currentBucket.buyVolume += trade.quantity
        this.currentBucket.delta += trade.quantity
      }
    }

    return this.currentBucket
  }

  /**
   * Get all completed buckets
   */
  getBuckets(): PriceBucket[] {
    return [...this.buckets]
  }

  /**
   * Get the current (in-progress) bucket
   */
  getCurrentBucket(): PriceBucket | null {
    return this.currentBucket
  }

  /**
   * Get all buckets including current
   */
  getAllBuckets(): PriceBucket[] {
    const all = [...this.buckets]
    if (this.currentBucket) {
      all.push(this.currentBucket)
    }
    return all
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.currentBucket = null
    this.buckets = []
  }

  /**
   * Get bucket count
   */
  size(): number {
    return this.buckets.length + (this.currentBucket ? 1 : 0)
  }
}

/**
 * Display transformer class
 * Transforms raw buckets into display-ready data
 */
class DisplayTransformer {
  private startPrice: number | null = null
  private visualMultiplier: number
  private emaCalculator: EMACalculator
  private previousDisplayValue: number = 0
  private maxVisualRange: number

  constructor(
    visualMultiplier: number = ARCADE_GRAPH_CONFIG.visualMultiplier,
    emaPeriod: number = ARCADE_GRAPH_CONFIG.emaPeriod,
    maxVisualRange: number = ARCADE_GRAPH_CONFIG.maxVisualRange
  ) {
    this.visualMultiplier = visualMultiplier
    this.emaCalculator = new EMACalculator(emaPeriod)
    this.maxVisualRange = maxVisualRange
  }

  /**
   * Set the start price (call once at match start)
   */
  setStartPrice(price: number): void {
    this.startPrice = price
    this.emaCalculator.reset()
    this.previousDisplayValue = 0
  }

  /**
   * Get the start price
   */
  getStartPrice(): number | null {
    return this.startPrice
  }

  /**
   * Transform a bucket into display-ready format
   */
  transform(bucket: PriceBucket): DisplayBucket | null {
    if (!this.startPrice) {
      // First bucket sets the start price
      this.setStartPrice(bucket.close)
    }

    if (!this.startPrice) return null

    // Calculate % change from start
    const priceChangePct = ((bucket.close - this.startPrice) / this.startPrice) * 100

    // Apply visual multiplier
    let displayValue = priceChangePct * this.visualMultiplier

    // Clamp extreme outliers
    displayValue = Math.max(-this.maxVisualRange, Math.min(this.maxVisualRange, displayValue))

    // Apply EMA smoothing
    const smoothedValue = this.emaCalculator.update(displayValue)

    // Calculate velocity (current - previous)
    const velocity = smoothedValue - this.previousDisplayValue
    this.previousDisplayValue = smoothedValue

    return {
      time: bucket.bucketTime as Time,
      rawClose: bucket.close,
      priceChangePct,
      displayValue,
      smoothedValue,
      velocity,
      totalVolume: bucket.totalVolume,
      delta: bucket.delta,
      isAboveZero: smoothedValue >= 0,
    }
  }

  /**
   * Reset the transformer
   */
  reset(): void {
    this.startPrice = null
    this.emaCalculator.reset()
    this.previousDisplayValue = 0
  }
}

/**
 * Hook return type
 */
export interface UseAggTradeBucketReturn {
  // State
  displayBuckets: DisplayBucket[]
  currentBucket: DisplayBucket | null
  startPrice: number | null
  maxAbsValue: number
  momentumStyle: MomentumStyle

  // Actions
  processTrade: (trade: TradeData) => void
  reset: () => void

  // Utilities
  getLiquidationDisplayValue: () => number
}

/**
 * Hook for aggregating and transforming trade data
 */
export function useAggTradeBucket(): UseAggTradeBucketReturn {
  const aggregatorRef = useRef<BucketAggregator>(new BucketAggregator())
  const transformerRef = useRef<DisplayTransformer>(new DisplayTransformer())

  const [displayBuckets, setDisplayBuckets] = useState<DisplayBucket[]>([])
  const [currentBucket, setCurrentBucket] = useState<DisplayBucket | null>(null)
  const [startPrice, setStartPrice] = useState<number | null>(null)
  const [maxAbsValue, setMaxAbsValue] = useState<number>(10) // Start with minimum range of 10
  const [momentumStyle, setMomentumStyle] = useState<MomentumStyle>({
    lineWidth: ARCADE_GRAPH_CONFIG.visualMultiplier >= 200 ? 4 : 3,
    glowIntensity: 0,
    pulseEffect: false,
  })

  /**
   * Process a single trade
   */
  const processTrade = useCallback((trade: TradeData) => {
    const aggregator = aggregatorRef.current
    const transformer = transformerRef.current

    // Add trade to aggregator
    aggregator.addTrade(trade)

    // Update start price if not set
    if (!transformer.getStartPrice()) {
      transformer.setStartPrice(trade.price)
      setStartPrice(trade.price)
    }

    // Transform all buckets
    const allBuckets = aggregator.getAllBuckets()
    const transformed: DisplayBucket[] = []

    for (const bucket of allBuckets) {
      const display = transformer.transform(bucket)
      if (display) {
        transformed.push(display)
      }
    }

    // Calculate max absolute value for auto-scaling with minimum range
    // Use a minimum range of 10 display units to prevent graph from being too sensitive
    const minRange = 10 // Minimum display range
    const currentMaxAbs = transformed.length > 0
      ? Math.max(...transformed.map((b) => Math.abs(b.smoothedValue)))
      : minRange
    const maxAbs = Math.max(minRange, currentMaxAbs)

    // Update state
    setDisplayBuckets(transformed)
    setCurrentBucket(transformed[transformed.length - 1] || null)
    setMaxAbsValue(maxAbs)

    // Calculate momentum style
    const latest = transformed[transformed.length - 1]
    if (latest) {
      const absVelocity = Math.abs(latest.velocity)
      const highMomentumThreshold = 2 // Display units
      const isHighMomentum = absVelocity > highMomentumThreshold

      // Glow intensity based on volume
      const avgVolume =
        transformed.reduce((sum, b) => sum + b.totalVolume, 0) / transformed.length || 1
      const volumeRatio = latest.totalVolume / avgVolume
      const glowIntensity = Math.min(1, volumeRatio / 2)

      // Pulse effect on delta spike
      const pulseEffect = Math.abs(latest.delta) > avgVolume * 1.5

      setMomentumStyle({
        lineWidth: isHighMomentum ? 5 : 3,
        glowIntensity,
        pulseEffect,
      })
    }
  }, [])

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    aggregatorRef.current.clear()
    transformerRef.current.reset()
    setDisplayBuckets([])
    setCurrentBucket(null)
    setStartPrice(null)
    setMaxAbsValue(10) // Reset to minimum range
    setMomentumStyle({
      lineWidth: 3,
      glowIntensity: 0,
      pulseEffect: false,
    })
  }, [])

  /**
   * Get liquidation display value
   */
  const getLiquidationDisplayValue = useCallback(() => {
    const liquidationMovePct = (1 / ARCADE_GRAPH_CONFIG.leverage) * 100
    return liquidationMovePct * ARCADE_GRAPH_CONFIG.visualMultiplier
  }, [])

  return {
    displayBuckets,
    currentBucket,
    startPrice,
    maxAbsValue,
    momentumStyle,
    processTrade,
    reset,
    getLiquidationDisplayValue,
  }
}
