/**
 * Hook for managing Lightweight Charts instance
 * Handles chart lifecycle, data updates, and performance optimization
 *
 * Designed for full-screen immersive background with smooth curves
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
import { usePriceHistoryBuffer } from './usePriceHistoryBuffer'
import { GRAPH_CONFIG } from './constants'

interface UsePriceGraphOptions {
	maxDataPoints?: number
	updateThrottleMs?: number
}

interface UsePriceGraphReturn {
	setContainer: (node: HTMLDivElement | null) => void
	fitContent: () => void
	clearData: () => void
}

/**
 * Hook for managing the price graph chart as a full-screen background
 * Uses AreaSeries with gradient fill for immersive effect
 *
 * Uses callback ref pattern to ensure DOM node is available
 */
export function usePriceGraph(options: UsePriceGraphOptions = {}): UsePriceGraphReturn {
	const { updateThrottleMs = GRAPH_CONFIG.updateThrottleMs } = options

	const chartRef = useRef<IChartApi | null>(null)
	const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
	const rafRef = useRef<number>(0)
	const lastUpdateTimeRef = useRef<number>(0)
	const isInitializedRef = useRef<boolean>(false)
	const pendingUpdateRef = useRef<{ price: number; timestamp: number } | null>(null)
	const containerNodeRef = useRef<HTMLDivElement | null>(null)

	const [isChartReady, setIsChartReady] = useState(false)

	const buffer = usePriceHistoryBuffer()

	// Get store state
	const isPlaying = useTradingStore((state) => state.isPlaying)
	const priceData = useTradingStore((state) => state.priceData)

	// Initialize chart when container is ready
	const initializeChart = useCallback((container: HTMLDivElement) => {
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
				scaleMargins: { top: 0.2, bottom: 0.2 },
				entireTextOnly: true,
			},
			timeScale: {
				borderVisible: false,
				ticksVisible: false,
				fixLeftEdge: false,
				fixRightEdge: false,
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
			color: '#00f3ff', // Bright tron cyan
			lineWidth: 4, // Thicker line for glowing snake effect
			lineType: LineType.Curved,
			lastValueVisible: false,
			crosshairMarkerVisible: false,
			priceLineVisible: false,
		})

		chartRef.current = chart
		seriesRef.current = series
		isInitializedRef.current = true
		setIsChartReady(true)
	}, [])

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

	// Subscribe to price updates and buffer them
	useEffect(() => {
		if (!priceData || !isPlaying) return

		pendingUpdateRef.current = {
			price: priceData.price,
			timestamp: priceData.tradeTime,
		}

		buffer.push(priceData.price, priceData.tradeTime)
	}, [priceData, isPlaying, buffer])

	// Render loop - smooth animation using requestAnimationFrame
	useEffect(() => {
		if (!isChartReady || !isPlaying || !chartRef.current || !seriesRef.current) return

		function renderLoop() {
			const now = performance.now()

			if (now - lastUpdateTimeRef.current >= updateThrottleMs && pendingUpdateRef.current) {
				const { price, timestamp } = pendingUpdateRef.current
				const time = timestamp as Time
				const dataPoint = { time, value: price }

				try {
					seriesRef.current?.update(dataPoint)
					chartRef.current?.timeScale().scrollToRealTime()
				} catch {
					// Chart may have been removed during update
				}

				lastUpdateTimeRef.current = now
				pendingUpdateRef.current = null
			}

			rafRef.current = requestAnimationFrame(renderLoop)
		}

		rafRef.current = requestAnimationFrame(renderLoop)

		return () => cancelAnimationFrame(rafRef.current)
	}, [isChartReady, isPlaying, updateThrottleMs])

	// Clear buffer when game ends
	useEffect(() => {
		if (!isPlaying) {
			buffer.clear()
			pendingUpdateRef.current = null
			seriesRef.current?.setData([])
		}
	}, [isPlaying, buffer])

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
		buffer.clear()
		pendingUpdateRef.current = null
		seriesRef.current?.setData([])
	}, [buffer])

	return { setContainer, fitContent, clearData }
}
