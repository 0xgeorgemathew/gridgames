// =============================================================================
// CLIPPY AGENT
// Core agent initialization: createAgent + ChatOpenAI + MemorySaver
// =============================================================================
import { createAgent } from 'langchain'
import { ChatOpenAI } from '@langchain/openai'
import { MemorySaver } from '@langchain/langgraph'
import { CLIPPY_SYSTEM_PROMPT } from '../prompts/system-prompt.ts'
import type { ClippyAgentConfig, AgentResponse } from './agent.types.ts'
import type { GameContext } from '../context/game-context.types.ts'

// ---------------------------------------------------------------------------
// Model name lookup
// ---------------------------------------------------------------------------

const MODEL_NAMES: Record<string, string> = {
  fast: 'gpt-4o-mini',
  quality: 'gpt-4o',
} as const

// ---------------------------------------------------------------------------
// Agent factory
// ---------------------------------------------------------------------------

export interface ClippyAgent {
  /**
   * Invoke the Clippy agent with game context and a user message.
   *
   * @param gameContext - Structured game state from the mapper
   * @param userMessage - The player's message, or a trigger like "analyze"
   * @param threadId - Conversation thread ID for memory persistence
   */
  invoke(gameContext: GameContext, userMessage: string, threadId?: string): Promise<AgentResponse>
}

/**
 * Creates a new Clippy agent instance.
 *
 * The agent is advisory-only — it reads game state and provides strategic
 * suggestions, but never executes trades or mutates game state.
 *
 * @example
 * ```ts
 * const agent = createClippyAgent({ modelTier: 'fast' })
 * const response = await agent.invoke(gameContext, 'What should I do?')
 * console.log(response.text)
 * ```
 */
export function createClippyAgent(config: ClippyAgentConfig = {}): ClippyAgent {
  const modelName = config.modelName ?? MODEL_NAMES[config.modelTier ?? 'fast']
  const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required. Pass it via config.apiKey or set the OPENAI_API_KEY env var.',
    )
  }

  // --- LLM ---
  const model = new ChatOpenAI({
    model: modelName,
    temperature: config.temperature ?? 0.3,
    maxTokens: config.maxTokens ?? 500,
    apiKey,
  })

  // --- No tools: state-only adviser ---
  const tools: never[] = []

  // --- Memory ---
  const checkpointer = new MemorySaver()

  // --- Agent ---
  const agent = createAgent({
    model,
    tools,
    systemPrompt: CLIPPY_SYSTEM_PROMPT,
    checkpointer,
  })

  // --- Public API ---
  return {
    async invoke(
      gameContext: GameContext,
      userMessage: string,
      threadId: string = 'default',
    ): Promise<AgentResponse> {
      const contextXml = `<current_game_state>\n${JSON.stringify(gameContext, null, 2)}\n</current_game_state>`

      const result = await agent.invoke(
        {
          messages: [
            { role: 'system', content: contextXml },
            { role: 'user', content: userMessage },
          ],
        },
        { configurable: { thread_id: threadId } },
      )

      // Extract response from the last message
      const messages = result.messages ?? []
      const lastMessage = messages[messages.length - 1]

      const text =
        typeof lastMessage?.content === 'string'
          ? lastMessage.content
          : Array.isArray(lastMessage?.content)
            ? (lastMessage.content as Array<{ type: string; text?: string }>)
                .map((block) => (block.type === 'text' ? block.text : ''))
                .join('')
            : ''

      // Check if the last message has tool calls
      const toolCalls = (lastMessage as unknown as { tool_calls?: Array<{ name: string }> })
        .tool_calls
      const toolUsed = Array.isArray(toolCalls) && toolCalls.length > 0

      return {
        text,
        toolUsed,
        toolName: toolUsed ? toolCalls[0]?.name : undefined,
      }
    },
  }
}
