'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { sdk } from '@farcaster/miniapp-sdk'

import { useTradingStore } from '@/games/hyper-swiper/game/stores/trading-store'
import GameCanvas from '@/components/GameCanvas'
import { GameCanvasBackground } from '@/components/GameCanvasBackground'
import { ToastNotifications } from '@/components/ToastNotifications'
import { GameHUD } from '@/games/hyper-swiper/components/GameHUD'
import { MatchmakingScreen } from '@/games/hyper-swiper/components/MatchmakingScreen'
import { PositionIndicator } from '@/games/hyper-swiper/components/PositionIndicator'
import { GameOverModal } from '@/games/hyper-swiper/components/GameOverModal'
import { RoundEndFlash } from '@/games/hyper-swiper/components/RoundEndFlash'

function GameUI(): ReactNode {
  const { toasts, removeToast } = useTradingStore()

  return (
    <div className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
      <GameOverModal />
      <RoundEndFlash />
      <GameCanvasBackground />
      <GameHUD />
      <GameCanvas scene="TradingScene" />
      <PositionIndicator />
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
