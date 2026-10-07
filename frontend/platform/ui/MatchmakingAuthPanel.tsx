'use client'

import type React from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { ActionButton } from './ActionButton'
import { PlayerName } from './PlayerName'
import { cn } from '@/platform/utils/classNames.utils'

interface MatchmakingAuthPanelProps {
  matchState: 'login' | 'ready' | 'lobby' | 'entering'
  isInMiniApp: boolean
  isConnected: boolean
  isMatching: boolean
  isRefreshingLobby: boolean
  selectedGameDuration: number
  settings: React.ReactNode
  lobbyPlayers: Array<{ socketId: string; name: string; gameDuration: number }>
  onEnter: () => void
  onOpenLobby: () => void
  onBackFromLobby: () => void
  onRefreshLobby: () => void
  onSelectOpponent: (opponentSocketId: string) => void
}

export function MatchmakingAuthPanel({
  matchState,
  isInMiniApp,
  isConnected,
  isMatching,
  isRefreshingLobby,
  selectedGameDuration,
  settings,
  lobbyPlayers,
  onEnter,
  onOpenLobby,
  onBackFromLobby,
  onRefreshLobby,
  onSelectOpponent,
}: MatchmakingAuthPanelProps) {
  const formatDuration = (ms: number) => `${ms / 60000}MIN`

  return (
    <div className="flex flex-col items-center">
      <div className="min-h-[200px] w-full max-w-md">
        {matchState === 'login' && (
          <div key="login" className="flex flex-col items-center gap-4">
            <m.p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan/80 text-sm tracking-[0.2em]"
              style={{ opacity: 1, textShadow: '0 0 20px rgba(0, 243, 255, 0.6)' }}
            >
              {isInMiniApp ? 'CONNECTING TO GRID...' : 'VERIFYING CREDENTIALS...'}
            </m.p>
          </div>
        )}

        {matchState === 'ready' && (
          <m.div
            key="ready"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan text-xs tracking-[0.2em]"
              style={{ textShadow: '0 0 15px rgba(0, 243, 255, 0.6)' }}
            >
              {isConnected ? 'GRID CONNECTED' : 'CONNECTING TO GRID…'}
            </p>

            <div className="flex flex-col gap-2 w-full min-w-[200px]">
              <ActionButton onClick={onEnter} disabled={!isConnected || isMatching} color="cyan">
                {isMatching ? 'ENTERING...' : 'AUTO-MATCH'}
              </ActionButton>
              <ActionButton
                onClick={onOpenLobby}
                disabled={!isConnected || isMatching}
                color="cyan"
              >
                SELECT OPPONENT
              </ActionButton>
            </div>
            {settings}
          </m.div>
        )}

        {matchState === 'entering' && (
          <div key="entering" className="flex flex-col items-center gap-3">
            <m.p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan text-xs tracking-[0.2em]"
              style={{ opacity: 1, textShadow: '0 0 25px rgba(0, 243, 255, 0.8)' }}
            >
              WAITING FOR PLAYER 2
            </m.p>
            {/* Loading dots animation */}
            <div className="flex gap-2">
              {[1, 2, 3].map((dotId) => (
                <m.div
                  key={dotId}
                  className="w-2 h-2 bg-tron-cyan rounded-full"
                  style={{ boxShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}
                />
              ))}
            </div>
          </div>
        )}

        {matchState === 'lobby' && (
          <m.div
            key="lobby"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-md"
          >
            <button
              onClick={onBackFromLobby}
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan/60 hover:text-tron-cyan transition-colors text-xs tracking-[0.2em] mb-2"
              style={{ textShadow: '0 0 8px rgba(0, 243, 255, 0.3)' }}
            >
              ← BACK
            </button>

            <p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan/80 text-[10px] tracking-[0.3em]"
              style={{ textShadow: '0 0 15px rgba(0, 243, 255, 0.5)' }}
            >
              PLAYERS IN THIS GAME
            </p>

            {lobbyPlayers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <p
                  className="font-[family-name:var(--font-orbitron)] text-tron-cyan/50 text-xs tracking-[0.1em]"
                  style={{ textShadow: '0 0 8px rgba(0, 243, 255, 0.2)' }}
                >
                  NO PLAYERS WAITING — TRY AUTO-MATCH
                </p>
                <div className="w-16 h-[1px] bg-tron-cyan/20" />
                <p className="text-[10px] text-white/30 tracking-widest">NO PLAYERS DETECTED</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <AnimatePresence mode="popLayout">
                  {lobbyPlayers.map((player) => {
                    const hasMatchingSettings = player.gameDuration === selectedGameDuration

                    return (
                      <m.button
                        key={player.socketId}
                        onClick={() => onSelectOpponent(player.socketId)}
                        disabled={isMatching}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'relative px-4 py-3 bg-tron-black/80 border rounded-sm overflow-hidden min-w-[200px] group transition-all duration-300',
                          hasMatchingSettings
                            ? 'border-tron-cyan/50 hover:border-tron-cyan hover:bg-tron-cyan/10'
                            : 'border-tron-cyan/20 hover:border-tron-cyan/40 opacity-70'
                        )}
                      >
                        {/* Corner accents */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />

                        {/* Grid background */}
                        <div className="absolute inset-0 opacity-[0.04] tron-grid pointer-events-none" />

                        {/* Hover glow */}
                        <m.div
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          animate={{
                            boxShadow: hasMatchingSettings
                              ? '0 0 20px rgba(0, 243, 255, 0.2)'
                              : '0 0 10px rgba(0, 243, 255, 0.1)',
                          }}
                        />

                        <div className="relative z-10 flex flex-col items-center gap-1">
                          <PlayerName
                            username={player.name}
                            className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.1em] text-tron-cyan group-hover:text-white transition-colors"
                            enableGlow={false}
                          />
                          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] font-mono">
                            <span
                              className={
                                hasMatchingSettings ? 'text-tron-cyan' : 'text-tron-cyan/50'
                              }
                              style={{
                                textShadow: hasMatchingSettings
                                  ? '0 0 8px rgba(0, 243, 255, 0.4)'
                                  : 'none',
                              }}
                            >
                              {formatDuration(player.gameDuration)}
                            </span>
                          </div>
                        </div>
                      </m.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}

            <ActionButton
              onClick={onRefreshLobby}
              isLoading={isRefreshingLobby}
              disabled={isMatching}
              color="cyan"
            >
              REFRESH
            </ActionButton>
          </m.div>
        )}
      </div>
    </div>
  )
}
