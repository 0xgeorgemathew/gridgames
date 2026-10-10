import { expect, test } from 'bun:test'
import { interruptMatch } from './interrupted-match'
import type { ArcadeState } from '../shared/types'

const match = (status: ArcadeState['status']): ArcadeState => ({
  matchId: 'round',
  status,
  startedAt: 1000,
  cutoffAt: 61000,
  serverTime: 2000,
  bags: [{ playerId: 'original', name: 'A', spent: 1, reservedSpend: 1, assets: [] }],
  drops: [
    {
      id: 'disc',
      symbol: 'NVDA',
      lane: 0.5,
      drift: 0,
      rotation: 0,
      spawnedAt: 1000,
      expiresAt: 5000,
    },
  ],
  simulation: true,
})
test.each(['ready', 'playing', 'valuing'] as const)(
  'disconnect during %s cancels locally and clears actionable drops',
  (status) => {
    const original = match(status)
    const result = interruptMatch(original)!
    expect(result.status).toBe('cancelled')
    expect(result.reason).toBe('connection_lost')
    expect(result.drops).toEqual([])
    expect(result.bags[0].reservedSpend).toBe(0)
    expect(result.bags[0].spent).toBe(1)
    expect(original.status).toBe(status)
  }
)
test.each(['completed', 'cancelled'] as const)(
  'disconnect preserves %s presentation and match identity',
  (status) => {
    const original = match(status)
    expect(interruptMatch(original)).toBe(original)
    expect(interruptMatch(null)).toBeNull()
  }
)
