import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
const Client = lazy(() =>
  import('@/app/tap-dancer/TapDancerClient').then((m) => ({ default: m.TapDancerClient }))
)
export const Route = createFileRoute('/tap-dancer')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Tap Dancer | Grid Games' }] }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-tron-cyan">Loading…</div>}>
      <Client />
    </Suspense>
  ),
})
