import type { GameConfig } from '@/domains/types'

export const tapDancerConfig: GameConfig = {
  slug: 'tap-dancer',
  name: 'TapDancer',
  description: 'Tap to trade. Long or short, fast decisions win.',
  icon: '/games/tap-dancer/icon.svg',
  backgroundImage: '/games/tap-dancer/bg.jpg',
  status: 'available',
  players: {
    min: 2,
    max: 2,
  },
  duration: '2-3 min',
}
