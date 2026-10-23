import * as Phaser from 'phaser'
import { AUTO } from 'phaser'

// Trading scene dimensions (fixed for consistent gameplay)
const TRADING_DIMENSIONS = {
  width: 600,
  height: 800,
} as const

interface PhaserConfigOptions {
  scene: Phaser.Types.Scenes.SceneType
  width: number
  height: number
  fitToScreen?: boolean
}

function createPhaserConfig(options: PhaserConfigOptions): Phaser.Types.Core.GameConfig {
  const { scene, width, height, fitToScreen = false } = options

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
      target: 60,
      limit: 0, // Follow native refresh; effects use elapsed time and physics stays fixed at 60.
      forceSetTimeOut: false, // Align rendering with the display via RAF.
      smoothStep: false, // Preserve actual elapsed time, including stalled frames.
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
