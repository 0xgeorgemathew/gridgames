'use client'

import React, { useEffect } from 'react'
import { m } from 'framer-motion'
import { cn } from '@/platform/utils/classNames.utils'
import { CLIENT_GAME_CONFIG as CFG } from '../../game.config'

const TIME_OPTIONS = CFG.DURATION_OPTIONS_MS.map((ms) => {
  const minutes = ms / 60000
  const labels: Record<number, { label: string; description: string }> = {
    1: { label: '1 MIN', description: 'Quick' },
    2: { label: '2 MIN', description: 'Standard' },
    3: { label: '3 MIN', description: 'Extended' },
  }
  return {
    value: ms,
    label: labels[minutes]?.label ?? `${minutes} MIN`,
    description: labels[minutes]?.description ?? '',
  }
})

interface GameSettingsSelectorProps {
  selectedDuration: number
  onDurationChange: (duration: number) => void
  disabled?: boolean
}

/**
 * GameSettingsSelector - Pre-game settings for matchmaking.
 *
 * Allows players to select game duration before entering the matchmaking queue.
 * Leverage is fixed at 500X for all players.
 * Settings are persisted to localStorage.
 */
export const GameSettingsSelector = React.memo(function GameSettingsSelector({
  selectedDuration,
  onDurationChange,
  disabled = false,
}: GameSettingsSelectorProps) {
  // Load saved settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDuration = localStorage.getItem('hyperSwiper_gameDuration')

      if (savedDuration) {
        const duration = parseInt(savedDuration, 10)
        if (TIME_OPTIONS.some((opt) => opt.value === duration)) {
          onDurationChange(duration)
        }
      }
    }
  }, [onDurationChange])

  return (
    <div className="flex items-center gap-2">
      {TIME_OPTIONS.map((option) => {
        const isSelected = selectedDuration === option.value

        return (
          <m.button
            key={option.value}
            onClick={() => !disabled && onDurationChange(option.value)}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            className={cn(
              'relative px-2 py-1 rounded-sm font-[family-name:var(--font-orbitron)] font-medium text-[10px] tracking-[0.15em]',
              'border transition-all duration-200',
              'flex items-center justify-center',
              isSelected
                ? 'text-tron-cyan bg-tron-cyan/20 border-tron-cyan/60 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                : 'text-tron-cyan/50 bg-tron-black/40 border-tron-cyan/20 hover:border-tron-cyan/40 hover:text-tron-cyan/70',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={`${option.description} - ${option.label}`}
          >
            <span className="relative z-10">{option.label}</span>
          </m.button>
        )
      })}
    </div>
  )
})
