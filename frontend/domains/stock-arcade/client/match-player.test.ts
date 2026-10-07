import { expect, test } from 'bun:test'
import { MatchPlayer } from './match-player'
test('reconnect keeps the completed bag owner; a fresh round captures its own session', () => {
  const owner = new MatchPlayer()
  owner.remember('round-a', 'original')
  owner.remember('round-a', 'reconnected')
  expect(owner.get('round-a')).toBe('original')
  expect(owner.get('round-b')).toBeUndefined()
  owner.remember('round-b', 'reconnected')
  expect(owner.get('round-b')).toBe('reconnected')
  expect(owner.get('round-a')).toBeUndefined()
  owner.reset()
  owner.remember('round-c', undefined)
  expect(owner.get('round-c')).toBeUndefined()
  owner.remember('round-c', 'next')
  expect(owner.get('round-c')).toBe('next')
})
