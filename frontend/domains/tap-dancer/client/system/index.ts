/**
 * TapDancer Systems - Sound toggle and kept minimal
 */
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'

export { useTradingStore }

export function toggleSound(): void {
  const { isSoundMuted } = useTradingStore.getState()
  const newMutedState = !isSoundMuted
  useTradingStore.setState({ isSoundMuted: newMutedState })
  if (typeof window !== 'undefined') {
    localStorage.setItem('tapDancer_soundMuted', String(newMutedState))
  }
}
