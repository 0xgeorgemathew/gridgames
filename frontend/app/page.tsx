import type { Metadata } from 'next'
import { HomeClient } from './HomeClient'

export const metadata: Metadata = {
  title: 'Grid Games | Choose a Game',
  description: 'Pick a game mode and enter the Grid Games arena on Base Mini App.',
}

export default function Home() {
  return <HomeClient />
}
