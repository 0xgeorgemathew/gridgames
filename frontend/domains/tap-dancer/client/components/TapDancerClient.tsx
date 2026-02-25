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
import { PositionList } from '@/domains/tap-dancer/client/components/trading/PositionList'
import { GameOverModal } from '@/domains/tap-dancer/client/components/screens/GameOverModal'

function GameUI(): ReactNode {
  const { toasts, removeToast } = useTradingStore()

  return (
    <div className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
      <GameOverModal />
      <GameCanvasBackground />
      <GameHUD />
      <GameCanvas scene="TradingScene" />
      <PositionList />
    </div>
  )
}

function MatchmakingUI(): ReactNode {
  const { toasts, removeToast } = useTradingStore()

  return (
    <div className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
      <GameOverModal />
      <MatchmakingScreen />
    </div>
  )
}

export function TapDancerClient(): ReactNode {
  const { isPlaying, connect, disconnect } = useTradingStore()

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
