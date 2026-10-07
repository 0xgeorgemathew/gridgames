import { createRootRoute, HeadContent, Outlet, Scripts, Link } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import css from '@/app/globals.css?url'
import fonts from '@/platform/ui/fonts.css?url'
const Providers = lazy(() => import('@/app/providers').then((m) => ({ default: m.Providers })))
const miniapp = {
  version: 'next',
  imageUrl: 'https://pivot.gridgames.space/og.png',
  button: {
    title: 'Play Now',
    action: {
      type: 'launch_miniapp',
      name: 'Grid Games',
      url: 'https://pivot.gridgames.space',
      splashImageUrl: 'https://pivot.gridgames.space/splash.png',
      splashBackgroundColor: '#000000',
    },
  },
}
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Grid Games | Pivot' },
      {
        name: 'description',
        content: 'Multiplayer arcade. Pivot preview uses simulated funds only.',
      },
      { name: 'base:app_id', content: '6995cd0fe0d5d2cf831b6001' },
      { name: 'fc:miniapp', content: JSON.stringify(miniapp) },
      {
        name: 'fc:frame',
        content: JSON.stringify({
          ...miniapp,
          button: { ...miniapp.button, action: { ...miniapp.button.action, type: 'launch_frame' } },
        }),
      },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'stylesheet', href: fonts },
      { rel: 'icon', href: '/icon.svg' },
    ],
  }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-tron-cyan">Loading Grid Games…</div>}>
      <Providers>
        <Outlet />
      </Providers>
    </Suspense>
  ),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased fixed inset-0 overflow-hidden touch-manipulation overscroll-none">
        {children}
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: () => (
    <main className="p-8">
      <h1>Page not found</h1>
      <Link to="/">Back to games</Link>
    </main>
  ),
})
