/**
 * Zero-sum settlement server
 * Handles end-of-game settlement for zero-sum matches
 *
 * Zero-sum rules:
 * - Open positions that were never correctly closed expire with no transfer
 * - Winner is determined by actual player balance
 * - Tie fallback: player1 wins
 */

import { Server as SocketIOServer } from 'socket.io'
import { GameRoom } from './room.manager'
import type {
  GameSettlementData,
  PositionSettlementResult,
  PlayerSettlementResult,
} from './events.types'

export function settleAllPositions(
  io: SocketIOServer,
  room: GameRoom,
  getLatestPrice: () => number
): GameSettlementData {
  const closePrice = getLatestPrice()
  const settlements: PositionSettlementResult[] = [...room.closedPositions]

  // Zero-sum: Open positions expire with no transfer (no PnL settlement)
  for (const [positionId, position] of room.openPositions) {
    const isUp = position.coinType === 'long'

    settlements.push({
      positionId,
      playerId: position.playerId,
      playerName: position.playerName,
      isUp,
      leverage: position.leverage,
      collateral: position.collateral,
      openPrice: position.priceAtOrder,
      closePrice,
      realizedPnl: 0, // Zero-sum: No transfer on expiry
      isProfitable: false, // Expired positions are not profitable
      isLiquidated: false,
    })
  }

  const playerResults = calculatePlayerResults(room, settlements)
  const winner = determineWinnerByBalance(room)

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
      finalBalance: player.dollars, // Use actual balance, not PnL-derived
    })
  }

  // Count positions for stats only (no balance changes)
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

  return Array.from(playerMap.values())
}

/**
 * Zero-sum winner determination by actual balance
 * Tie fallback: player1 wins
 */
function determineWinnerByBalance(room: GameRoom): GameSettlementData['winner'] {
  const players = Array.from(room.players.values())
  if (players.length === 0) {
    throw new Error(`Cannot determine winner for room ${room.id}: no players present`)
  }

  if (players.length >= 2) {
    const playerIds = room.getPlayerIds()
    const p1 = players.find((p) => p.id === playerIds[0])
    const p2 = players.find((p) => p.id === playerIds[1])

    if (p1 && p2) {
      if (p1.dollars > p2.dollars) {
        return { playerId: p1.id, playerName: p1.name, winningBalance: p1.dollars }
      } else if (p2.dollars > p1.dollars) {
        return { playerId: p2.id, playerName: p2.name, winningBalance: p2.dollars }
      } else {
        // Tie fallback: player1 wins
        return { playerId: p1.id, playerName: p1.name, winningBalance: p1.dollars }
      }
    }
  }

  // Single player or edge case
  const winner = players.reduce((a, b) => (a.dollars > b.dollars ? a : b), players[0])
  return {
    playerId: winner.id,
    playerName: winner.name,
    winningBalance: winner.dollars,
  }
}
