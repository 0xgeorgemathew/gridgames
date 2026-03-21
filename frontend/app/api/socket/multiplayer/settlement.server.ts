/**
 * @deprecated
 * This file is part of the legacy trading/perp settlement system.
 * It will be removed in Phase 6 after the new match lifecycle is fully integrated.
 *
 * New code should use:
 * - result-artifact.server.ts for building result artifacts
 * - result-store.server.ts for persisting results
 * - settlement-handoff.server.ts for settlement handoff
 */

import { Server as SocketIOServer } from 'socket.io'
import { SERVER_GAME_CONFIG as CFG } from './game.config'
import { GameRoom } from './room.manager'
import type {
  GameSettlementData,
  PositionSettlementResult,
  PlayerSettlementResult,
} from './events.types'
import { calculatePositionPnl } from './liquidation.server'

const TIE_EPSILON = 1e-9

export function settleAllPositions(
  io: SocketIOServer,
  room: GameRoom,
  getLatestPrice: () => number
): GameSettlementData {
  const closePrice = getLatestPrice()
  const settlements: PositionSettlementResult[] = [...room.closedPositions]

  for (const [positionId, position] of room.openPositions) {
    const { pnl, isProfitable } = calculatePositionPnl(position, closePrice)
    const isLong = position.coinType === 'long'

    settlements.push({
      positionId,
      playerId: position.playerId,
      playerName: position.playerName,
      isLong,
      leverage: position.leverage,
      collateral: position.collateral,
      openPrice: position.priceAtOrder,
      closePrice,
      realizedPnl: pnl,
      isProfitable,
      isLiquidated: false,
    })
  }

  const playerResults = calculatePlayerResults(room, settlements)
  const winner = determineWinner(playerResults)

  const settlementData: GameSettlementData = {
    closePrice,
    positions: settlements,
    playerResults,
    winner,
  }

  io.to(room.id).emit('game_settlement', settlementData)

  return settlementData
}

function calculatePlayerResults(
  room: GameRoom,
  settlements: PositionSettlementResult[]
): PlayerSettlementResult[] {
  const playerMap = new Map<string, PlayerSettlementResult>()

  for (const [playerId, player] of room.players) {
    playerMap.set(playerId, {
      playerId,
      playerName: player.name,
      totalPnl: 0,
      positionCount: 0,
      winningPositions: 0,
      finalBalance: 0,
    })
  }

  for (const settlement of settlements) {
    const playerResult = playerMap.get(settlement.playerId)
    if (playerResult) {
      playerResult.totalPnl += settlement.realizedPnl
      playerResult.positionCount += 1
      if (settlement.isProfitable) {
        playerResult.winningPositions += 1
      }
    }
  }

  for (const playerResult of playerMap.values()) {
    playerResult.finalBalance = Math.max(0, CFG.STARTING_BALANCE + playerResult.totalPnl)
  }

  return Array.from(playerMap.values())
}

function determineWinner(
  playerResults: PlayerSettlementResult[]
): { playerId: string; playerName: string; winningBalance: number } | null {
  if (playerResults.length === 0) return null

  const sorted = [...playerResults].sort((a, b) => b.totalPnl - a.totalPnl)
  if (sorted.length > 1 && Math.abs(sorted[0].totalPnl - sorted[1].totalPnl) <= TIE_EPSILON) {
    return null
  }
  const winner = sorted[0]

  return {
    playerId: winner.playerId,
    playerName: winner.playerName,
    winningBalance: winner.finalBalance,
  }
}
