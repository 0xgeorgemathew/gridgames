// =============================================================================
// SHARED UI SHELLS
// Reusable UI components with game-specific slots
// =============================================================================

'use client'

import React, { ReactNode } from 'react'

// =============================================================================
// MATCHMAKING SCREEN SHELL
// =============================================================================

export interface MatchmakingShellProps {
  /** Game name to display */
  gameName: string
  /** Game icon */
  gameIcon?: string
  /** Loading state */
  isLoading?: boolean
  /** Connection status */
  isConnected?: boolean
  /** Player name input */
  playerName: string
  onPlayerNameChange: (name: string) => void
  /** Find match action */
  onFindMatch: () => void
  /** Cancel matchmaking */
  onCancel?: () => void
  /** Game-specific settings slot */
  settingsSlot?: ReactNode
  /** Additional info slot */
  infoSlot?: ReactNode
  /** Custom className */
  className?: string
}

/**
 * Shared matchmaking screen shell
 * Games provide their own settings via slots
 */
export function MatchmakingShell({
  gameName,
  gameIcon,
  isLoading = false,
  isConnected = false,
  playerName,
  onPlayerNameChange,
  onFindMatch,
  onCancel,
  settingsSlot,
  infoSlot,
  className = '',
}: MatchmakingShellProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 ${className}`}>
      {/* Header */}
      <div className="mb-8 text-center">
        {gameIcon && <img src={gameIcon} alt={gameName} className="w-16 h-16 mx-auto mb-4" />}
        <h1 className="text-3xl font-bold text-white">{gameName}</h1>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="mb-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-400 text-sm">Connecting to server...</p>
        </div>
      )}

      {/* Player Name Input */}
      <div className="w-full max-w-md mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Player Name</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          disabled={isLoading}
        />
      </div>

      {/* Game-Specific Settings Slot */}
      {settingsSlot && <div className="w-full max-w-md mb-6">{settingsSlot}</div>}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onFindMatch}
          disabled={!playerName || !isConnected || isLoading}
          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Finding Match...' : 'Find Match'}
        </button>
        {onCancel && isLoading && (
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Info Slot */}
      {infoSlot && <div className="mt-8 w-full max-w-md">{infoSlot}</div>}
    </div>
  )
}

// =============================================================================
// GAME HUD SHELL
// =============================================================================

export interface GameHUDShellProps {
  /** Player info */
  players: Array<{
    id: string
    name: string
    score?: number
    isLocal?: boolean
  }>
  /** Timer info */
  timer?: {
    remaining: number
    total: number
  }
  /** Price info */
  price?: {
    current: number
    change: number
    changePercent: number
  }
  /** Game-specific HUD content slot */
  contentSlot?: ReactNode
  /** Game-specific controls slot */
  controlsSlot?: ReactNode
  /** Custom className */
  className?: string
}

/**
 * Shared HUD shell for in-game UI
 * Games provide their own content via slots
 */
export function GameHUDShell({
  players,
  timer,
  price,
  contentSlot,
  controlsSlot,
  className = '',
}: GameHUDShellProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    })
  }

  return (
    <div className={`absolute top-0 left-0 right-0 z-10 ${className}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        {/* Player 1 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center">
            <span className="text-white font-bold">
              {players[0]?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <p className="text-white font-medium">{players[0]?.name}</p>
            {players[0]?.score !== undefined && (
              <p className="text-cyan-400 text-sm">Score: {players[0].score}</p>
            )}
          </div>
        </div>

        {/* Timer */}
        {timer && (
          <div className="text-center">
            <p className="text-3xl font-mono text-white">{formatTime(timer.remaining)}</p>
            <div className="w-32 h-1 bg-gray-700 rounded-full mt-1">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${(timer.remaining / timer.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Player 2 */}
        {players[1] && (
          <div className="flex items-center gap-3">
            <div>
              <p className="text-white font-medium text-right">{players[1].name}</p>
              {players[1].score !== undefined && (
                <p className="text-cyan-400 text-sm text-right">Score: {players[1].score}</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">
                {players[1].name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Price Display */}
      {price && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/60 rounded-lg">
          <p className="text-white text-lg font-mono">
            {formatPrice(price.current)}
            <span
              className={`ml-2 text-sm ${price.change >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {price.change >= 0 ? '+' : ''}
              {price.changePercent.toFixed(2)}%
            </span>
          </p>
        </div>
      )}

      {/* Game-Specific Content Slot */}
      {contentSlot}

      {/* Game-Specific Controls Slot */}
      {controlsSlot && <div className="absolute bottom-0 left-0 right-0 p-4">{controlsSlot}</div>}
    </div>
  )
}

// =============================================================================
// GAME OVER MODAL SHELL
// =============================================================================

export interface GameOverShellProps {
  /** Winner info */
  winner?: {
    id: string
    name: string
  } | null
  /** Is local player the winner */
  isWinner?: boolean
  /** Is draw */
  isDraw?: boolean
  /** End reason */
  reason?: 'time_limit' | 'knockout' | 'forfeit' | 'draw'
  /** Player results */
  results?: Array<{
    id: string
    name: string
    result: 'win' | 'loss' | 'draw'
    score?: number
  }>
  /** Play again action */
  onPlayAgain?: () => void
  /** Exit action */
  onExit: () => void
  /** Game-specific stats slot */
  statsSlot?: ReactNode
  /** Custom className */
  className?: string
}

/**
 * Shared game over modal shell
 * Games provide their own stats via slots
 */
export function GameOverShell({
  winner,
  isWinner = false,
  isDraw = false,
  reason,
  results,
  onPlayAgain,
  onExit,
  statsSlot,
  className = '',
}: GameOverShellProps) {
  const getTitle = () => {
    if (isDraw) return "It's a Draw!"
    if (isWinner) return 'Victory!'
    return 'Defeat'
  }

  const getTitleColor = () => {
    if (isDraw) return 'text-yellow-400'
    if (isWinner) return 'text-green-400'
    return 'text-red-400'
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 ${className}`}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4">
        {/* Title */}
        <h2 className={`text-4xl font-bold text-center mb-4 ${getTitleColor()}`}>{getTitle()}</h2>

        {/* Winner Name */}
        {winner && !isDraw && (
          <p className="text-xl text-center text-gray-300 mb-6">{winner.name} wins!</p>
        )}

        {/* Reason */}
        {reason && (
          <p className="text-sm text-center text-gray-500 mb-4">
            {reason === 'time_limit' && 'Time ran out'}
            {reason === 'knockout' && 'Knockout'}
            {reason === 'forfeit' && 'Opponent forfeited'}
            {reason === 'draw' && 'Scores were equal'}
          </p>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <div className="mb-6 space-y-2">
            {results.map((result, index) => (
              <div
                key={result.id}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  result.result === 'win'
                    ? 'bg-green-900/30'
                    : result.result === 'loss'
                      ? 'bg-red-900/30'
                      : 'bg-gray-800'
                }`}
              >
                <span className="text-white">{result.name}</span>
                <span
                  className={`font-medium ${
                    result.result === 'win'
                      ? 'text-green-400'
                      : result.result === 'loss'
                        ? 'text-red-400'
                        : 'text-gray-400'
                  }`}
                >
                  {result.result.toUpperCase()}
                  {result.score !== undefined && ` - ${result.score}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Game-Specific Stats Slot */}
        {statsSlot && <div className="mb-6">{statsSlot}</div>}

        {/* Actions */}
        <div className="flex gap-4">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
            >
              Play Again
            </button>
          )}
          <button
            onClick={onExit}
            className={`${onPlayAgain ? 'flex-1' : 'w-full'} px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors`}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// SETTINGS CONTROL SHELL
// =============================================================================

export interface SettingsShellProps {
  /** Sound toggle */
  soundEnabled?: boolean
  onSoundToggle?: (enabled: boolean) => void
  /** Duration selector */
  durationOptions?: number[]
  selectedDuration?: number
  onDurationChange?: (duration: number) => void
  /** Game-specific settings slot */
  settingsSlot?: ReactNode
  /** Custom className */
  className?: string
}

/**
 * Shared settings controls shell
 */
export function SettingsShell({
  soundEnabled = true,
  onSoundToggle,
  durationOptions,
  selectedDuration,
  onDurationChange,
  settingsSlot,
  className = '',
}: SettingsShellProps) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    return `${minutes} min`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sound Toggle */}
      {onSoundToggle && (
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Sound</span>
          <button
            onClick={() => onSoundToggle(!soundEnabled)}
            className={`w-12 h-6 rounded-full transition-colors ${
              soundEnabled ? 'bg-cyan-600' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* Duration Selector */}
      {durationOptions && durationOptions.length > 0 && onDurationChange && (
        <div>
          <span className="block text-gray-300 mb-2">Game Duration</span>
          <div className="flex gap-2">
            {durationOptions.map((duration) => (
              <button
                key={duration}
                onClick={() => onDurationChange(duration)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedDuration === duration
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {formatDuration(duration)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game-Specific Settings Slot */}
      {settingsSlot}
    </div>
  )
}
