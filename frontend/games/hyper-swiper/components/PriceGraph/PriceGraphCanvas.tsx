/**
 * PriceGraphCanvas - Full-screen immersive background component
 * Uses TradingView Lightweight Charts for canvas-based rendering
 *
 * Features:
 * - Full-screen area graph with gradient fill
 * - Smooth curves that progress from right to left
 * - Auto-scrolling to show latest data
 * - Semi-transparent for background layering
 */

'use client'

import React, { useSyncExternalStore, useRef } from 'react'
import { usePriceGraph } from './usePriceGraph'
import { useTradingStore } from '../../game/stores/trading-store'

const emptySubscribe = () => () => {}

function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

/**
 * Main price graph component - Full screen immersive background
 * Memoized to prevent unnecessary re-renders
 */
export const PriceGraphCanvas = React.memo(function PriceGraphCanvas() {
  const mounted = useMounted()
  const { setContainer } = usePriceGraph()
  const isPriceConnected = useTradingStore((state) => state.isPriceConnected)
  const priceData = useTradingStore((state) => state.priceData)
  const isPlaying = useTradingStore((state) => state.isPlaying)

  const isLoading = !isPriceConnected || !priceData
  const showGraph = isPlaying && !isLoading

  if (!mounted) return null

  return (
    <div
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        zIndex: 0,
        opacity: showGraph ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      <div ref={setContainer} className="absolute inset-0 h-full w-full" />
    </div>
  )
})
