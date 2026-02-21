/**
 * Ring buffer hook for managing price history data
 * Optimized for high-frequency100ms updates
 */

import { useRef, useCallback } from 'react'
import type { Time } from 'lightweight-charts'
import type { PriceDataPoint } from './types'
import { BUFFER_CONFIG } from './constants'

/**
 * Ring buffer class for efficient price data storage
 * Prevents unbounded memory growth during long games
 */
class PriceHistoryBuffer {
  private buffer: PriceDataPoint[]
  private maxSize: number
  private writeIndex: number = 0
  private isFull: boolean = false

  constructor(maxSize: number = BUFFER_CONFIG.maxSize) {
    this.maxSize = maxSize
    this.buffer = []
  }

  /**
   * Add a new price point to the buffer
   */
  push(price: number, timestamp: number): void {
    // Convert timestamp to business day string format for Lightweight Charts
    // Lightweight charts handles Unix timestamp as numbers with Time type. We keep ms to prevent overlapping points in 100ms updates
    const time: Time = timestamp as Time

    const dataPoint: PriceDataPoint = {
      time,
      value: price,
    }

    if (this.buffer.length < this.maxSize) {
      this.buffer.push(dataPoint)
    } else {
      this.buffer[this.writeIndex] = dataPoint
      this.isFull = true
    }

    this.writeIndex = (this.writeIndex + 1) % this.maxSize
  }

  /**
   * Get all data points sorted by time (required by Lightweight Charts)
   */
  getSorted(): PriceDataPoint[] {
    if (!this.isFull || this.buffer.length < this.maxSize) {
      // Buffer not yet full, just return sorted copy
      return [...this.buffer].sort((a, b) => {
        const timeA = typeof a.time === 'number' ? a.time : 0
        const timeB = typeof b.time === 'number' ? b.time : 0
        return timeA - timeB
      })
    }

    // Ring buffer rotation - reorder to maintain time sequence
    return [...this.buffer.slice(this.writeIndex), ...this.buffer.slice(0, this.writeIndex)]
  }

  /**
   * Get the most recent data point
   */
  getLatest(): PriceDataPoint | null {
    if (this.buffer.length === 0) return null

    // The latest item is at (writeIndex - 1), wrapping around
    const lastIndex = (this.writeIndex - 1 + this.maxSize) % this.maxSize
    return this.buffer[lastIndex] || null
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length
  }

  /**
   * Check if buffer has data
   */
  hasData(): boolean {
    return this.buffer.length > 0
  }

  /**
   * Clear all data (for game reset)
   */
  clear(): void {
    this.buffer = []
    this.writeIndex = 0
    this.isFull = false
  }
}

/**
 * React hook for managing price history buffer
 */
export function usePriceHistoryBuffer() {
  const bufferRef = useRef<PriceHistoryBuffer>(new PriceHistoryBuffer())

  const push = useCallback((price: number, timestamp: number) => {
    bufferRef.current.push(price, timestamp)
  }, [])

  const getSorted = useCallback(() => {
    return bufferRef.current.getSorted()
  }, [])

  const getLatest = useCallback(() => {
    return bufferRef.current.getLatest()
  }, [])

  const size = useCallback(() => {
    return bufferRef.current.size()
  }, [])

  const hasData = useCallback(() => {
    return bufferRef.current.hasData()
  }, [])

  const clear = useCallback(() => {
    bufferRef.current.clear()
  }, [])

  return {
    push,
    getSorted,
    getLatest,
    size,
    hasData,
    clear,
  }
}
