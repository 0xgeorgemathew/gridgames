'use client'

import { useTradingStore } from '@/games/hyper-swiper/game/stores/trading-store'
import { MatchmakingScreen } from '@/games/hyper-swiper/components/MatchmakingScreen'
import { GameHUD } from '@/games/hyper-swiper/components/GameHUD'
import { PositionIndicator } from '@/games/hyper-swiper/components/PositionIndicator'
import { GameCanvasBackground } from '@/components/GameCanvasBackground'
import { ToastNotifications } from '@/components/ToastNotifications'
import { GameOverModal } from '@/games/hyper-swiper/components/GameOverModal'
import { SettlementFlash } from '@/games/hyper-swiper/components/SettlementFlash'
import { RoundEndFlash } from '@/games/hyper-swiper/components/RoundEndFlash'
import GameCanvas from '@/components/GameCanvas'
import { useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

export default function HyperSwiperPage() {
  const { isPlaying, connect, disconnect, toasts, removeToast } = useTradingStore()

  useEffect(() => {
    sdk.actions.ready().catch(console.error)

    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return (
    <div className="h-dvh w-screen bg-tron-black relative overflow-hidden">
      <ToastNotifications toasts={toasts} onRemove={removeToast} />

      <GameOverModal />

      <SettlementFlash />

      <RoundEndFlash />

      {!isPlaying ? (
        <MatchmakingScreen />
      ) : (
        <>
          <GameCanvasBackground />

          <GameHUD />

          <GameCanvas scene="TradingScene" />

          <PositionIndicator />
        </>
      )}
    </div>
  )
}
