// =============================================================================
// TAP DANCER PLUGIN INDEX
// Export plugin definition and explicit registration helper
// =============================================================================

export * from './definition'
import { tapDancerDefinition } from './definition'
import { gameRegistry } from '@/domains/game-engine/core'

export function registerTapDancerGame() {
  if (!gameRegistry.has(tapDancerDefinition.metadata.slug)) {
    gameRegistry.register(tapDancerDefinition)
  }

  return tapDancerDefinition
}
