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

export const GameSettingsSelector = React.memo(function GameSettingsSelector({
  selectedDuration,
  onDurationChange,
  disabled = false,
}: GameSettingsSelectorProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDuration = localStorage.getItem('tapDancer_gameDuration')

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
            aria-pressed={isSelected}
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            className={cn(
              'arena-button relative px-4 py-3 font-mono font-medium text-xs tracking-[0.08em]',
              'border transition-all duration-200',
              'flex items-center justify-center',
              isSelected
                ? '!text-[#111217] !bg-[#ffc76a] !border-[#ffc76a]'
                : 'text-[#b4afa5] bg-[#1d1d23] border-[#46434a] hover:text-[#f7f0df]',
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
