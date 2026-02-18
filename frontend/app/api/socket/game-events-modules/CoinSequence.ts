import { SeededRandom } from './SeededRandom'

/**
 * CoinSequence - Pre-generated deterministic coin sequences for fair play.
 *
 * Both players see the same coin types in the same sequence.
 * Only screen positions differ based on device dimensions.
 */
export class CoinSequence {
  private sequence: Array<{ type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number }> = []
  private index = 0

  constructor(durationMs: number, minIntervalMs: number, maxIntervalMs: number, seed: number) {
    const rng = new SeededRandom(seed)
    const types: Array<'call' | 'put' | 'gas' | 'whale'> = [
      'call',
      'call',
      'put',
      'put',
      'gas',
      'whale',
    ]

    const estimatedSpawns = Math.ceil(durationMs / minIntervalMs) + 10 // Extra for burst spawns
    for (let i = 0; i < estimatedSpawns; i++) {
      this.sequence.push({
        type: types[rng.nextInt(0, types.length - 1)],
        xNormalized: 0.15 + rng.next() * 0.7, // 15%-85% screen width (avoid edges)
      })
    }
  }

  next(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    if (this.index >= this.sequence.length) return null
    return this.sequence[this.index++]
  }

  hasNext(): boolean {
    return this.index < this.sequence.length
  }

  peek(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    if (this.index >= this.sequence.length) return null
    return this.sequence[this.index]
  }
}
