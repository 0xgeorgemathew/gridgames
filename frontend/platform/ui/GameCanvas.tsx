'use client'

import { clientLazy } from '@/platform/ui/client-lazy'
import type { SceneType } from './GameCanvasClient'

// Dynamic import with SSR disabled for Phaser (client-only)
const GameCanvasClient = clientLazy(() => import('./GameCanvasClient').then((mod) => mod.default))

interface GameCanvasProps {
  scene?: SceneType
  gameSlug?: string
}

export default function GameCanvas({ scene, gameSlug }: GameCanvasProps) {
  return <GameCanvasClient scene={scene} gameSlug={gameSlug} />
}
