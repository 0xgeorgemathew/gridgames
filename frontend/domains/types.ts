import type { LucideIcon } from 'lucide-react'

export type GameStatus = 'available' | 'coming-soon' | 'maintenance'

export interface GameConfig {
  slug: string
  name: string
  description: string
  icon: string
  backgroundImage?: string
  status: GameStatus
  players: {
    min: number
    max: number
  }
  duration?: string
  lucideIcon?: LucideIcon
}
