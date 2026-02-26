import type { GameConfig } from '@/domains/types'
import { Zap } from 'lucide-react'

export const hyperSwiperConfig: GameConfig = {
  slug: 'hyper-swiper',
  name: 'Hyper Swiper',
  description: 'Real-time crypto trading battle. Swipe to trade, outsmart your opponent.',
  icon: '/games/hyper-swiper/icon.svg',
  backgroundImage: '/games/hyper-swiper/bg.jpg',
  status: 'available',
  players: {
    min: 2,
    max: 2,
  },
  duration: '2-3 min',
  lucideIcon: Zap,
}
