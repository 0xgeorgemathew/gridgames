import { AUTO } from 'phaser'

// Trading scene dimensions (fixed for consistent gameplay)
const TRADING_DIMENSIONS = {
  width: 600,
  height: 800,
} as const

function getTargetFrameRate(): number {
  if (typeof window === 'undefined') return 90

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return 60

  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    window.matchMedia('(pointer: coarse)').matches

  if (isMobile && cores >= 8 && memory >= 6) return 120
  if (isMobile && cores >= 6 && memory >= 4) return 90
  return 60
}

// Common physics config (zero gravity for top-down games)
const PHYSICS_CONFIG_BASE = {
  default: 'arcade',
  arcade: {
    gravity: { x: 0, y: 0 },
    fps: 60,
    fixedStep: true,
    timeScale: 1,
  },
} as const

interface PhaserConfigOptions {
  scene: Phaser.Types.Scenes.SceneType
  width: number
  height: number
  fitToScreen?: boolean
}

function createPhaserConfig(options: PhaserConfigOptions): Phaser.Types.Core.GameConfig {
  const { scene, width, height, fitToScreen = false } = options
  const targetFrameRate = getTargetFrameRate()

  const inputConfig = {
    mouse: { target: document.getElementById('phaser-game') },
    touch: { target: document.getElementById('phaser-game') },
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: 'phaser-game',
    width,
    height,
    transparent: true,
    pixelArt: false, // Smooth scaling (not pixelated)
    antialias: true, // Anti-aliased rendering
    fps: {
      target: 60, // Fixed 60 FPS for consistent gameplay
      forceSetTimeOut: true, // Use setTimeout for more consistent timing
      smoothStep: false, // Disable smooth step to prevent time accumulation
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        fps: 60, // Fixed physics timestep for consistent coin speed across all devices
        fixedStep: true,
        timeScale: 1,
      },
    },
    audio: {
      disableWebAudio: false,
      noAudio: false,
    },
    input: inputConfig,
    scene: [scene],
  }

  // Set scale mode for high-DPI support (device pixel ratio)
  if (fitToScreen) {
    config.scale = {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    }
  } else {
    config.scale = {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    }
  }

  return config
}

// Convenience factory for TradingScene
export function createTradingPhaserConfig(
  scene: Phaser.Types.Scenes.SceneType
): Phaser.Types.Core.GameConfig {
  return createPhaserConfig({
    scene,
    width: TRADING_DIMENSIONS.width,
    height: TRADING_DIMENSIONS.height,
    fitToScreen: true,
  })
}
