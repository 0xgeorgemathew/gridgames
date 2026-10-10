import type { GameConfig } from './types'
import { tapDancerConfig } from './tap-dancer/meta.config'

export const games: GameConfig[] = [
  {
    slug: 'stock-arcade',
    name: 'Stock Ninja',
    description: 'Swipe stock discs to collect $1 simulated catches. No real funds.',
    icon: '/stocks/SPCX.svg',
    status: 'available',
    players: { min: 2, max: 2 },
    duration: '1 min',
  },
  tapDancerConfig,
]
