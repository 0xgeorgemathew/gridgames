/**
 * AudioPlayer - Manages audio playback with Web Audio API for precise timing
 *
 * Provides:
 * - Background music playback
 * - AudioContext access for beat synchronization
 * - Mute/unmute integration with trading store
 */

import type { BeatData } from './beat.types'
import { AUDIO_FILE_PATH } from './beat.types'

type AudioState = 'loading' | 'ready' | 'playing' | 'paused' | 'error'

type AudioPlayerListener = (state: {
  state: AudioState
  currentTime: number
  duration: number
}) => void

/**
 * AudioPlayer - Singleton class for managing game audio
 */
class AudioPlayer {
  private audioContext: AudioContext | null = null
  private audioElement: HTMLAudioElement | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private state: AudioState = 'loading'
  private isMuted = false
  private listeners: Set<AudioPlayerListener> = new Set()
  private animationFrame: number | null = null
  private beatData: BeatData | null = null

  constructor() {
    // Initialize muted state from localStorage
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('tapDancer_soundMuted') === 'true'
    }
  }

  /**
   * Get the AudioContext for precise timing (used by BeatSynchronizer)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  /**
   * Get current playback time in seconds
   */
  getCurrentTime(): number {
    return this.audioElement?.currentTime ?? 0
  }

  /**
   * Get total duration in seconds
   */
  getDuration(): number {
    return this.audioElement?.duration ?? 0
  }

  /**
   * Get current state
   */
  getState(): AudioState {
    return this.state
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.state === 'playing'
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: AudioPlayerListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    const state = {
      state: this.state,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
    }
    this.listeners.forEach((listener) => listener(state))
  }

  /**
   * Initialize the audio system
   */
  async initialize(): Promise<void> {
    if (this.audioElement) return

    try {
      // Create audio element
      this.audioElement = new Audio(AUDIO_FILE_PATH)
      this.audioElement.loop = true
      this.audioElement.volume = 0.3
      this.audioElement.muted = this.isMuted

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Connect audio element to context for analysis
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement)
      this.sourceNode.connect(this.audioContext.destination)

      // Wait for audio to be loadable
      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = () => {
          this.audioElement?.removeEventListener('canplay', handleCanPlay)
          this.audioElement?.removeEventListener('error', handleError)
          resolve()
        }
        const handleError = (e: Event) => {
          this.audioElement?.removeEventListener('canplay', handleCanPlay)
          this.audioElement?.removeEventListener('error', handleError)
          reject(new Error('Failed to load audio'))
        }
        this.audioElement?.addEventListener('canplay', handleCanPlay)
        this.audioElement?.addEventListener('error', handleError)
        this.audioElement?.load()
      })

      this.state = 'ready'
      this.notify()
      console.log('[AudioPlayer] Initialized successfully')
    } catch (error) {
      this.state = 'error'
      this.notify()
      console.error('[AudioPlayer] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Set beat data for synchronization
   */
  setBeatData(beatData: BeatData): void {
    this.beatData = beatData
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    if (!this.audioElement || !this.audioContext) {
      await this.initialize()
    }

    if (!this.audioElement || !this.audioContext) return

    // Resume audio context if suspended (mobile browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // Play audio if not muted (still start beat detection when muted)
    if (!this.isMuted) {
      try {
        await this.audioElement.play()
      } catch (error) {
        console.warn('[AudioPlayer] Failed to play:', error)
        return
      }
    }

    this.state = 'playing'
    this.startTimeUpdates()
    this.notify()
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.audioElement) return

    this.audioElement.pause()
    this.state = 'paused'
    this.stopTimeUpdates()
    this.notify()
  }

  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    if (!this.audioElement) return

    this.audioElement.pause()
    this.audioElement.currentTime = 0
    this.state = 'ready'
    this.stopTimeUpdates()
    this.notify()
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted
    if (this.audioElement) {
      this.audioElement.muted = muted
    }

    if (muted && this.state === 'playing') {
      this.pause()
    } else if (!muted && this.state === 'paused') {
      this.play()
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.setMuted(!this.isMuted)
    return this.isMuted
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    if (!this.audioElement) return
    this.audioElement.currentTime = Math.max(0, Math.min(time, this.getDuration()))
    this.notify()
  }

  private startTimeUpdates(): void {
    const update = () => {
      this.notify()
      this.animationFrame = requestAnimationFrame(update)
    }
    this.animationFrame = requestAnimationFrame(update)
  }

  private stopTimeUpdates(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopTimeUpdates()

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
      this.audioElement = null
    }

    this.listeners.clear()
    this.state = 'loading'
  }
}

/**
 * Singleton instance for app-wide use
 */
export const audioPlayer = new AudioPlayer()
