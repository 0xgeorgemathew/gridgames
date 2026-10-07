import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
const Client = lazy(() => import('@/app/HomeClient').then((m) => ({ default: m.HomeClient })))
export const Route = createFileRoute('/')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Grid Games | Choose a Game' }] }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-tron-cyan">Loading…</div>}>
      <Client />
    </Suspense>
  ),
})
