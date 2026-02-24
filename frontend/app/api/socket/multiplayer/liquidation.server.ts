import { Server as SocketIOServer } from 'socket.io'
import { SERVER_GAME_CONFIG as CFG } from './game.config'
import { GameRoom } from './room.manager'
import type { OpenPosition, LiquidationEvent } from './events.types'

export function checkLiquidations(
  io: SocketIOServer,
  manager: { getAllRooms: () => GameRoom[] },
  currentPrice: number
): void {
  for (const room of manager.getAllRooms()) {
    if (room.getIsClosing() || room.isShutdown) continue

    for (const [, position] of room.openPositions) {
      if (shouldLiquidate(position, currentPrice)) {
        liquidatePosition(io, room, position, currentPrice)
      }
    }
  }
}

export function liquidatePosition(
  io: SocketIOServer,
  room: GameRoom,
  position: OpenPosition,
  currentPrice: number
): void {
  const { pnl, isProfitable } = calculatePositionPnl(position, currentPrice)
  const healthRatio = calculateCollateralHealthRatio(position, currentPrice)

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

  room.removeOpenPosition(position.id)

  io.to(room.id).emit('position_liquidated', liquidationEvent)

  console.log(
    `[Liquidation] Position ${position.id} liquidated for player ${position.playerName} ` +
      `at health ratio ${(healthRatio * 100).toFixed(1)}% ` +
      `(PnL: $${pnl.toFixed(4)}, Price: $${currentPrice.toFixed(2)})`
  )
}

export function calculatePositionPnl(
  position: OpenPosition,
  closePrice: number
): { pnl: number; isProfitable: boolean } {
  const priceChange = (closePrice - position.priceAtOrder) / position.priceAtOrder
  const isLong = position.coinType === 'long'

  const directionMultiplier = isLong ? 1 : -1
  const pnl = position.collateral * position.leverage * priceChange * directionMultiplier
  const isProfitable = pnl > 0

  return { pnl, isProfitable }
}

export function calculateCollateralHealthRatio(
  position: OpenPosition,
  currentPrice: number
): number {
  const { pnl } = calculatePositionPnl(position, currentPrice)
  const netCollateral = position.collateral

  return (netCollateral + pnl) / netCollateral
}

export function shouldLiquidate(position: OpenPosition, currentPrice: number): boolean {
  const healthRatio = calculateCollateralHealthRatio(position, currentPrice)
  return healthRatio <= CFG.LIQUIDATION_THRESHOLD
}
