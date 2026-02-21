/**
 * Hook for managing Lightweight Charts instance
 * Arcade-optimized for 500× leverage trading game
 *
 * Features:
 * - Auto-scaling Y-axis (never flat, never clips)
 * - Centered at zero with permanent 0% line
 * - Liquidation bands for tension
 * - Momentum-reactive line styling
 * - Single neon line (green above, red below zero)
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineType,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
} from 'lightweight-charts'
import { useTradingStore } from '../../game/stores/trading-store'
import { useAggTradeBucket } from './useAggTradeBucket'
import { GRAPH_COLORS, ARCADE_GRAPH_CONFIG } from './constants'
import type { TradeData, MomentumStyle } from './types'

interface UsePriceGraphOptions {
  maxDataPoints?: number
  updateThrottleMs?: number
}

interface UsePriceGraphReturn {
  setContainer: (node: HTMLDivElement | null) => void
  fitContent: () => void
  clearData: () => void
  momentumStyle: MomentumStyle
  maxAbsValue: number
  liquidationDisplayValue: number
}

/**
 * Hook for managing the price graph chart as an arcade-optimized display
 * Uses single neon line that changes color based on position relative to zero
 */
export function usePriceGraph(options: UsePriceGraphOptions = {}): UsePriceGraphReturn {
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const rafRef = useRef<number>(0)
  const lastUpdateTimeRef = useRef<number>(0)
  const isInitializedRef = useRef<boolean>(false)
  const containerNodeRef = useRef<HTMLDivElement | null>(null)
  const pendingTradesRef = useRef<TradeData[]>([])

  const [isChartReady, setIsChartReady] = useState(false)

  // Use the bucket aggregator hook
  const {
    displayBuckets,
    currentBucket,
    maxAbsValue,
    momentumStyle,
    processTrade,
    reset: resetBuckets,
    getLiquidationDisplayValue,
  } = useAggTradeBucket()

  // Get store state
  const isPlaying = useTradingStore((state) => state.isPlaying)
  const priceData = useTradingStore((state) => state.priceData)

  // Initialize chart when container is ready
  const initializeChart = useCallback(
    (container: HTMLDivElement) => {
      if (isInitializedRef.current) return

      const chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'transparent',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: 'transparent' },
          horzLines: { color: 'transparent' },
        },
        rightPriceScale: {
          borderVisible: false,
          ticksVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 }, // Leave room for liquidation bands
          entireTextOnly: true,
        },
        timeScale: {
          borderVisible: false,
          ticksVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
          lockVisibleTimeRangeOnResize: true,
          rightOffset: 0,
          barSpacing: 4,
          minBarSpacing: 0.5,
        },
        crosshair: { mode: CrosshairMode.Hidden },
        handleScale: false,
        handleScroll: false,
        autoSize: true,
      })

      const series = chart.addSeries(LineSeries, {
        color: GRAPH_COLORS.lineColorGreen, // Default green
        lineWidth: momentumStyle.lineWidth as 1 | 2 | 3 | 4,
        lineType: LineType.Curved,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
      })

      chartRef.current = chart
      seriesRef.current = series
      isInitializedRef.current = true
      setIsChartReady(true)
    },
    [momentumStyle.lineWidth]
  )

  // Callback ref - called by React when the DOM node is mounted
  const setContainer = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        containerNodeRef.current = null
        return
      }

      if (isInitializedRef.current) return

      containerNodeRef.current = node

      // Wait for container to have dimensions if not yet available
      if (node.clientWidth === 0 || node.clientHeight === 0) {
        const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              observer.disconnect()
              if (!isInitializedRef.current && containerNodeRef.current) {
                initializeChart(containerNodeRef.current)
              }
            }
          }
        })
        observer.observe(node)
        return
      }

      initializeChart(node)
    },
    [initializeChart]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [])

  // Convert priceData to trades and process
  useEffect(() => {
    if (!priceData || !isPlaying) return

    // Create a trade from the price data
    const trade: TradeData = {
      price: priceData.price,
      quantity: priceData.tradeSize || 0.01, // Default small quantity
      tradeTime: priceData.tradeTime || Date.now(), // Use current time if not provided
      isSell: priceData.tradeSide === 'SELL',
    }

    pendingTradesRef.current.push(trade)
  }, [priceData, isPlaying])

  // Process pending trades
  useEffect(() => {
    if (pendingTradesRef.current.length === 0) return

    for (const trade of pendingTradesRef.current) {
      processTrade(trade)
    }
    pendingTradesRef.current = []
  }, [processTrade])

  // Update chart with display buckets
  useEffect(() => {
    if (!isChartReady || !isPlaying || !chartRef.current || !seriesRef.current) return
    if (displayBuckets.length === 0) return

    const series = seriesRef.current
    const chart = chartRef.current

    // Convert display buckets to chart data format
    const data = displayBuckets.map((bucket) => ({
      time: bucket.time,
      value: bucket.smoothedValue,
    }))

    // Update series data
    series.setData(data)

    // Update line color based on last value
    const lastBucket = displayBuckets[displayBuckets.length - 1]
    if (lastBucket) {
      const color = lastBucket.isAboveZero ? GRAPH_COLORS.lineColorGreen : GRAPH_COLORS.lineColorRed

      // Update series options with new color and line width
      series.applyOptions({
        color,
        lineWidth: momentumStyle.lineWidth as 1 | 2 | 3 | 4,
      })
    }

    // Auto-scale Y-axis
    const paddedMax = maxAbsValue * ARCADE_GRAPH_CONFIG.autoScalePadding
    chart.priceScale('right').applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })

    // Set visible range for Y-axis
    const timeRange = chart.timeScale().getVisibleRange()
    if (timeRange) {
      series.priceScale().applyOptions({
        autoScale: false,
      })
    }
  }, [isChartReady, isPlaying, displayBuckets, maxAbsValue, momentumStyle])

  // Clear data when game ends
  useEffect(() => {
    if (!isPlaying) {
      resetBuckets()
      pendingTradesRef.current = []
      seriesRef.current?.setData([])
    }
  }, [isPlaying, resetBuckets])

  // Handle resize
  useEffect(() => {
    const container = containerNodeRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartRef.current && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          chartRef.current.applyOptions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          })
        }
      }
    })

    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  // Fit content to visible area
  const fitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent()
  }, [])

  // Clear all data
  const clearData = useCallback(() => {
    resetBuckets()
    pendingTradesRef.current = []
    seriesRef.current?.setData([])
  }, [resetBuckets])

  return {
    setContainer,
    fitContent,
    clearData,
    momentumStyle,
    maxAbsValue,
    liquidationDisplayValue: getLiquidationDisplayValue(),
  }
}
