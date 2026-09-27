// =============================================================================
// AGENT CONFIG & RESPONSE TYPES
// =============================================================================

export type ModelTier = 'fast' | 'quality'

export interface ClippyAgentConfig {
  /** LLM tier: 'fast' = gpt-4o-mini, 'quality' = gpt-4o */
  modelTier?: ModelTier
  /** Override model name (takes precedence over modelTier) */
  modelName?: string
  /** OpenAI API key. Falls back to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Temperature for the LLM. Default: 0.3 */
  temperature?: number
  /** Max tokens for LLM response. Default: 500 */
  maxTokens?: number
}

export interface AgentResponse {
  /** The text response from Clippy */
  text: string
  /** Whether the agent used a tool during this invocation */
  toolUsed: boolean
  /** The name of the tool used, if any */
  toolName?: string
}
