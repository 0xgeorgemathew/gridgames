import { Server as SocketIOServer } from 'socket.io'
import { Socket } from 'socket.io'
import { GAME_CONFIG } from '@/game/constants'

// Module imports
import { settlementGuard } from './SettlementGuard'
import { priceFeed } from './PriceFeedManager'
import { GameRoom } from './GameRoom'
import { RoomManager } from './RoomManager'
import { validatePlayerName, validateCoinType } from './validation'
import type { WaitingPlayer, PendingOrder, SpawnedCoin } from './types'

// Re-export types and modules for external use
export { SettlementGuard, settlementGuard } from './SettlementGuard'
export { SeededRandom } from './SeededRandom'
export { CoinSequence } from './CoinSequence'
export { PriceFeedManager, priceFeed } from './PriceFeedManager'
export { GameRoom } from './GameRoom'
export { RoomManager } from './RoomManager'
export { validatePlayerName, validateCoinType } from './validation'
export type { WaitingPlayer, PendingOrder, SpawnedCoin, Coin, PriceBroadcastData } from './types'

// Order settlement duration
export const ORDER_SETTLEMENT_DURATION_MS = GAME_CONFIG.ORDER_SETTLEMENT_DURATION_MS

// Price feed state
let priceFeedConnected = false

// =============================================================================
// Price Feed Management
// =============================================================================

function ensurePriceFeedConnected(io: SocketIOServer): void {
  if (priceFeedConnected) return

  priceFeed.setBroadcastCallback((data) => {
    io.emit('btc_price', data)
  })

  priceFeed.connect('btcusdt')
  priceFeedConnected = true
}

function disconnectPriceFeedIfIdle(manager: RoomManager): void {
  if (manager.getRoomCount() === 0 && priceFeedConnected) {
    priceFeed.disconnect()
    priceFeedConnected = false
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function transferFunds(room: GameRoom, winnerId: string, loserId: string, amount: number): number {
  const winner = room.players.get(winnerId)
  const loser = room.players.get(loserId)

  const actualTransfer = Math.min(amount, loser?.dollars || 0)

  if (winner) winner.dollars += actualTransfer
  if (loser) loser.dollars -= actualTransfer

  return actualTransfer
}

// =============================================================================
// Settlement Logic
// =============================================================================

function settleOrder(io: SocketIOServer, room: GameRoom, order: PendingOrder): void {
  if (!settlementGuard.tryAcquire(order.id)) return
  if (!room.pendingOrders.has(order.id)) {
    settlementGuard.release(order.id)
    return
  }

  try {
    if (room.players.size === 0) return
    const playerIds = room.getPlayerIds()
    if (playerIds.length < 2) return

    const finalPrice = priceFeed.getLatestPrice()
    const priceChange = (finalPrice - order.priceAtOrder) / order.priceAtOrder

    const isCorrect = order.coinType === 'call' ? priceChange > 0 : priceChange < 0
    const impact = order.multiplier

    const actualTransfer = transferFunds(
      room,
      isCorrect ? order.playerId : playerIds.find((id) => id !== order.playerId)!,
      isCorrect ? playerIds.find((id) => id !== order.playerId)! : order.playerId,
      impact
    )

    room.tugOfWar += order.isPlayer1 ? -impact : impact
    room.removePendingOrder(order.id)

    io.to(room.id).emit('order_settled', {
      orderId: order.id,
      playerId: order.playerId,
      playerName: order.playerName,
      coinType: order.coinType,
      isCorrect,
      priceAtOrder: order.priceAtOrder,
      finalPrice: finalPrice,
      amountTransferred: actualTransfer,
    })
  } finally {
    settlementGuard.release(order.id)
  }
}

// =============================================================================
// Coin Spawning
// =============================================================================

function spawnCoin(room: GameRoom): SpawnedCoin | null {
  const coinData = room.getNextCoinData()
  if (!coinData) return null

  const coinId = `coin-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  const coin: SpawnedCoin = {
    id: coinId,
    type: coinData.type,
    xNormalized: coinData.xNormalized,
  }

  room.addCoin({ id: coinId, type: coinData.type, x: 0, y: 0 })
  return coin
}

// =============================================================================
// Game Loop
// =============================================================================

function startGameLoop(io: SocketIOServer, manager: RoomManager, room: GameRoom): void {
  if (room.isShutdown || room.getIsClosing()) {
    return
  }

  if (room.gameLoopActive) return
  room.gameLoopActive = true

  room.initCoinSequence()
  const gameStartTime = Date.now()

  io.to(room.id).emit('game_start', {
    durationMs: room.GAME_DURATION,
  })

  const emitCoinSpawn = (coin: SpawnedCoin) => {
    io.to(room.id).emit('coin_spawn', {
      coinId: coin.id,
      coinType: coin.type,
      xNormalized: coin.xNormalized,
    })
  }

  const scheduleNextSpawn = () => {
    if (!manager.hasRoom(room.id) || room.players.size < 2 || room.isShutdown) return

    const elapsedMs = Date.now() - gameStartTime
    const spawnConfig = room.getSpawnInterval(elapsedMs)

    const rng = Math.random()
    let burstCount = 1
    if (rng < spawnConfig.burstChance) {
      burstCount = rng < spawnConfig.burstChance * 0.3 ? 3 : 2
    }

    let actualBurstCount = burstCount
    for (let i = 0; i < burstCount; i++) {
      if (!room.peekNextCoinData()) {
        actualBurstCount = i
        break
      }
    }

    for (let i = 0; i < actualBurstCount; i++) {
      const coin = spawnCoin(room)
      if (!coin) return

      if (i === 0) {
        emitCoinSpawn(coin)
      } else {
        const staggerTimeout = setTimeout(() => {
          if (room.isShutdown || !manager.hasRoom(room.id)) return
          emitCoinSpawn(coin)
        }, i * 100)
        room.trackTimeout(staggerTimeout)
      }
    }

    const nextDelay =
      Math.floor(Math.random() * (spawnConfig.maxMs - spawnConfig.minMs + 1)) + spawnConfig.minMs
    const timeoutId = setTimeout(scheduleNextSpawn, nextDelay)
    room.trackTimeout(timeoutId)
  }

  scheduleNextSpawn()

  if (room.gameTimeout) clearTimeout(room.gameTimeout)

  room.gameTimeout = setTimeout(() => {
    endGame(io, manager, room, 'time_limit')
  }, room.GAME_DURATION)

  room.trackTimeout(room.gameTimeout)
}

function startGameWhenClientsReady(io: SocketIOServer, manager: RoomManager, room: GameRoom): void {
  if (room.clientsReady.size === 2) {
    startGameLoop(io, manager, room)
    return
  }

  const timeoutId = setTimeout(() => {
    startGameLoop(io, manager, room)
  }, 10000)

  room.trackTimeout(timeoutId)
}

// =============================================================================
// Game End
// =============================================================================

function endGame(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  reason: 'time_limit' | 'knockout' | 'forfeit'
): void {
  if (room.getIsClosing()) return
  room.setClosing()

  // Settle all pending orders
  for (const [orderId, order] of room.pendingOrders) {
    settleOrder(io, room, order)
  }

  const winner = room.getWinner()

  io.to(room.id).emit('game_over', {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason,
  })

  setTimeout(() => manager.deleteRoom(room.id), 1000)
  setTimeout(() => disconnectPriceFeedIfIdle(manager), 1100)
}

// =============================================================================
// Game Over Check (for knockout)
// =============================================================================

function checkGameOver(io: SocketIOServer, manager: RoomManager, room: GameRoom): void {
  if (room.hasDeadPlayer()) {
    endGame(io, manager, room, 'knockout')
  }
}

// =============================================================================
// Match Creation
// =============================================================================

async function createMatch(
  io: SocketIOServer,
  manager: RoomManager,
  playerId1: string,
  playerId2: string,
  name1: string,
  name2: string,
  wallet1: string | undefined,
  wallet2: string | undefined,
  sceneWidth1: number,
  sceneHeight1: number,
  sceneWidth2: number,
  sceneHeight2: number,
  leverage1: number,
  leverage2: number
): Promise<void> {
  ensurePriceFeedConnected(io)

  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const room = manager.createRoom(roomId)

  room.addPlayer(playerId1, name1, sceneWidth1, sceneHeight1, leverage1)
  room.addPlayer(playerId2, name2, sceneWidth2, sceneHeight2, leverage2)

  if (wallet1 && wallet1.startsWith('0x')) {
    room.player1Address = wallet1 as `0x${string}`
    room.addressToSocketId.set(wallet1.toLowerCase(), playerId1)
  }
  if (wallet2 && wallet2.startsWith('0x')) {
    room.player2Address = wallet2 as `0x${string}`
    room.addressToSocketId.set(wallet2.toLowerCase(), playerId2)
  }

  manager.setPlayerRoom(playerId1, roomId)
  manager.setPlayerRoom(playerId2, roomId)

  io.of('/').sockets.get(playerId1)?.join(roomId)
  io.of('/').sockets.get(playerId2)?.join(roomId)

  io.to(roomId).emit('match_found', {
    roomId,
    players: [
      {
        id: playerId1,
        name: name1,
        dollars: GAME_CONFIG.STARTING_CASH,
        score: 0,
        sceneWidth: sceneWidth1,
        sceneHeight: sceneHeight1,
        leverage: leverage1,
      },
      {
        id: playerId2,
        name: name2,
        dollars: GAME_CONFIG.STARTING_CASH,
        score: 0,
        sceneWidth: sceneWidth2,
        sceneHeight: sceneHeight2,
        leverage: leverage2,
      },
    ],
  })

  manager.removeWaitingPlayer(playerId2)

  const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
    ([_id, player]) => ({
      socketId: player.socketId,
      name: player.name,
      joinedAt: player.joinedAt,
      leverage: player.leverage,
    })
  )
  io.emit('lobby_updated', { players: allWaitingPlayers })

  startGameWhenClientsReady(io, manager, room)
}

// =============================================================================
// Slice Handling
// =============================================================================

async function handleSlice(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  playerId: string,
  data: { coinId: string; coinType: string; priceAtSlice: number }
): Promise<void> {
  room.removeCoin(data.coinId)

  if (data.coinType === 'gas') {
    const playerIds = room.getPlayerIds()
    const actualTransfer = transferFunds(
      room,
      playerIds.find((id) => id !== playerId)!,
      playerId,
      1
    )
    room.tugOfWar += playerId === playerIds[0] ? 1 : -1
    io.to(room.id).emit('player_hit', { playerId, damage: actualTransfer, reason: 'gas' })

    if (room.hasDeadPlayer()) {
      checkGameOver(io, manager, room)
    }
    return
  }

  if (data.coinType === 'whale') {
    const player = room.players.get(playerId)
    const leverage = player?.leverage ?? 2

    room.activateWhale2X(playerId, leverage)
    io.to(room.id).emit('whale_2x_activated', {
      playerId,
      playerName: room.players.get(playerId)?.name || 'Unknown',
      durationMs: room.WHALE_2X_DURATION,
      multiplier: leverage,
    })
    io.to(room.id).emit('coin_sliced', {
      playerId,
      playerName: room.players.get(playerId)?.name,
      coinType: data.coinType,
    })
    return
  }

  if (!validateCoinType(data.coinType)) return

  const playerIds = room.getPlayerIds()
  const isPlayer1 = playerId === playerIds[0]
  const multiplier = room.get2XMultiplier(playerId)
  const serverPrice = priceFeed.getLatestPrice()

  const order: PendingOrder = {
    id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    playerId,
    playerName: room.players.get(playerId)?.name || 'Unknown',
    coinType: data.coinType,
    priceAtOrder: serverPrice,
    settlesAt: Date.now() + ORDER_SETTLEMENT_DURATION_MS,
    isPlayer1,
    multiplier,
  }

  room.addPendingOrder(order)

  io.to(room.id).emit('order_placed', {
    orderId: order.id,
    playerId: order.playerId,
    playerName: order.playerName,
    coinType: order.coinType,
    priceAtOrder: order.priceAtOrder,
    settlesAt: order.settlesAt,
  })

  io.to(room.id).emit('coin_sliced', {
    playerId,
    playerName: room.players.get(playerId)?.name,
    coinType: data.coinType,
  })

  const timeoutId = setTimeout(() => {
    if (room.isShutdown || room.getIsClosing()) return
    if (manager.hasRoom(room.id) && room.pendingOrders.has(order.id)) {
      settleOrder(io, room, order)
      checkGameOver(io, manager, room)
    }
  }, ORDER_SETTLEMENT_DURATION_MS)

  room.trackTimeout(timeoutId)
}

// =============================================================================
// Main Export - Setup Game Events
// =============================================================================

export function setupGameEvents(io: SocketIOServer): {
  cleanup: () => void
  emergencyShutdown: () => void
} {
  settlementGuard.start()

  const manager = new RoomManager()

  const cleanupInterval = setInterval(() => manager.cleanupStaleWaitingPlayers(), 30000)

  const cleanup = () => {
    clearInterval(cleanupInterval)
    settlementGuard.stop()
    if (priceFeedConnected) {
      priceFeed.disconnect()
      priceFeedConnected = false
    }
  }

  const emergencyShutdown = () => {
    manager.emergencyShutdown(io, (ioServer, room, orderId) => {
      const order = room.pendingOrders.get(orderId)
      if (order) settleOrder(ioServer, room, order)
    })
  }

  io.on('connection', (socket: Socket) => {
    // ... event handlers (find_match, join_waiting_pool, etc.)
    // For brevity, the full event handlers are in the original file
    // and should be copied here during migration

    socket.on(
      'find_match',
      ({
        playerName,
        sceneWidth,
        sceneHeight,
        walletAddress,
        leverage,
      }: {
        playerName: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)

          const p1Width = sceneWidth || 500
          const p1Height = sceneHeight || 800
          const p1Wallet = walletAddress
          const p1Leverage = leverage ?? 2

          manager.addWaitingPlayer(socket.id, validatedName, p1Leverage)
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
            })
          )
          io.emit('lobby_updated', { players: allWaitingPlayers })

          for (const [waitingId, waiting] of manager.getWaitingPlayers()) {
            if (waitingId !== socket.id) {
              if (waiting.leverage !== p1Leverage) continue

              const waitingSocket = io.of('/').sockets.get(waitingId)
              if (waitingSocket?.connected && waitingSocket.id === waitingId) {
                const p2Width = waiting.sceneWidth || 500
                const p2Height = waiting.sceneHeight || 800
                const p2Wallet = waiting.walletAddress
                const p2Leverage = waiting.leverage

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
                  p2Leverage
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
                  }))
                io.emit('lobby_updated', { players: remainingPlayers })

                return
              }
            }
          }

          socket.emit('waiting_for_match')
        } catch (error) {
          console.error('[find_match] Error:', error instanceof Error ? error.message : String(error))
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
        leverage,
      }: {
        playerName: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)

          if (manager.getWaitingPlayer(socket.id)) {
            socket.emit('already_in_pool')
            return
          }

          manager.addWaitingPlayer(socket.id, validatedName, leverage ?? 2)
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
        startGameLoop(io, manager, room)
      }
    })

    socket.on('end_game', () => {
      const roomId = manager.getPlayerRoomId(socket.id)
      if (!roomId) return

      const room = manager.getRoom(roomId)
      if (!room || room.getIsClosing()) return

      // The player who clicked ends the game - opponent wins
      const playerIds = room.getPlayerIds()
      const opponentId = playerIds.find((id) => id !== socket.id)
      const opponent = opponentId ? room.players.get(opponentId) : undefined

      endGame(io, manager, room, 'forfeit')
    })

    socket.on(
      'slice_coin',
      async (data: { coinId: string; coinType: string; priceAtSlice: number }) => {
        try {
          const roomId = manager.getPlayerRoomId(socket.id)
          if (!roomId) return

          const room = manager.getRoom(roomId)
          if (!room) {
            manager.removePlayerFromRoom(socket.id)
            return
          }

          await handleSlice(io, manager, room, socket.id, data)
        } catch (error) {
          socket.emit('error', { message: 'Failed to slice coin' })
        }
      }
    )

    socket.on('get_lobby_players', () => {
      const players = Array.from(manager.getWaitingPlayers().entries())
        .filter(([id]) => id !== socket.id)
        .map(([_id, player]) => ({
          socketId: player.socketId,
          name: player.name,
          joinedAt: player.joinedAt,
          leverage: player.leverage,
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

      if (localPlayer.leverage !== opponent.leverage) {
        socket.emit('error', { message: 'Cannot match: different leverage settings' })
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
        opponent.leverage
      ).catch((error) => {
        console.error('[Match] Failed to create selected match:', error)
        socket.emit('error', { message: 'Failed to start match' })
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
        })
      )
      io.emit('lobby_updated', { players: allWaitingPlayers })

      const roomId = manager.getPlayerRoomId(socket.id)
      if (roomId) {
        const room = manager.getRoom(roomId)
        if (room?.hasPlayer(socket.id)) {
          io.to(roomId).emit('opponent_disconnected')

          if (room.pendingOrders.size === 0) {
            setTimeout(() => manager.deleteRoom(roomId), 5000)
            setTimeout(() => disconnectPriceFeedIfIdle(manager), 5100)
          }
        }
      }
    })
  })

  return { cleanup, emergencyShutdown }
}
