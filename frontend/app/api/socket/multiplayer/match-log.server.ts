// =============================================================================
// MATCH ACTION LOG
// Append-only action log with monotonically increasing sequence numbers
// =============================================================================

import type { AuthoritativeAction } from '@/domains/match/types'
import crypto from 'crypto'

/**
 * Log entry with sequence number
 */
export interface LogEntry<GameAction = unknown> {
  sequence: number
  playerId: string
  timestamp: number
  action: GameAction
  hash: string
}

/**
 * Action log for a match
 */
export class MatchActionLog<GameAction = unknown> {
  private matchId: string
  private entries: LogEntry<GameAction>[] = []
  private nextSequence = 0

  constructor(matchId: string) {
    this.matchId = matchId
  }

  /**
   * Append an action to the log
   * Returns the assigned sequence number
   */
  append(playerId: string, action: GameAction): number {
    const sequence = this.nextSequence++
    const timestamp = Date.now()

    // Create hash of entry for verification
    const previousHash = this.entries.length > 0 ? this.entries[this.entries.length - 1].hash : '0'
    const hash = this.hashEntry(sequence, playerId, timestamp, action, previousHash)

    const entry: LogEntry<GameAction> = {
      sequence,
      playerId,
      timestamp,
      action,
      hash,
    }

    this.entries.push(entry)

    console.log(
      `[MatchActionLog] ${this.matchId}: Appended action seq=${sequence} from player=${playerId}`
    )

    return sequence
  }

  /**
   * Get all entries
   */
  getAll(): ReadonlyArray<LogEntry<GameAction>> {
    return this.entries
  }

  /**
   * Get entries from a specific sequence number
   */
  getFrom(sequence: number): ReadonlyArray<LogEntry<GameAction>> {
    return this.entries.filter((e) => e.sequence >= sequence)
  }

  /**
   * Get the last sequence number
   */
  getLastSequence(): number {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1].sequence : -1
  }

  /**
   * Get entry count
   */
  getLength(): number {
    return this.entries.length
  }

  /**
   * Verify log integrity by checking hash chain
   */
  verifyIntegrity(): boolean {
    let previousHash = '0'
    for (const entry of this.entries) {
      const expectedHash = this.hashEntry(
        entry.sequence,
        entry.playerId,
        entry.timestamp,
        entry.action,
        previousHash
      )
      if (entry.hash !== expectedHash) {
        console.error(
          `[MatchActionLog] ${this.matchId}: Hash mismatch at sequence ${entry.sequence}`
        )
        return false
      }
      previousHash = entry.hash
    }
    return true
  }

  /**
   * Get a hash of the entire log for result artifact
   */
  getLogHash(): string {
    const allHashes = this.entries.map((e) => e.hash).join('')
    return crypto.createHash('sha256').update(allHashes).digest('hex')
  }

  /**
   * Assert that sequence numbers are contiguous (for debugging)
   */
  assertContiguous(): void {
    for (let i = 0; i < this.entries.length; i++) {
      console.assert(
        this.entries[i].sequence === i,
        `[MatchActionLog] Non-contiguous sequence at index ${i}: expected ${i}, got ${this.entries[i].sequence}`
      )
    }
  }

  /**
   * Convert to authoritative actions for clients
   */
  toAuthoritativeActions(): AuthoritativeAction<GameAction>[] {
    return this.entries.map((entry) => ({
      matchId: this.matchId,
      playerId: entry.playerId,
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      action: entry.action,
    }))
  }

  /**
   * Hash an entry
   */
  private hashEntry(
    sequence: number,
    playerId: string,
    timestamp: number,
    action: unknown,
    previousHash: string
  ): string {
    const data = `${sequence}:${playerId}:${timestamp}:${JSON.stringify(action)}:${previousHash}`
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)
  }
}

/**
 * Create a new match action log
 */
export function createMatchLog<GameAction = unknown>(matchId: string): MatchActionLog<GameAction> {
  console.log(`[MatchActionLog] Creating action log for match ${matchId}`)
  return new MatchActionLog<GameAction>(matchId)
}
