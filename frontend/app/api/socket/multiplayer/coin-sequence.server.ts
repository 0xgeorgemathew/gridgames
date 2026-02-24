import { SeededRandom } from './seeded-random.utils'

export class CoinSequence {
  private sequence: Array<{
    type: 'long' | 'short'
    xNormalized: number
    velocityX: number
    velocityY: number
  }> = []
  private index = 0

  constructor(durationMs: number, minIntervalMs: number, maxIntervalMs: number, seed: number) {
    const rng = new SeededRandom(seed)
    const types: Array<'long' | 'short'> = ['long', 'long', 'short', 'short']

    const estimatedSpawns = Math.ceil(durationMs / minIntervalMs) + 10
    for (let i = 0; i < estimatedSpawns; i++) {
      const xNormalized = 0.15 + rng.next() * 0.7
      const baseVelocityX = (0.5 - xNormalized) * 100
      const randomDrift = rng.nextInt(-20, 20)
      let velocityX = Math.round(baseVelocityX + randomDrift)
      if (xNormalized < 0.5) {
        velocityX = Math.max(20, velocityX)
      } else {
        velocityX = Math.min(-20, velocityX)
      }
      this.sequence.push({
        type: types[rng.nextInt(0, types.length - 1)],
        xNormalized,
        velocityX,
        velocityY: rng.nextInt(-175, -140),
      })
    }
  }

  next(forceType?: 'long' | 'short'): {
    type: 'long' | 'short'
    xNormalized: number
    velocityX: number
    velocityY: number
  } | null {
    if (this.index >= this.sequence.length) return null
    const coin = { ...this.sequence[this.index++] }
    if (forceType) {
      coin.type = forceType
    }
    return coin
  }

  hasNext(): boolean {
    return this.index < this.sequence.length
  }

  getIndex(): number {
    return this.index
  }

  peek(): {
    type: 'long' | 'short'
    xNormalized: number
    velocityX: number
    velocityY: number
  } | null {
    if (this.index >= this.sequence.length) return null
    return this.sequence[this.index]
  }
}
