/**
 * BeatSynchronizer - Synchronizes beat events with audio playback
 *
 * Uses requestAnimationFrame to check current audio time against
 * pre-analyzed beat timestamps and emits beat events.
 */

import type { BeatData, BeatEvent } from './beat.types'
import { audioPlayer } from './AudioPlayer'

type AudioState = 'loading' | 'ready' | 'playing' | 'paused' | 'error'

type BeatListener = (event: BeatEvent) => void

/**
 * BeatSynchronizer - Emits beat events synced to audio playback
 */
export class BeatSynchronizer {
  private beatData: BeatData | null = null
  private nextBeatIndex = 0
  private isRunning = false
  private animationFrame: number | null = null
  private listeners: Set<BeatListener> = new Set()
  private audioUnsubscribe?: () => void
  private previousAudioState: AudioState = 'loading'

  // Look-ahead time in seconds to account for frame delay
  // 50ms gives us a small buffer for smooth animation triggering
  private readonly LOOK_AHEAD = 0.05

  constructor() {
    // Subscribe to audio player state changes
    // Only trigger start/stop on state transitions to avoid excessive logging
    this.audioUnsubscribe = audioPlayer.subscribe(({ state }) => {
      const wasPlaying = this.previousAudioState === 'playing'
      const nowPlaying = state === 'playing'

      if (nowPlaying && !wasPlaying) {
        this.start()
      } else if (!nowPlaying && wasPlaying) {
        this.stop()
      }

      this.previousAudioState = state
    })
  }

  /**
   * Set beat data for synchronization
   */
  setBeatData(beatData: BeatData): void {
    this.beatData = beatData
    audioPlayer.setBeatData(beatData)
    this.reset()
  }

  /**
   * Subscribe to beat events
   */
  onBeat(listener: BeatListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Reset beat tracking (e.g., when audio seeks or restarts)
   */
  reset(): void {
    this.nextBeatIndex = 0
  }

  /**
   * Start beat synchronization loop
   */
  start(): void {
    if (this.isRunning) {
      console.log('[BeatSynchronizer] Already running, skipping start')
      return
    }
    if (!this.beatData) {
      console.warn('[BeatSynchronizer] No beat data set')
      return
    }

    console.log('[BeatSynchronizer] Starting beat sync loop')
    this.isRunning = true
    this.loop()
  }

  /**
   * Stop beat synchronization loop
   */
  stop(): void {
    this.isRunning = false
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  private loop = (): void => {
    if (!this.isRunning || !this.beatData) return

    const currentTime = audioPlayer.getCurrentTime()
    const duration = audioPlayer.getDuration()

    // Handle looping: reset beat index when audio loops
    if (currentTime < 0.5 && this.nextBeatIndex > 10) {
      this.nextBeatIndex = 0
    }

    // Look ahead to trigger animations slightly early
    const lookAheadTime = currentTime + this.LOOK_AHEAD

    // Check for beats that should trigger
    while (this.nextBeatIndex < this.beatData.beats.length) {
      const beatTime = this.beatData.beats[this.nextBeatIndex]

      // Handle beats beyond duration (shouldn't happen, but safety check)
      if (beatTime > duration) break

      if (beatTime <= lookAheadTime) {
        this.emitBeat(this.nextBeatIndex)
        this.nextBeatIndex++
      } else {
        // No more beats to trigger yet
        break
      }
    }

    // Schedule next frame
    this.animationFrame = requestAnimationFrame(this.loop)
  }

  private emitBeat(beatIndex: number): void {
    if (!this.beatData) return

    // Only trigger on downbeats (every 4th beat - the "1" in "1-2-3-4")
    // This creates a more musical, less chaotic pulse effect
    if (beatIndex % 4 !== 0) return

    const event: BeatEvent = {
      timestamp: this.beatData.beats[beatIndex],
      beatIndex,
      totalBeats: this.beatData.beats.length,
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('[BeatSynchronizer] Listener error:', error)
      }
    })
  }

  /**
   * Get current beat info
   */
  getCurrentBeatInfo(): {
    currentBeat: number
    nextBeatTime: number
    tempo: number
  } | null {
    if (!this.beatData) return null

    const currentTime = audioPlayer.getCurrentTime()
    const beats = this.beatData.beats

    // Find current beat (last beat that passed)
    let currentBeat = 0
    for (let i = 0; i < beats.length; i++) {
      if (beats[i] <= currentTime) {
        currentBeat = i
      } else {
        break
      }
    }

    return {
      currentBeat,
      nextBeatTime: beats[this.nextBeatIndex] ?? 0,
      tempo: this.beatData.tempo,
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop()
    this.listeners.clear()
    this.beatData = null
    if (this.audioUnsubscribe) {
      this.audioUnsubscribe()
      this.audioUnsubscribe = undefined
    }
  }
}

/**
 * Singleton instance for app-wide use
 */
export const beatSynchronizer = new BeatSynchronizer()
