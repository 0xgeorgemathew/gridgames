'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { sdk } from '@farcaster/miniapp-sdk'

import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import GameCanvas from '@/platform/ui/GameCanvas'
import { GameCanvasBackground } from '@/platform/ui/GameCanvasBackground'
import { ToastNotifications } from '@/platform/ui/ToastNotifications'
import { GameHUD } from '@/domains/tap-dancer/client/components/hud/GameHUD'
import { MatchmakingScreen } from '@/domains/tap-dancer/client/components/screens/MatchmakingScreen'
import { GameOverModal } from '@/domains/tap-dancer/client/components/screens/GameOverModal'

function GameUI(): ReactNode {
  const toasts = useTradingStore((state) => state.toasts)
  const removeToast = useTradingStore((state) => state.removeToast)

  return (
    <div className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
      <GameOverModal />
      <GameCanvasBackground />
      <GameHUD />
      <GameCanvas gameSlug="tap-dancer" scene="TapDancerScene" />
    </div>
  )
}

function MatchmakingUI(): ReactNode {
  const toasts = useTradingStore((state) => state.toasts)
  const removeToast = useTradingStore((state) => state.removeToast)

  return (
    <div className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
      <GameOverModal />
      <MatchmakingScreen />
    </div>
  )
}

export function TapDancerClient(): ReactNode {
  const isPlaying = useTradingStore((state) => state.isPlaying)
  const connect = useTradingStore((state) => state.connect)
  const disconnect = useTradingStore((state) => state.disconnect)

  useEffect(() => {
    sdk.actions.ready().catch(console.error)
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  if (!isPlaying) {
    return <MatchmakingUI />
  }

  return <GameUI />
}
