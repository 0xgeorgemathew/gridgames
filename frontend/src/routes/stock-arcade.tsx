import { createFileRoute } from '@tanstack/react-router'
import { inviteSearch } from '@/domains/match/invites'
import { lazy, Suspense } from 'react'
import { LandingGridLoading } from '@/platform/ui/LandingGridBackground'
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
    <Suspense fallback={<LandingGridLoading />}>
      <Client />
    </Suspense>
  ),
})
