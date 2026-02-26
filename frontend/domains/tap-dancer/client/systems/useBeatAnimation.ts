/**
 * useBeatAnimation - Hook to initialize beat-reactive animations
 *
 * This hook:
 * 1. Initializes audio playback on first user interaction
 * 2. Analyzes audio beats (or loads from cache)
 * 3. Connects beat events to the store for button animations
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'
import {
  beatAnalyzer,
  audioPlayer,
  beatSynchronizer,
} from '@/domains/tap-dancer/client/systems/index'

export function useBeatAnimation() {
  const isInitialized = useRef(false)
  const beatUnsubscribe = useRef<(() => void) | null>(null)
  const triggerBeat = useTradingStore((state) => state.triggerBeat)
  const isSoundMuted = useTradingStore((state) => state.isSoundMuted)
  const isPlaying = useTradingStore((state) => state.isPlaying)

  /**
   * Initialize the beat animation system
   * Called once when the game starts
   */
  const initialize = useCallback(async () => {
    if (isInitialized.current) {
      if (!beatUnsubscribe.current) {
        beatUnsubscribe.current = beatSynchronizer.onBeat(() => {
          triggerBeat()
        })
      }
      return
    }
    isInitialized.current = true

    try {
      await audioPlayer.initialize()

      const beatData = await beatAnalyzer.initialize()

      beatSynchronizer.setBeatData(beatData)

      beatUnsubscribe.current = beatSynchronizer.onBeat(() => {
        triggerBeat()
      })
    } catch (error) {
      console.error('[useBeatAnimation] Failed to initialize:', error)
    }
  }, [triggerBeat])

  /**
   * Start playing music when game starts
   */
  const startMusic = useCallback(async () => {
    if (!isSoundMuted) {
      await audioPlayer.play()
    }
  }, [isSoundMuted])

  const stopMusic = useCallback(() => {
    audioPlayer.stop()
  }, [])

  /**
   * Sync mute state with audio player
   */
  useEffect(() => {
    audioPlayer.setMuted(isSoundMuted)
  }, [isSoundMuted])

  /**
   * Start/stop music based on game state
   */
  useEffect(() => {
    if (isPlaying) {
      initialize().then(() => startMusic())
    } else {
      stopMusic()
    }
  }, [isPlaying, initialize, startMusic, stopMusic])

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      // Clean up beat listener on unmount
      if (beatUnsubscribe.current) {
        beatUnsubscribe.current()
        beatUnsubscribe.current = null
      }
      // Note: We don't destroy audioPlayer here as it's a singleton
      // and should persist across navigation
    }
  }, [])

  return {
    initialize,
    startMusic,
    stopMusic,
    isAnalyzing: beatAnalyzer.getState().isAnalyzing,
    progress: beatAnalyzer.getState().progress,
  }
}
