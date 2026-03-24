import { gameRegistry } from './core/registry'
import { hyperSwiperDefinition } from '@/domains/hyper-swiper/plugin/definition'
import { tapDancerDefinition } from '@/domains/tap-dancer/plugin/definition'

export function ensureCoreGamesRegistered(): void {
  if (!gameRegistry.has(hyperSwiperDefinition.metadata.slug)) {
    gameRegistry.register(hyperSwiperDefinition)
  }

  if (!gameRegistry.has(tapDancerDefinition.metadata.slug)) {
    gameRegistry.register(tapDancerDefinition)
  }
}
