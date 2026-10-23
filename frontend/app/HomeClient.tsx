'use client'

import { useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { GameSelectionAuth } from '@/platform/ui/GameSelectionAuth'

export function HomeClient() {
  useEffect(() => {
    sdk.actions.ready().catch(console.error)
  }, [])

  return <GameSelectionAuth />
}
