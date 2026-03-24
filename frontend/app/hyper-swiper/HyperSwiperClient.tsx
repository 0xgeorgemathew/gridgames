'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { sdk } from '@farcaster/miniapp-sdk'

import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import GameCanvas from '@/platform/ui/GameCanvas'
import { GameCanvasBackground } from '@/platform/ui/GameCanvasBackground'
import { ToastNotifications } from '@/platform/ui/ToastNotifications'
import { GameHUD } from '@/domains/hyper-swiper/client/components/hud/GameHUD'
import { MatchmakingScreen } from '@/domains/hyper-swiper/client/components/screens/MatchmakingScreen'
import { GameOverModal } from '@/domains/hyper-swiper/client/components/screens/GameOverModal'
import { RoundEndFlash } from '@/domains/hyper-swiper/client/components/effects/RoundEndFlash'

function GameUI(): ReactNode {
  const { toasts, removeToast } = useTradingStore()

  return (
    <div className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
      <GameOverModal />
      <RoundEndFlash />
      <GameCanvasBackground />
      <GameHUD />
      <GameCanvas gameSlug="hyper-swiper" scene="TradingScene" />
    </div>
  )
}

function MatchmakingUI(): ReactNode {
  const { toasts, removeToast } = useTradingStore()

  return (
    <div className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
      <GameOverModal />
      <RoundEndFlash />
      <MatchmakingScreen />
    </div>
  )
}

export function HyperSwiperClient(): ReactNode {
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
