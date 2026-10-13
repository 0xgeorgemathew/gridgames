import { createFileRoute } from '@tanstack/react-router'
import { inviteSearch } from '@/domains/match/invites'
import { lazy, Suspense } from 'react'
const Client = lazy(() =>
  import('@/domains/stock-arcade/client/StockArcadeClient').then((m) => ({
    default: m.StockArcadeClient,
  }))
)
export const Route = createFileRoute('/stock-arcade')({
  ssr: false,
  validateSearch: inviteSearch,
  head: () => ({ meta: [{ title: 'Stock Ninja | Grid Games Pivot' }] }),
  component: () => (
    <Suspense fallback={<div>Loading arcade…</div>}>
      <Client />
    </Suspense>
  ),
})
