import type { ArcadeState } from '../shared/types'

export function interruptMatch(
  game: ArcadeState | null,
  reason = 'connection_lost'
): ArcadeState | null {
  if (!game || game.status === 'completed' || game.status === 'cancelled') return game
  return {
    ...game,
    status: 'cancelled',
    reason,
    drops: [],
    bags: game.bags.map((bag) => ({ ...bag, reservedSpend: 0 })),
  }
}
