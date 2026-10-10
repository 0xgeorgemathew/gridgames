import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { MotionProvider } from './MotionProvider'
import { GameSelectionScreen } from './GameSelectionScreen'

test('the menu renders while authentication is still loading', () => {
  const html = renderToString(
    <MotionProvider>
      <GameSelectionScreen authPending onNavigate={() => {}} />
    </MotionProvider>
  )
  expect(html).toContain('GRID GAMES')
  expect(html).toContain('Stock Ninja')
  expect(html).toContain('TapDancer')
  expect(html).toContain('disabled=""')
  expect(html).not.toContain('<canvas')
  expect(html).not.toMatch(/opacity:0(?:;|")/)
})

test('pending authentication cannot enable game entry', () => {
  const html = renderToString(
    <MotionProvider>
      <GameSelectionScreen authPending authState="ready" onNavigate={() => {}} />
    </MotionProvider>
  )
  expect(html).toMatch(/<button disabled="" aria-label="Play Stock Ninja"/)
  expect(html).toMatch(/<button disabled="" aria-label="Play TapDancer"/)
})

test('confirmed authentication enables the existing game choices', () => {
  const html = renderToString(
    <MotionProvider>
      <GameSelectionScreen authState="ready" onNavigate={() => {}} />
    </MotionProvider>
  )
  expect(html).toMatch(/<button aria-label="Play Stock Ninja"/)
  expect(html).toMatch(/<button aria-label="Play TapDancer"/)
  expect(html).not.toContain('LOGIN WITH GOOGLE')
})
