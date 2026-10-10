import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { clientLazy } from '@/platform/ui/client-lazy'
import {
  StockMatchmakingScreen,
  StockHUD,
  StockResult,
  StockInstructions,
  type LobbyPlayer,
} from './StockGameUI'
import { StockGrid } from './StockGrid'
import './stock-game.css'
import { StockArena, type ContactVisual } from './StockArena'
import { PresentationClock } from './presentation-clock'
import { interruptMatch } from './interrupted-match'
import {
  ContactFeedback,
  CONTACT_MS,
  type ContactKind,
  type ContactAnchor,
} from './contact-feedback'
const GridScanBackground = clientLazy(() =>
  import('@/platform/ui/GridScanBackground').then((m) => m.GridScanBackground)
)
import { usePrivy } from '@privy-io/react-auth'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { RealtimeSocket } from '@/platform/multiplayer/client'
import {
  CATCH_COST,
  type ArcadeState,
  type StockDrop,
  type CatchCost,
  type ArcadeBetEvent,
  type SetCatchCostPayload,
  type CatchStockPayload,
} from '../shared/types'
import { ClaimBudget } from './claim-budget'
import { MatchPlayer } from './match-player'
import { useStockMusic } from './use-stock-music'
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
  const matchPlayer = useRef(new MatchPlayer())
  const claimBudget = useRef(new ClaimBudget())
  const feedback = useRef(new ContactFeedback())
  const presentationClock = useRef(new PresentationClock())
  const [game, setGame] = useState<ArcadeState | null>(null)
  const [connected, setConnected] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [time, setTime] = useState({ remaining: 60000, started: false })
  const [caught, setCaught] = useState<ContactVisual[]>([])
  const [creditPulse, setCreditPulse] = useState<{ dropId: string; at: number } | null>(null)
  const [quotePulse, setQuotePulse] = useState<{
    kind: Exclude<ContactKind, 'rejected'>
    at: number
  } | null>(null)
  const [rejectedAt, setRejectedAt] = useState(-Infinity)
  const [notice, setNotice] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)
  const betRequest = useRef<SetCatchCostPayload | null>(null)
  const [pendingBet, setPendingBet] = useState<SetCatchCostPayload | null>(null)
  const clearBetRequest = useCallback(() => {
    betRequest.current = null
    setPendingBet(null)
  }, [])
  const localId = game
    ? (matchPlayer.current.get(game.matchId) ?? socket.current?.id)
    : socket.current?.id
  const self = game?.bags.find((bag) => bag.playerId === localId)
  const other = game?.bags.find((bag) => bag.playerId !== localId)
  const terminal = game?.status === 'completed' || game?.status === 'cancelled'
  const music = useStockMusic(
    connected && game?.status === 'playing' && time.started && time.remaining > 0
  )
  const showContact = useCallback(
    (anchor: ContactAnchor, kind: 'pending') => {
      const at = performance.now()
      setCaught((old) =>
        [...old.filter((v) => at - v.at < CONTACT_MS[v.kind]), { ...anchor, kind, at }].slice(-9)
      )
      setQuotePulse({ kind, at })
      music.feedback(kind)
    },
    [music.feedback]
  )
  useEffect(() => {
    if (!pendingBet) return
    const timer = window.setTimeout(() => {
      if (betRequest.current?.requestId !== pendingBet.requestId) return
      clearBetRequest()
      setNotice('Bet confirmation delayed. Your server-confirmed amount still applies.')
    }, 5000)
    return () => clearTimeout(timer)
  }, [pendingBet, clearBetRequest])
  const changeBet = useCallback((amount: CatchCost) => {
    const state = stateRef.current
    if (
      !socket.current?.connected ||
      !state ||
      betRequest.current ||
      (state.status !== 'ready' && state.status !== 'playing') ||
      (state.status === 'playing' &&
        presentationClock.current.authoritativeNow(performance.now()) >= state.cutoffAt)
    )
      return
    const request: SetCatchCostPayload = { amount, requestId: crypto.randomUUID() }
    betRequest.current = request
    setPendingBet(request)
    socket.current.emit('set_catch_cost', request)
  }, [])
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
  const onTime = useCallback((remaining: number, started: boolean) => {
    setTime((old) =>
      old.remaining === remaining && old.started === started ? old : { remaining, started }
    )
  }, [])
  // HUD feedback owns bounded expiry timers, never a per-frame React update.
  useEffect(() => {
    if (!quotePulse) return
    const timer = window.setTimeout(
      () => setQuotePulse(null),
      Math.max(0, CONTACT_MS[quotePulse.kind] - (performance.now() - quotePulse.at))
    )
    return () => clearTimeout(timer)
  }, [quotePulse])
  useEffect(() => {
    if (!creditPulse) return
    const timer = window.setTimeout(
      () => setCreditPulse(null),
      Math.max(0, CONTACT_MS.credited - (performance.now() - creditPulse.at))
    )
    return () => clearTimeout(timer)
  }, [creditPulse])
  useEffect(() => {
    if (!Number.isFinite(rejectedAt)) return
    const timer = window.setTimeout(() => setRejectedAt(-Infinity), 250)
    return () => clearTimeout(timer)
  }, [rejectedAt])
  useEffect(() => {
    if (!allowed) return
    const client = new RealtimeSocket()
    socket.current = client
    client.on('connect', () => setConnected(true))
    client.on('disconnect', () => {
      clearBetRequest()
      setConnected(false)
      setWaiting(false)
      claimBudget.current.reset()
      feedback.current.reset()
      setCaught([])
      setCreditPulse(null)
      setQuotePulse(null)
      const interrupted = interruptMatch(stateRef.current)
      stateRef.current = interrupted
      setGame(interrupted)
      setRejectedAt(-Infinity)
      setNotice('Connection lost. Return to the lobby to start a fresh match.')
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
      matchPlayer.current.remember(next.matchId, client.id)
      const local = performance.now()
      if (stateRef.current?.matchId !== next.matchId)
        presentationClock.current.reset(next.serverTime, local)
      else presentationClock.current.sample(next.serverTime, local)
      const now = presentationClock.current.now(local)
      onTime(
        Math.ceil(Math.min(60000, Math.max(0, next.cutoffAt - now)) / 1000) * 1000,
        now >= next.startedAt
      )
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
        setCreditPulse(null)
        setQuotePulse(null)
        setRejectedAt(-Infinity)
        feedback.current.reset(next.matchId)
        client.emit('scene_ready')
      }
      if (next.status !== 'playing') {
        setCaught([])
        setQuotePulse(null)
      }
      if (next.status !== 'ready' && next.status !== 'playing') clearBetRequest()
      if (next.status === 'completed' || next.status === 'cancelled') claimBudget.current.reset()
      if (next.status === 'cancelled')
        setNotice(`Match cancelled: ${next.reason?.replaceAll('_', ' ')}. No payout.`)
    })
    client.on('arcade_bet', (raw: unknown) => {
      const update = raw as ArcadeBetEvent | null
      if (
        !update ||
        update.playerId !== client.id ||
        update.requestId !== betRequest.current?.requestId ||
        typeof update.accepted !== 'boolean'
      )
        return
      clearBetRequest()
      setNotice(
        update.accepted
          ? `Bet confirmed: $${update.catchCost.toFixed(2)} per caught token.`
          : update.reason || 'Bet change unavailable.'
      )
    })
    client.on('arcade_claim', (raw: unknown) => {
      const claim = raw as { playerId: string; dropId: string; status: string; reason?: string }
      if (claim.playerId !== client.id) return
      claimBudget.current.acknowledge(claim.dropId)
      const state = stateRef.current
      if (
        !state ||
        client.roomId !== state.matchId ||
        state.status !== 'playing' ||
        presentationClock.current.authoritativeNow(performance.now()) >= state.cutoffAt ||
        (claim.status !== 'credited' && claim.status !== 'failed')
      )
        return
      const contact = feedback.current.settle(state.matchId, claim.dropId, claim.status)
      if (!contact) return
      if (claim.status === 'credited') {
        setCreditPulse({ dropId: claim.dropId, at: performance.now() })
        setQuotePulse({ kind: 'credited', at: performance.now() })
        music.feedback('credited')
        setNotice('Quote received. Simulated catch added to your bag.')
      } else {
        setQuotePulse({ kind: 'failed', at: performance.now() })
        music.feedback('failed')
        setNotice(
          `${claim.reason || 'Quote unavailable'} · Reservation released. No spend or credit.`
        )
      }
    })
    return () => {
      client.disconnect()
      socket.current = null
    }
  }, [allowed, onTime, music.feedback, clearBetRequest])
  const catchDrop = useCallback(
    (drop: StockDrop, anchor: ContactAnchor) => {
      const state = stateRef.current
      if (
        document.hidden ||
        !socket.current?.connected ||
        !state ||
        state.status !== 'playing' ||
        claimed.current.has(drop.id) ||
        betRequest.current ||
        presentationClock.current.authoritativeNow(performance.now()) >= state.cutoffAt
      )
        return
      const bag = state.bags.find((b) => b.playerId === socket.current?.id)
      if (!bag || !claimBudget.current.reserve(drop.id, bag)) {
        setNotice('Budget spent or reserved by pending quotes. No further simulated spend.')
        if (feedback.current.reject(state.matchId, drop.id)) {
          setRejectedAt(performance.now())
          music.feedback('rejected')
        }
        return
      }
      claimed.current.add(drop.id)
      if (feedback.current.begin(state.matchId, anchor)) showContact(anchor, 'pending')
      setNotice('Quote pending. No credit until the quote arrives.')
      const request: CatchStockPayload = { dropId: drop.id, catchCost: bag.catchCost ?? CATCH_COST }
      socket.current?.emit('catch_stock', request)
    },
    [showContact, music.feedback]
  )
  const findMatch = () => {
    if (!connected || !walletAddress) return
    music.prepare()
    clearBetRequest()
    setGame(null)
    matchPlayer.current.reset()
    stateRef.current = null
    claimBudget.current.reset()
    feedback.current.reset()
    setCreditPulse(null)
    setQuotePulse(null)
    setRejectedAt(-Infinity)
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
    clearBetRequest()
    setGame(null)
    matchPlayer.current.reset()
    stateRef.current = null
    claimBudget.current.reset()
    feedback.current.reset()
    setCreditPulse(null)
    setQuotePulse(null)
    setRejectedAt(-Infinity)
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
  const onHelp = useCallback(() => setHelp(true), [])
  const onExit = useCallback(() => {
    clearBetRequest()
    if (socket.current?.connected) socket.current.emit('end_game')
    const interrupted = interruptMatch(stateRef.current, 'player_left')
    stateRef.current = interrupted
    setGame(interrupted)
    claimBudget.current.reset()
    feedback.current.reset()
    setCaught([])
    setCreditPulse(null)
    setQuotePulse(null)
    setRejectedAt(-Infinity)
  }, [clearBetRequest])
  return (
    <main
      className={
        game
          ? 'fixed inset-0 bg-tron-black overflow-hidden overscroll-none'
          : 'pivot-grid-palette relative min-h-[100dvh] overflow-x-hidden'
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
          linesColor="#69deff"
          scanDirection={0}
          scanRange={[2, 2]}
          scanOpacity={0}
          scanDuration={4}
          scanGlow={0}
        />
      ) : (
        <StockGrid
          active={connected && game.status === 'playing' && time.started && time.remaining > 0}
          reducedMotion={reducedMotion}
        />
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
          onHelp={onHelp}
        />
      )}
      {game && (
        <>
          <StockArena
            key={game.matchId}
            game={game}
            clock={presentationClock.current}
            claimed={claimed.current}
            contacts={caught}
            reducedMotion={reducedMotion}
            catchCost={self?.catchCost ?? CATCH_COST}
            onCatch={catchDrop}
            onTime={onTime}
          />

          <StockHUD
            game={game}
            self={self}
            other={other}
            remaining={time.remaining}
            notice={notice}
            dockRef={dock}
            topRef={top}
            creditPulse={creditPulse ? { dropId: creditPulse.dropId, progress: 0 } : undefined}
            quotePulse={quotePulse ? { kind: quotePulse.kind, progress: 0 } : undefined}
            budgetPulse={Number(Number.isFinite(rejectedAt))}
            muted={music.muted}
            pendingBet={pendingBet?.amount}
            onChangeBet={changeBet}
            onToggleSound={music.toggle}
            onExit={onExit}
            onHelp={onHelp}
          />
        </>
      )}
      {game && terminal && (
        <StockResult
          game={game}
          self={self}
          other={other}
          localId={localId}
          onPlayAgain={reset}
          onBack={() => navigate({ to: '/' })}
        />
      )}
      {help && <StockInstructions onClose={() => setHelp(false)} />}
    </main>
  )
}
