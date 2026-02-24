'use client'

import { useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { GameSelectionScreen } from '@/platform/ui/GameSelectionScreen'

export function HomeClient() {
  useEffect(() => {
    sdk.actions.ready().catch(console.error)
  }, [])

  return <GameSelectionScreen />
}
