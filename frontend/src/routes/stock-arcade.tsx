import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
const Client = lazy(() =>
  import('@/domains/stock-arcade/client/StockArcadeClient').then((m) => ({
    default: m.StockArcadeClient,
  }))
)
export const Route = createFileRoute('/stock-arcade')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Stock Arcade | Grid Games Pivot' }] }),
  component: () => (
    <Suspense fallback={<div>Loading arcade…</div>}>
      <Client />
    </Suspense>
  ),
})
