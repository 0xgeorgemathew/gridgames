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

let priceFeedConnected = false

let roomManagerRef: RoomManager | null = null

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

    if (roomManagerRef) {
      checkLiquidations(io, roomManagerRef, data.price)
    }
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

  const settlementData = settleAllPositions(io, room, () => priceFeed.getLatestPrice())

  const winner = settlementData.winner

  io.to(room.id).emit('game_over', {
    winnerId: winner?.playerId ?? null,
    winnerName: winner?.playerName ?? null,
    reason,
    playerResults: settlementData.playerResults,
  })

  setTimeout(() => manager.deleteRoom(room.id), CFG.ROOM_DELETION_DELAY_MS)
  setTimeout(() => disconnectPriceFeedIfIdle(manager), CFG.ROOM_DELETION_DELAY_MS + 100)
}

async function handleSlice(
  io: SocketIOServer,
  manager: RoomManager,
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

  if (player.dollars < CFG.POSITION_COLLATERAL) {
    io.to(playerId).emit('error', { message: 'Insufficient balance to open position' })
    return
  }

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

  player.dollars -= CFG.POSITION_COLLATERAL

  room.addOpenPosition(position)

  io.to(room.id).emit('position_opened', {
    positionId: position.id,
    playerId: position.playerId,
    playerName: position.playerName,
    isLong: position.coinType === 'long',
    leverage: position.leverage,
    collateral: position.collateral,
    openPrice: position.priceAtOrder,
  })

  io.to(room.id).emit('balance_updated', {
    playerId,
    newBalance: player.dollars,
    reason: 'position_opened',
    positionId: position.id,
    collateral: CFG.POSITION_COLLATERAL,
  })

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
        sceneWidth,
        sceneHeight,
        walletAddress,
        gameDuration,
      }: {
        playerName: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
        gameDuration?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)

          const p1Width = sceneWidth || CFG.DEFAULT_SCENE_WIDTH
          const p1Height = sceneHeight || CFG.DEFAULT_SCENE_HEIGHT
          const p1Wallet = walletAddress
          const p1Leverage = CFG.FIXED_LEVERAGE
          const p1GameDuration = gameDuration ?? 60000

          manager.addWaitingPlayer(socket.id, validatedName, p1Leverage, p1GameDuration)
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

          const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
            ([_id, player]) => ({
              socketId: player.socketId,
              name: player.name,
              joinedAt: player.joinedAt,
              leverage: player.leverage,
              gameDuration: player.gameDuration,
            })
          )
          io.emit('lobby_updated', { players: allWaitingPlayers })

          for (const [waitingId, waiting] of manager.getWaitingPlayers()) {
            if (waitingId !== socket.id) {
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
                  p1GameDuration,
                  ensurePriceFeedConnected,
                  (io, mgr, room) =>
                    startGameWhenClientsReady(io, mgr, room, (io, mgr, rm) =>
                      startGameLoop(io, mgr, rm, endGame)
                    )
                ).catch((error) => {
                  console.error('[Match] Failed to create match:', error)
                })

                const remainingPlayers = Array.from(manager.getWaitingPlayers().entries())
                  .filter(([id]) => id !== socket.id && id !== waitingId)
                  .map(([_id, player]) => ({
                    socketId: player.socketId,
                    name: player.name,
                    joinedAt: player.joinedAt,
                    leverage: player.leverage,
                    gameDuration: player.gameDuration,
                  }))
                io.emit('lobby_updated', { players: remainingPlayers })

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
          socket.emit('error', { message: 'Failed to find match' })
        }
      }
    )

    socket.on(
      'join_waiting_pool',
      ({
        playerName,
        sceneWidth,
        sceneHeight,
        walletAddress,
        gameDuration,
      }: {
        playerName: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
        gameDuration?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)

          if (manager.getWaitingPlayer(socket.id)) {
            socket.emit('already_in_pool')
            return
          }

          manager.addWaitingPlayer(
            socket.id,
            validatedName,
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

          const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
            ([_id, player]) => ({
              socketId: player.socketId,
              name: player.name,
              joinedAt: player.joinedAt,
              leverage: player.leverage,
              gameDuration: player.gameDuration,
            })
          )
          io.emit('lobby_updated', { players: allWaitingPlayers })

          socket.emit('joined_waiting_pool')
        } catch (error) {
          socket.emit('error', { message: 'Failed to join waiting pool' })
        }
      }
    )

    socket.on('leave_waiting_pool', () => {
      manager.removeWaitingPlayer(socket.id)

      const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
        ([_id, player]) => ({
          socketId: player.socketId,
          name: player.name,
          joinedAt: player.joinedAt,
          leverage: player.leverage,
          gameDuration: player.gameDuration,
        })
      )
      io.emit('lobby_updated', { players: allWaitingPlayers })
    })

    socket.on('scene_ready', () => {
      const roomId = manager.getPlayerRoomId(socket.id)
      if (!roomId) return

      const room = manager.getRoom(roomId)
      if (!room) return

      const bothReady = room.markClientReady(socket.id)

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

          await handleSlice(io, manager, room, socket.id, data, () => priceFeed.getLatestPrice())
        } catch (error) {
          console.log('[Server] slice_coin error:', error)
          socket.emit('error', { message: 'Failed to slice coin' })
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
          socket.emit('error', { message: 'Position not found' })
          return
        }

        if (position.playerId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized to close this position' })
          return
        }

        const currentPrice = priceFeed.getLatestPrice()
        const priceChange = (currentPrice - position.priceAtOrder) / position.priceAtOrder
        const isLong = position.coinType === 'long'
        const directionMultiplier = isLong ? 1 : -1
        const pnl = position.collateral * position.leverage * priceChange * directionMultiplier
        const isProfitable = pnl > 0

        room.addClosedPosition({
          positionId: position.id,
          playerId: position.playerId,
          playerName: position.playerName,
          isLong: position.coinType === 'long',
          leverage: position.leverage,
          collateral: position.collateral,
          openPrice: position.priceAtOrder,
          closePrice: currentPrice,
          realizedPnl: pnl,
          isProfitable,
          isLiquidated: false,
        })

        room.removeOpenPosition(position.id)

        const player = room.players.get(socket.id)
        if (player) {
          player.dollars += position.collateral + pnl
        }

        io.to(roomId).emit('position_closed', {
          positionId: position.id,
          playerId: position.playerId,
          closePrice: currentPrice,
          realizedPnl: pnl,
        })

        if (player) {
          io.to(roomId).emit('balance_updated', {
            playerId: socket.id,
            newBalance: player.dollars,
            reason: 'position_closed',
            positionId: position.id,
            pnl,
          })
        }
      } catch (error) {
        console.error('[Server] close_position error:', error)
        socket.emit('error', { message: 'Failed to close position' })
      }
    })

    socket.on('get_lobby_players', () => {
      const players = Array.from(manager.getWaitingPlayers().entries())
        .filter(([id]) => id !== socket.id)
        .map(([_id, player]) => ({
          socketId: player.socketId,
          name: player.name,
          joinedAt: player.joinedAt,
          leverage: player.leverage,
          gameDuration: player.gameDuration,
        }))
      socket.emit('lobby_players', players)
    })

    socket.on('select_opponent', ({ opponentSocketId }: { opponentSocketId: string }) => {
      const opponent = manager.getWaitingPlayer(opponentSocketId)
      if (!opponent) {
        socket.emit('error', { message: 'Opponent no longer available' })
        return
      }

      const localPlayer = manager.getWaitingPlayer(socket.id)
      if (!localPlayer) {
        socket.emit('error', { message: 'You must join waiting pool first' })
        return
      }

      if (localPlayer.gameDuration !== opponent.gameDuration) {
        socket.emit('error', { message: 'Cannot match: different game duration settings' })
        return
      }

      const opponentSocket = io.of('/').sockets.get(opponentSocketId)
      if (!opponentSocket?.connected) {
        socket.emit('error', { message: 'Opponent disconnected' })
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
        localPlayer.gameDuration,
        ensurePriceFeedConnected,
        (io, mgr, room) =>
          startGameWhenClientsReady(io, mgr, room, (io, mgr, rm) =>
            startGameLoop(io, mgr, rm, endGame)
          )
      ).catch((error) => {
        console.error('[Match] Failed to create selected match:', error)
        socket.emit('error', { message: 'Failed to start match' })
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

    socket.on('disconnect', () => {
      manager.removeWaitingPlayer(socket.id)

      const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
        ([_id, player]) => ({
          socketId: player.socketId,
          name: player.name,
          joinedAt: player.joinedAt,
          leverage: player.leverage,
          gameDuration: player.gameDuration,
        })
      )
      io.emit('lobby_updated', { players: allWaitingPlayers })

      const roomId = manager.getPlayerRoomId(socket.id)
      if (roomId) {
        const room = manager.getRoom(roomId)
        if (room?.hasPlayer(socket.id)) {
          io.to(roomId).emit('opponent_disconnected')

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
