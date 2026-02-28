import { Server as SocketIOServer } from 'socket.io'
import { GameRoom } from './room.manager'
import { SERVER_GAME_CONFIG as CFG } from './game.config'
import type { WaitingPlayer } from './events.types'

interface LastGameMeta {
  name: string
  walletAddress?: string
  sceneWidth: number
  sceneHeight: number
  leverage: number
  gameDuration: number
  opponentSocketId: string
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>()
  private waitingPlayers = new Map<string, WaitingPlayer>()
  private playerToRoom = new Map<string, string>()
  private lastGameMeta = new Map<string, LastGameMeta>()

  storeLastGameMeta(room: GameRoom): void {
    const ids = room.getPlayerIds()
    if (ids.length !== 2) return

    for (let i = 0; i < 2; i++) {
      const pid = ids[i]
      const opponent = ids[1 - i]
      const player = room.players.get(pid)
      if (!player) continue

      this.lastGameMeta.set(pid, {
        name: player.name,
        walletAddress: room.getWalletAddressPublic(pid),
        sceneWidth: player.sceneWidth,
        sceneHeight: player.sceneHeight,
        leverage: player.leverage,
        gameDuration: room.GAME_DURATION,
        opponentSocketId: opponent,
      })
    }
  }

  getLastGameMeta(socketId: string): LastGameMeta | undefined {
    return this.lastGameMeta.get(socketId)
  }

  clearLastGameMeta(socketId: string): void {
    this.lastGameMeta.delete(socketId)
  }

  createRoom(roomId: string, gameDuration: number = 60000): GameRoom {
    const room = new GameRoom(roomId, gameDuration)
    this.rooms.set(roomId, room)
    return room
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId)
  }

  getRoomCount(): number {
    return this.rooms.size
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values())
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.isShutdown = true

    for (const playerId of room.getPlayerIds()) {
      this.playerToRoom.delete(playerId)
    }

    room.cleanup()
    this.rooms.delete(roomId)
  }

  setPlayerRoom(playerId: string, roomId: string): void {
    this.playerToRoom.set(playerId, roomId)
  }

  getPlayerRoomId(playerId: string): string | undefined {
    return this.playerToRoom.get(playerId)
  }

  removePlayerFromRoom(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId)
    if (roomId) {
      const room = this.rooms.get(roomId)
      room?.removePlayer(playerId)
      if (room?.isEmpty()) {
        this.deleteRoom(roomId)
      }
    }
    this.playerToRoom.delete(playerId)
  }

  addWaitingPlayer(
    socketId: string,
    name: string,
    leverage: number = CFG.FIXED_LEVERAGE,
    gameDuration: number = 60000
  ): void {
    const existing = this.waitingPlayers.get(socketId)
    if (existing) {
      existing.name = name
      existing.leverage = leverage
      existing.gameDuration = gameDuration
    } else {
      this.waitingPlayers.set(socketId, {
        name,
        socketId,
        joinedAt: Date.now(),
        leverage,
        gameDuration,
      })
    }
  }

  getWaitingPlayer(socketId: string): WaitingPlayer | undefined {
    return this.waitingPlayers.get(socketId)
  }

  removeWaitingPlayer(socketId: string): void {
    this.waitingPlayers.delete(socketId)
  }

  getWaitingPlayers(): Map<string, WaitingPlayer> {
    return this.waitingPlayers
  }

  cleanupStaleWaitingPlayers(): void {
    const now = Date.now()
    for (const [id, player] of this.waitingPlayers) {
      if (now - player.joinedAt > CFG.STALE_PLAYER_TIMEOUT_MS) {
        this.waitingPlayers.delete(id)
      }
    }
  }

  emergencyShutdown(
    io: SocketIOServer,
    settlePositionsFn: (io: SocketIOServer, room: GameRoom) => void
  ): void {
    for (const [roomId, room] of this.rooms) {
      room.isShutdown = true

      if (room.openPositions.size > 0) {
        settlePositionsFn(io, room)
      }

      const winner = room.getWinner()
      io.to(roomId).emit('game_over', {
        winnerId: winner?.id,
        winnerName: winner?.name,
        reason: 'server_shutdown',
      })

      room.cleanup()
    }

    this.rooms.clear()
    this.waitingPlayers.clear()
    this.playerToRoom.clear()
  }
}
