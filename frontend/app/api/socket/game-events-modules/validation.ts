/**
 * Input validation functions for server-side event handling.
 */

export function validatePlayerName(name: unknown): string {
  if (typeof name !== 'string' || name.length < 1) {
    throw new Error('Invalid player name')
  }
  return name.replace(/[^a-zA-Z0-9_.-]/g, '')
}

export function validateCoinType(coinType: string): coinType is 'call' | 'put' {
  return coinType === 'call' || coinType === 'put'
}
