'use client'

import dynamic from 'next/dynamic'
import type { SceneType } from './GameCanvasClient'

// Dynamic import with SSR disabled for Phaser (client-only)
const GameCanvasClient = dynamic(() => import('./GameCanvasClient').then((mod) => mod.default), {
  ssr: false,
})

interface GameCanvasProps {
  scene?: SceneType
  gameSlug?: string
}

export default function GameCanvas({ scene, gameSlug }: GameCanvasProps) {
  return <GameCanvasClient scene={scene} gameSlug={gameSlug} />
}
