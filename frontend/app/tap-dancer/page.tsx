import type { Metadata } from 'next'
import { TapDancerClient } from './TapDancerClient'

export const metadata: Metadata = {
  title: 'TapDancer | Grid Games',
  description: 'Tap to trade. Long or short, fast decisions win.',
}

export default function TapDancerPage() {
  return <TapDancerClient />
}
