import type { Metadata } from 'next'
import { HyperSwiperClient } from './HyperSwiperClient'

export const metadata: Metadata = {
  title: 'Hyper Swiper | Grid Games',
  description: 'Real-time BTC prediction battles with instant multiplayer matchmaking.',
}

export default function HyperSwiperPage() {
  return <HyperSwiperClient />
}
