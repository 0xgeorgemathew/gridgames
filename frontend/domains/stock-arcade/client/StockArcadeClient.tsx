import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { clientLazy } from '@/platform/ui/client-lazy'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { GameCanvasBackground } from '@/platform/ui/GameCanvasBackground'
import './stock-game.css'
const GridScanBackground = clientLazy(() =>
  import('@/platform/ui/GridScanBackground').then((m) => m.GridScanBackground)
)
import { usePrivy } from '@privy-io/react-auth'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { RealtimeSocket } from '@/platform/multiplayer/client'
import { STOCK_ASSETS, stockAsset } from '../shared/assets'
import type { ArcadeState, StockDrop } from '../shared/types'
import { dropPoint, segmentHitsDisc } from './motion'
interface PendingVisual {
  drop: StockDrop
  caughtAt: number
}
export function StockArcadeClient() {
  const { authenticated, login, user } = usePrivy()
  const mini = useBaseMiniAppAuth()
  const allowed = authenticated || (mini.isInMiniApp && mini.isConnected)
  const walletAddress = mini.isInMiniApp ? mini.walletAddress : user?.wallet?.address
  const playerName =
    mini.user?.username ||
    (user as { google?: { name?: string } } | null)?.google?.name ||
    'Grid Runner'
  const socket = useRef<RealtimeSocket | null>(null)
  const arena = useRef<HTMLDivElement>(null)
  const stateRef = useRef<ArcadeState | null>(null)
  const claimed = useRef(new Set<string>())
  const offset = useRef(0)
  const [game, setGame] = useState<ArcadeState | null>(null)
  const [connected, setConnected] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [pending, setPending] = useState<Record<string, PendingVisual>>({})
  const [notice, setNotice] = useState('Swipe a stock disc to collect a $1 simulated quote.')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [trail, setTrail] = useState<Array<{ x: number; y: number; time: number }>>([])
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const self = game?.bags.find((bag) => bag.playerId === socket.current?.id)
  const other = game?.bags.find((bag) => bag.playerId !== socket.current?.id)
  const terminal = game?.status === 'completed' || game?.status === 'cancelled'
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReducedMotion(media.matches)
    change()
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  // Only a live match needs a clock/animation loop; lobby and results stay idle.
  useEffect(() => {
    if (game?.status !== 'playing') return
    let frame = 0
    const animate = () => {
      setNow(Date.now() + offset.current)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [game?.status])
  useEffect(() => {
    if (!allowed) return
    const client = new RealtimeSocket()
    socket.current = client
    client.on('connect', () => setConnected(true))
    client.on('disconnect', () => {
      setConnected(false)
      setWaiting(false)
      setNotice('Connection lost. The prototype match is cancelled; reconnect starts fresh.')
    })
    client.on('error', (raw: unknown) => {
      setWaiting(false)
      setNotice((raw as { message?: string })?.message || 'Match unavailable')
    })
    client.on('waiting_for_match', () => setWaiting(true))
    client.on('arcade_state', (raw: unknown) => {
      const next = raw as ArcadeState
      if (!next || next.simulation !== true || !Array.isArray(next.bags)) return
      offset.current = next.serverTime - Date.now()
      if (next.status === 'playing' && stateRef.current?.status !== 'playing')
        setNotice('Swipe discs. Quotes stay pending until confirmed.')
      if (next.status === 'completed')
        setNotice('Match complete. Both bags use the same cutoff block; payout is simulated.')
      stateRef.current = next
      setGame(next)
      setWaiting(false)
      if (next.status === 'ready') {
        claimed.current.clear()
        setPending({})
        client.emit('scene_ready')
      }
      if (next.status === 'cancelled')
        setNotice(`Match cancelled: ${next.reason?.replaceAll('_', ' ')}. No payout.`)
    })
    client.on('arcade_claim', (raw: unknown) => {
      const claim = raw as { playerId: string; dropId: string; status: string; reason?: string }
      if (claim.playerId !== client.id) return
      if (claim.status === 'credited' || claim.status === 'failed') {
        setPending((p) => {
          const next = { ...p }
          delete next[claim.dropId]
          return next
        })
        setNotice(
          claim.status === 'credited'
            ? 'Quote received. $1 simulated catch added to your bag.'
            : claim.reason || 'Quote failed. No spend or credit.'
        )
      }
    })
    return () => {
      client.disconnect()
      socket.current = null
    }
  }, [allowed])
  const catchDrop = (drop: StockDrop) => {
    const state = stateRef.current
    if (
      !state ||
      state.status !== 'playing' ||
      claimed.current.has(drop.id) ||
      Date.now() + offset.current >= state.cutoffAt
    )
      return
    const bag = state.bags.find((b) => b.playerId === socket.current?.id)
    if (!bag || bag.spent + bag.pending >= 10) {
      setNotice('Bag full or quotes pending. No further simulated spend.')
      return
    }
    claimed.current.add(drop.id)
    setPending((p) => ({ ...p, [drop.id]: { drop, caughtAt: Date.now() + offset.current } }))
    setNotice('Quote pending. No credit until the quote arrives.')
    socket.current?.emit('catch_stock', { dropId: drop.id })
  }
  const position = (e: PointerEvent<HTMLDivElement>) => {
    const rect = arena.current!.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    }
  }
  const swipe = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointer.current || !arena.current) return
    const p = position(e),
      previous = pointer.current
    for (const drop of game?.drops ?? []) {
      const point = dropPoint(drop, now)
      if (
        now >= drop.spawnedAt &&
        now < drop.expiresAt &&
        segmentHitsDisc(previous.x, previous.y, p.x, p.y, point.x * p.width, point.y * p.height, 35)
      )
        catchDrop(drop)
    }
    pointer.current = p
    setTrail((t) =>
      [...t.filter((p) => now - p.time < 160), { x: p.x, y: p.y, time: now }].slice(-15)
    )
  }
  const findMatch = () => {
    if (!connected || !walletAddress) return
    setGame(null)
    stateRef.current = null
    setPending({})
    claimed.current.clear()
    setWaiting(true)
    setNotice('Finding another player…')
    socket.current?.emit('find_match', {
      playerName,
      walletAddress,
      gameSlug: 'stock-arcade',
      gameDuration: 60000,
    })
  }
  return (
    <main className="fixed inset-0 bg-tron-black overflow-hidden overscroll-none touch-none">
      {!game || terminal ? (
        <GridScanBackground
          scanDirection={0}
          scanRange={[2, 2]}
          scanOpacity={0}
          scanDuration={4}
          scanGlow={0}
        />
      ) : (
        <GameCanvasBackground />
      )}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-start justify-between px-4 pt-4 pointer-events-none">
        <Link
          to="/"
          className="pointer-events-auto px-4 py-2 font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/80 hover:text-tron-cyan transition-all border border-tron-cyan/40 hover:border-tron-cyan hover:bg-tron-cyan/10 rounded-sm bg-tron-black/80 backdrop-blur-md"
        >
          ← BACK
        </Link>
        {allowed && (!game || terminal) && (
          <div className="pointer-events-auto glass-panel-vibrant px-3 py-2 border border-tron-cyan/30 rounded-sm bg-tron-black/80 backdrop-blur-md">
            <UserProfileBadge
              displayName={playerName}
              pfpUrl={mini.isInMiniApp ? mini.user?.pfpUrl : null}
              compact
              animateIdle={false}
            />
          </div>
        )}
        {game && !terminal && (
          <div
            className="flex items-center gap-2 px-4 py-2 bg-tron-black/90 backdrop-blur-md border border-tron-cyan/30 rounded-full font-numeric text-tron-cyan"
            aria-label="Time remaining"
          >
            <span className="text-[10px] uppercase tracking-[0.2em]">STOCK ARCADE</span>
            <strong>
              {game.status === 'playing'
                ? Math.max(0, Math.ceil((game.cutoffAt - now) / 1000))
                : game.status === 'valuing'
                  ? 'CUTOFF'
                  : '60'}
              {game.status !== 'valuing' && 's'}
            </strong>
          </div>
        )}
      </div>
      {(!game || terminal) && (
        <section className="relative z-20 flex flex-col items-center justify-center gap-4 px-4 h-full w-full max-w-[400px] mx-auto text-center pt-16 pb-4">
          <div className="text-center relative">
            <h1
              className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-[0.3em] text-white/90 mb-1"
              style={{ textShadow: '0 0 15px rgba(255,255,255,0.15)' }}
            >
              ENTER THE GRID
            </h1>
            <h2
              className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.3em] text-tron-cyan relative mb-4"
              style={{ textShadow: '0 0 30px rgba(0,243,255,0.65)' }}
            >
              STOCK ARCADE
            </h2>
            <div className="h-[2px] bg-tron-cyan/60 mx-auto w-3/4" />
          </div>
          {!allowed ? (
            <>
              <p className="text-[11px] text-tron-white-dim/70 tracking-wider">
                Connect to compete. Simulated catches and payout only.
              </p>
              <button
                onClick={login}
                className="w-full py-4 border border-tron-cyan/60 bg-tron-cyan/10 hover:bg-tron-cyan/20 rounded-sm font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan disabled:opacity-40"
              >
                LOGIN WITH GOOGLE
              </button>
            </>
          ) : (
            <>
              <h2 className="font-[family-name:var(--font-orbitron)] text-lg tracking-[0.2em] text-tron-cyan">
                {terminal
                  ? game.status === 'completed'
                    ? game.result?.winnerId === socket.current?.id
                      ? 'Your bag wins.'
                      : 'Opponent’s bag wins.'
                    : 'Match cancelled'
                  : 'SWIPE TO COLLECT'}
              </h2>
              <p className="text-[11px] text-tron-white-dim/70 leading-relaxed">
                {terminal
                  ? notice
                  : 'Swipe tossed stock discs. Both players get the same opportunities. A catch stays pending until its live quote returns.'}
              </p>
              {game?.result && (
                <div className="glass-panel-vibrant w-full p-4 border border-tron-cyan/30 text-xs text-tron-cyan/70">
                  <p>Common cutoff block {game.result.block}</p>
                  <p>
                    Invested: ${self?.spent ?? 0} · opponent ${other?.spent ?? 0}
                  </p>
                  <p>
                    Opponent bag:{' '}
                    {(Number(game.result.values[other?.playerId ?? '']) / 1e6).toFixed(4)} USDG
                  </p>
                  <p>
                    Your bag:{' '}
                    {(Number(game.result.values[socket.current?.id ?? '']) / 1e6).toFixed(4)} USDG
                  </p>
                  <p>
                    Simulated prize: {(Number(game.result.simulatedPayoutUSDG) / 1e6).toFixed(4)}{' '}
                    USDG · winner fixed
                  </p>
                </div>
              )}
              <button
                className="w-full py-4 border border-tron-cyan/60 bg-tron-cyan/10 hover:bg-tron-cyan/20 rounded-sm font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan disabled:opacity-40"
                disabled={!connected || waiting || !walletAddress}
                onClick={findMatch}
              >
                {waiting ? 'FINDING A PLAYER…' : connected ? 'FIND MATCH' : 'CONNECTING…'}
              </button>
              {!terminal && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-[10px] text-tron-white-dim leading-relaxed"
                >
                  {notice}
                </p>
              )}
              {waiting && (
                <button
                  className="px-4 py-2 border border-tron-cyan/30 bg-tron-black/80 rounded-sm font-[family-name:var(--font-orbitron)] text-[10px] tracking-wider text-tron-cyan/70 hover:bg-tron-cyan/10"
                  onClick={() => {
                    socket.current?.emit('leave_waiting_pool')
                    setWaiting(false)
                  }}
                >
                  Cancel search
                </button>
              )}
            </>
          )}
          <div className="grid grid-cols-5 gap-3 w-full py-2 text-[9px] font-mono text-tron-cyan/60">
            {STOCK_ASSETS.map((a) => (
              <div key={a.symbol} className="flex flex-col items-center gap-1">
                <img className="w-8 h-8" src={a.logo} alt={a.name} />
                <span>{a.symbol}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {game && !terminal && (
        <>
          <div
            className="arcade-arena"
            ref={arena}
            onPointerDown={(e) => {
              // Keep a disc's accessible click target while letting swipe events bubble.
              // Capturing every press on the arena retargeted the disc's click away.
              const captureTarget =
                (e.target as HTMLElement).closest<HTMLButtonElement>('button.arcade-disc') ??
                e.currentTarget
              captureTarget.setPointerCapture(e.pointerId)
              pointer.current = position(e)
              setTrail([])
            }}
            onPointerMove={swipe}
            onPointerUp={() => {
              pointer.current = null
              setTrail([])
            }}
            onPointerCancel={() => {
              pointer.current = null
              setTrail([])
            }}
          >
            <div className="absolute inset-0 tron-grid opacity-[0.07] pointer-events-none" />
            {game.status === 'ready' && (
              <div className="arcade-center">Preparing a shared match…</div>
            )}
            {game.status === 'valuing' && (
              <div className="arcade-center">Valuing both bags at one cutoff block…</div>
            )}
            {game.status === 'playing' && now < game.startedAt && (
              <div className="arcade-center">GET READY</div>
            )}
            {game.drops
              .filter((d) => !claimed.current.has(d.id) && now >= d.spawnedAt && now < d.expiresAt)
              .map((drop) => {
                const a = stockAsset(drop.symbol)!,
                  point = dropPoint(drop, now)
                return (
                  <button
                    key={drop.id}
                    data-drop-id={drop.id}
                    data-symbol={drop.symbol}
                    className="arcade-disc"
                    aria-label={`Catch ${drop.symbol} for $1 simulated`}
                    onClick={() => catchDrop(drop)}
                    style={{
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${reducedMotion ? 0 : point.rotation}rad)`,
                      borderColor: a.color,
                      boxShadow: `0 0 18px ${a.color}35`,
                    }}
                  >
                    <span
                      className="arcade-disc-face"
                      style={{ transform: `rotate(${reducedMotion ? 0 : -point.rotation}rad)` }}
                    >
                      <img src={a.logo} alt="" draggable={false} />
                      <span>{drop.symbol}</span>
                    </span>
                  </button>
                )
              })}
            {Object.entries(pending).map(([id, { drop, caughtAt }]) => {
              const point = dropPoint(drop, caughtAt),
                p = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - caughtAt) / 220))
              return (
                <div
                  key={id}
                  className="arcade-pending-disc"
                  style={{
                    left: `${(point.x + (0.86 - point.x) * p) * 100}%`,
                    top: `${(point.y + (0.9 - point.y) * p) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <img src={stockAsset(drop.symbol)!.logo} alt="" />
                  <span>pending</span>
                </div>
              )
            })}
            {!reducedMotion && trail.length > 1 && (
              <svg className="arcade-trail">
                <polyline
                  points={trail
                    .filter((p) => now - p.time < 180)
                    .map((p) => `${p.x},${p.y}`)
                    .join(' ')}
                  fill="none"
                  stroke="#00f3ff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <div className="arcade-bag-target">↓ YOUR BAG</div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-30 bottom-nav-container">
            <div className="pb-safe">
              <div className="relative bg-tron-black/95 backdrop-blur-xl shadow-[0_-5px_20px_rgba(0,243,255,0.1)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-tron-cyan/80" />
                <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-1 font-mono text-[10px] tracking-wider border-b border-tron-cyan/10">
                  <span className="text-white/60">SIMULATED SCORE</span>
                  <span className="text-tron-cyan">
                    {self?.spent === 10
                      ? '10/10 · BAG LOCKED UNTIL CUTOFF'
                      : `${10 - (self?.spent ?? 0) - (self?.pending ?? 0)} SLOTS READY`}
                  </span>
                  <span className="text-white/60">SWIPE DISCS</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 text-xs font-numeric">
                  <span className="text-tron-cyan">
                    YOU · {self?.spent ?? 0}/10 · ${self?.spent ?? 0} INVESTED{' '}
                    <small className="text-white/50">({self?.pending ?? 0} pending)</small>
                  </span>
                  <span className="text-tron-orange">
                    {other?.name || 'OPPONENT'} · {other?.spent ?? 0}/10
                  </span>
                </div>
                <div className="arcade-holdings" aria-label="Acquired assets">
                  {self?.assets.map((a) => (
                    <span key={a.dropId}>
                      <img src={stockAsset(a.symbol)!.logo} alt="" />
                      {a.symbol}
                      <small>{(Number(a.amount) / 1e18).toPrecision(3)}</small>
                    </span>
                  ))}
                  {!self?.assets.length && (
                    <p>Your bag is empty. Pending quotes do not count yet.</p>
                  )}
                </div>
                <div className="arcade-bottom">
                  <p role="status">{notice}</p>
                  <button
                    className="px-4 py-2 border border-tron-cyan/30 bg-tron-black/80 rounded-sm font-[family-name:var(--font-orbitron)] text-[10px] tracking-wider text-tron-cyan/70 hover:bg-tron-cyan/10"
                    onClick={() => socket.current?.emit('end_game')}
                  >
                    Close match
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {(!game || terminal) && (
        <p className="absolute bottom-2 left-0 right-0 z-20 text-center text-[9px] text-tron-cyan/40 font-mono px-4">
          $1 per successful quote · $10 cap · SIMULATED FILLS · NO REAL FUNDS
        </p>
      )}
    </main>
  )
}
