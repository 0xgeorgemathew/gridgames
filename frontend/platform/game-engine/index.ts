// =============================================================================
// GAME ENGINE MODULE INDEX
// Unified modular game engine for 1v1 real-time titles
// =============================================================================

// Core layer - types, registry, lifecycle
export * from './core'

// Grid module - spatial gameplay support
export * from './grid'

// Graph module - snake graph visualization (optional)
export * from './graph'

// Client utilities - store factory, registry
export * from './client'

// Explicit registration helpers
export * from './register-core-games'
export * from './register-client-games'
