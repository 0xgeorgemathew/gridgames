import type { Player } from '@/game/types/trading'

// Crypto symbol type
export type CryptoSymbol = 'btcusdt'

// Player color options
export type PlayerColor = 'green' | 'red'

// Player label type
export type PlayerLabel = 'YOU' | 'OPP'

// Player slot interface
export interface PlayerSlot {
  player: Player | undefined
  label: PlayerLabel
}

// Animation variants for Framer Motion
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
}

export const itemVariants = {
  hidden: { y: -20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

// Crypto symbols mapping
export const CRYPTO_SYMBOLS: Record<CryptoSymbol, string> = {
  btcusdt: 'BTC',
} as const

// Helper function to format time
export function formatTime(seconds: number): string {
  return seconds.toString()
}

// Helper function to get price color
export function getPriceColor(changePercent: number): { color: string; glow: string } {
  const isPositive = changePercent >= 0
  return {
    color: isPositive ? 'text-tron-cyan' : 'text-tron-orange',
    glow: isPositive
      ? '0 0 10px rgba(0, 243, 255, 0.8), 0 0 20px rgba(0, 243, 255, 0.4)'
      : '0 0 10px rgba(255, 107, 0, 0.8), 0 0 20px rgba(255, 107, 0, 0.4)',
  }
}

// Helper function to get player slots
export function getPlayerSlots(localPlayer: Player | null, opponent: Player | null): PlayerSlot[] {
  return [
    { player: opponent ?? undefined, label: 'OPP' as const },
    { player: localPlayer ?? undefined, label: 'YOU' as const },
  ]
}
