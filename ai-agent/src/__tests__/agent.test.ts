// =============================================================================
// AGENT INTEGRATION TESTS
// Verifies agent wiring without making real API calls.
// =============================================================================
import { describe, expect, it } from 'bun:test'
import { createClippyAgent } from '../agent/clippy-agent.ts'
import { mapTradingStateToGameContext } from '../context/state-mapper.ts'
import type { RawTradingStateSnapshot } from '../context/state-mapper.types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = Date.now()

function createSampleSnapshot(): RawTradingStateSnapshot {
  return {
    isConnected: true,
    isMatching: false,
    isPlaying: true,
    isGameOver: false,
    localPlayerId: 'player-1',
    isPlayer1: true,
    players: [
      { id: 'player-1', name: 'Alice', dollars: 10, score: 0 },
      { id: 'player-2', name: 'Bob', dollars: 10, score: 0 },
    ],
    gameTimeRemaining: 45,
    selectedGameDuration: 60000,
    openPositions: [
      [
        'pos-1',
        {
          id: 'pos-1',
          playerId: 'player-1',
          playerName: 'Alice',
          isUp: true,
          leverage: 500,
          collateral: 10,
          openPrice: 66500,
          closePrice: null,
          realizedPnl: 0,
          openedAt: NOW - 15_000,
          status: 'open',
        },
      ],
      [
        'pos-2',
        {
          id: 'pos-2',
          playerId: 'player-2',
          playerName: 'Bob',
          isUp: false,
          leverage: 500,
          collateral: 10,
          openPrice: 67200,
          closePrice: null,
          realizedPnl: 0,
          openedAt: NOW - 10_000,
          status: 'open',
        },
      ],
    ],
    priceData: { symbol: 'BTC', price: 67000, change: 500, changePercent: 0.75 },
    firstPrice: 66500,
    isPriceConnected: true,
    leverage: 500,
    stakeAmount: 1,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createClippyAgent', () => {
  it('throws when OPENAI_API_KEY is missing', () => {
    const originalKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    expect(() => createClippyAgent()).toThrow('OPENAI_API_KEY is required')

    process.env.OPENAI_API_KEY = originalKey
  })

  it('creates agent instance with only OPENAI_API_KEY', () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'sk-test-key'

    const agent = createClippyAgent()
    expect(agent).toBeDefined()
    expect(typeof agent.invoke).toBe('function')

    process.env.OPENAI_API_KEY = originalKey
  })

  it('creates agent with config API key (no Tavily)', () => {
    const agent = createClippyAgent({
      apiKey: 'sk-config-key',
      modelTier: 'quality',
    })
    expect(agent).toBeDefined()
    expect(typeof agent.invoke).toBe('function')
  })
})

describe('GameContext generation', () => {
  it('produces valid GameContext from snapshot', () => {
    const snapshot = createSampleSnapshot()
    const ctx = mapTradingStateToGameContext(snapshot)

    // Verify the context is well-formed
    expect(ctx.match.isPlaying).toBe(true)
    expect(ctx.match.timeRemainingSeconds).toBe(45)
    expect(ctx.match.stakeAmount).toBe(1)
    expect(ctx.price.currentPrice).toBe(67000)
    expect(ctx.localPlayer?.name).toBe('Alice')
    expect(ctx.localPlayer?.balance).toBe(10)
    expect(ctx.opponent?.name).toBe('Bob')
    expect(ctx.positions).toHaveLength(2)
    expect(ctx.ownPositions).toHaveLength(1)
    expect(ctx.opponentPositions).toHaveLength(1)
    expect(ctx.capacity).not.toBeNull()
    expect(ctx.capacity!.remainingOpenSlots).toBe(8) // max 9 (risk reserve), 1 own open = 8
    expect(ctx.summary.ownLongCount).toBe(1)
    expect(ctx.summary.netExposureDirection).toBe('net_long')

    // Verify new fields exist
    expect(ctx.actionFlow).toBeDefined()
    expect(ctx.exposureQuality).toBeDefined()

    // Verify it's JSON-serializable (required for LLM context)
    const json = JSON.stringify(ctx)
    expect(json).toBeTruthy()
    const parsed = JSON.parse(json) as typeof ctx
    expect(parsed.match.isPlaying).toBe(true)
    expect(parsed.ownPositions[0].canClose).toBe(true) // LONG at 66500, price 67000
  })
})
