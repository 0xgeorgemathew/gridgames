// =============================================================================
// ENGINE CLIENT REGISTRY
// Registry-driven client bootstrap for games
// =============================================================================

import type { GameDefinition } from '../core/types'
type PhaserConfig = Phaser.Types.Core.GameConfig

// =============================================================================
// CLIENT GAME CONFIGURATION
// =============================================================================

/**
 * Client-side game configuration
 */
export interface ClientGameConfig {
  /** Game slug */
  slug: string
  /** Scene dimensions */
  scene: {
    width: number
    height: number
  }
  /** Phaser configuration factory */
  createPhaserConfig: (parent: string | HTMLElement) => PhaserConfig
}

/**
 * Client registry entry
 */
export interface ClientRegistryEntry {
  definition: GameDefinition
  clientConfig: ClientGameConfig
}

// =============================================================================
// CLIENT REGISTRY
// =============================================================================

/**
 * Client-side game registry
 * Links game definitions with client configurations
 */
export class ClientGameRegistry {
  private entries = new Map<string, ClientRegistryEntry>()

  /**
   * Register a client game configuration
   */
  register(definition: GameDefinition, clientConfig: ClientGameConfig): void {
    if (definition.metadata.slug !== clientConfig.slug) {
      throw new Error(
        `Slug mismatch: definition has "${definition.metadata.slug}" but config has "${clientConfig.slug}"`
      )
    }

    this.entries.set(definition.metadata.slug, {
      definition,
      clientConfig,
    })
  }

  /**
   * Get a registry entry by slug
   */
  get(slug: string): ClientRegistryEntry | undefined {
    return this.entries.get(slug)
  }

  /**
   * Get game definition by slug
   */
  getDefinition<
    GameAction = unknown,
    GameState = unknown,
    DomainEvent = unknown,
    RuntimeState = unknown,
  >(slug: string): GameDefinition<GameAction, GameState, DomainEvent, RuntimeState> | undefined {
    return this.entries.get(slug)?.definition as
      | GameDefinition<GameAction, GameState, DomainEvent, RuntimeState>
      | undefined
  }

  /**
   * Get client config by slug
   */
  getClientConfig(slug: string): ClientGameConfig | undefined {
    return this.entries.get(slug)?.clientConfig
  }

  /**
   * Check if a game is registered
   */
  has(slug: string): boolean {
    return this.entries.has(slug)
  }

  /**
   * Get all registered slugs
   */
  getSlugs(): string[] {
    return Array.from(this.entries.keys())
  }

  /**
   * Get all game metadata
   */
  getAllMetadata() {
    return Array.from(this.entries.values()).map((e) => e.definition.metadata)
  }

  /**
   * Get capabilities for a game
   */
  getCapabilities(slug: string) {
    return this.entries.get(slug)?.definition.capabilities
  }
}

/**
 * Global client registry instance
 */
export const clientGameRegistry = new ClientGameRegistry()

// =============================================================================
// GAME BOOTSTRAP HELPER
// =============================================================================

/**
 * Bootstrap options for a game client
 */
export interface BootstrapGameOptions {
  /** Game slug */
  slug: string
  /** Parent element for Phaser */
  parent: string | HTMLElement
}

/**
 * Bootstrap result
 */
export interface BootstrapResult {
  slug: string
  config: ClientGameConfig
  phaserConfig: PhaserConfig
}

/**
 * Bootstrap a game client
 */
export function bootstrapGame(options: BootstrapGameOptions): BootstrapResult | null {
  const entry = clientGameRegistry.get(options.slug)
  if (!entry) {
    console.error(`[GameBootstrap] Game not found: ${options.slug}`)
    return null
  }

  const phaserConfig = entry.clientConfig.createPhaserConfig(options.parent)

  return {
    slug: options.slug,
    config: entry.clientConfig,
    phaserConfig,
  }
}
