'use client'

import React, { useEffect } from 'react'
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
    <div className="hyper-duration" role="group" aria-label="Round length">
      {TIME_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => !disabled && onDurationChange(option.value)}
          disabled={disabled}
          aria-pressed={selectedDuration === option.value}
          title={`${option.description} - ${option.label}`}
        >
          <strong>{option.label}</strong>
          <small>{option.description}</small>
        </button>
      ))}
    </div>
  )
})
