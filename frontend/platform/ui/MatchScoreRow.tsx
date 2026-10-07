'use client'
import React from 'react'
import { cn } from '@/platform/utils/classNames.utils'
import { Clock } from 'lucide-react'
interface MatchScoreRowProps {
  variant?: 'default' | 'stock'
  gameTimeRemaining: number
  isGameReady: boolean
  playerBalance?: number
  opponentBalance?: number
  playerName?: string
  opponentName?: string
  compareValues?: boolean
  playerDetail?: string
  opponentDetail?: string
  timerLabel?: string
}
function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
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

export const MatchScoreRow = React.memo(function MatchScoreRow({
  variant = 'default',
  gameTimeRemaining,
  isGameReady,
  playerBalance,
  opponentBalance,
  playerName,
  opponentName,
  compareValues = true,
  playerDetail,
  opponentDetail,
  timerLabel,
}: MatchScoreRowProps) {
  const isLowTime = gameTimeRemaining <= 30000
  const isWinning =
    compareValues &&
    playerBalance !== undefined &&
    opponentBalance !== undefined &&
    playerBalance > opponentBalance
  const isTied =
    !compareValues ||
    (playerBalance !== undefined &&
      opponentBalance !== undefined &&
      playerBalance === opponentBalance)

  if (variant === 'stock')
    return (
      <div className="ninja-score-row">
        <div className="ninja-spend" title={playerName}>
          <span className="ninja-hud-caption">YOU</span>
          <strong>${playerBalance ?? 0}</strong>
          <small>{playerDetail}</small>
        </div>
        <div
          className={cn('ninja-timer', isLowTime && 'ninja-timer-low')}
          role="timer"
          aria-label="Match time remaining"
        >
          <Clock size={14} />
          <strong>{timerLabel ?? formatTime(gameTimeRemaining)}</strong>
          <small>SIMULATED</small>
        </div>
        <div className="ninja-spend" title={opponentName}>
          <span className="ninja-hud-caption ninja-player-name">
            {getDisplayName(opponentName, 14) || 'OPPONENT'}
          </span>
          <strong>${opponentBalance ?? 0}</strong>
          <small>{opponentDetail}</small>
        </div>
      </div>
    )

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-3">
      {/* Left: Your Balance */}
      {isGameReady && playerBalance !== undefined && (
        <div
          className={cn(
            'flex flex-col items-center px-3 py-1.5 rounded-sm transition-all duration-300',
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
              'text-base font-black font-numeric tabular-nums',
              isWinning ? 'text-tron-cyan' : 'text-tron-cyan/70'
            )}
            style={{
              textShadow: isWinning ? '0 0 10px rgba(0,243,255,0.6)' : 'none',
            }}
          >
            ${playerBalance.toLocaleString()}
          </span>
          {playerDetail && <span className="text-[9px] text-tron-cyan/60">{playerDetail}</span>}
        </div>
      )}

      {/* Center: Timer (Main Component) */}
      {isGameReady && (
        <div
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 rounded-sm border',
            isLowTime
              ? 'bg-tron-orange/10 border-tron-orange/60'
              : 'bg-tron-cyan/10 border-tron-cyan/50'
          )}
          style={{
            boxShadow: isLowTime ? '0 0 20px rgba(255,107,0,0.4)' : '0 0 20px rgba(0,243,255,0.3)',
          }}
        >
          <Clock
            className={cn('w-5 h-5', isLowTime ? 'text-tron-orange' : 'text-tron-cyan')}
            style={{
              filter: isLowTime
                ? 'drop-shadow(0 0 6px rgba(255,107,0,0.8))'
                : 'drop-shadow(0 0 6px rgba(0,243,255,0.8))',
            }}
          />
          <span
            className={cn(
              'text-xl font-black font-numeric tabular-nums tracking-wider',
              isLowTime ? 'text-tron-orange' : 'text-tron-cyan'
            )}
            style={{
              textShadow: isLowTime
                ? '0 0 15px rgba(255,107,0,0.9)'
                : '0 0 15px rgba(0,243,255,0.9)',
            }}
          >
            {timerLabel ?? formatTime(gameTimeRemaining)}
          </span>
        </div>
      )}

      {/* Right: Opponent Balance */}
      {isGameReady && playerBalance !== undefined && (
        <div
          className={cn(
            'flex flex-col items-center px-3 py-1.5 rounded-sm transition-all duration-300',
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
              'text-base font-black font-numeric tabular-nums',
              !isWinning && !isTied ? 'text-tron-orange' : 'text-tron-cyan/50'
            )}
            style={{
              textShadow: !isWinning && !isTied ? '0 0 10px rgba(255,107,0,0.6)' : 'none',
            }}
          >
            ${opponentBalance !== undefined ? opponentBalance.toLocaleString() : '---'}
          </span>
          {opponentDetail && (
            <span className="text-[9px] text-tron-orange/70">{opponentDetail}</span>
          )}
        </div>
      )}
    </div>
  )
})
