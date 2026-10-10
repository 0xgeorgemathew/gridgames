import type { GameConfig } from './types'
import { tapDancerConfig } from './tap-dancer/meta.config'

export const games: GameConfig[] = [
  {
    slug: 'stock-arcade',
    name: 'Stock Ninja',
    description: 'Choose your bet and swipe stock discs to collect. Simulated funds only.',
    icon: '/stocks/SPCX.svg',
    status: 'available',
    players: { min: 2, max: 2 },
    duration: '1 min',
  },
  tapDancerConfig,
]
