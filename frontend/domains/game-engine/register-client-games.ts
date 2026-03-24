'use client'

import { clientGameRegistry } from './client/registry'
import { ensureCoreGamesRegistered } from './register-core-games'
import { hyperSwiperDefinition } from '@/domains/hyper-swiper/plugin/definition'
import { tapDancerDefinition } from '@/domains/tap-dancer/plugin/definition'
import { TradingScene as HyperSwiperTradingScene } from '@/domains/hyper-swiper/client/phaser/scenes/TradingScene'
import { TradingScene as TapDancerTradingScene } from '@/domains/tap-dancer/client/phaser/scenes/TradingScene'
import { createTradingPhaserConfig as createHyperSwiperPhaserConfig } from '@/domains/hyper-swiper/client/phaser/config'
import { createTradingPhaserConfig as createTapDancerPhaserConfig } from '@/domains/tap-dancer/client/phaser/config'

function withParent(
  config: Phaser.Types.Core.GameConfig,
  parent: string | HTMLElement
): Phaser.Types.Core.GameConfig {
  return {
    ...config,
    parent,
  }
}

export function ensureClientGamesRegistered(): void {
  ensureCoreGamesRegistered()

  if (!clientGameRegistry.has(hyperSwiperDefinition.metadata.slug)) {
    clientGameRegistry.register(hyperSwiperDefinition, {
      slug: hyperSwiperDefinition.metadata.slug,
      scene: { width: 600, height: 800 },
      createPhaserConfig: (parent): Phaser.Types.Core.GameConfig =>
        withParent(createHyperSwiperPhaserConfig(HyperSwiperTradingScene), parent),
    })
  }

  if (!clientGameRegistry.has(tapDancerDefinition.metadata.slug)) {
    clientGameRegistry.register(tapDancerDefinition, {
      slug: tapDancerDefinition.metadata.slug,
      scene: { width: 600, height: 800 },
      createPhaserConfig: (parent): Phaser.Types.Core.GameConfig =>
        withParent(createTapDancerPhaserConfig(TapDancerTradingScene), parent),
    })
  }
}
