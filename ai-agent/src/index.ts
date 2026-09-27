// =============================================================================
// PUBLIC API
// Entry point for the @grid-games/ai-agent module.
// =============================================================================
export { createClippyAgent } from './agent/clippy-agent.ts'
export type { ClippyAgent } from './agent/clippy-agent.ts'
export type { ClippyAgentConfig, AgentResponse, ModelTier } from './agent/agent.types.ts'
export { mapTradingStateToGameContext } from './context/state-mapper.ts'
export type {
  GameContext,
  GameContextSummary,
  PositionContext,
  PriceContext,
  MatchContext,
  PlayerContext,
  CapacityContext,
  CapacityLimitReason,
  ExposureDirection,
} from './context/game-context.types.ts'
export type { RawTradingStateSnapshot, RawPosition, RawPriceData } from './context/state-mapper.types.ts'
