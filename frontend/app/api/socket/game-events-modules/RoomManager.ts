import { Server as SocketIOServer } from 'socket.io'
import { GameRoom } from './GameRoom'
import type { WaitingPlayer } from './types'

/**
 * RoomManager - Manages all rooms and waiting players.
 *
 * Centralized room and player management with cleanup.
 * Handles matchmaking pool and player-to-room lookups.
 */
export class RoomManager {
  private rooms = new Map<string, GameRoom>()
  private waitingPlayers = new Map<string, WaitingPlayer>()
  private playerToRoom = new Map<string, string>()

  // Room operations
  createRoom(roomId: string): GameRoom {
    const room = new GameRoom(roomId)
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

  // Player-to-room lookup
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

  // Waiting players
  addWaitingPlayer(socketId: string, name: string, leverage: number = 2): void {
    const existing = this.waitingPlayers.get(socketId)
    if (existing) {
      existing.name = name
      existing.leverage = leverage
    } else {
      this.waitingPlayers.set(socketId, {
        name,
        socketId,
        joinedAt: Date.now(),
        leverage,
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

  // Cleanup stale waiting players (older than 30s)
  cleanupStaleWaitingPlayers(): void {
    const now = Date.now()
    for (const [id, player] of this.waitingPlayers) {
      if (now - player.joinedAt > 30000) {
        this.waitingPlayers.delete(id)
      }
    }
  }

  // Emergency shutdown - settles all pending orders and clears all state
  emergencyShutdown(
    io: SocketIOServer,
    settlePositionsFn: (io: SocketIOServer, room: GameRoom) => void
  ): void {
    for (const [roomId, room] of this.rooms) {
      room.isShutdown = true

      // Settle all open positions at emergency shutdown
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
