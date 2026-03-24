import { Server as SocketIOServer } from 'socket.io'
import { Socket } from 'socket.io'

import { priceFeed } from './price-feed.server'
import { GameRoom } from './room.manager'
import { RoomManager } from './room-registry.server'
import { validatePlayerName, validateCoinType } from './validation.utils'
import { checkLiquidations } from './liquidation.server'
import { settleAllPositions } from './settlement.server'
import {
  spawnCoin,
  startGameLoop,
  startGameWhenClientsReady,
  createMatch,
} from './game-loop.server'
import { SERVER_GAME_CONFIG as CFG } from './game.config'
import type { OpenPosition } from './events.types'
import type { SocketErrorCode } from '@/domains/hyper-swiper/shared/trading.types'
import { MATCH_EVENTS } from '@/domains/match/events'
import { buildResultArtifact, resolveMatchOutcome } from './result-artifact.server'
import { initiateSettlementHandoff, storeResultArtifact } from './settlement-handoff.server'
import { STAKE_AMOUNT } from '@/domains/match/config'
import {
  getPositionOpeningCapacity,
  getPositionOpeningLimitMessage,
} from '@/domains/match/position-opening'
import { ensureCoreGamesRegistered } from '@/platform/game-engine/register-core-games'
import { gameRegistry } from '@/platform/game-engine/core/registry'
import type { WaitingPlayer } from './events.types'

let priceFeedConnected = false

let roomManagerRef: RoomManager | null = null

function toLobbyPlayer(player: WaitingPlayer) {
  return {
    socketId: player.socketId,
    name: player.name,
    joinedAt: player.joinedAt,
    leverage: player.leverage,
    gameDuration: player.gameDuration,
    gameSlug: player.gameSlug,
  }
}

function emitLobbyUpdated(io: SocketIOServer, manager: RoomManager): void {
  const players = Array.from(manager.getWaitingPlayers().values()).map(toLobbyPlayer)
  io.emit('lobby_updated', { players })
}

function ensurePriceFeedConnected(io: SocketIOServer, manager?: RoomManager): void {
  if (manager) {
    roomManagerRef = manager
  }

  if (priceFeedConnected && priceFeed.isConnected()) return

  if (!priceFeed.isConnected()) {
    priceFeed.reset()
    priceFeedConnected = false
  }

  priceFeed.setBroadcastCallback((data) => {
    io.emit('btc_price', data)

    // Zero-sum: Liquidation disabled - positions can only be closed when prediction is correct
    // if (roomManagerRef) {
    //   checkLiquidations(io, roomManagerRef, data.price)
    // }
  })

  priceFeed.connect('btcusdt')
  priceFeedConnected = true
}

function disconnectPriceFeedIfIdle(manager: RoomManager): void {
  if (manager.getRoomCount() === 0 && priceFeedConnected) {
    priceFeed.disconnect()
    priceFeedConnected = false
    roomManagerRef = null
  }
}

function endGame(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  reason: 'time_limit' | 'knockout' | 'forfeit'
): void {
  if (room.getIsClosing()) return
  room.setClosing()

  // Zero-sum settlement: Use actual player balances, not PnL-based settlement
  const settlementData = settleAllPositions(io, room, () => priceFeed.getLatestPrice())

  io.to(room.id).emit('game_over', {
    winnerId: settlementData.winner.playerId,
    winnerName: settlementData.winner.playerName,
    reason,
    playerResults: settlementData.playerResults,
  })

  setTimeout(() => manager.deleteRoom(room.id), CFG.ROOM_DELETION_DELAY_MS)
  setTimeout(() => disconnectPriceFeedIfIdle(manager), CFG.ROOM_DELETION_DELAY_MS + 100)
}

function getOpenPositionCounts(
  room: GameRoom,
  playerId: string
): {
  playerOpenPositions: number
  opponentOpenPositions: number
} {
  let playerOpenPositions = 0
  let opponentOpenPositions = 0

  for (const position of room.openPositions.values()) {
    if (position.playerId === playerId) {
      playerOpenPositions += 1
    } else {
      opponentOpenPositions += 1
    }
  }

  return { playerOpenPositions, opponentOpenPositions }
}

function getPositionOpeningGuard(room: GameRoom, playerId: string) {
  const player = room.players.get(playerId)
  const opponentId = room.getPlayerIds().find((id) => id !== playerId)
  const opponent = opponentId ? room.players.get(opponentId) : undefined

  if (!player || !opponent) {
    return null
  }

  const { playerOpenPositions, opponentOpenPositions } = getOpenPositionCounts(room, playerId)

  return getPositionOpeningCapacity({
    playerBalance: player.dollars,
    opponentBalance: opponent.dollars,
    playerOpenPositions,
    opponentOpenPositions,
    stakeAmount: STAKE_AMOUNT,
  })
}

async function handleSlice(
  io: SocketIOServer,
  _manager: RoomManager,
  room: GameRoom,
  playerId: string,
  data: { coinId: string; coinType: string; priceAtSlice: number },
  getLatestPrice: () => number
): Promise<void> {
  room.removeCoin(data.coinId)
  room.removeActiveCoin(data.coinId)

  if (!validateCoinType(data.coinType)) {
    return
  }

  const player = room.players.get(playerId)
  if (!player) return

  const openingGuard = getPositionOpeningGuard(room, playerId)
  if (!openingGuard) return

  if (!openingGuard.canOpen) {
    const message = getPositionOpeningLimitMessage(openingGuard)
    const payload = {
      code: 'ACTION_REJECTED' as SocketErrorCode,
      message,
      details: {
        maxOpenPositions: openingGuard.maxOpenPositions,
        playerOpenPositions: openingGuard.playerOpenPositions,
        remainingOpenSlots: openingGuard.remainingOpenSlots,
        limitingReason: openingGuard.limitingReason,
      },
    }

    io.to(playerId).emit('error', payload)
    return
  }

  // Zero-sum: No balance deduction on position open
  // Balance only changes when money is actually won or lost on close

  const playerIds = room.getPlayerIds()
  const isPlayer1 = playerId === playerIds[0]
  const leverage = room.getLeverageForPlayer(playerId)
  const serverPrice = getLatestPrice()

  const coinType: 'long' | 'short' = data.coinType

  const position: OpenPosition = {
    id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    playerId,
    playerName: player.name,
    coinType,
    priceAtOrder: serverPrice,
    leverage,
    collateral: CFG.POSITION_COLLATERAL,
    openedAt: Date.now(),
    isPlayer1,
  }

  // Zero-sum: Do NOT deduct balance on open
  room.addOpenPosition(position)

  io.to(room.id).emit('position_opened', {
    positionId: position.id,
    playerId: position.playerId,
    playerName: position.playerName,
    isUp: position.coinType === 'long',
    leverage: position.leverage,
    collateral: position.collateral,
    openPrice: position.priceAtOrder,
  })

  // Zero-sum: No balance_updated event on open - balance only changes on transfer

  io.to(room.id).emit('coin_sliced', {
    playerId,
    playerName: player.name,
    coinType: data.coinType,
    coinId: data.coinId,
  })
}

export function setupGameEvents(io: SocketIOServer): {
  cleanup: () => void
  emergencyShutdown: () => void
} {
  ensureCoreGamesRegistered()

  // Log shared socket event names at startup (Phase 1 feedback loop)
  console.log('[SocketEvents] Shared match events:', Object.values(MATCH_EVENTS).join(', '))

  const manager = new RoomManager()

  const cleanupInterval = setInterval(() => {
    manager.cleanupStaleWaitingPlayers()

    if (io.of('/').sockets.size === 0) {
      for (const room of manager.getAllRooms()) {
        manager.deleteRoom(room.id)
      }
    }

    disconnectPriceFeedIfIdle(manager)
  }, CFG.CLEANUP_INTERVAL_MS)
  cleanupInterval.unref?.()

  const cleanup = () => {
    clearInterval(cleanupInterval)
    if (priceFeedConnected) {
      priceFeed.disconnect()
      priceFeedConnected = false
    }
  }

  const emergencyShutdown = () => {
    manager.emergencyShutdown(io, (ioServer, room) => {
      if (room.openPositions.size > 0) {
        settleAllPositions(ioServer, room, () => priceFeed.getLatestPrice())
      }
    })
  }

  io.on('connection', (socket: Socket) => {
    socket.on(
      'find_match',
      ({
        playerName,
        gameSlug,
        sceneWidth,
        sceneHeight,
        walletAddress,
        gameDuration,
      }: {
        playerName: string
        gameSlug?: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
        gameDuration?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)
          const requestedGameSlug = gameSlug ?? 'hyper-swiper'

          if (!gameRegistry.has(requestedGameSlug)) {
            socket.emit('error', {
              code: 'FIND_MATCH_FAILED' as SocketErrorCode,
              message: `Unknown game: ${requestedGameSlug}`,
            })
            return
          }

          const p1Width = sceneWidth || CFG.DEFAULT_SCENE_WIDTH
          const p1Height = sceneHeight || CFG.DEFAULT_SCENE_HEIGHT
          const p1Wallet = walletAddress
          const p1Leverage = CFG.FIXED_LEVERAGE
          const p1GameDuration = gameDuration ?? 60000

          manager.addWaitingPlayer(
            socket.id,
            validatedName,
            requestedGameSlug,
            p1Leverage,
            p1GameDuration
          )
          const waitingPlayer = manager.getWaitingPlayer(socket.id)
          if (waitingPlayer) {
            if (sceneWidth && sceneHeight) {
              waitingPlayer.sceneWidth = sceneWidth
              waitingPlayer.sceneHeight = sceneHeight
            }
            if (walletAddress) {
              waitingPlayer.walletAddress = walletAddress
            }
          }

          emitLobbyUpdated(io, manager)

          for (const [waitingId, waiting] of manager.getWaitingPlayers()) {
            if (waitingId !== socket.id) {
              if (waiting.gameSlug !== requestedGameSlug) continue
              if (waiting.gameDuration !== p1GameDuration) continue

              const waitingSocket = io.of('/').sockets.get(waitingId)
              if (waitingSocket?.connected && waitingSocket.id === waitingId) {
                const p2Width = waiting.sceneWidth || CFG.DEFAULT_SCENE_WIDTH
                const p2Height = waiting.sceneHeight || CFG.DEFAULT_SCENE_HEIGHT
                const p2Wallet = waiting.walletAddress
                const p2Leverage = CFG.FIXED_LEVERAGE

                createMatch(
                  io,
                  manager,
                  socket.id,
                  waitingId,
                  validatedName,
                  waiting.name,
                  p1Wallet,
                  p2Wallet,
                  p1Width,
                  p1Height,
                  p2Width,
                  p2Height,
                  p1Leverage,
                  p2Leverage,
                  requestedGameSlug,
                  p1GameDuration,
                  ensurePriceFeedConnected,
                  (io, mgr, room) =>
                    startGameWhenClientsReady(io, mgr, room, (io, mgr, rm) =>
                      startGameLoop(io, mgr, rm, endGame)
                    )
                ).catch((error) => {
                  console.error('[Match] Failed to create match:', error)
                })

                emitLobbyUpdated(io, manager)

                return
              }
            }
          }

          socket.emit('waiting_for_match')
        } catch (error) {
          console.error(
            '[find_match] Error:',
            error instanceof Error ? error.message : String(error)
          )
          socket.emit('error', {
            code: 'FIND_MATCH_FAILED' as SocketErrorCode,
            message: 'Failed to find match',
          })
        }
      }
    )

    socket.on(
      'join_waiting_pool',
      ({
        playerName,
        gameSlug,
        sceneWidth,
        sceneHeight,
        walletAddress,
        gameDuration,
      }: {
        playerName: string
        gameSlug?: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
        gameDuration?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)
          const requestedGameSlug = gameSlug ?? 'hyper-swiper'

          if (!gameRegistry.has(requestedGameSlug)) {
            socket.emit('error', {
              code: 'JOIN_POOL_FAILED' as SocketErrorCode,
              message: `Unknown game: ${requestedGameSlug}`,
            })
            return
          }

          if (manager.getWaitingPlayer(socket.id)) {
            socket.emit('already_in_pool')
            return
          }

          manager.addWaitingPlayer(
            socket.id,
            validatedName,
            requestedGameSlug,
            CFG.FIXED_LEVERAGE,
            gameDuration ?? 60000
          )
          const waitingPlayer = manager.getWaitingPlayer(socket.id)
          if (waitingPlayer) {
            if (sceneWidth && sceneHeight) {
              waitingPlayer.sceneWidth = sceneWidth
              waitingPlayer.sceneHeight = sceneHeight
            }
            if (walletAddress) {
              waitingPlayer.walletAddress = walletAddress
            }
          }

          emitLobbyUpdated(io, manager)

          socket.emit('joined_waiting_pool')
        } catch (error) {
          socket.emit('error', {
            code: 'JOIN_POOL_FAILED' as SocketErrorCode,
            message: 'Failed to join waiting pool',
          })
        }
      }
    )

    socket.on('leave_waiting_pool', () => {
      manager.removeWaitingPlayer(socket.id)
      emitLobbyUpdated(io, manager)
    })

    socket.on('scene_ready', () => {
      const roomId = manager.getPlayerRoomId(socket.id)
      if (!roomId) return

      const room = manager.getRoom(roomId)
      if (!room) return

      // Update match player ready state
      room.setPlayerReadyState(socket.id, 'ready')

      const bothReady = room.markClientReady(socket.id)

      // Emit match_updated event with new ready state
      io.to(roomId).emit(MATCH_EVENTS.MATCH_UPDATED, {
        matchId: roomId,
        status: room.getMatchStatus(),
        stateVersion: room.getMatchStateVersion(),
        players: Array.from(room.matchStateMachine.getState().players.values()),
      })

      if (bothReady) {
        startGameLoop(io, manager, room, endGame)
      }
    })

    socket.on('end_game', () => {
      const roomId = manager.getPlayerRoomId(socket.id)
      if (!roomId) return

      const room = manager.getRoom(roomId)
      if (!room || room.getIsClosing()) return

      endGame(io, manager, room, 'forfeit')
    })

    socket.on(
      'slice_coin',
      async (data: { coinId: string; coinType: string; priceAtSlice: number }) => {
        try {
          const roomId = manager.getPlayerRoomId(socket.id)

          if (!roomId) {
            return
          }

          const room = manager.getRoom(roomId)
          if (!room) {
            manager.removePlayerFromRoom(socket.id)
            return
          }

          if (room.gameSlug !== 'hyper-swiper') {
            socket.emit('error', {
              code: 'ACTION_REJECTED' as SocketErrorCode,
              message: 'Slice actions are only valid for Hyper Swiper matches',
            })
            return
          }

          await handleSlice(io, manager, room, socket.id, data, () => priceFeed.getLatestPrice())
        } catch (error) {
          console.log('[Server] slice_coin error:', error)
          socket.emit('error', {
            code: 'SLICE_FAILED' as SocketErrorCode,
            message: 'Failed to slice coin',
          })
        }
      }
    )

    socket.on('coin_expired', ({ coinId }: { coinId: string }) => {
      const roomId = manager.getPlayerRoomId(socket.id)
      if (!roomId) return

      const room = manager.getRoom(roomId)
      if (room) {
        room.expireCoin(coinId)
      }
    })

    socket.on('close_position', ({ positionId }: { positionId: string }) => {
      try {
        const roomId = manager.getPlayerRoomId(socket.id)
        if (!roomId) return

        const room = manager.getRoom(roomId)
        if (!room) return

        const position = room.openPositions.get(positionId)
        if (!position) {
          socket.emit('error', {
            code: 'POSITION_NOT_FOUND' as SocketErrorCode,
            message: 'Position not found',
          })
          return
        }

        if (position.playerId !== socket.id) {
          socket.emit('error', {
            code: 'UNAUTHORIZED_POSITION' as SocketErrorCode,
            message: 'Unauthorized to close this position',
          })
          return
        }

        const currentPrice = priceFeed.getLatestPrice()
        const isUp = position.coinType === 'long'

        // Zero-sum: Check if prediction is correct
        // UP can close only if currentPrice > openPrice
        // DOWN can close only if currentPrice < openPrice
        const isPredictionCorrect = isUp
          ? currentPrice > position.priceAtOrder
          : currentPrice < position.priceAtOrder

        if (!isPredictionCorrect) {
          // Reject close - prediction is not currently correct
          io.to(roomId).emit('position_close_rejected', {
            positionId: position.id,
            playerId: position.playerId,
            openPrice: position.priceAtOrder,
            currentPrice,
            isUp,
            reason: isUp ? 'price_not_above_open' : 'price_not_below_open',
            isPredictionCorrect: false,
          })
          return
        }

        // Zero-sum: Transfer stake amount from opponent to closer (capped by opponent balance)
        const TRANSFER_AMOUNT = STAKE_AMOUNT
        const playerIds = room.getPlayerIds()
        const opponentId = playerIds.find((id) => id !== socket.id)

        if (!opponentId) {
          socket.emit('error', {
            code: 'CLOSE_POSITION_FAILED' as SocketErrorCode,
            message: 'No opponent found',
          })
          return
        }

        const closer = room.players.get(socket.id)
        const opponent = room.players.get(opponentId)

        if (!closer || !opponent) {
          socket.emit('error', {
            code: 'CLOSE_POSITION_FAILED' as SocketErrorCode,
            message: 'Player not found',
          })
          return
        }

        // Calculate transfer amount (capped by opponent balance)
        const amountTransferred = Math.min(TRANSFER_AMOUNT, opponent.dollars)

        // Update balances
        opponent.dollars -= amountTransferred
        closer.dollars += amountTransferred

        // Record closed position
        room.addClosedPosition({
          positionId: position.id,
          playerId: position.playerId,
          playerName: position.playerName,
          isUp,
          leverage: position.leverage,
          collateral: position.collateral,
          openPrice: position.priceAtOrder,
          closePrice: currentPrice,
          realizedPnl: amountTransferred, // For zero-sum, this is the transfer amount
          isProfitable: amountTransferred > 0,
          isLiquidated: false,
        })

        room.removeOpenPosition(position.id)

        // Emit position closed event with zero-sum payload
        io.to(roomId).emit('position_closed', {
          positionId: position.id,
          playerId: position.playerId,
          closePrice: currentPrice,
          openPrice: position.priceAtOrder,
          isPredictionCorrect: true,
          isUp,
          amountTransferred,
          winnerId: socket.id,
          loserId: opponentId,
        })

        // Emit balance updates for both players
        io.to(roomId).emit('balance_updated', {
          playerId: socket.id,
          newBalance: closer.dollars,
          reason: 'position_won',
          positionId: position.id,
          amountTransferred,
        })

        io.to(roomId).emit('balance_updated', {
          playerId: opponentId,
          newBalance: opponent.dollars,
          reason: 'position_lost',
          positionId: position.id,
          amountTransferred,
        })
      } catch (error) {
        console.error('[Server] close_position error:', error)
        socket.emit('error', {
          code: 'CLOSE_POSITION_FAILED' as SocketErrorCode,
          message: 'Failed to close position',
        })
      }
    })

    socket.on('get_lobby_players', ({ gameSlug }: { gameSlug?: string } = {}) => {
      const requestedGameSlug = gameSlug ?? manager.getWaitingPlayer(socket.id)?.gameSlug
      const players = Array.from(manager.getWaitingPlayers().entries())
        .filter(
          ([id, player]) =>
            id !== socket.id && (!requestedGameSlug || player.gameSlug === requestedGameSlug)
        )
        .map(([_id, player]) => ({
          ...toLobbyPlayer(player),
        }))
      socket.emit('lobby_players', players)
    })

    socket.on('select_opponent', ({ opponentSocketId }: { opponentSocketId: string }) => {
      const opponent = manager.getWaitingPlayer(opponentSocketId)
      if (!opponent) {
        socket.emit('error', {
          code: 'OPPONENT_UNAVAILABLE' as SocketErrorCode,
          message: 'Opponent no longer available',
        })
        return
      }

      const localPlayer = manager.getWaitingPlayer(socket.id)
      if (!localPlayer) {
        socket.emit('error', {
          code: 'NOT_IN_WAITING_POOL' as SocketErrorCode,
          message: 'You must join waiting pool first',
        })
        return
      }

      if (localPlayer.gameDuration !== opponent.gameDuration) {
        socket.emit('error', {
          code: 'DURATION_MISMATCH' as SocketErrorCode,
          message: 'Cannot match: different game duration settings',
        })
        return
      }

      if (localPlayer.gameSlug !== opponent.gameSlug) {
        socket.emit('error', {
          code: 'OPPONENT_UNAVAILABLE' as SocketErrorCode,
          message: 'Cannot match: opponent is queued for a different game',
        })
        return
      }

      const opponentSocket = io.of('/').sockets.get(opponentSocketId)
      if (!opponentSocket?.connected) {
        socket.emit('error', {
          code: 'OPPONENT_DISCONNECTED' as SocketErrorCode,
          message: 'Opponent disconnected',
        })
        manager.removeWaitingPlayer(opponentSocketId)
        return
      }

      createMatch(
        io,
        manager,
        socket.id,
        opponentSocketId,
        localPlayer.name,
        opponent.name,
        localPlayer.walletAddress,
        opponent.walletAddress,
        localPlayer.sceneWidth || 500,
        localPlayer.sceneHeight || 800,
        opponent.sceneWidth || 500,
        opponent.sceneHeight || 800,
        localPlayer.leverage,
        opponent.leverage,
        localPlayer.gameSlug,
        localPlayer.gameDuration,
        ensurePriceFeedConnected,
        (io, mgr, room) =>
          startGameWhenClientsReady(io, mgr, room, (io, mgr, rm) =>
            startGameLoop(io, mgr, rm, endGame)
          )
      ).catch((error) => {
        console.error('[Match] Failed to create selected match:', error)
        socket.emit('error', {
          code: 'MATCH_START_FAILED' as SocketErrorCode,
          message: 'Failed to start match',
        })
      })
    })

    socket.on('set_leverage', (_data: { leverage: number }) => {
      const roomId = manager.getPlayerRoomId(socket.id)
      if (!roomId) return

      const room = manager.getRoom(roomId)
      if (!room) return

      room.setPlayerLeverage(socket.id, CFG.FIXED_LEVERAGE)

      io.to(room.id).emit('player_leverage_changed', {
        playerId: socket.id,
        playerName: room.players.get(socket.id)?.name || 'Unknown',
        leverage: CFG.FIXED_LEVERAGE,
      })
    })

    /**
     * Open Position Handler - TapDancer
     * Direct position opening via LONG/SHORT buttons (no coin slicing required)
     * Zero-sum: No balance deduction on open
     */
    socket.on('open_position', async (data: { direction: 'long' | 'short' }) => {
      try {
        const roomId = manager.getPlayerRoomId(socket.id)
        if (!roomId) {
          socket.emit('error', { message: 'Not in a game' })
          return
        }

        const room = manager.getRoom(roomId)
        if (!room) {
          socket.emit('error', { message: 'Room not found' })
          return
        }

        if (room.gameSlug !== 'tap-dancer') {
          socket.emit('error', { message: 'Open position is only valid for Tap Dancer matches' })
          return
        }

        const player = room.players.get(socket.id)
        if (!player) {
          socket.emit('error', { message: 'Player not found' })
          return
        }

        const openingGuard = getPositionOpeningGuard(room, socket.id)
        if (!openingGuard) {
          socket.emit('error', { message: 'Player state unavailable' })
          return
        }

        if (!openingGuard.canOpen) {
          socket.emit('error', {
            message: getPositionOpeningLimitMessage(openingGuard),
          })
          return
        }

        const currentPrice = priceFeed.getLatestPrice()
        const isUp = data.direction === 'long'
        const playerIds = room.getPlayerIds()
        const isPlayer1 = socket.id === playerIds[0]

        // Create position
        const position: OpenPosition = {
          id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          playerId: socket.id,
          playerName: player.name,
          coinType: data.direction,
          priceAtOrder: currentPrice,
          leverage: CFG.FIXED_LEVERAGE,
          collateral: CFG.POSITION_COLLATERAL,
          openedAt: Date.now(),
          isPlayer1,
        }

        room.addOpenPosition(position)

        // Broadcast position opened
        io.to(room.id).emit('position_opened', {
          positionId: position.id,
          playerId: position.playerId,
          playerName: position.playerName,
          isUp,
          leverage: position.leverage,
          collateral: position.collateral,
          openPrice: position.priceAtOrder,
        })

        // Zero-sum: No balance_updated event on open - balance only changes on transfer
      } catch (error) {
        console.error('[Server] open_position error:', error)
        socket.emit('error', { message: 'Failed to open position' })
      }
    })

    // =============================================================================
    // NEW MATCH ACTION HANDLER (Phase 3)
    // Handles game actions through the deterministic zero-sum reducer
    // =============================================================================

    socket.on(MATCH_EVENTS.MATCH_ACTION, (data: { matchId: string; action: unknown }) => {
      try {
        const roomId = manager.getPlayerRoomId(socket.id)
        if (!roomId || roomId !== data.matchId) {
          socket.emit('error', {
            code: 'ACTION_REJECTED' as SocketErrorCode,
            message: 'Invalid match',
          })
          return
        }

        const room = manager.getRoom(roomId)
        if (!room || !room.canAcceptMatchActions()) {
          socket.emit('error', {
            code: 'ACTION_REJECTED' as SocketErrorCode,
            message: 'Match not accepting actions',
          })
          return
        }

        // Append action to authoritative log
        const sequence = room.appendMatchAction(socket.id, data.action)

        // Log action sequence (for debugging)
        console.log(`[Match] ${roomId} action seq=${sequence} from ${socket.id}`)

        // Assert sequence is contiguous
        console.assert(
          sequence === room.matchActionLog.getLength() - 1,
          `[Match] Non-contiguous sequence in ${roomId}`
        )

        // Emit action applied event
        io.to(roomId).emit(MATCH_EVENTS.MATCH_ACTION_APPLIED, {
          matchId: roomId,
          playerId: socket.id,
          sequence,
          stateVersion: room.getMatchStateVersion(),
          action: data.action,
        })
      } catch (error) {
        console.error('[Server] match_action error:', error)
        socket.emit('error', {
          code: 'ACTION_REJECTED' as SocketErrorCode,
          message: 'Failed to apply action',
        })
      }
    })

    socket.on('disconnect', () => {
      manager.removeWaitingPlayer(socket.id)
      emitLobbyUpdated(io, manager)

      const roomId = manager.getPlayerRoomId(socket.id)
      if (roomId) {
        const room = manager.getRoom(roomId)
        if (room?.hasPlayer(socket.id)) {
          // Emit legacy event (backward compatibility)
          io.to(roomId).emit('opponent_disconnected')

          // Transition match state to aborted
          room.transitionMatchStatus('aborted', {
            abortReason: 'player_disconnect',
            affectedPlayerId: socket.id,
          })

          // Emit new match_aborted event
          io.to(roomId).emit(MATCH_EVENTS.MATCH_ABORTED, {
            matchId: roomId,
            reason: 'player_disconnect',
            affectedPlayerId: socket.id,
          })

          console.log(`[Match] ${roomId} aborted due to player disconnect: ${socket.id}`)

          if (room.openPositions.size === 0) {
            setTimeout(() => manager.deleteRoom(roomId), 5000)
            setTimeout(() => disconnectPriceFeedIfIdle(manager), 5100)
          }
        }
      }
    })
  })

  return { cleanup, emergencyShutdown }
}
