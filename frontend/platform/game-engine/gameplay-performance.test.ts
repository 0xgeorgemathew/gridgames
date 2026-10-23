import { afterAll, afterEach, expect, mock, spyOn, test } from 'bun:test'

// Phaser needs a browser at import time. Stub its display surface, while running
// the real blade, token, graph, config and card-subscription implementations.
class Container {
  active = true
  visible = true
  angle = 0
  alpha = 1
  data = new Map<string, unknown>()
  constructor(
    public scene: any,
    public x = 0,
    public y = 0
  ) {}
  add() {
    return this
  }
  addAt() {
    return this
  }
  setData(key: string, value: unknown) {
    this.data.set(key, value)
    return this
  }
  getData(key: string) {
    return this.data.get(key)
  }
  setAlpha(value: number) {
    this.alpha = value
    return this
  }
  setAngle(value: number) {
    this.angle = value
    return this
  }
  setVisible(value: boolean) {
    this.visible = value
    return this
  }
  setActive(value: boolean) {
    this.active = value
    return this
  }
  setDepth() {
    return this
  }
  setScale() {
    return this
  }
  destroy() {}
}
mock.module('phaser', () => ({
  AUTO: 0,
  Scene: class {},
  GameObjects: { Container },
  Geom: {
    Point: class {
      constructor(
        public x = 0,
        public y = 0
      ) {}
    },
  },
  BlendModes: { SCREEN: 1, ADD: 2 },
  Scale: { RESIZE: 1, FIT: 2, CENTER_BOTH: 3 },
}))
const { BladeRenderer } = await import('@/domains/hyper-swiper/client/phaser/systems/BladeRenderer')
const { InputAudioSystem } =
  await import('@/domains/hyper-swiper/client/phaser/systems/InputAudioSystem')
const { Token } = await import('@/domains/hyper-swiper/client/phaser/objects/Token')
const { SharedPositionCardSystem } =
  await import('@/domains/match/client/phaser/positions/PositionCardSystem')
const { SnakePriceGraph: HyperGraph } =
  await import('@/domains/hyper-swiper/client/phaser/systems/SnakePriceGraph')
const { SnakePriceGraph: TapGraph } =
  await import('@/domains/tap-dancer/client/phaser/systems/SnakePriceGraph')
const { createTradingPhaserConfig: hyperConfig } =
  await import('@/domains/hyper-swiper/client/phaser/config')
const { createTradingPhaserConfig: tapConfig } =
  await import('@/domains/tap-dancer/client/phaser/config')
let local = 0
const now = spyOn(performance, 'now').mockImplementation(() => local)
afterEach(() => {
  local = 0
  now.mockImplementation(() => local)
})
afterAll(() => now.mockRestore())

function graphics() {
  const counters = { clears: 0, lines: 0 }
  const surface: any = { counters }
  for (const name of [
    'clear',
    'setDepth',
    'setBlendMode',
    'fillStyle',
    'fillPoints',
    'fillCircle',
    'fillRect',
    'setVisible',
    'setAlpha',
    'lineStyle',
    'lineBetween',
    'destroy',
  ]) {
    surface[name] = () => {
      if (name === 'clear') counters.clears++
      if (name === 'lineBetween') counters.lines++
      return surface
    }
  }
  return surface
}
function scene() {
  const glow = graphics()
  const image = { setDepth() {}, setTexture() {} }
  return {
    glow,
    add: { graphics: () => glow, image: () => image },
    textures: { exists: () => true },
    time: { now: 0 },
    tweens: { add: () => ({ destroy() {} }) },
    physics: {
      add: {
        existing(token: any) {
          token.body = {
            width: 10,
            height: 10,
            position: {},
            reset(x: number, y: number) {
              token.x = x
              token.y = y
            },
          }
          for (const name of [
            'setAcceleration',
            'setVelocity',
            'setBounce',
            'setCollideWorldBounds',
            'setGravity',
            'setDrag',
            'setAngularVelocity',
            'setCircle',
          ])
            token.body[name] = () => {}
        },
      },
    },
  }
}
test('stationary blade movement expires for collisions before its visual ribbon; a new gesture never bridges old movement', () => {
  const blade = new BladeRenderer(scene() as any, false)
  blade.updateBladePath(0, 0)
  local = 10
  blade.updateBladePath(100, 0)
  expect(blade.getCollisionSegments()).toHaveLength(3)
  local = 100
  expect(blade.getCollisionSegments()).toHaveLength(0)
  expect(blade.getBladePath()).toHaveLength(2)
  local = 10000
  blade.draw()
  expect(blade.getBladePath()).toHaveLength(0)
  expect(blade.getBladeVelocity()).toEqual({ x: 0, y: 0 })
  blade.updateBladePath(200, 0)
  expect(blade.getCollisionSegments()).toHaveLength(0)
  blade.clearBladePath()
  expect(blade.getBladePath()).toHaveLength(0)
})
function token() {
  const fake = scene()
  const disc = new Token(fake as any)
  disc.spawn(
    0,
    0,
    'long',
    'coin',
    { color: 0xffffff, glowColor: 0xffffff, radius: 28, symbol: 'UP' },
    false,
    100,
    -100
  )
  disc.setData('lifetimeMs', 5000)
  return { disc, fake }
}
test('a newly delivered swipe segment remains catchable at 100ms pointer-event spacing', () => {
  const blade = new BladeRenderer(scene() as any, false)
  blade.updateBladePath(0, 0)
  for (let i = 1; i <= 5; i++) {
    local = i * 100
    blade.updateBladePath(i * 100, 0)
    expect(blade.getCollisionSegments()).toHaveLength(3)
  }
  local += 70
  expect(blade.getCollisionSegments()).toHaveLength(0)
})
test('blade input clears on release, arena exit, cancel, blur and tab hide without replay on resume', () => {
  const previousDocument = globalThis.document,
    previousWindow = globalThis.window
  const documentEvents = Object.assign(new EventTarget(), { hidden: false })
  const windowEvents = new EventTarget()
  globalThis.document = documentEvents as any
  globalThis.window = windowEvents as any
  const handlers = new Map<string, (...args: any[]) => void>()
  const fake = {
    ...scene(),
    input: {
      on: (name: string, handler: (...args: any[]) => void) => handlers.set(name, handler),
      off: (name: string) => handlers.delete(name),
    },
    sound: { on() {} },
  }
  const system: any = new InputAudioSystem(fake as any)
  system.audio = { create() {}, setSceneReady() {}, destroy() {}, playSwipe() {} }
  try {
    system.create({ on() {} }, false)
    const blade = system.getBladeRenderer()
    const move = () => {
      handlers.get('pointermove')!({ x: 0, y: 0, velocity: { length: () => 20 } })
      local += 10
      handlers.get('pointermove')!({ x: 100, y: 0, velocity: { length: () => 20 } })
      expect(blade.getCollisionSegments()).toHaveLength(3)
    }
    for (const clear of [
      () => handlers.get('pointerup')!(),
      () => handlers.get('gameout')!(),
      () => windowEvents.dispatchEvent(new Event('pointercancel')),
      () => windowEvents.dispatchEvent(new Event('blur')),
      () => {
        documentEvents.hidden = true
        documentEvents.dispatchEvent(new Event('visibilitychange'))
      },
    ]) {
      move()
      clear()
      expect(blade.getBladePath()).toHaveLength(0)
    }
    documentEvents.hidden = false
    documentEvents.dispatchEvent(new Event('visibilitychange'))
    expect(blade.getCollisionSegments()).toHaveLength(0)
    system.shutdown()
    expect(handlers.size).toBe(0)
  } finally {
    globalThis.document = previousDocument
    globalThis.window = previousWindow
  }
})
test.each([1000 / 60, 50, 100, 250])(
  'ballistic motion preserves elapsed time after %dms frames',
  (delta) => {
    const { disc, fake } = token()
    for (let elapsed = delta; elapsed <= 1000 + 0.001; elapsed += delta) {
      local = elapsed
      fake.time.now = elapsed
      disc.preUpdate(elapsed, delta)
    }
    expect(disc.x).toBeCloseTo(100, 5)
    expect(disc.y).toBeCloseTo(-87.5, 5)
  }
)
test('hidden-tab gaps hide elapsed discs without unbounded catch-up; exhaust redraws only on spawn', () => {
  const { disc, fake } = token()
  const before = { ...fake.glow.counters }
  local = 250
  disc.preUpdate(250, 250)
  expect(fake.glow.counters).toEqual(before)
  local = 60000
  disc.preUpdate(250, 16)
  expect(disc.visible).toBe(false)
  expect(disc.x).toBeLessThanOrEqual(500)
})
test('card subscriber skips price-only notifications and reconciles changed identity/maps', () => {
  let listener!: (state: any) => void
  const positions = new Map(),
    closing = new Map()
  const store: any = {
    subscribe: (fn: any) => {
      listener = fn
      return () => {}
    },
    getState: () => ({
      openPositions: positions,
      closingPositions: closing,
      localPlayerId: 'a',
      priceData: null,
    }),
  }
  const system: any = new SharedPositionCardSystem({} as any, store)
  system.subscribeToStore()
  const visits = spyOn(positions, 'forEach')
  const state = { ...store.getState() }
  listener(state)
  visits.mockClear()
  for (let i = 0; i < 10; i++) listener({ ...state, priceData: { price: 100 + i } })
  expect(visits).toHaveBeenCalledTimes(0)
  listener({ ...state, localPlayerId: 'b' })
  expect(visits).toHaveBeenCalledTimes(1)
  system.shutdown()
})
test.each([
  ['Hyper', HyperGraph],
  ['Tap', TapGraph],
] as const)('%s graph flash has the same lifetime at 60 and 120 refresh', (_name, Graph) => {
  const decay = (delta: number, count: number) => {
    const graph: any = Object.create(Graph.prototype)
    graph.flashOverlay = graphics()
    graph.flashAlpha = 0.5
    graph.flashColor = 0xffffff
    for (let i = 0; i < count; i++) graph.updateFlashOverlay(600, 800, delta)
    return graph.flashAlpha
  }
  expect(decay(1000 / 120, 20)).toBeCloseTo(decay(1000 / 60, 10), 8)
})
test.each([
  ['Hyper', hyperConfig],
  ['Tap', tapConfig],
] as const)('%s rendering uses native-refresh RAF with fixed 60Hz physics', (_name, factory) => {
  const previous = globalThis.document
  globalThis.document = { getElementById: () => null } as any
  try {
    const config = factory({} as any)
    expect(config.fps?.forceSetTimeOut).toBe(false)
    expect(config.fps?.limit).toBe(0)
    expect(config.physics?.arcade?.fixedStep).toBe(true)
    expect(config.physics?.arcade?.fps).toBe(60)
  } finally {
    globalThis.document = previous
  }
})
