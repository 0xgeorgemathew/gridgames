import type { GameConfig } from './types'
import { hyperSwiperConfig } from './hyper-swiper'

export const games: GameConfig[] = [hyperSwiperConfig]

export function getGameBySlug(slug: string): GameConfig | undefined {
  return games.find((g) => g.slug === slug)
}

export { type GameConfig, type GameStatus } from './types'
