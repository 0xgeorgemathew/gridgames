export type PositionOpeningLimitReason =
  | 'player_balance'
  | 'opponent_funding'
  | 'risk_reserve'

export interface PositionOpeningSnapshot {
  playerBalance: number
  opponentBalance: number
  playerOpenPositions: number
  opponentOpenPositions: number
  stakeAmount: number
}

export interface PositionOpeningCapacity extends PositionOpeningSnapshot {
  maxOpenPositions: number
  remainingOpenSlots: number
  playerBalanceCapacity: number
  opponentFundingCapacity: number
  riskReserveCapacity: number
  limitingReason: PositionOpeningLimitReason
  canOpen: boolean
}

export function getPositionOpeningCapacity(
  snapshot: PositionOpeningSnapshot
): PositionOpeningCapacity {
  const {
    playerBalance,
    opponentBalance,
    playerOpenPositions,
    opponentOpenPositions,
    stakeAmount,
  } = snapshot

  if (stakeAmount <= 0) {
    return {
      ...snapshot,
      maxOpenPositions: 0,
      remainingOpenSlots: 0,
      playerBalanceCapacity: 0,
      opponentFundingCapacity: 0,
      riskReserveCapacity: 0,
      limitingReason: 'player_balance',
      canOpen: false,
    }
  }

  const playerBalanceCapacity = Math.max(0, Math.floor(playerBalance / stakeAmount))
  const opponentFundingCapacity = Math.max(0, Math.floor(opponentBalance / stakeAmount))
  const riskReserveCapacity = Math.max(0, playerBalanceCapacity - opponentOpenPositions)

  const capacities: Array<[PositionOpeningLimitReason, number]> = [
    ['player_balance', playerBalanceCapacity],
    ['opponent_funding', opponentFundingCapacity],
    ['risk_reserve', riskReserveCapacity],
  ]

  let limitingReason: PositionOpeningLimitReason = 'player_balance'
  let maxOpenPositions = capacities[0][1]

  for (const [reason, capacity] of capacities) {
    if (capacity < maxOpenPositions) {
      maxOpenPositions = capacity
      limitingReason = reason
    }
  }

  const remainingOpenSlots = Math.max(0, maxOpenPositions - playerOpenPositions)

  return {
    ...snapshot,
    maxOpenPositions,
    remainingOpenSlots,
    playerBalanceCapacity,
    opponentFundingCapacity,
    riskReserveCapacity,
    limitingReason,
    canOpen: playerOpenPositions < maxOpenPositions,
  }
}

export function getPositionOpeningLimitMessage(capacity: PositionOpeningCapacity): string {
  switch (capacity.limitingReason) {
    case 'player_balance':
      if (capacity.playerBalance <= 0) {
        return 'No balance left to open another position'
      }

      return `Position limit reached: your $${capacity.playerBalance} balance only supports ${capacity.maxOpenPositions} active position${capacity.maxOpenPositions === 1 ? '' : 's'}`

    case 'opponent_funding':
      return `Position limit reached: opponent can only fund ${capacity.opponentFundingCapacity} active position${capacity.opponentFundingCapacity === 1 ? '' : 's'}`

    case 'risk_reserve':
      if (capacity.riskReserveCapacity === 0) {
        return "No slot left after reserving for the opponent's active positions"
      }

      return `Position limit reached: worst-case reserve leaves room for ${capacity.riskReserveCapacity} active position${capacity.riskReserveCapacity === 1 ? '' : 's'}`
  }
}
