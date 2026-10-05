'use client'

import React from 'react'
import { cn } from '@/platform/utils/classNames.utils'
import { Clock } from 'lucide-react'
import type { CryptoSymbol } from '@/domains/tap-dancer/client/state/trading.types'
import type { PriceData } from '@/domains/tap-dancer/shared/trading.types'
import { formatTime } from './types'

interface CompactPriceRowProps {
  priceData: PriceData | null
  selectedCrypto: CryptoSymbol
  isPriceConnected: boolean
  priceError: string | null
  gameTimeRemaining: number
  isSoundMuted: boolean
  onToggleSound: () => void
  onShowHowToPlay: () => void
  onEndGame: () => void
  isGameReady: boolean
  playerBalance?: number
  opponentBalance?: number
  playerName?: string
  opponentName?: string
}

function getDisplayName(name: string | undefined, maxLength: number = 8): string {
  if (!name) return 'YOU'
  if (name.toLowerCase().endsWith('.base.eth')) {
    const baseName = name.slice(0, -9)
    return baseName.length > maxLength ? baseName.slice(0, maxLength) : baseName
  }
  const firstName = name.split(' ')[0] || name
  return firstName.length > maxLength ? firstName.slice(0, maxLength) : firstName
}

export const CompactPriceRow = React.memo(function CompactPriceRow({
  gameTimeRemaining,
  isGameReady,
  playerBalance,
  opponentBalance,
  playerName,
  opponentName,
}: CompactPriceRowProps) {
  const isLowTime = gameTimeRemaining <= 30000
  const isWinning =
    playerBalance !== undefined && opponentBalance !== undefined && playerBalance > opponentBalance
  const isTied =
    playerBalance !== undefined &&
    opponentBalance !== undefined &&
    playerBalance === opponentBalance

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      {/* Left: Your Balance */}
      {isGameReady && playerBalance !== undefined && (
        <div
          className={cn(
            'flex flex-col items-center px-3 py-1.5 rounded-lg transition-all duration-300',
            isWinning
              ? 'bg-tron-cyan/10 border border-tron-cyan/40'
              : 'bg-tron-black/50 border border-tron-cyan/20'
          )}
          style={{
            boxShadow: isWinning ? '0 0 12px rgba(0,243,255,0.3)' : 'none',
          }}
        >
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider font-bold',
              isWinning ? 'text-tron-cyan' : 'text-tron-cyan/60'
            )}
            style={{
              textShadow: isWinning ? '0 0 8px rgba(0,243,255,0.6)' : 'none',
            }}
          >
            {getDisplayName(playerName)}
          </span>
          <span
            className={cn(
              'text-base font-black font-numeric',
              isWinning ? 'text-tron-cyan' : 'text-tron-cyan/70'
            )}
            style={{
              textShadow: isWinning ? '0 0 10px rgba(0,243,255,0.6)' : 'none',
            }}
          >
            ${playerBalance.toLocaleString()}
          </span>
        </div>
      )}

      {/* Center: Timer (Main Component) */}
      {isGameReady && (
        <div
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2',
            isLowTime ? 'bg-red-500/10 border-red-400/60' : 'bg-tron-cyan/10 border-tron-cyan/50'
          )}
          style={{
            boxShadow: isLowTime
              ? '0 0 20px rgba(248,113,113,0.4)'
              : '0 0 20px rgba(0,243,255,0.3)',
          }}
        >
          <Clock
            className={cn('w-5 h-5', isLowTime ? 'text-red-400' : 'text-tron-cyan')}
            style={{
              filter: isLowTime
                ? 'drop-shadow(0 0 6px rgba(248,113,113,0.8))'
                : 'drop-shadow(0 0 6px rgba(0,243,255,0.8))',
            }}
          />
          <span
            className={cn(
              'text-xl font-black font-numeric tracking-wider',
              isLowTime ? 'text-red-400' : 'text-tron-cyan'
            )}
            style={{
              textShadow: isLowTime
                ? '0 0 15px rgba(248,113,113,0.9)'
                : '0 0 15px rgba(0,243,255,0.9)',
            }}
          >
            {formatTime(gameTimeRemaining)}
          </span>
        </div>
      )}

      {/* Right: Opponent Balance */}
      {isGameReady && playerBalance !== undefined && (
        <div
          className={cn(
            'flex flex-col items-center px-3 py-1.5 rounded-lg transition-all duration-300',
            !isWinning && !isTied
              ? 'bg-tron-orange/10 border border-tron-orange/40'
              : 'bg-tron-black/50 border border-tron-cyan/20'
          )}
          style={{
            boxShadow: !isWinning && !isTied ? '0 0 12px rgba(255,107,0,0.3)' : 'none',
          }}
        >
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider font-bold',
              !isWinning && !isTied ? 'text-tron-orange' : 'text-tron-cyan/50'
            )}
            style={{
              textShadow: !isWinning && !isTied ? '0 0 8px rgba(255,107,0,0.6)' : 'none',
            }}
          >
            {getDisplayName(opponentName, 8) || 'OPP'}
          </span>
          <span
            className={cn(
              'text-base font-black font-numeric',
              !isWinning && !isTied ? 'text-tron-orange' : 'text-tron-cyan/50'
            )}
            style={{
              textShadow: !isWinning && !isTied ? '0 0 10px rgba(255,107,0,0.6)' : 'none',
            }}
          >
            ${opponentBalance !== undefined ? opponentBalance.toLocaleString() : '---'}
          </span>
        </div>
      )}
    </div>
  )
})
