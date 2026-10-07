import { expect, test } from 'bun:test'
import { ClaimBudget } from './claim-budget'
import type { Bag } from '../shared/types'
const bag = (spent: number, reservedSpend = 0): Bag => ({
  playerId: 'a',
  name: 'A',
  spent,
  reservedSpend,
  assets: [],
})
test('one multi-disc swipe cannot optimistically consume more than the last dollar', () => {
  const guard = new ClaimBudget()
  expect(guard.reserve('one', bag(9))).toBe(true)
  expect(guard.reserve('two', bag(9))).toBe(false)
  expect(guard.reserve('one', bag(9))).toBe(false)
  guard.acknowledge('one')
  expect(guard.reserve('two', bag(9, 1))).toBe(false)
  expect(guard.reserve('two', bag(10))).toBe(false)
})
test('ordered pending ack, failures, timeout failures and a new connection release only local reservations', () => {
  const guard = new ClaimBudget()
  expect(guard.reserve('one', bag(8))).toBe(true)
  expect(guard.reserve('two', bag(8))).toBe(true)
  expect(guard.reserve('three', bag(8))).toBe(false)
  guard.acknowledge('one') // server ledger has reserved this dollar
  expect(guard.reserve('three', bag(8, 1))).toBe(false)
  guard.acknowledge('two') // server ledger now owns both reservations
  expect(guard.reserve('three', bag(8, 2))).toBe(false)
  guard.acknowledge('one') // duplicate ack changes nothing
  expect(guard.reserve('three', bag(8, 1))).toBe(true) // server released a failed/timed-out quote
  guard.reset() // disconnect/terminal/readiness reset
  expect(guard.reserve('new-match', bag(0))).toBe(true)
  guard.acknowledge('stale-old-match')
  expect(guard.reserve('last-dollar', bag(9))).toBe(false)
})
