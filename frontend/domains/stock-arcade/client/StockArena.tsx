import { memo, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { CATCH_COST, type ArcadeState, type StockDrop, type CatchCost } from '../shared/types'
import { stockAsset } from '../shared/assets'
import { StockDiscRim, StockBlade, StockContact } from './StockEffects'
import { CONTACT_MS, type ContactAnchor } from './contact-feedback'
import { discDiameter, dropPoint, segmentHitsDisc } from './motion'
import type { PresentationClock } from './presentation-clock'

export interface ContactVisual extends ContactAnchor {
  kind: 'pending'
  at: number
}
interface TrailPoint {
  x: number
  y: number
  time: number
}
interface Props {
  game: ArcadeState
  clock: PresentationClock
  claimed: Set<string>
  contacts: ContactVisual[]
  reducedMotion: boolean
  catchCost?: CatchCost
  onCatch: (drop: StockDrop, anchor: ContactAnchor) => void
  onTime: (remaining: number, started: boolean) => void
}

const StockDisc = memo(function StockDisc({
  drop,
  catchCost,
  register,
  onClick,
}: {
  drop: StockDrop
  catchCost: CatchCost
  register: (id: string, element: HTMLButtonElement | null) => void
  onClick: (drop: StockDrop) => void
}) {
  return (
    <button
      ref={(node) => register(drop.id, node)}
      data-drop-id={drop.id}
      data-symbol={drop.symbol}
      className="arcade-disc"
      aria-label={`Catch ${drop.symbol} for $${catchCost.toFixed(2)} simulated`}
      style={{ visibility: 'hidden' }}
      onClick={() => onClick(drop)}
    >
      <StockDiscRim />
      <span className="arcade-disc-face">
        <span className="ninja-disc-logo">
          <img src={stockAsset(drop.symbol)?.logo} alt="" draggable={false} />
        </span>
        <span className="ninja-disc-label">
          <span className="ninja-disc-symbol">{drop.symbol}</span>
        </span>
      </span>
    </button>
  )
})

/** One frame owner for transforms and local effects. The page/HUD never receive
 * a frame clock. Input uses the positions that this owner last displayed. */
export const StockArena = memo(function StockArena(props: Props) {
  const arena = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const discs = useRef(new Map<string, HTMLButtonElement>())
  const presented = useRef(new Map<string, ReturnType<typeof dropPoint>>())
  const geometry = useRef({ left: 0, top: 0, width: 0, height: 0 })
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const trail = useRef<TrailPoint[]>([])
  const [effects, setEffects] = useState({ time: 0, trail: [] as TrailPoint[], live: false })
  const [started, setStarted] = useState(false)
  const register = useRef((id: string, node: HTMLButtonElement | null) => {
    if (node) discs.current.set(id, node)
    else discs.current.delete(id)
  }).current
  const catchPresented = useRef((drop: StockDrop, angle = 0) => {
    const point = presented.current.get(drop.id)
    if (!point || document.hidden) return
    latest.current.onCatch(drop, {
      dropId: drop.id,
      symbol: drop.symbol,
      x: point.x,
      y: point.y,
      rotation: point.rotation,
      angle,
      diameter: discDiameter(geometry.current.width),
    })
  }).current

  useEffect(() => {
    const element = arena.current!
    const measure = () => {
      const rect = element.getBoundingClientRect()
      geometry.current = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      // Resizing changes the coordinate system; don't connect a swipe across it.
      pointer.current = null
      trail.current = []
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    window.visualViewport?.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('scroll', measure)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.visualViewport?.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('scroll', measure)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let hadEffects = false
    let lastSeconds = -1
    let lastStarted: boolean | undefined
    const clearInput = () => {
      pointer.current = null
      trail.current = []
      setEffects({ time: performance.now(), trail: [], live: false })
    }
    const draw = (local: number) => {
      const { game, clock, claimed, contacts, reducedMotion, onTime } = latest.current
      const now = clock.now(local)
      const live =
        game.status === 'playing' &&
        now >= game.startedAt &&
        now < game.cutoffAt &&
        clock.authoritativeNow(local) < game.cutoffAt
      const hasStarted = now >= game.startedAt
      const deadlineNow = Math.max(now, clock.authoritativeNow(local))
      const seconds = Math.ceil(Math.min(60000, Math.max(0, game.cutoffAt - deadlineNow)) / 1000)
      if (seconds !== lastSeconds || hasStarted !== lastStarted) {
        lastSeconds = seconds
        lastStarted = hasStarted
        setStarted(hasStarted)
        onTime(seconds * 1000, hasStarted)
      }
      presented.current.clear()
      // Geometry was measured on resize/viewport changes, before transform writes.
      for (const drop of game.drops) {
        const node = discs.current.get(drop.id)
        if (!node) continue
        const visible =
          live && !claimed.has(drop.id) && now >= drop.spawnedAt && now < drop.expiresAt
        const visibility = visible ? 'visible' : 'hidden'
        if (node.style.visibility !== visibility) node.style.visibility = visibility
        if (node.disabled === visible) node.disabled = !visible
        if (!visible) continue
        const point = dropPoint(drop, now)
        presented.current.set(drop.id, point)
        const rotation = reducedMotion ? 0 : point.rotation
        node.style.transform = `translate3d(${point.x * geometry.current.width}px,${point.y * geometry.current.height}px,0) translate(-50%,-50%) rotate(${rotation}rad)`
        const face = node.lastElementChild as HTMLElement
        face.style.transform = `rotate(${-rotation}rad)`
      }
      trail.current = live ? trail.current.filter((point) => local - point.time < 180) : []
      const hasEffects =
        live &&
        (trail.current.length > 1 ||
          contacts.some((contact) => local - contact.at < CONTACT_MS.pending))
      if (hasEffects || hadEffects)
        setEffects({ time: local, trail: live ? [...trail.current] : [], live })
      hadEffects = hasEffects
      if (game.status === 'playing' && deadlineNow < game.cutoffAt && !document.hidden)
        frame = requestAnimationFrame(draw)
    }
    const visibility = () => {
      cancelAnimationFrame(frame)
      frame = 0
      clearInput()
      if (!document.hidden) draw(performance.now())
      else presented.current.clear()
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('blur', clearInput)
    if (latest.current.game.status !== 'playing') clearInput()
    if (!document.hidden) draw(performance.now())
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('blur', clearInput)
      pointer.current = null
      trail.current = []
      presented.current.clear()
    }
  }, [props.game.matchId, props.game.status, props.game.cutoffAt])

  const position = (event: PointerEvent<HTMLDivElement>) => ({
    x: event.clientX - geometry.current.left,
    y: event.clientY - geometry.current.top,
  })
  const clearPointer = () => {
    pointer.current = null
    trail.current = []
  }
  const swipe = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointer.current
    if (!previous) return
    const point = position(event)
    for (const drop of props.game.drops) {
      const displayed = presented.current.get(drop.id)
      if (
        displayed &&
        segmentHitsDisc(
          previous.x,
          previous.y,
          point.x,
          point.y,
          displayed.x * geometry.current.width,
          displayed.y * geometry.current.height,
          discDiameter(geometry.current.width) / 2
        )
      )
        catchPresented(drop, Math.atan2(point.y - previous.y, point.x - previous.x))
    }
    pointer.current = point
    trail.current = [...trail.current, { ...point, time: performance.now() }].slice(
      geometry.current.width < 768 ? -24 : -20
    )
  }
  const terminal = props.game.status === 'completed' || props.game.status === 'cancelled'
  return (
    <div
      className="arcade-arena"
      ref={arena}
      onPointerDown={(event) => {
        if (props.game.status !== 'playing' || !presented.current.size) return
        const target =
          (event.target as HTMLElement).closest<HTMLButtonElement>('button.arcade-disc') ??
          event.currentTarget
        target.setPointerCapture(event.pointerId)
        pointer.current = position(event)
        trail.current = []
      }}
      onPointerMove={swipe}
      onPointerUp={clearPointer}
      onPointerCancel={clearPointer}
    >
      {!terminal && props.game.status === 'ready' && (
        <div className="arcade-center">Preparing a shared match…</div>
      )}
      {!terminal && props.game.status === 'valuing' && (
        <div className="arcade-center">Valuing both bags at one cutoff block…</div>
      )}
      {props.game.status === 'playing' && !started && (
        <div className="arcade-center">GET READY</div>
      )}
      {props.game.status === 'playing' &&
        props.game.drops.map((drop) => (
          <StockDisc
            key={drop.id}
            drop={drop}
            catchCost={props.catchCost ?? CATCH_COST}
            register={register}
            onClick={catchPresented}
          />
        ))}
      {effects.live &&
        !terminal &&
        props.game.status === 'playing' &&
        props.contacts
          .filter(
            (contact) =>
              effects.time >= contact.at && effects.time - contact.at < CONTACT_MS.pending
          )
          .map((contact) => (
            <div
              key={contact.dropId}
              className="ninja-catch"
              style={{
                left: `${contact.x * 100}%`,
                top: `${contact.y * 100}%`,
                width: contact.diameter,
                height: contact.diameter,
              }}
            >
              <StockContact
                progress={(effects.time - contact.at) / CONTACT_MS.pending}
                kind={contact.kind}
                symbol={contact.symbol}
                angle={contact.angle}
                rotation={contact.rotation}
                reducedMotion={props.reducedMotion}
              />
            </div>
          ))}
      {props.game.status === 'playing' &&
        effects.live &&
        !props.reducedMotion &&
        effects.trail.length > 1 && (
          <StockBlade
            points={effects.trail}
            mobile={geometry.current.width < 768}
            phase={effects.time / 160}
          />
        )}
    </div>
  )
})
