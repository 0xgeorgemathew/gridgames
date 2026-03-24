// =============================================================================
// HYPER SWIPER PLUGIN INDEX
// Export plugin definition and explicit registration helper
// =============================================================================

export * from './definition'
import { hyperSwiperDefinition } from './definition'
import { gameRegistry } from '@/platform/game-engine/core'

export function registerHyperSwiperGame() {
  if (!gameRegistry.has(hyperSwiperDefinition.metadata.slug)) {
    gameRegistry.register(hyperSwiperDefinition)
  }

  return hyperSwiperDefinition
}
