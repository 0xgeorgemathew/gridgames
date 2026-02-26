/**
 * Beat Analysis Types
 * Types for beat detection and caching system
 */

/**
 * Cached beat data structure stored in localStorage
 */
export interface BeatData {
  /** Detected tempo in BPM */
  tempo: number
  /** Array of beat timestamps in seconds (calculated from tempo) */
  beats: number[]
  /** When the first beat occurs (seconds) */
  firstBeatOffset: number
  /** Total duration of the audio (seconds) */
  duration: number
  /** When this analysis was performed (for cache invalidation) */
  analyzedAt: number
  /** Hash of audio file to detect changes */
  audioHash: string
}

/**
 * Beat analyzer state
 */
export interface BeatAnalyzerState {
  /** Whether analysis is in progress */
  isAnalyzing: boolean
  /** Cached beat data if available */
  beatData: BeatData | null
  /** Error message if analysis failed */
  error: string | null
  /** Progress percentage (0-100) during analysis */
  progress: number
}

/**
 * Beat event emitted when a beat is detected
 */
export interface BeatEvent {
  /** Timestamp of the beat in seconds */
  timestamp: number
  /** Beat number in sequence */
  beatIndex: number
  /** Total beats in track */
  totalBeats: number
}

/**
 * Local storage key for cached beat data
 */
export const BEAT_CACHE_KEY = 'tapDancer_beatData_v1'

/**
 * Audio file path for the game music
 */
export const AUDIO_FILE_PATH = '/audio/digital_dividend.mp3'
