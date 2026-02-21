import { Server as SocketIOServer } from 'socket.io'
import { Socket } from 'socket.io'
import { GAME_CONFIG } from '@/games/hyper-swiper/game/constants'

// Module imports
import { priceFeed } from './PriceFeedManager'
import { GameRoom } from './GameRoom'
import { RoomManager } from './RoomManager'
import { validatePlayerName, validateCoinType } from './validation'
import type {
  WaitingPlayer,
  OpenPosition,
  SpawnedCoin,
  PositionSettlementResult,
  PlayerSettlementResult,
  GameSettlementData,
  LiquidationEvent,
} from './types'

// Price feed state
let priceFeedConnected = false
const FIXED_LEVERAGE = 500
const TIE_EPSILON = 1e-9

// =============================================================================
// Price Feed Management
// =============================================================================

// Store reference to RoomManager for liquidation checks
let roomManagerRef: RoomManager | null = null

function ensurePriceFeedConnected(io: SocketIOServer, manager?: RoomManager): void {
  // Store manager reference for liquidation checks
  if (manager) {
    roomManagerRef = manager
  }

  // Check if already connected and the WebSocket is actually open
  if (priceFeedConnected && priceFeed.isConnected()) return

  // Reset price feed if it was shutdown (e.g., after previous game)
  if (!priceFeed.isConnected()) {
    priceFeed.reset()
    priceFeedConnected = false
  }

  priceFeed.setBroadcastCallback((data) => {
    io.emit('btc_price', data)

    // Check all active rooms for liquidations on each price update
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

// =============================================================================
// Liquidation Logic
// =============================================================================

/**
 * Check all open positions across active rooms for liquidation
 * Called on every price update from the feed
 */
function checkLiquidations(io: SocketIOServer, manager: RoomManager, currentPrice: number): void {
  for (const room of manager.getAllRooms()) {
    // Skip rooms that are closing or shutdown
    if (room.getIsClosing() || room.isShutdown) continue

    // Check each open position in the room
    for (const [, position] of room.openPositions) {
      if (shouldLiquidate(position, currentPrice)) {
        liquidatePosition(io, room, position, currentPrice)
      }
    }
  }
}

/**
 * Liquidate a position and notify players
 * Position is force-closed when collateral health ratio <= 80%
 */
function liquidatePosition(
  io: SocketIOServer,
  room: GameRoom,
  position: OpenPosition,
  currentPrice: number
): void {
  const { pnl, isProfitable } = calculatePositionPnl(position, currentPrice)
  const healthRatio = calculateCollateralHealthRatio(position, currentPrice)

  // Record liquidation as a realized settlement so winner and PnL totals stay accurate.
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
    isLiquidated: true,
  })

  // Create liquidation event
  const liquidationEvent: LiquidationEvent = {
    positionId: position.id,
    playerId: position.playerId,
    playerName: position.playerName,
    isLong: position.coinType === 'long',
    leverage: position.leverage,
    collateral: position.collateral,
    openPrice: position.priceAtOrder,
    liquidationPrice: currentPrice,
    healthRatio,
    pnlAtLiquidation: pnl,
  }

  // Remove position from open positions
  room.removeOpenPosition(position.id)

  // Emit liquidation event to room
  io.to(room.id).emit('position_liquidated', liquidationEvent)

  console.log(
    `[Liquidation] Position ${position.id} liquidated for player ${position.playerName} ` +
      `at health ratio ${(healthRatio * 100).toFixed(1)}% ` +
      `(PnL: $${pnl.toFixed(4)}, Price: $${currentPrice.toFixed(2)})`
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

// Calculate PnL for a position
function calculatePositionPnl(
  position: OpenPosition,
  closePrice: number
): { pnl: number; isProfitable: boolean } {
  const priceChange = (closePrice - position.priceAtOrder) / position.priceAtOrder
  const isLong = position.coinType === 'long'

  // PnL = collateral * leverage * price_change_percent * direction
  // For LONG: profit when price goes up
  // For SHORT: profit when price goes down
  const directionMultiplier = isLong ? 1 : -1
  const pnl = position.collateral * position.leverage * priceChange * directionMultiplier
  const isProfitable = pnl > 0

  return { pnl, isProfitable }
}

/**
 * Calculate collateral health ratio for a position
 * Health Ratio = (Net Collateral + PnL) / Net Collateral
 * Liquidation at <= 80%
 *
 * Following Avantis Docs:
 * Collateral Health Ratio = (Net Collateral + PnL - accumulated margin fee - closing fee) / Net Collateral
 * Since we have no fees, this simplifies to: (Net Collateral + PnL) / Net Collateral
 */
function calculateCollateralHealthRatio(position: OpenPosition, currentPrice: number): number {
  const { pnl } = calculatePositionPnl(position, currentPrice)
  const netCollateral = position.collateral // No opening fee, so net = original collateral

  return (netCollateral + pnl) / netCollateral
}

/**
 * Check if a position should be liquidated
 * Returns true if health ratio <= 80%
 */
function shouldLiquidate(position: OpenPosition, currentPrice: number): boolean {
  const healthRatio = calculateCollateralHealthRatio(position, currentPrice)
  return healthRatio <= GAME_CONFIG.LIQUIDATION_HEALTH_RATIO
}

// =============================================================================
// Game End Settlement Logic
// =============================================================================

function settleAllPositions(io: SocketIOServer, room: GameRoom): GameSettlementData {
  const closePrice = priceFeed.getLatestPrice()
  const settlements: PositionSettlementResult[] = [...room.closedPositions]

  // Calculate PnL for each position
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

  // Calculate player totals
  const playerResults = calculatePlayerResults(room, settlements)

  // Determine winner by total PnL
  const winner = determineWinner(playerResults)

  const settlementData: GameSettlementData = {
    closePrice,
    positions: settlements,
    playerResults,
    winner,
  }

  // Emit game settlement event
  io.to(room.id).emit('game_settlement', settlementData)

  return settlementData
}

function calculatePlayerResults(
  room: GameRoom,
  settlements: PositionSettlementResult[]
): PlayerSettlementResult[] {
  const playerMap = new Map<string, PlayerSettlementResult>()

  // Initialize player results
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

  // Aggregate position results
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

  // Equity-style final balance aligned with total realized PnL.
  for (const playerResult of playerMap.values()) {
    playerResult.finalBalance = Math.max(0, GAME_CONFIG.STARTING_CASH + playerResult.totalPnl)
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
    velocityX: coinData.velocityX,
    velocityY: coinData.velocityY,
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
      velocityX: coin.velocityX,
      velocityY: coin.velocityY,
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

  // Settle ALL positions at game end
  const settlementData = settleAllPositions(io, room)

  // Use winner from settlement data (based on total PnL)
  const winner = settlementData.winner

  io.to(room.id).emit('game_over', {
    winnerId: winner?.playerId ?? null,
    winnerName: winner?.playerName ?? null,
    reason,
    playerResults: settlementData.playerResults,
  })

  setTimeout(() => manager.deleteRoom(room.id), 1000)
  setTimeout(() => disconnectPriceFeedIfIdle(manager), 1100)
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
  leverage2: number,
  gameDuration: number = 60000
): Promise<void> {
  ensurePriceFeedConnected(io, manager)

  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const room = manager.createRoom(roomId, gameDuration)

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
      gameDuration: player.gameDuration,
    })
  )
  io.emit('lobby_updated', { players: allWaitingPlayers })

  startGameWhenClientsReady(io, manager, room)
}

// =============================================================================
// Slice Handling - Perp-Style Position Opening
// =============================================================================

async function handleSlice(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  playerId: string,
  data: { coinId: string; coinType: string; priceAtSlice: number }
): Promise<void> {
  room.removeCoin(data.coinId)

  // Only call and put coins now - no gas or whale
  console.log('[Server] handleSlice called with coinType:', data.coinType)
  if (!validateCoinType(data.coinType)) {
    console.log('[Server] Invalid coin type, returning early')
    return
  }

  const player = room.players.get(playerId)
  console.log('[Server] Player found:', player?.name, 'balance:', player?.dollars)
  if (!player) return

  // Check if player has enough balance for collateral
  if (player.dollars < GAME_CONFIG.POSITION_COLLATERAL) {
    // Emit error - not enough balance
    io.to(playerId).emit('error', { message: 'Insufficient balance to open position' })
    return
  }

  const playerIds = room.getPlayerIds()
  const isPlayer1 = playerId === playerIds[0]
  const leverage = room.getLeverageForPlayer(playerId)
  const serverPrice = priceFeed.getLatestPrice()

  // Type is now validated as 'long' | 'short'
  const coinType: 'long' | 'short' = data.coinType

  // Create perp-style position (no settlement timer)
  const position: OpenPosition = {
    id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    playerId,
    playerName: player.name,
    coinType,
    priceAtOrder: serverPrice,
    leverage,
    collateral: GAME_CONFIG.POSITION_COLLATERAL,
    openedAt: Date.now(),
    isPlayer1,
  }

  // Deduct collateral from player balance
  player.dollars -= GAME_CONFIG.POSITION_COLLATERAL

  // Add position to room
  room.addOpenPosition(position)

  // Emit position_opened event
  console.log('[Server] Emitting position_opened to room:', room.id, 'positionId:', position.id)
  io.to(room.id).emit('position_opened', {
    positionId: position.id,
    playerId: position.playerId,
    playerName: position.playerName,
    isLong: position.coinType === 'long',
    leverage: position.leverage,
    collateral: position.collateral,
    openPrice: position.priceAtOrder,
  })

  // Emit balance_updated event for collateral deduction
  io.to(room.id).emit('balance_updated', {
    playerId,
    newBalance: player.dollars,
    reason: 'position_opened',
    positionId: position.id,
    collateral: GAME_CONFIG.POSITION_COLLATERAL,
  })

  // Emit coin_sliced for visual feedback
  io.to(room.id).emit('coin_sliced', {
    playerId,
    playerName: player.name,
    coinType: data.coinType,
    coinId: data.coinId,
  })
}

// =============================================================================
// Main Export - Setup Game Events
// =============================================================================

export function setupGameEvents(io: SocketIOServer): {
  cleanup: () => void
  emergencyShutdown: () => void
} {
  const manager = new RoomManager()

  const cleanupInterval = setInterval(() => {
    manager.cleanupStaleWaitingPlayers()

    // If no clients are connected, hard-clean all rooms to avoid stale room leaks
    // keeping the price feed websocket alive indefinitely.
    if (io.of('/').sockets.size === 0) {
      for (const room of manager.getAllRooms()) {
        manager.deleteRoom(room.id)
      }
    }

    // Opportunistic idle disconnect in case room state has reached zero.
    disconnectPriceFeedIfIdle(manager)
  }, 30000)
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
      // With perp-style positions, we settle all positions at emergency shutdown
      if (room.openPositions.size > 0) {
        settleAllPositions(ioServer, room)
      }
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

          const p1Width = sceneWidth || 500
          const p1Height = sceneHeight || 800
          const p1Wallet = walletAddress
          const p1Leverage = FIXED_LEVERAGE
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
              // Match only if gameDuration matches (leverage is fixed at 500X)
              if (waiting.gameDuration !== p1GameDuration) continue

              const waitingSocket = io.of('/').sockets.get(waitingId)
              if (waitingSocket?.connected && waitingSocket.id === waitingId) {
                const p2Width = waiting.sceneWidth || 500
                const p2Height = waiting.sceneHeight || 800
                const p2Wallet = waiting.walletAddress
                const p2Leverage = FIXED_LEVERAGE

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
                  p1GameDuration
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

          manager.addWaitingPlayer(socket.id, validatedName, FIXED_LEVERAGE, gameDuration ?? 60000)
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
        console.log('[Server] slice_coin event received from socket:', socket.id)
        console.log('[Server] slice_coin data:', data)
        try {
          const roomId = manager.getPlayerRoomId(socket.id)
          console.log('[Server] roomId lookup result:', roomId ?? 'NULL')

          if (!roomId) {
            console.log('[Server] EARLY RETURN - roomId is null')
            return
          }

          const room = manager.getRoom(roomId)
          if (!room) {
            console.log('[Server] EARLY RETURN - room not found for roomId:', roomId)
            manager.removePlayerFromRoom(socket.id)
            return
          }

          await handleSlice(io, manager, room, socket.id, data)
        } catch (error) {
          console.log('[Server] slice_coin error:', error)
          socket.emit('error', { message: 'Failed to slice coin' })
        }
      }
    )

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
        const { pnl, isProfitable } = calculatePositionPnl(position, currentPrice)

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
        localPlayer.gameDuration
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

      // Leverage is fixed at 500X for all players.
      room.setPlayerLeverage(socket.id, FIXED_LEVERAGE)

      // Broadcast to room so opponent sees the change
      io.to(room.id).emit('player_leverage_changed', {
        playerId: socket.id,
        playerName: room.players.get(socket.id)?.name || 'Unknown',
        leverage: FIXED_LEVERAGE,
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

          // With perp-style positions, clean up room on disconnect
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
