import { useState, type RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { Settings, LogOut, HelpCircle } from 'lucide-react'
import { ActionButton } from '@/platform/ui/ActionButton'
import { MatchmakingAuthPanel } from '@/platform/ui/MatchmakingAuthPanel'
import { MatchScoreRow } from '@/platform/ui/MatchScoreRow'
import { MatchResultOverlay } from '@/platform/ui/MatchResultOverlay'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { PlayerName } from '@/platform/ui/PlayerName'
import { cn } from '@/platform/utils/classNames.utils'
import { MATCH_BUDGET, type ArcadeState, type Bag } from '../shared/types'
import { stockAsset } from '../shared/assets'

export interface LobbyPlayer {
  socketId: string
  name: string
  gameDuration: number
}
export function StockMatchmakingScreen(props: {
  allowed: boolean
  connected: boolean
  waiting: boolean
  lobbyOpen: boolean
  refreshing: boolean
  playerName: string
  pfpUrl?: string | null
  isInMiniApp: boolean
  players: LobbyPlayer[]
  notice: string
  onLogin: () => void
  onEnter: () => void
  onOpenLobby: () => void
  onBackFromLobby: () => void
  onRefresh: () => void
  onSelect: (id: string) => void
  onCancel: () => void
  onHelp: () => void
}) {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-30 flex items-start justify-between px-4 pt-4 pointer-events-none">
        <Link
          to="/"
          className="pointer-events-auto px-4 py-2 font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/80 hover:text-tron-cyan transition-colors border border-tron-cyan/40 rounded-sm bg-tron-black/80 backdrop-blur-md relative overflow-hidden group"
        >
          <Corners /> <span style={{ textShadow: '0 0 10px rgba(0,243,255,0.3)' }}>← BACK</span>
        </Link>
        {props.allowed && (
          <div className="pointer-events-auto glass-panel-vibrant px-3 py-2 border border-tron-cyan/30 rounded-sm bg-tron-black/80 backdrop-blur-md relative overflow-hidden">
            <Corners />
            <div className="absolute inset-0 opacity-[0.04] tron-grid pointer-events-none" />
            <UserProfileBadge
              displayName={props.playerName}
              pfpUrl={props.pfpUrl}
              compact
              animateIdle={false}
            />
          </div>
        )}
      </div>
      <div className="relative z-20 flex min-h-[100dvh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 mt-16 py-12 w-full max-w-[400px]">
          <div className="text-center relative">
            <h1
              className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-[0.3em] text-white/90 mb-1"
              style={{ textShadow: '0 0 20px rgba(255,255,255,0.2)' }}
            >
              ENTER THE GRID
            </h1>
            <div className="relative inline-block mb-4">
              <div
                className="absolute -inset-4 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center,rgba(0,243,255,0.15) 0%,transparent 70%)',
                }}
              />
              <h2
                className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.3em] text-tron-cyan relative"
                style={{ textShadow: '0 0 40px rgba(0,243,255,0.8)' }}
              >
                STOCK NINJA
              </h2>
              <div
                className="absolute -bottom-2 left-0 right-0 h-[2px] bg-tron-cyan/60 mx-auto w-3/4"
                style={{ boxShadow: '0 0 20px rgba(0,243,255,0.5)' }}
              />
            </div>
          </div>
          {props.allowed ? (
            <MatchmakingAuthPanel
              matchState={props.waiting ? 'entering' : props.lobbyOpen ? 'lobby' : 'ready'}
              isInMiniApp={props.isInMiniApp}
              isConnected={props.connected}
              isMatching={props.waiting}
              isRefreshingLobby={props.refreshing}
              selectedGameDuration={60000}
              lobbyPlayers={props.players}
              onEnter={props.onEnter}
              onOpenLobby={props.onOpenLobby}
              onBackFromLobby={props.onBackFromLobby}
              onRefreshLobby={props.onRefresh}
              onSelectOpponent={props.onSelect}
              settings={
                <span className="px-2 py-1 rounded-sm font-[family-name:var(--font-orbitron)] text-[10px] tracking-[0.15em] text-tron-cyan bg-tron-cyan/20 border border-tron-cyan/60 shadow-[0_0_8px_rgba(0,243,255,0.3)]">
                  1 MIN
                </span>
              }
            />
          ) : (
            <div className="flex flex-col items-center min-h-[200px] gap-3">
              <ActionButton color="cyan" onClick={props.onLogin}>
                LOGIN WITH GOOGLE
              </ActionButton>
            </div>
          )}
          {props.waiting && (
            <ActionButton color="cyan" size="sm" onClick={props.onCancel}>
              CANCEL SEARCH
            </ActionButton>
          )}
          {props.notice && (
            <p
              role="status"
              aria-live="polite"
              className="text-center text-[10px] text-tron-white-dim/70 max-w-xs"
            >
              {props.notice}
            </p>
          )}
          <button
            onClick={props.onHelp}
            className="min-h-11 font-[family-name:var(--font-orbitron)] text-[10px] tracking-[0.2em] text-tron-cyan/60 hover:text-tron-cyan"
          >
            HOW TO PLAY
          </button>
        </div>
      </div>
      <p className="absolute bottom-2 inset-x-0 text-center text-[9px] text-tron-cyan/40 font-mono px-4">
        LIVE QUOTES · SIMULATED FILLS · NO REAL FUNDS
      </p>
    </>
  )
}
function Corners() {
  return (
    <>
      {[
        'top-0 left-0 border-t border-l',
        'top-0 right-0 border-t border-r',
        'bottom-0 left-0 border-b border-l',
        'bottom-0 right-0 border-b border-r',
      ].map((c) => (
        <span key={c} className={`absolute w-2 h-2 border-tron-cyan/50 ${c}`} />
      ))}
    </>
  )
}
export function StockHUD({
  game,
  self,
  other,
  remaining,
  notice,
  dockRef,
  onExit,
  onHelp,
}: {
  game: ArcadeState
  self?: Bag
  other?: Bag
  remaining: number
  notice: string
  dockRef: RefObject<HTMLDivElement | null>
  onExit: () => void
  onHelp: () => void
}) {
  const [menu, setMenu] = useState(false)
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-30 pt-safe">
        <div className="flex justify-center pt-3 relative">
          <div className="flex items-center gap-2 px-4 py-2 bg-tron-black/90 backdrop-blur-md border border-tron-cyan/30 rounded-full pr-12 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <span className="text-[10px] text-tron-cyan/60 uppercase tracking-[0.2em] font-bold">
              CATCH
            </span>
            <span className="text-lg font-black font-numeric text-tron-cyan">$1</span>
            <span className="text-[10px] font-bold text-tron-cyan/70 bg-tron-cyan/10 px-2 py-0.5 rounded-full">
              SIMULATED
            </span>
          </div>
          <button
            onClick={() => setMenu(!menu)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-tron-black/80 border border-tron-cyan/30 rounded-full focus-visible:outline-2 focus-visible:outline-tron-cyan hover:bg-tron-cyan/10 z-20"
            aria-label="Game settings"
            aria-expanded={menu}
          >
            <Settings className="w-4 h-4 text-tron-cyan/70" />
          </button>
          {menu && (
            <>
              <button
                className="fixed inset-0 z-10"
                aria-label="Close settings"
                onClick={() => setMenu(false)}
              />
              <div className="absolute top-full right-2 mt-2 flex flex-col gap-1 bg-tron-black/95 border border-tron-cyan/30 rounded-lg overflow-hidden z-30 min-w-[120px]">
                <button
                  onClick={() => {
                    setMenu(false)
                    onHelp()
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-tron-cyan/70 hover:bg-tron-cyan/10"
                >
                  <HelpCircle className="w-4 h-4" />
                  How to play
                </button>
                <button
                  onClick={() => {
                    setMenu(false)
                    onExit()
                  }}
                  aria-label="Exit match"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-tron-orange/70 hover:bg-tron-orange/10 border-t border-tron-cyan/20"
                >
                  <LogOut className="w-4 h-4" />
                  Exit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div ref={dockRef} className="fixed bottom-0 left-0 right-0 z-30 bottom-nav-container">
        <div className="pb-safe relative bg-tron-black/95 backdrop-blur-xl shadow-[0_-5px_20px_rgba(0,243,255,0.1)]">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-tron-cyan/80" />
          <div className="absolute top-[2px] left-0 w-4 h-px bg-tron-cyan/50" />
          <div className="absolute top-[2px] right-0 w-4 h-px bg-tron-cyan/50" />
          <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-1 font-mono text-[10px] tracking-wider border-b border-tron-cyan/10">
            <span className="text-white/60">SIMULATED FILLS</span>
            <span className="text-tron-cyan">
              {`$${Math.max(0, MATCH_BUDGET - (self?.spent ?? 0) - (self?.reservedSpend ?? 0))} BUDGET LEFT`}
            </span>
            <span className="text-white/60 hidden min-[390px]:inline">SWIPE DISCS</span>
          </div>
          <div className="arcade-holdings" aria-label="Acquired assets">
            {self?.assets.map((a) => (
              <span
                key={a.dropId}
                title={`${a.symbol}: ${(Number(a.amount) / 1e18).toPrecision(3)} simulated units`}
              >
                <img src={stockAsset(a.symbol)!.logo} alt="" />
                {a.symbol}
              </span>
            ))}
            {!self?.assets.length && (
              <p>
                YOUR BAG ·{' '}
                {self?.reservedSpend ? `$${self.reservedSpend} pending` : 'NO CATCHES YET'}
              </p>
            )}
          </div>
          <p role="status" className="px-4 text-[9px] text-white/40 truncate" title={notice}>
            {notice}
          </p>
          <MatchScoreRow
            gameTimeRemaining={remaining}
            isGameReady
            playerBalance={self?.spent ?? 0}
            opponentBalance={other?.spent ?? 0}
            playerName={self?.name}
            opponentName={other?.name}
            compareValues={false}
            playerDetail={`$${self?.spent ?? 0} spent · $${self?.reservedSpend ?? 0} pending`}
            opponentDetail={`$${other?.spent ?? 0} spent`}
            timerLabel={game.status === 'valuing' ? 'CUTOFF' : undefined}
          />
        </div>
      </div>
    </>
  )
}
export function StockResult({
  game,
  self,
  other,
  localId,
  onPlayAgain,
  onBack,
}: {
  game: ArcadeState
  self?: Bag
  other?: Bag
  localId?: string
  onPlayAgain: () => void
  onBack: () => void
}) {
  const won = game.result?.winnerId === localId
  const winner = game.bags.find((b) => b.playerId === game.result?.winnerId)
  const reason: Record<string, string> = {
    tie: 'Equal bag values. Tie settlement is deferred.',
    empty_bags: 'No valued catches.',
    valuation_unavailable: 'Cutoff prices unavailable.',
    pending_at_cutoff: 'A quote was still pending at cutoff.',
    player_left: 'A player left the match.',
    player_disconnected: 'A player disconnected.',
  }
  return (
    <MatchResultOverlay
      title={game.result ? (won ? 'VICTORY' : 'DEFEAT') : 'CANCELLED'}
      accent={won ? 'cyan' : 'orange'}
      onPlayAgain={onPlayAgain}
      onBack={onBack}
      subtitle={
        game.result ? (
          <>
            <PlayerName username={winner?.name} enableGlow={false} className="text-white/70" />
            <span>WINS</span>
          </>
        ) : (
          'NO PAYOUT'
        )
      }
    >
      {[self, other].map((bag, i) => (
        <div
          key={i}
          className={cn(
            'relative flex items-center justify-between px-3 py-2.5 rounded-lg border overflow-hidden',
            game.result?.winnerId === bag?.playerId
              ? 'border-cyan-400/20 bg-cyan-950/15'
              : 'border-orange-400/20 bg-orange-950/15'
          )}
        >
          <div className="absolute inset-0 opacity-[0.06] tron-grid pointer-events-none" />
          <div className="relative z-10 flex flex-col items-start min-w-0 text-left">
            <span className="text-[10px] tracking-[0.15em] text-tron-cyan/80 truncate max-w-32">
              {i === 0 ? 'YOU' : bag?.name || 'OPPONENT'}
            </span>
            <span className="text-[9px] text-white/40">
              {bag?.assets.length ?? 0} catches · ${bag?.spent ?? 0} invested
            </span>
          </div>
          <span className="relative z-10 font-numeric text-sm font-bold text-tron-cyan shrink-0 ml-2">
            {game.result
              ? (Number(game.result.values[bag?.playerId ?? '']) / 1e6).toFixed(4) + ' USDG'
              : '—'}
          </span>
        </div>
      ))}
      {game.result ? (
        <div className="pt-2 text-[10px] text-tron-cyan/70 leading-relaxed">
          <p>Simulated prize: {(Number(game.result.simulatedPayoutUSDG) / 1e6).toFixed(4)} USDG</p>
          <p>Common cutoff block {game.result.block} · Winner fixed</p>
          <p className="text-white/40">Bag values · Simulated fills and payout</p>
        </div>
      ) : (
        <p className="pt-2 text-xs text-white/50">
          {reason[game.reason ?? ''] || 'Match interrupted.'} No payout.
        </p>
      )}
    </MatchResultOverlay>
  )
}
export function StockInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <div className="relative w-full max-w-md bg-tron-black border border-tron-cyan/40 p-6 md:p-8 rounded-sm">
        <Corners />
        <div className="absolute inset-0 tron-grid opacity-10 pointer-events-none" />
        <div className="relative text-center space-y-4">
          <h2 className="font-[family-name:var(--font-orbitron)] text-xl text-tron-cyan tracking-[0.2em]">
            SYSTEM INITIALIZATION
          </h2>
          <h3 className="font-[family-name:var(--font-orbitron)] text-lg text-white tracking-widest">
            SWIPE TO COLLECT
          </h3>
          <p className="text-tron-cyan/70 text-sm leading-relaxed">
            Swipe a stock disc for a live $1 quote. Each valid quote credits simulated tokens.
            Failed quotes spend nothing. Both players get the same opportunities.
          </p>
          <p className="text-tron-cyan/70 text-sm leading-relaxed">
            You have a $10 budget for the round. Acquired assets decide the winner; unspent cash
            stays outside. Twenty stocks arrive in a shared shuffled sequence. Fills and the USDG
            prize are simulated.
          </p>
          <ActionButton color="cyan" onClick={onClose}>
            ENTER THE GRID
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
