/**
 * BeatAnalyzer - Analyzes audio and caches beat timestamps
 *
 * Uses music-tempo library for beat detection.
 * Results are cached in localStorage for subsequent visits.
 */

import MusicTempo from 'music-tempo'
import type { BeatData, BeatAnalyzerState } from './beat.types'
import { BEAT_CACHE_KEY, AUDIO_FILE_PATH } from './beat.types'

/**
 * Simple hash function for audio data to detect changes
 */
async function hashAudioBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Extract mono audio data from AudioBuffer for music-tempo
 */
function extractMonoAudioData(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0)
  }

  // Mix down stereo to mono
  const channel1 = audioBuffer.getChannelData(0)
  const channel2 = audioBuffer.getChannelData(1)
  const mono = new Float32Array(channel1.length)

  for (let i = 0; i < channel1.length; i++) {
    mono[i] = (channel1[i] + channel2[i]) / 2
  }

  return mono
}

/**
 * Load cached beat data from localStorage
 */
function loadCachedBeatData(): BeatData | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(BEAT_CACHE_KEY)
    if (!cached) return null

    const data = JSON.parse(cached) as BeatData

    // Validate structure
    if (
      typeof data.tempo === 'number' &&
      Array.isArray(data.beats) &&
      typeof data.firstBeatOffset === 'number' &&
      typeof data.duration === 'number' &&
      typeof data.analyzedAt === 'number' &&
      typeof data.audioHash === 'string'
    ) {
      return data
    }

    return null
  } catch {
    console.warn('[BeatAnalyzer] Failed to load cached beat data')
    return null
  }
}

/**
 * Save beat data to localStorage
 */
function saveBeatData(data: BeatData): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BEAT_CACHE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[BeatAnalyzer] Failed to cache beat data:', e)
  }
}

/**
 * Clear cached beat data
 */
function clearCachedBeatData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(BEAT_CACHE_KEY)
}

/**
 * Analyze audio file and return beat data
 *
 * @param onProgress - Optional callback for progress updates (0-100)
 */
async function analyzeAudioBeats(onProgress?: (progress: number) => void): Promise<BeatData> {
  onProgress?.(5)

  // Fetch audio file
  const response = await fetch(AUDIO_FILE_PATH)
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  onProgress?.(20)

  // Hash the audio for cache validation
  const audioHash = await hashAudioBuffer(arrayBuffer)
  onProgress?.(25)

  // Check if we have valid cached data
  const cached = loadCachedBeatData()
  if (cached && cached.audioHash === audioHash) {
    console.log('[BeatAnalyzer] Using cached beat data')
    onProgress?.(100)
    return cached
  }

  // Create audio context and decode
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  onProgress?.(30)

  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  onProgress?.(50)

  // Extract mono data for analysis
  const monoData = extractMonoAudioData(audioBuffer)
  onProgress?.(60)

  // Run beat detection with music-tempo
  console.log('[BeatAnalyzer] Analyzing beats...')
  const musicTempo = new MusicTempo(monoData)
  onProgress?.(90)

  // Debug: log raw output from music-tempo
  console.log('[BeatAnalyzer] Raw music-tempo output:', {
    tempo: musicTempo.tempo,
    tempoType: typeof musicTempo.tempo,
    onsetCount: musicTempo.beats?.length,
    sampleOnsets: musicTempo.beats?.slice(0, 10),
  })

  // Get duration before closing context
  const duration = audioBuffer.duration

  // Clean up audio context
  await audioContext.close()

  // Validate and sanitize tempo
  const tempo =
    typeof musicTempo.tempo === 'number' && Number.isFinite(musicTempo.tempo)
      ? musicTempo.tempo
      : 120 // Fallback to 120 BPM if detection fails

  // Get onsets (raw beat detections) to find first beat offset
  const onsets = Array.isArray(musicTempo.beats)
    ? musicTempo.beats.filter((b): b is number => typeof b === 'number' && Number.isFinite(b))
    : []

  // Use first onset as the offset for beat grid
  const firstBeatOffset = onsets[0] ?? 0

  // Calculate beat timestamps from tempo (clean, regular intervals)
  // At 120 BPM, beats occur every 0.5 seconds
  const beatInterval = 60 / tempo
  const calculatedBeats: number[] = []

  for (let t = firstBeatOffset; t < duration; t += beatInterval) {
    calculatedBeats.push(t)
  }

  const beatData: BeatData = {
    tempo,
    beats: calculatedBeats,
    firstBeatOffset,
    duration,
    analyzedAt: Date.now(),
    audioHash,
  }

  console.log('[BeatAnalyzer] Analysis complete:', {
    tempo: beatData.tempo.toFixed(1) + ' BPM',
    beatInterval: beatInterval.toFixed(3) + 's',
    beats: beatData.beats.length,
    firstBeat: beatData.firstBeatOffset.toFixed(3) + 's',
  })

  // Cache the results
  saveBeatData(beatData)
  onProgress?.(100)

  return beatData
}

/**
 * Hook-friendly analyzer that tracks state
 */
class BeatAnalyzer {
  private state: BeatAnalyzerState = {
    isAnalyzing: false,
    beatData: null,
    error: null,
    progress: 0,
  }

  private listeners: Set<(state: BeatAnalyzerState) => void> = new Set()

  getState(): BeatAnalyzerState {
    return { ...this.state }
  }

  subscribe(listener: (state: BeatAnalyzerState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    const state = this.getState()
    this.listeners.forEach((listener) => listener(state))
  }

  /**
   * Initialize analyzer - load cache or start analysis
   */
  async initialize(): Promise<BeatData> {
    // Check cache first
    const cached = loadCachedBeatData()
    if (cached) {
      this.state = {
        isAnalyzing: false,
        beatData: cached,
        error: null,
        progress: 100,
      }
      this.notify()
      return cached
    }

    // Start analysis
    this.state = {
      isAnalyzing: true,
      beatData: null,
      error: null,
      progress: 0,
    }
    this.notify()

    try {
      const beatData = await analyzeAudioBeats((progress) => {
        this.state.progress = progress
        this.notify()
      })

      this.state = {
        isAnalyzing: false,
        beatData,
        error: null,
        progress: 100,
      }
      this.notify()

      return beatData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed'
      this.state = {
        isAnalyzing: false,
        beatData: null,
        error: errorMessage,
        progress: 0,
      }
      this.notify()
      throw error
    }
  }

  /**
   * Force re-analysis (clears cache first)
   */
  async reanalyze(): Promise<BeatData> {
    clearCachedBeatData()
    this.state.beatData = null
    this.notify()
    return this.initialize()
  }
}

/**
 * Singleton instance for app-wide use
 */
export const beatAnalyzer = new BeatAnalyzer()
