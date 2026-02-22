'use client'

import React, { useEffect } from 'react'
import { m } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Time options for game duration (in milliseconds)
 */
const TIME_OPTIONS = [
  { value: 60000, label: '1 MIN', description: 'Quick' },
  { value: 120000, label: '2 MIN', description: 'Standard' },
  { value: 180000, label: '3 MIN', description: 'Extended' },
] as const

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
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="glass-panel-vibrant rounded-sm p-3 border border-tron-cyan/30 w-full mb-2 mt-2">
        {/* Header */}
        <div className="text-center mb-3">
          <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan/80 text-[10px] tracking-[0.3em] font-medium drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
            GAME SETTINGS
          </p>
        </div>

        {/* Duration Selection */}
        <div>
          <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan/60 text-[9px] tracking-[0.3em] mb-4 text-center">
            DURATION
          </p>
          <div className="flex items-center justify-center gap-2">
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
                    'relative px-3 py-2 rounded-sm font-[family-name:var(--font-orbitron)] font-medium text-xs tracking-[0.2em]',
                    'border transition-all duration-300',
                    'flex items-center justify-center hologram',
                    'min-w-[70px] min-h-[36px] overflow-hidden group',
                    isSelected
                      ? 'text-tron-cyan bg-tron-cyan/20 border-tron-cyan shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                      : 'text-tron-cyan/40 bg-tron-black/60 border-tron-cyan/20 hover:border-tron-cyan/50 hover:text-tron-cyan/80 hover:bg-tron-cyan/10',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{
                    boxShadow: isSelected ? '0 0 15px rgba(0, 243, 255, 0.3)' : 'none',
                  }}
                  title={`${option.description} - ${option.label}`}
                >
                  {isSelected && (
                    <m.div
                      className="absolute inset-0 rounded-sm"
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)',
                      }}
                    />
                  )}
                  <span className="relative z-10">{option.label}</span>
                </m.button>
              )
            })}
          </div>
        </div>
      </div>
    </m.div>
  )
})
