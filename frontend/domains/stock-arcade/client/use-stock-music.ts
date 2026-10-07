import { useEffect, useRef, useState } from 'react'
import { StockMusic } from './music'

const PREFERENCE = 'stockNinja_soundMuted'
export function useStockMusic(active: boolean) {
  const music = useRef<StockMusic | null>(null)
  const [muted, setMuted] = useState(false)
  useEffect(() => {
    const audio = new Audio('/audio/digital_dividend.mp3')
    audio.preload = 'none'
    const instance = new StockMusic(audio, () => !document.hidden)
    music.current = instance
    let preference = false
    try {
      preference = localStorage.getItem(PREFERENCE) === 'true'
    } catch {
      /* Storage may be unavailable in embedded browsers. */
    }
    setMuted(preference)
    instance.setMuted(preference)
    const unlock = () => instance.unlock()
    const visibility = () => instance.sync()
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
      document.removeEventListener('visibilitychange', visibility)
      instance.dispose()
      audio.removeAttribute('src')
      audio.load()
      music.current = null
    }
  }, [])
  useEffect(() => music.current?.setActive(active), [active])
  const toggle = () => {
    const next = !muted
    setMuted(next)
    music.current?.setMuted(next)
    if (!next) music.current?.unlock()
    try {
      localStorage.setItem(PREFERENCE, String(next))
    } catch {
      /* Keep the in-memory preference when storage is unavailable. */
    }
  }
  return { muted, toggle, prepare: () => music.current?.unlock(true) }
}
