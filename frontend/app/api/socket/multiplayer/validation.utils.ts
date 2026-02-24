export function validatePlayerName(name: unknown): string {
  if (typeof name !== 'string' || name.length < 1) {
    throw new Error('Invalid player name')
  }
  return name.replace(/[^a-zA-Z0-9_.-]/g, '')
}

export function validateCoinType(coinType: string): coinType is 'long' | 'short' {
  return coinType === 'long' || coinType === 'short'
}
