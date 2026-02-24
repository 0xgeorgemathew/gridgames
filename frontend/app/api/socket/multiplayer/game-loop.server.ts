import { Server as SocketIOServer } from 'socket.io'
import { SERVER_GAME_CONFIG as CFG } from './game.config'
import type { RoomManager } from './room-registry.server'
import { GameRoom } from './room.manager'
import type { SpawnedCoin } from './events.types'

export function spawnCoin(room: GameRoom, forceType?: 'long' | 'short'): SpawnedCoin | null {
  if (!room.canSpawnCoin()) {
    return null
  }

  const coinData = room.getNextCoinData(forceType)
  if (!coinData) {
    console.warn('[CoinSync] Coin spawn attempted while sequence exhausted')
    return null
  }

  const coinId = `coin-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const sequenceIndex = room.getCoinSequenceIndex()

  const coin: SpawnedCoin = {
    id: coinId,
    type: coinData.type,
    xNormalized: coinData.xNormalized,
    velocityX: coinData.velocityX,
    velocityY: coinData.velocityY,
    sequenceIndex,
  }

  room.addCoin({ id: coinId, type: coinData.type, x: 0, y: 0 })
  room.addActiveCoin(coinId, coinData.type)
  return coin
}

export function startGameLoop(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  endGameFn: (
    io: SocketIOServer,
    manager: RoomManager,
    room: GameRoom,
    reason: 'time_limit' | 'knockout' | 'forfeit'
  ) => void
): void {
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
      sequenceIndex: coin.sequenceIndex,
    })
  }

  const scheduleNextSpawn = () => {
    if (!manager.hasRoom(room.id) || room.players.size < 2 || room.isShutdown) return

    room.expireOldCoins()

    if (room.canSpawnCoin()) {
      const forceType = room.getRequiredCoinType()
      const coin = spawnCoin(room, forceType)
      if (coin) {
        emitCoinSpawn(coin)
      }
    }

    const elapsedMs = Date.now() - gameStartTime
    const heartbeatInterval = room.getHeartbeatInterval(elapsedMs)
    const timeoutId = setTimeout(scheduleNextSpawn, heartbeatInterval)
    room.trackTimeout(timeoutId)
  }

  scheduleNextSpawn()

  if (room.gameTimeout) clearTimeout(room.gameTimeout)

  room.gameTimeout = setTimeout(() => {
    endGameFn(io, manager, room, 'time_limit')
  }, room.GAME_DURATION)

  room.trackTimeout(room.gameTimeout)
}

export function startGameWhenClientsReady(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  startGameLoopFn: (io: SocketIOServer, manager: RoomManager, room: GameRoom) => void
): void {
  if (room.clientsReady.size === 2) {
    startGameLoopFn(io, manager, room)
    return
  }

  const timeoutId = setTimeout(() => {
    startGameLoopFn(io, manager, room)
  }, CFG.CLIENT_READY_TIMEOUT_MS)

  room.trackTimeout(timeoutId)
}

export async function createMatch(
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
  gameDuration: number,
  ensurePriceFeedConnectedFn: (io: SocketIOServer, manager: RoomManager) => void,
  startGameWhenClientsReadyFn: (io: SocketIOServer, manager: RoomManager, room: GameRoom) => void
): Promise<void> {
  ensurePriceFeedConnectedFn(io, manager)

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
        dollars: CFG.STARTING_BALANCE,
        score: 0,
        sceneWidth: sceneWidth1,
        sceneHeight: sceneHeight1,
        leverage: leverage1,
      },
      {
        id: playerId2,
        name: name2,
        dollars: CFG.STARTING_BALANCE,
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

  startGameWhenClientsReadyFn(io, manager, room)
}
