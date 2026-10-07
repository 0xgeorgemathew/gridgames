import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
const Client = lazy(() =>
  import('@/app/hyper-swiper/HyperSwiperClient').then((m) => ({ default: m.HyperSwiperClient }))
)
export const Route = createFileRoute('/hyper-swiper')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Hyper Swiper | Grid Games' }] }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-tron-cyan">Loading…</div>}>
      <Client />
    </Suspense>
  ),
})
