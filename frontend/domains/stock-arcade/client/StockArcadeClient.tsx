import { useEffect, useRef, useState, type PointerEvent, type CSSProperties } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { clientLazy } from '@/platform/ui/client-lazy'
import {
  StockMatchmakingScreen,
  StockHUD,
  StockResult,
  StockInstructions,
  type LobbyPlayer,
} from './StockGameUI'
import { GameCanvasBackground } from '@/platform/ui/GameCanvasBackground'
import './stock-game.css'
import { StockDiscRim, StockBlade, StockDeRez } from './StockEffects'
import { captureDisc, type DiscSnapshot } from './derez-renderer'
const GridScanBackground = clientLazy(() =>
  import('@/platform/ui/GridScanBackground').then((m) => m.GridScanBackground)
)
import { usePrivy } from '@privy-io/react-auth'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { RealtimeSocket } from '@/platform/multiplayer/client'
import { type ArcadeState, type StockDrop } from '../shared/types'
import { stockAsset } from '../shared/assets'
import { ClaimBudget } from './claim-budget'
import { useStockMusic } from './use-stock-music'
import { dropPoint, segmentHitsDisc, discDiameter, SLICE_EFFECT_MS } from './motion'
interface PendingVisual {
  drop: StockDrop
  caughtAt: number
  sliceAngle: number
  source: DiscSnapshot
  x: number
  y: number
}
export function StockArcadeClient() {
  const navigate = useNavigate()
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
  const dock = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const [topHeight, setTopHeight] = useState(78)
  const [dockHeight, setDockHeight] = useState(160)
  const [help, setHelp] = useState(false)
  const [lobbyOpen, setLobbyOpen] = useState(false)
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const stateRef = useRef<ArcadeState | null>(null)
  const claimed = useRef(new Set<string>())
  const claimBudget = useRef(new ClaimBudget())
  const offset = useRef(0)
  const [game, setGame] = useState<ArcadeState | null>(null)
  const [connected, setConnected] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [caught, setCaught] = useState<PendingVisual[]>([])
  const [notice, setNotice] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [trail, setTrail] = useState<Array<{ x: number; y: number; time: number }>>([])
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const self = game?.bags.find((bag) => bag.playerId === socket.current?.id)
  const other = game?.bags.find((bag) => bag.playerId !== socket.current?.id)
  const terminal = game?.status === 'completed' || game?.status === 'cancelled'
  const music = useStockMusic(
    connected && game?.status === 'playing' && now >= game.startedAt && now < game.cutoffAt
  )
  useEffect(() => {
    if (!game || !dock.current || !top.current) return
    const measure = () => {
      setDockHeight(dock.current!.getBoundingClientRect().height)
      setTopHeight(top.current!.getBoundingClientRect().height)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(dock.current)
    observer.observe(top.current)
    measure()
    return () => observer.disconnect()
  }, [game?.matchId])
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
      claimBudget.current.reset()
      setNotice('Connection lost. The prototype match is cancelled; reconnect starts fresh.')
    })
    client.on('error', (raw: unknown) => {
      setWaiting(false)
      setNotice((raw as { message?: string })?.message || 'Match unavailable')
    })
    client.on('waiting_for_match', () => setWaiting(true))
    client.on('lobby_players', (raw: unknown) => {
      if (Array.isArray(raw))
        setLobbyPlayers(
          raw.filter(
            (p): p is LobbyPlayer =>
              typeof p?.socketId === 'string' &&
              typeof p?.name === 'string' &&
              p?.gameDuration === 60000
          )
        )
      setRefreshing(false)
    })
    client.on('lobby_updated', (raw: unknown) => {
      const players = (raw as { players?: unknown })?.players
      if (Array.isArray(players))
        setLobbyPlayers(
          players.filter(
            (p): p is LobbyPlayer =>
              p?.socketId !== client.id &&
              typeof p?.socketId === 'string' &&
              typeof p?.name === 'string' &&
              p?.gameSlug === 'stock-arcade' &&
              p?.gameDuration === 60000
          )
        )
    })
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
      setLobbyOpen(false)
      if (next.status === 'ready') {
        claimed.current.clear()
        claimBudget.current.reset()
        setCaught([])
        client.emit('scene_ready')
      }
      if (next.status === 'completed' || next.status === 'cancelled') claimBudget.current.reset()
      if (next.status === 'cancelled')
        setNotice(`Match cancelled: ${next.reason?.replaceAll('_', ' ')}. No payout.`)
    })
    client.on('arcade_claim', (raw: unknown) => {
      const claim = raw as { playerId: string; dropId: string; status: string; reason?: string }
      if (claim.playerId !== client.id) return
      claimBudget.current.acknowledge(claim.dropId)
      if (claim.status === 'credited' || claim.status === 'failed') {
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
  const catchDrop = (drop: StockDrop, sliceAngle = 0) => {
    const state = stateRef.current
    if (
      !socket.current?.connected ||
      !state ||
      state.status !== 'playing' ||
      claimed.current.has(drop.id) ||
      Date.now() + offset.current >= state.cutoffAt
    )
      return
    const bag = state.bags.find((b) => b.playerId === socket.current?.id)
    if (!bag || !claimBudget.current.reserve(drop.id, bag)) {
      setNotice('Budget spent or reserved by pending quotes. No further simulated spend.')
      return
    }
    claimed.current.add(drop.id)
    const point = dropPoint(drop, now),
      nextPoint = dropPoint(drop, now + 16)
    const width = arena.current?.clientWidth ?? window.innerWidth,
      height = arena.current?.clientHeight ?? window.innerHeight
    const button = Array.from(
      arena.current?.querySelectorAll<HTMLButtonElement>('button.arcade-disc') ?? []
    ).find((el) => el.dataset.dropId === drop.id)
    const scale = discDiameter(width) / 66
    const source = captureDisc(
      drop.symbol,
      button,
      point.rotation,
      ((((nextPoint.x - point.x) * width) / 16) * 1000) / scale,
      ((((nextPoint.y - point.y) * height) / 16) * 1000) / scale
    )
    setCaught((old) => [
      ...old.filter((v) => Date.now() + offset.current - v.caughtAt < SLICE_EFFECT_MS),
      { drop, caughtAt: Date.now() + offset.current, sliceAngle, source, x: point.x, y: point.y },
    ])
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
        segmentHitsDisc(
          previous.x,
          previous.y,
          p.x,
          p.y,
          point.x * p.width,
          point.y * p.height,
          discDiameter(p.width) / 2
        )
      )
        catchDrop(drop, Math.atan2(p.y - previous.y, p.x - previous.x))
    }
    pointer.current = p
    setTrail((t) =>
      [...t.filter((p) => now - p.time < 160), { x: p.x, y: p.y, time: now }].slice(
        p.width < 768 ? -24 : -20
      )
    )
  }
  const findMatch = () => {
    if (!connected || !walletAddress) return
    music.prepare()
    setGame(null)
    stateRef.current = null
    claimBudget.current.reset()
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
  const reset = () => {
    setGame(null)
    stateRef.current = null
    claimBudget.current.reset()
    setTrail([])
    setCaught([])
    claimed.current.clear()
    setLobbyOpen(false)
    setWaiting(false)
    setNotice('')
  }
  const refreshLobby = () => {
    setRefreshing(true)
    socket.current?.emit('get_lobby_players', { gameSlug: 'stock-arcade' })
  }
  const cancelSearch = () => {
    socket.current?.emit('leave_waiting_pool')
    setWaiting(false)
    setLobbyOpen(false)
    setNotice('')
  }
  const remaining = game ? Math.min(60000, Math.max(0, game.cutoffAt - now)) : 60000
  return (
    <main
      className={
        game
          ? 'fixed inset-0 bg-tron-black overflow-hidden overscroll-none'
          : 'relative min-h-[100dvh] bg-black overflow-x-hidden'
      }
      style={
        {
          '--stock-hud-height': `${dockHeight}px`,
          '--stock-top-height': `${topHeight}px`,
        } as CSSProperties
      }
    >
      {!game ? (
        <GridScanBackground
          scanDirection={0}
          scanRange={[2, 2]}
          scanOpacity={0}
          scanDuration={4}
          scanGlow={0}
        />
      ) : (
        <>
          <GameCanvasBackground />
          <div className="arcade-playfield-grid" />
        </>
      )}
      {!game && (
        <StockMatchmakingScreen
          allowed={allowed}
          connected={connected && !!walletAddress}
          waiting={waiting}
          lobbyOpen={lobbyOpen}
          refreshing={refreshing}
          playerName={playerName}
          pfpUrl={mini.isInMiniApp ? mini.user?.pfpUrl : null}
          isInMiniApp={mini.isInMiniApp}
          players={lobbyPlayers}
          notice={notice}
          onLogin={login}
          onEnter={findMatch}
          onOpenLobby={() => {
            music.prepare()
            setLobbyOpen(true)
            socket.current?.emit('join_waiting_pool', {
              playerName,
              walletAddress,
              gameSlug: 'stock-arcade',
              gameDuration: 60000,
            })
            refreshLobby()
          }}
          onBackFromLobby={cancelSearch}
          onRefresh={refreshLobby}
          onSelect={(opponentSocketId) => {
            music.prepare()
            setWaiting(true)
            socket.current?.emit('select_opponent', { opponentSocketId })
          }}
          onCancel={cancelSearch}
          onHelp={() => setHelp(true)}
        />
      )}
      {game && (
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
            {!terminal && game.status === 'ready' && (
              <div className="arcade-center">Preparing a shared match…</div>
            )}
            {!terminal && game.status === 'valuing' && (
              <div className="arcade-center">Valuing both bags at one cutoff block…</div>
            )}
            {game.status === 'playing' && now < game.startedAt && (
              <div className="arcade-center">GET READY</div>
            )}
            {game.drops
              .filter(
                (d) =>
                  !terminal && !claimed.current.has(d.id) && now >= d.spawnedAt && now < d.expiresAt
              )
              .map((drop) => {
                const point = dropPoint(drop, now)
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
                    }}
                  >
                    <StockDiscRim />
                    <span
                      className="arcade-disc-face"
                      style={{ transform: `rotate(${reducedMotion ? 0 : -point.rotation}rad)` }}
                    >
                      <span className="ninja-disc-logo">
                        <img src={stockAsset(drop.symbol)?.logo} alt="" draggable={false} />
                      </span>
                      <span className="ninja-disc-label">
                        <span className="ninja-disc-symbol">{drop.symbol}</span>
                      </span>
                    </span>
                  </button>
                )
              })}
            {!terminal &&
              game.status === 'playing' &&
              now < game.cutoffAt &&
              !reducedMotion &&
              caught
                .filter((v) => now - v.caughtAt < SLICE_EFFECT_MS)
                .map(({ drop, caughtAt, sliceAngle, source, x, y }) => (
                  <div
                    key={drop.id}
                    className="ninja-catch"
                    style={{
                      left: `${x * 100}%`,
                      top: `${y * 100}%`,
                      width: source.diameter,
                      height: source.diameter,
                    }}
                  >
                    <StockDeRez
                      progress={(now - caughtAt) / SLICE_EFFECT_MS}
                      symbol={drop.symbol}
                      sliceAngle={sliceAngle}
                      source={source}
                    />
                  </div>
                ))}
            {game.status === 'playing' &&
              now < game.cutoffAt &&
              !reducedMotion &&
              trail.length > 1 && (
                <StockBlade
                  points={trail.filter((p) => now - p.time < 180)}
                  mobile={(arena.current?.clientWidth ?? 900) < 768}
                  phase={now / 160}
                />
              )}
            <div className="arcade-bag-target">↓ YOUR BAG</div>
          </div>

          <StockHUD
            game={game}
            self={self}
            other={other}
            remaining={remaining}
            notice={notice}
            dockRef={dock}
            topRef={top}
            muted={music.muted}
            onToggleSound={music.toggle}
            onExit={() => socket.current?.emit('end_game')}
            onHelp={() => setHelp(true)}
          />
        </>
      )}
      {game && terminal && (
        <StockResult
          game={game}
          self={self}
          other={other}
          localId={socket.current?.id}
          onPlayAgain={reset}
          onBack={() => navigate({ to: '/' })}
        />
      )}
      {help && <StockInstructions onClose={() => setHelp(false)} />}
    </main>
  )
}
