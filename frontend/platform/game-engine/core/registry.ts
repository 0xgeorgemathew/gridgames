// =============================================================================
// GAME REGISTRY
// Runtime registry for game definitions
// =============================================================================

import type { GameDefinition, GameMetadata, GameCapabilities } from './types'

/**
 * Game registry for managing game definitions
 * Single source of truth for all available games
 */
export class GameRegistry {
  private games = new Map<string, GameDefinition>()

  /**
   * Register a game definition
   */
  register<GameAction, GameState, DomainEvent, RuntimeState>(
    definition: GameDefinition<GameAction, GameState, DomainEvent, RuntimeState>
  ): void {
    const slug = definition.metadata.slug
    if (this.games.has(slug)) {
      console.warn(`[GameRegistry] Overwriting existing game: ${slug}`)
    }
    this.games.set(slug, definition as GameDefinition)
  }

  /**
   * Get a game definition by slug
   */
  get<GameAction = unknown, GameState = unknown, DomainEvent = unknown, RuntimeState = unknown>(
    slug: string
  ): GameDefinition<GameAction, GameState, DomainEvent, RuntimeState> | undefined {
    return this.games.get(slug) as
      | GameDefinition<GameAction, GameState, DomainEvent, RuntimeState>
      | undefined
  }

  /**
   * Check if a game exists
   */
  has(slug: string): boolean {
    return this.games.has(slug)
  }

  /**
   * Get all registered game metadata
   */
  getAllMetadata(): GameMetadata[] {
    return Array.from(this.games.values()).map((g) => g.metadata)
  }

  /**
   * Get all game slugs
   */
  getSlugs(): string[] {
    return Array.from(this.games.keys())
  }

  /**
   * Get capabilities for a game
   */
  getCapabilities(slug: string): GameCapabilities | undefined {
    return this.games.get(slug)?.capabilities
  }

  /**
   * Check if a game uses a specific capability
   */
  usesCapability(slug: string, capability: keyof GameCapabilities): boolean {
    const caps = this.getCapabilities(slug)
    return caps?.[capability] ?? false
  }

  /**
   * Unregister a game
   */
  unregister(slug: string): boolean {
    return this.games.delete(slug)
  }

  /**
   * Clear all registered games
   */
  clear(): void {
    this.games.clear()
  }

  /**
   * Get number of registered games
   */
  get size(): number {
    return this.games.size
  }
}

/**
 * Global game registry instance
 */
export const gameRegistry = new GameRegistry()

/**
 * Helper to create and register a game definition
 */
export function defineGame<GameAction, GameState, DomainEvent = unknown, RuntimeState = unknown>(
  definition: GameDefinition<GameAction, GameState, DomainEvent, RuntimeState>
) {
  gameRegistry.register(definition)
  return definition
}
