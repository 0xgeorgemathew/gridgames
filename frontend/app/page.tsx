'use client'

import { GameSelectionScreen } from '@/components/GameSelectionScreen'
import { useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

export default function Home() {
  useEffect(() => {
    sdk.actions.ready().catch(console.error)
  }, [])

  return <GameSelectionScreen />
}
