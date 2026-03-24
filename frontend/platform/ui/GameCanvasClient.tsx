'use client'

import { useEffect, useRef } from 'react'
import { Game } from 'phaser'
import { ensureClientGamesRegistered } from '@/platform/game-engine/register-client-games'
import { bootstrapGame } from '@/platform/game-engine/client/registry'
import { GridScene } from '@/domains/hyper-swiper/client/phaser/scenes/GridScene'
import { TradingScene as HyperSwiperTradingScene } from '@/domains/hyper-swiper/client/phaser/scenes/TradingScene'
import { TradingScene as TapDancerTradingScene } from '@/domains/tap-dancer/client/phaser/scenes/TradingScene'
import {
  createGridPhaserConfig,
  createTradingPhaserConfig,
  DEFAULT_GRID,
} from '@/domains/hyper-swiper/client/phaser/config'
import { createTradingPhaserConfig as createTapDancerPhaserConfig } from '@/domains/tap-dancer/client/phaser/config'

export type SceneType = 'GridScene' | 'TradingScene' | 'TapDancerScene'

interface GameCanvasClientProps {
  scene?: SceneType
  gameSlug?: string
}

// Scene type → config factory mapping (pass scene classes, not instances)
function createConfigForScene(type: SceneType) {
  if (type === 'TradingScene') {
    return createTradingPhaserConfig(HyperSwiperTradingScene)
  }

  if (type === 'TapDancerScene') {
    return createTapDancerPhaserConfig(TapDancerTradingScene)
  }

  return createGridPhaserConfig(GridScene, DEFAULT_GRID)
}

// Module-level singleton to prevent duplicate game instances from React StrictMode
let globalGameInstance: Game | null = null

export default function GameCanvasClient({ scene = 'GridScene', gameSlug }: GameCanvasClientProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Module-level check survives StrictMode unmount/remount
    if (globalGameInstance) {
      return
    }

    // Ensure parent element exists before creating game
    if (!parentRef.current) {
      return
    }

    let config: Phaser.Types.Core.GameConfig
    if (gameSlug) {
      ensureClientGamesRegistered()
      const bootstrap = bootstrapGame({
        slug: gameSlug,
        parent: 'phaser-game',
      })

      config = bootstrap?.phaserConfig ?? createConfigForScene(scene)
    } else {
      config = createConfigForScene(scene)
    }

    globalGameInstance = new Game(config)

    return () => {
      if (globalGameInstance) {
        globalGameInstance.destroy(true)
        globalGameInstance = null
      }
    }
  }, [scene, gameSlug])

  return (
    <div
      ref={parentRef}
      id="phaser-game"
      className="absolute inset-0 z-1"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        overscrollBehavior: 'none',
      }}
      suppressHydrationWarning={true}
    />
  )
}
